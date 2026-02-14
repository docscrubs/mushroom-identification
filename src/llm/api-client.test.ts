import { vi } from 'vitest';
import { callLLM, callLLMStream, LLMApiError } from './api-client';
import type { LLMRequest, LLMResponse } from '@/types';

function makeRequest(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    model: 'test-model',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 100,
    temperature: 0.3,
    ...overrides,
  };
}

function makeResponse(overrides: Partial<LLMResponse> = {}): LLMResponse {
  return {
    id: 'resp-123',
    choices: [
      {
        message: { role: 'assistant', content: '{"test": true}' },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70,
    },
    ...overrides,
  };
}

describe('LLM API Client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends a properly formatted request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse()),
    });
    globalThis.fetch = mockFetch;

    const request = makeRequest();
    await callLLM(request, 'sk-test-key');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe('/api/chat');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer sk-test-key');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual(request);
  });

  it('returns a typed LLM response on success', async () => {
    const expected = makeResponse();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(expected),
    });

    const result = await callLLM(makeRequest(), 'sk-test');
    expect(result.id).toBe('resp-123');
    expect(result.choices[0]!.message.content).toBe('{"test": true}');
    expect(result.usage.total_tokens).toBe(70);
  });

  it('throws LLMApiError on 401 (bad key)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(callLLM(makeRequest(), 'bad-key')).rejects.toThrow(LLMApiError);
    try {
      await callLLM(makeRequest(), 'bad-key');
    } catch (e) {
      const err = e as LLMApiError;
      expect(err.status).toBe(401);
      expect(err.retryable).toBe(false);
    }
  });

  it('throws retryable LLMApiError on 429 (rate limited)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    try {
      await callLLM(makeRequest(), 'sk-test');
    } catch (e) {
      const err = e as LLMApiError;
      expect(err.status).toBe(429);
      expect(err.retryable).toBe(true);
    }
  });

  it('throws retryable LLMApiError on 500 (server error)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    try {
      await callLLM(makeRequest(), 'sk-test');
    } catch (e) {
      const err = e as LLMApiError;
      expect(err.status).toBe(500);
      expect(err.retryable).toBe(true);
    }
  });

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(callLLM(makeRequest(), 'sk-test')).rejects.toThrow();
  });

  it('uses default endpoint /api/chat when none provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse()),
    });
    globalThis.fetch = mockFetch;

    await callLLM(makeRequest(), 'sk-test');
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe('/api/chat');
  });

  it('omits Authorization header when apiKey is null', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse()),
    });
    globalThis.fetch = mockFetch;

    await callLLM(makeRequest(), null);
    const [, options] = mockFetch.mock.calls[0]!;
    expect(options.headers['Authorization']).toBeUndefined();
    expect(options.headers['Content-Type']).toBe('application/json');
  });
});

// --- Helper to mock a response body with a reader ---

function makeSseBody(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    getReader() {
      return {
        read() {
          if (index < chunks.length) {
            return Promise.resolve({ done: false, value: encoder.encode(chunks[index++]!) });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };
}

function sseLines(...events: Array<{ content?: string; usage?: object }>): string[] {
  const lines: string[] = [];
  for (const evt of events) {
    const delta: Record<string, unknown> = {};
    if (evt.content !== undefined) delta.content = evt.content;
    lines.push(
      `data: ${JSON.stringify({ choices: [{ delta }], usage: evt.usage ?? null })}\n\n`,
    );
  }
  lines.push('data: [DONE]\n\n');
  return lines;
}

describe('callLLMStream', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends request with stream: true', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(sseLines({ content: 'hi' })),
    });
    globalThis.fetch = mockFetch;

    await callLLMStream(makeRequest(), 'sk-test', vi.fn());
    const body = JSON.parse(mockFetch.mock.calls[0]![1].body);
    expect(body.stream).toBe(true);
  });

  it('calls onChunk for each content delta', async () => {
    const chunks = sseLines(
      { content: 'Hello' },
      { content: ' world' },
      { content: '!' },
    );
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(chunks),
    });

    const onChunk = vi.fn();
    await callLLMStream(makeRequest(), 'sk-test', onChunk);

    expect(onChunk).toHaveBeenCalledTimes(3);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello');
    expect(onChunk).toHaveBeenNthCalledWith(2, ' world');
    expect(onChunk).toHaveBeenNthCalledWith(3, '!');
  });

  it('returns accumulated content and usage in LLMResponse format', async () => {
    const chunks = sseLines(
      { content: 'Hello' },
      { content: ' world', usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } },
    );
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(chunks),
    });

    const result = await callLLMStream(makeRequest(), 'sk-test', vi.fn());
    expect(result.choices[0]!.message.content).toBe('Hello world');
    expect(result.usage.prompt_tokens).toBe(100);
    expect(result.usage.total_tokens).toBe(110);
  });

  it('handles chunks split across SSE boundaries', async () => {
    const fullLine = `data: ${JSON.stringify({ choices: [{ delta: { content: 'split' } }], usage: null })}\n\n`;
    // Simulate a chunk that splits in the middle of a line
    const body = makeSseBody([
      fullLine.slice(0, 15),
      fullLine.slice(15),
      'data: [DONE]\n\n',
    ]);

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, body });

    const onChunk = vi.fn();
    const result = await callLLMStream(makeRequest(), 'sk-test', onChunk);
    expect(onChunk).toHaveBeenCalledWith('split');
    expect(result.choices[0]!.message.content).toBe('split');
  });

  it('throws LLMApiError on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(
      callLLMStream(makeRequest(), 'bad-key', vi.fn()),
    ).rejects.toThrow(LLMApiError);
  });

  it('handles empty content deltas without calling onChunk', async () => {
    const chunks = sseLines(
      { content: '' },
      { content: 'real content' },
    );
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: makeSseBody(chunks),
    });

    const onChunk = vi.fn();
    await callLLMStream(makeRequest(), 'sk-test', onChunk);
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith('real content');
  });
});
