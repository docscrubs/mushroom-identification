import type { LLMRequest, LLMResponse } from '@/types';

const DEFAULT_ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions';
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
  apiKey: string,
  endpoint: string = DEFAULT_ENDPOINT,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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
