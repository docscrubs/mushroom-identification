import 'fake-indexeddb/auto';
import { vi, type Mock } from 'vitest';
import { MushroomDB } from '@/db/database';
import { saveApiKey } from './api-key';
import type { LLMResponse } from '@/types/llm';

// Mock callLLM and callLLMStream at the network boundary — everything else is real
vi.mock('./api-client', () => ({
  callLLM: vi.fn(),
  callLLMStream: vi.fn(),
  LLMApiError: class LLMApiError extends Error {
    constructor(
      message: string,
      public status: number,
      public retryable: boolean,
    ) {
      super(message);
      this.name = 'LLMApiError';
    }
  },
}));

import { callLLM, callLLMStream } from './api-client';
import {
  startConversation,
  sendMessage,
  sendMessageStreaming,
  endConversation,
  getSession,
  listSessions,
} from './conversation';

const mockCallLLM = callLLM as Mock;
const mockCallLLMStream = callLLMStream as Mock;

function makeLLMResponse(content: string): LLMResponse {
  return {
    id: 'resp-1',
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 },
  };
}

describe('conversation orchestrator', () => {
  let db: MushroomDB;

  beforeEach(async () => {
    db = new MushroomDB(`test-conv-orch-${Date.now()}-${Math.random()}`);
    mockCallLLM.mockReset();
    mockCallLLMStream.mockReset();
    // Most tests need an API key
    await saveApiKey(db, 'test-api-key-123');
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('startConversation', () => {
    it('creates session with active status and empty messages', async () => {
      const session = await startConversation(db);
      expect(session.status).toBe('active');
      expect(session.messages).toEqual([]);
      expect(session.session_id).toBeTruthy();
      expect(session.created_at).toBeTruthy();
    });

    it('persists session to IndexedDB', async () => {
      const session = await startConversation(db);
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.session_id).toBe(session.session_id);
    });
  });

  describe('sendMessage', () => {
    it('adds user message, calls LLM, adds assistant response', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('This looks like a Chanterelle.'));

      const session = await startConversation(db);
      const result = await sendMessage(db, session.session_id, 'I found a yellow mushroom');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.messages).toHaveLength(2);
        expect(result.session.messages[0]!.role).toBe('user');
        expect(result.session.messages[0]!.content).toBe('I found a yellow mushroom');
        expect(result.session.messages[1]!.role).toBe('assistant');
        expect(result.session.messages[1]!.content).toBe('This looks like a Chanterelle.');
        expect(result.response).toBe('This looks like a Chanterelle.');
      }
    });

    it('uses text model when no photos provided', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('I can help identify that.'));

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Brown cap, white gills');

      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      const request = mockCallLLM.mock.calls[0]![0];
      expect(request.model).toBe('glm-4.7-flash');
    });

    it('uses vision model when photos present', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('I can see the mushroom in your photo.'));

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'What is this?', [
        'data:image/jpeg;base64,abc',
      ]);

      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      const request = mockCallLLM.mock.calls[0]![0];
      expect(request.model).toBe('glm-4.6v-flash');
    });

    it('includes species dataset in system prompt sent to LLM', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('Noted.'));

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Hello');

      const request = mockCallLLM.mock.calls[0]![0];
      const systemMessage = request.messages.find(
        (m: { role: string }) => m.role === 'system',
      );
      expect(systemMessage).toBeDefined();
      // System prompt should contain known deadly species
      expect(systemMessage.content).toContain('Amanita phalloides');
      expect(systemMessage.content).toContain('Amanita virosa');
    });

    it('sends full conversation history on each call', async () => {
      mockCallLLM
        .mockResolvedValueOnce(makeLLMResponse('Tell me more about the cap.'))
        .mockResolvedValueOnce(makeLLMResponse('That sounds like Agaricus.'));

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Brown mushroom');
      await sendMessage(db, session.session_id, 'Cap is 8cm, convex');

      // Second call should have system + user1 + assistant1 + user2
      const secondCall = mockCallLLM.mock.calls[1]![0];
      const nonSystemMessages = secondCall.messages.filter(
        (m: { role: string }) => m.role !== 'system',
      );
      expect(nonSystemMessages).toHaveLength(3);
      expect(nonSystemMessages[0].role).toBe('user');
      expect(nonSystemMessages[0].content).toBe('Brown mushroom');
      expect(nonSystemMessages[1].role).toBe('assistant');
      expect(nonSystemMessages[1].content).toBe('Tell me more about the cap.');
      expect(nonSystemMessages[2].role).toBe('user');
      expect(nonSystemMessages[2].content).toBe('Cap is 8cm, convex');
    });

    it('handles API errors: user message stored, error returned, session stays active', async () => {
      mockCallLLM.mockRejectedValue(new Error('Network timeout'));

      const session = await startConversation(db);
      const result = await sendMessage(db, session.session_id, 'Help me identify');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('api_error');
        expect(result.message).toContain('Network timeout');
      }

      // User message should still be persisted
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      expect(retrieved!.messages[0]!.role).toBe('user');
      expect(retrieved!.status).toBe('active');
    });

    it('returns session_not_found for nonexistent session', async () => {
      const result = await sendMessage(db, 'nonexistent-session', 'Hello');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('session_not_found');
      }
    });

    it('returns no_api_key error when no key configured', async () => {
      // Clear the API key set in beforeEach
      await db.llmSettings.clear();

      const session = await startConversation(db);
      const result = await sendMessage(db, session.session_id, 'Hello');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('no_api_key');
      }

      // User message should still be stored
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      // LLM should never be called
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('returns budget_exceeded error when over budget', async () => {
      // Add usage record exceeding the default $5 budget
      await db.llmUsage.add({
        timestamp: new Date().toISOString(),
        prompt_tokens: 1_000_000,
        completion_tokens: 1_000_000,
        estimated_cost_usd: 10.0,
        cache_hit: false,
      });

      const session = await startConversation(db);
      const result = await sendMessage(db, session.session_id, 'Hello');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('budget_exceeded');
      }

      // User message still stored
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      // LLM should never be called
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('returns cached response without calling LLM', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('This is a Chanterelle.'));

      // First call populates the cache
      const session1 = await startConversation(db);
      await sendMessage(db, session1.session_id, 'Yellow funnel-shaped mushroom');
      expect(mockCallLLM).toHaveBeenCalledTimes(1);

      // Second call with same message in a new session should hit cache
      // (LLM messages = system prompt + same user text = same cache key)
      mockCallLLM.mockClear();
      const session2 = await startConversation(db);
      const result = await sendMessage(db, session2.session_id, 'Yellow funnel-shaped mushroom');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.response).toBe('This is a Chanterelle.');
        expect(result.session.messages).toHaveLength(2);
      }
      // callLLM should NOT have been called for the cached response
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('records usage on successful non-cached calls', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('Noted.'));

      const session = await startConversation(db);
      const beforeCount = await db.llmUsage.count();

      await sendMessage(db, session.session_id, 'Brown cap with ring');

      const afterCount = await db.llmUsage.count();
      expect(afterCount).toBe(beforeCount + 1);

      const records = await db.llmUsage.toArray();
      const lastRecord = records[records.length - 1]!;
      expect(lastRecord.prompt_tokens).toBe(1000);
      expect(lastRecord.completion_tokens).toBe(200);
      expect(lastRecord.cache_hit).toBe(false);
    });

    it('persists both messages to IndexedDB after success', async () => {
      mockCallLLM.mockResolvedValue(makeLLMResponse('Interesting find!'));

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Found in woodland');

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(2);
      expect(retrieved!.messages[0]!.role).toBe('user');
      expect(retrieved!.messages[0]!.content).toBe('Found in woodland');
      expect(retrieved!.messages[1]!.role).toBe('assistant');
      expect(retrieved!.messages[1]!.content).toBe('Interesting find!');
    });
  });

  describe('endConversation', () => {
    it('sets status to completed', async () => {
      const session = await startConversation(db);
      await endConversation(db, session.session_id);

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.status).toBe('completed');
    });

    it('does not throw for nonexistent session', async () => {
      await expect(endConversation(db, 'nonexistent')).resolves.not.toThrow();
    });
  });

  describe('getSession', () => {
    it('retrieves a session by ID', async () => {
      const session = await startConversation(db);
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.session_id).toBe(session.session_id);
    });

    it('returns undefined for nonexistent ID', async () => {
      const result = await getSession(db, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('listSessions', () => {
    it('returns sessions ordered by updated_at descending', async () => {
      const s1 = await startConversation(db);
      await new Promise((r) => setTimeout(r, 10));
      const s2 = await startConversation(db);

      const sessions = await listSessions(db);
      expect(sessions).toHaveLength(2);
      expect(sessions[0]!.session_id).toBe(s2.session_id);
      expect(sessions[1]!.session_id).toBe(s1.session_id);
    });

    it('filters by status', async () => {
      const s1 = await startConversation(db);
      const s2 = await startConversation(db);
      await endConversation(db, s2.session_id);

      const active = await listSessions(db, 'active');
      expect(active).toHaveLength(1);
      expect(active[0]!.session_id).toBe(s1.session_id);

      const completed = await listSessions(db, 'completed');
      expect(completed).toHaveLength(1);
      expect(completed[0]!.session_id).toBe(s2.session_id);
    });
  });

  describe('sendMessageStreaming', () => {
    it('calls onChunk for each streamed delta and returns final result', async () => {
      mockCallLLMStream.mockImplementation(
        async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
          onChunk('Hello');
          onChunk(' world');
          return makeLLMResponse('Hello world');
        },
      );

      const session = await startConversation(db);
      const chunks: string[] = [];
      const result = await sendMessageStreaming(
        db,
        session.session_id,
        'Test message',
        (chunk) => chunks.push(chunk),
      );

      expect(chunks).toEqual(['Hello', ' world']);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.response).toBe('Hello world');
        expect(result.session.messages).toHaveLength(2);
        expect(result.session.messages[1]!.content).toBe('Hello world');
      }
    });

    it('uses callLLMStream not callLLM', async () => {
      mockCallLLMStream.mockImplementation(
        async (_req: unknown, _key: unknown, _onChunk: unknown) => {
          return makeLLMResponse('Streamed response');
        },
      );

      const session = await startConversation(db);
      await sendMessageStreaming(db, session.session_id, 'Hello', vi.fn());

      expect(mockCallLLMStream).toHaveBeenCalledTimes(1);
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('persists both messages to IndexedDB after streaming completes', async () => {
      mockCallLLMStream.mockImplementation(
        async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
          onChunk('Saved');
          return makeLLMResponse('Saved');
        },
      );

      const session = await startConversation(db);
      await sendMessageStreaming(db, session.session_id, 'Save test', vi.fn());

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(2);
      expect(retrieved!.messages[0]!.role).toBe('user');
      expect(retrieved!.messages[1]!.role).toBe('assistant');
      expect(retrieved!.messages[1]!.content).toBe('Saved');
    });

    it('handles API errors the same as sendMessage', async () => {
      mockCallLLMStream.mockRejectedValue(new Error('Stream failed'));

      const session = await startConversation(db);
      const result = await sendMessageStreaming(
        db,
        session.session_id,
        'Will fail',
        vi.fn(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('api_error');
        expect(result.message).toContain('Stream failed');
      }

      // User message still persisted
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      expect(retrieved!.messages[0]!.role).toBe('user');
    });

    it('falls back to non-streaming for cached responses', async () => {
      // First call populates cache via non-streaming
      mockCallLLM.mockResolvedValue(makeLLMResponse('Cached answer'));
      const s1 = await startConversation(db);
      await sendMessage(db, s1.session_id, 'Cache test message');

      // Streaming call with same input should hit cache without calling stream API
      mockCallLLMStream.mockClear();
      mockCallLLM.mockClear();
      const s2 = await startConversation(db);
      const result = await sendMessageStreaming(
        db,
        s2.session_id,
        'Cache test message',
        vi.fn(),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.response).toBe('Cached answer');
      }
      expect(mockCallLLMStream).not.toHaveBeenCalled();
      expect(mockCallLLM).not.toHaveBeenCalled();
    });
  });
});
