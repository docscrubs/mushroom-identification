import { vi } from 'vitest';
import { callLLM, LLMApiError } from './api-client';
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
    await callLLM(request, 'sk-test-key', 'https://api.z.ai/api/paas/v4/chat/completions');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://api.z.ai/api/paas/v4/chat/completions');
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

  it('uses default endpoint when none provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeResponse()),
    });
    globalThis.fetch = mockFetch;

    await callLLM(makeRequest(), 'sk-test');
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe('https://api.z.ai/api/paas/v4/chat/completions');
  });
});
