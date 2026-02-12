import { vi } from 'vitest';
import { MushroomDB } from '@/db/database';
import { generateExplanation } from './explain';
import { saveApiKey } from './api-key';
import type { IdentificationResult, LLMResponse } from '@/types';

function makeLLMResponse(content: string): LLMResponse {
  return {
    id: 'resp-explain',
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 },
  };
}

const VALID_EXPLANATION = JSON.stringify({
  summary: 'This appears to be a Russula species based on the brittle flesh.',
  detailed_explanation: 'The brittle, chalk-like flesh is a definitive marker for the Russula/Lactarius family. Combined with the woodland habitat and absence of milk, this strongly suggests Russula.',
  safety_emphasis: 'No immediate safety concerns at genus level. However, some Russula species are peppery and should not be eaten.',
  suggested_questions: [
    'Have you tried the taste test?',
    'What colour is the spore print?',
  ],
});

const mockResult: IdentificationResult = {
  candidates: [
    {
      genus: 'Russula',
      common_name: 'Russula',
      confidence: 'high',
      score: 0.85,
      matching_evidence: [
        { feature: 'flesh_texture', observed_value: 'brittle', expected_value: 'brittle', tier: 'definitive', supports: true, summary: 'brittle flesh' },
      ],
      contradicting_evidence: [],
      missing_evidence: [],
    },
  ],
  reasoning_chain: ['Observed: brittle flesh.', 'Top candidate: Russula.'],
  safety: {
    toxicity: 'edible',
    warnings: [],
    dangerous_lookalikes: [],
    confidence_sufficient_for_foraging: true,
  },
  suggested_actions: [],
  follow_up_questions: [],
  ambiguities: [],
  triggered_heuristics: [],
};

describe('Explanation Generator', () => {
  let db: MushroomDB;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    db = new MushroomDB(`test-explain-${Date.now()}-${Math.random()}`);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns null when no API key is set', async () => {
    const result = await generateExplanation(db, mockResult, { flesh_texture: 'brittle' });
    expect(result).toBeNull();
  });

  it('returns a parsed explanation on success', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeLLMResponse(VALID_EXPLANATION)),
    });

    const result = await generateExplanation(db, mockResult, { flesh_texture: 'brittle' });
    expect(result).not.toBeNull();
    expect(result!.summary).toContain('Russula');
    expect(result!.suggested_questions.length).toBeGreaterThan(0);
  });

  it('returns null on API error', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    });

    const result = await generateExplanation(db, mockResult, {});
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await generateExplanation(db, mockResult, {});
    expect(result).toBeNull();
  });

  it('caches the explanation response', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeLLMResponse(VALID_EXPLANATION)),
    });

    // First call
    await generateExplanation(db, mockResult, { flesh_texture: 'brittle' });
    // Second call — should use cache
    const result = await generateExplanation(db, mockResult, { flesh_texture: 'brittle' });
    expect(result).not.toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});
