import type { LLMRequest, LLMResponse } from '@/types';

const DEFAULT_ENDPOINT = '/api/chat';
const DEFAULT_TIMEOUT_MS = 30_000;

export class LLMApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable: boolean,
  ) {
    super(message);
    this.name = 'LLMApiError';
  }
}

/**
 * Call the z.ai OpenAI-compatible chat completions endpoint.
 * This is the ONLY place in the codebase that calls fetch for LLM.
 */
export async function callLLM(
  request: LLMRequest,
  apiKey: string | null,
  endpoint: string = DEFAULT_ENDPOINT,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LLMApiError(
        `LLM API error: ${response.status} ${response.statusText}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }

    return (await response.json()) as LLMResponse;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call the z.ai chat completions endpoint with streaming (SSE).
 * Calls onChunk with each content delta as it arrives.
 * Returns a complete LLMResponse when done (same shape as callLLM).
 */
export async function callLLMStream(
  request: LLMRequest,
  apiKey: string | null,
  onChunk: (content: string) => void,
  endpoint: string = DEFAULT_ENDPOINT,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LLMApiError(
        `LLM API error: ${response.status} ${response.statusText}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(delta);
          }
          if (parsed.usage && parsed.usage.total_tokens) {
            usage = parsed.usage;
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    return {
      id: '',
      choices: [{ message: { role: 'assistant', content: fullContent }, finish_reason: 'stop' }],
      usage,
    };
  } finally {
    clearTimeout(timeout);
  }
}
