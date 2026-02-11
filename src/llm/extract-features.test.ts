import { vi } from 'vitest';
import { MushroomDB } from '@/db/database';
import { extractFeatures, fileToDataUrl } from './extract-features';
import { saveApiKey, saveSettings } from './api-key';
import type { LLMResponse } from '@/types';

function makeLLMResponse(content: string): LLMResponse {
  return {
    id: 'resp-test',
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  };
}

const VALID_EXTRACTION = JSON.stringify({
  extracted_observations: { cap_color: 'brown', gill_type: 'gills', habitat: 'woodland' },
  field_confidence: { cap_color: 'high', gill_type: 'medium', habitat: 'high' },
  direct_identification: {
    species_guess: 'Russula cyanoxantha',
    genus_guess: 'Russula',
    confidence: 'medium',
    reasoning: 'Brittle-looking gills in woodland suggest Russula',
  },
  extraction_notes: ['Photo quality is good'],
});

describe('Feature Extraction Orchestrator', () => {
  let db: MushroomDB;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    db = new MushroomDB(`test-extract-${Date.now()}-${Math.random()}`);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns no_api_key error when no key is configured', async () => {
    const result = await extractFeatures(db, [], null, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('no_api_key');
    }
  });

  it('returns budget_exceeded error when over budget', async () => {
    await saveApiKey(db, 'sk-test');
    await saveSettings(db, { budget_limit_usd: 0.001 });
    // Record usage that exceeds budget
    await db.llmUsage.add({
      timestamp: new Date().toISOString(),
      prompt_tokens: 100000,
      completion_tokens: 50000,
      estimated_cost_usd: 1.0,
      cache_hit: false,
    });

    const result = await extractFeatures(db, [], 'a mushroom', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('budget_exceeded');
    }
  });

  it('calls the LLM and returns parsed extraction result', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeLLMResponse(VALID_EXTRACTION)),
    });

    const result = await extractFeatures(db, [], 'brownish cap in woodland', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.extracted_observations.cap_color).toBe('brown');
      expect(result.result.direct_identification.genus_guess).toBe('Russula');
      expect(result.cached).toBe(false);
    }
  });

  it('returns cached result on second call with same input', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeLLMResponse(VALID_EXTRACTION)),
    });

    // First call — hits API
    await extractFeatures(db, [], 'brownish cap in woodland', {});
    // Second call — should be cached
    const result = await extractFeatures(db, [], 'brownish cap in woodland', {});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.cached).toBe(true);
    }
    // fetch should only be called once
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('records usage after a successful API call', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeLLMResponse(VALID_EXTRACTION)),
    });

    await extractFeatures(db, [], 'a mushroom', {});
    const usageCount = await db.llmUsage.count();
    expect(usageCount).toBe(1);
  });

  it('returns api_error on network failure', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await extractFeatures(db, [], 'a mushroom', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('network_error');
    }
  });

  it('returns parse_error when LLM returns invalid JSON', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(makeLLMResponse('This is not valid JSON at all')),
    });

    const result = await extractFeatures(db, [], 'a mushroom', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('parse_error');
    }
  });

  it('returns api_error on HTTP error', async () => {
    await saveApiKey(db, 'sk-test');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await extractFeatures(db, [], 'a mushroom', {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('api_error');
    }
  });
});

describe('fileToDataUrl', () => {
  it('is exported as a function', () => {
    // fileToDataUrl uses Image + canvas for resize/compression,
    // which requires a real browser — cannot be tested in jsdom.
    expect(typeof fileToDataUrl).toBe('function');
  });
});
