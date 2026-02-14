import 'fake-indexeddb/auto';
import { vi, type Mock } from 'vitest';
import { MushroomDB } from '@/db/database';
import { saveApiKey } from './api-key';
import type { LLMResponse } from '@/types/llm';
import type { Stage1Output } from '@/types/pipeline';

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

function makeLLMResponse(content: string, usage?: Partial<LLMResponse['usage']>): LLMResponse {
  return {
    id: 'resp-1',
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: {
      prompt_tokens: usage?.prompt_tokens ?? 1000,
      completion_tokens: usage?.completion_tokens ?? 200,
      total_tokens: usage?.total_tokens ?? 1200,
    },
  };
}

const validStage1Json: Stage1Output = {
  candidates: [
    {
      name: 'Field Mushroom',
      scientific_name: 'Agaricus campestris',
      confidence: 'high',
      key_reasons: 'White cap, pink gills, grassland habitat',
    },
    {
      name: 'Death Cap',
      scientific_name: 'Amanita phalloides',
      confidence: 'low',
      key_reasons: 'Safety inclusion — white-gilled mushroom',
    },
  ],
  reasoning: 'White mushroom in grassland strongly suggests Agaricus campestris',
  needs_more_info: true,
  follow_up_question: 'Can you check the stem base for a volva?',
};

/**
 * Set up both mocks for the two-stage pipeline:
 * - callLLM for Stage 1 (candidate generation, returns JSON)
 * - callLLMStream for Stage 2 (verification, streams chunks)
 */
function setupPipelineMocks(
  stage2Content = '## Verification\nField Mushroom is a strong match.',
) {
  mockCallLLM.mockResolvedValue(
    makeLLMResponse(JSON.stringify(validStage1Json), {
      prompt_tokens: 500,
      completion_tokens: 200,
      total_tokens: 700,
    }),
  );
  mockCallLLMStream.mockImplementation(
    async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
      onChunk(stage2Content);
      return makeLLMResponse(stage2Content, {
        prompt_tokens: 2000,
        completion_tokens: 400,
        total_tokens: 2400,
      });
    },
  );
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

  describe('sendMessage (pipeline integration)', () => {
    it('calls Stage 1 (callLLM) then Stage 2 (callLLMStream)', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'I found a white mushroom');

      // Stage 1 via callLLM, Stage 2 via callLLMStream
      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      expect(mockCallLLMStream).toHaveBeenCalledTimes(1);
    });

    it('adds user message and assistant response with pipeline metadata', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      const result = await sendMessage(db, session.session_id, 'I found a white mushroom');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.messages).toHaveLength(2);
        expect(result.session.messages[0]!.role).toBe('user');
        expect(result.session.messages[0]!.content).toBe('I found a white mushroom');
        expect(result.session.messages[1]!.role).toBe('assistant');
        // Pipeline metadata stored on assistant message
        const metadata = result.session.messages[1]!.pipeline_metadata;
        expect(metadata).toBeDefined();
        expect(metadata!.stage1_candidates).toHaveLength(2);
        expect(metadata!.stage1_candidates![0]!.name).toBe('Field Mushroom');
        expect(metadata!.verified_species!.length).toBeGreaterThan(0);
      }
    });

    it('Stage 1 system prompt does NOT contain species dataset', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Brown cap mushroom');

      const stage1Request = mockCallLLM.mock.calls[0]![0];
      const systemMessage = stage1Request.messages.find(
        (m: { role: string }) => m.role === 'system',
      );
      expect(systemMessage).toBeDefined();
      // Stage 1 should NOT have the full species dataset
      expect(systemMessage.content).not.toContain('Lactarius torminosus');
      // But should have candidate generation instructions
      expect(systemMessage.content).toContain('candidate');
    });

    it('Stage 2 system prompt contains focused species data', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'White cap, pink gills');

      const stage2Request = mockCallLLMStream.mock.calls[0]![0];
      const systemMessage = stage2Request.messages.find(
        (m: { role: string }) => m.role === 'system',
      );
      expect(systemMessage).toBeDefined();
      // Should contain the candidate species
      expect(systemMessage.content).toContain('Agaricus campestris');
      // Should NOT contain unrelated species
      expect(systemMessage.content).not.toContain('Lactarius torminosus');
    });

    it('sends full conversation history to Stage 1 on multi-turn', async () => {
      setupPipelineMocks('Tell me more.');
      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Brown mushroom');

      setupPipelineMocks('Looks like Agaricus.');
      await sendMessage(db, session.session_id, 'Cap is 8cm, convex');

      // Second Stage 1 call should have full history
      const secondStage1Call = mockCallLLM.mock.calls[1]![0];
      const nonSystemMessages = secondStage1Call.messages.filter(
        (m: { role: string }) => m.role !== 'system',
      );
      expect(nonSystemMessages).toHaveLength(3);
      expect(nonSystemMessages[0].role).toBe('user');
      expect(nonSystemMessages[0].content).toBe('Brown mushroom');
      expect(nonSystemMessages[1].role).toBe('assistant');
      expect(nonSystemMessages[1].content).toBe('Tell me more.');
      expect(nonSystemMessages[2].role).toBe('user');
      expect(nonSystemMessages[2].content).toBe('Cap is 8cm, convex');
    });

    it('handles API errors: user message stored, error returned', async () => {
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
      await db.llmSettings.clear();

      const session = await startConversation(db);
      const result = await sendMessage(db, session.session_id, 'Hello');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('no_api_key');
      }

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('returns budget_exceeded error when over budget', async () => {
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

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('returns cached response without calling pipeline', async () => {
      setupPipelineMocks('This is a Chanterelle.');
      const session1 = await startConversation(db);
      await sendMessage(db, session1.session_id, 'Yellow funnel-shaped mushroom');
      expect(mockCallLLM).toHaveBeenCalledTimes(1);

      mockCallLLM.mockClear();
      mockCallLLMStream.mockClear();
      const session2 = await startConversation(db);
      const result = await sendMessage(db, session2.session_id, 'Yellow funnel-shaped mushroom');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.response).toBe('This is a Chanterelle.');
        expect(result.session.messages).toHaveLength(2);
      }
      expect(mockCallLLM).not.toHaveBeenCalled();
      expect(mockCallLLMStream).not.toHaveBeenCalled();
    });

    it('records combined usage from both pipeline stages', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      const beforeCount = await db.llmUsage.count();

      await sendMessage(db, session.session_id, 'Brown cap with ring');

      const afterCount = await db.llmUsage.count();
      expect(afterCount).toBe(beforeCount + 1);

      const records = await db.llmUsage.toArray();
      const lastRecord = records[records.length - 1]!;
      // Combined: Stage 1 (500) + Stage 2 (2000) = 2500
      expect(lastRecord.prompt_tokens).toBe(2500);
      // Combined: Stage 1 (200) + Stage 2 (400) = 600
      expect(lastRecord.completion_tokens).toBe(600);
      expect(lastRecord.cache_hit).toBe(false);
    });

    it('persists both messages to IndexedDB after success', async () => {
      setupPipelineMocks('Interesting find!');

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Found in woodland');

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(2);
      expect(retrieved!.messages[0]!.role).toBe('user');
      expect(retrieved!.messages[0]!.content).toBe('Found in woodland');
      expect(retrieved!.messages[1]!.role).toBe('assistant');
      expect(retrieved!.messages[1]!.content).toBe('Interesting find!');
    });

    it('uses vision model for Stage 1 when photos present', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'What is this?', [
        'data:image/jpeg;base64,abc',
      ]);

      const stage1Request = mockCallLLM.mock.calls[0]![0];
      expect(stage1Request.model).toBe('glm-4.6v-flash');
    });

    it('uses text model for Stage 1 when no photos', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessage(db, session.session_id, 'Brown cap, white gills');

      const stage1Request = mockCallLLM.mock.calls[0]![0];
      expect(stage1Request.model).toBe('glm-4.7-flash');
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

  describe('sendMessageStreaming (pipeline integration)', () => {
    it('streams Stage 2 chunks via onChunk and returns final result', async () => {
      mockCallLLM.mockResolvedValue(
        makeLLMResponse(JSON.stringify(validStage1Json)),
      );
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

    it('calls both callLLM (Stage 1) and callLLMStream (Stage 2)', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessageStreaming(db, session.session_id, 'Hello', vi.fn());

      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      expect(mockCallLLMStream).toHaveBeenCalledTimes(1);
    });

    it('emits onStageChange callbacks in order', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      const stages: string[] = [];
      await sendMessageStreaming(
        db,
        session.session_id,
        'White mushroom',
        vi.fn(),
        undefined,
        (stage) => stages.push(stage),
      );

      expect(stages).toEqual(['candidates', 'lookup', 'verification']);
    });

    it('stores pipeline_metadata on assistant message', async () => {
      setupPipelineMocks();

      const session = await startConversation(db);
      await sendMessageStreaming(db, session.session_id, 'Found something', vi.fn());

      const retrieved = await getSession(db, session.session_id);
      const assistantMsg = retrieved!.messages[1]!;
      expect(assistantMsg.pipeline_metadata).toBeDefined();
      expect(assistantMsg.pipeline_metadata!.stage1_candidates).toHaveLength(2);
      expect(assistantMsg.pipeline_metadata!.verified_species!.length).toBeGreaterThan(0);
    });

    it('persists both messages to IndexedDB after streaming completes', async () => {
      setupPipelineMocks('Saved');

      const session = await startConversation(db);
      await sendMessageStreaming(db, session.session_id, 'Save test', vi.fn());

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(2);
      expect(retrieved!.messages[0]!.role).toBe('user');
      expect(retrieved!.messages[1]!.role).toBe('assistant');
      expect(retrieved!.messages[1]!.content).toBe('Saved');
    });

    it('handles API errors the same as sendMessage', async () => {
      mockCallLLM.mockRejectedValue(new Error('Stream failed'));

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

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      expect(retrieved!.messages[0]!.role).toBe('user');
    });

    it('falls back to non-streaming for cached responses', async () => {
      setupPipelineMocks('Cached answer');
      const s1 = await startConversation(db);
      await sendMessage(db, s1.session_id, 'Cache test message');

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
