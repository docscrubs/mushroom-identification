import { speciesDataset } from './species-dataset';
import { pruneForPrompt, estimateTokens, REQUIRED_FIELDS } from './species-pruning';

describe('pruneForPrompt', () => {
  let pruned: string;

  beforeAll(() => {
    pruned = pruneForPrompt(speciesDataset);
  });

  it('returns valid JSON parseable back to an array', () => {
    const parsed = JSON.parse(pruned);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(268);
  });

  it('strips source_url from all entries', () => {
    expect(pruned).not.toContain('source_url');
  });

  it('strips other_facts from all entries', () => {
    expect(pruned).not.toContain('other_facts');
  });

  it('strips synonyms from all entries', () => {
    expect(pruned).not.toContain('"synonyms"');
  });

  it('strips common_names from all entries', () => {
    expect(pruned).not.toContain('"common_names"');
  });

  it('strips frequency from all entries', () => {
    expect(pruned).not.toContain('"frequency"');
  });

  it('preserves all safety-critical fields', () => {
    const parsed = JSON.parse(pruned) as Record<string, unknown>[];
    const safetyFields = ['possible_confusion', 'edibility_detail', 'diagnostic_features', 'safety_checks'];

    for (const field of safetyFields) {
      // At least some entries should have these fields (those with non-null values)
      const hasField = parsed.some((entry) => field in entry);
      expect(hasField).toBe(true);
    }
  });

  it('preserves all morphological fields', () => {
    const parsed = JSON.parse(pruned) as Record<string, unknown>[];
    const morphFields = ['cap', 'under_cap_description', 'stem', 'flesh', 'habitat', 'spore_print', 'taste', 'smell'];

    for (const field of morphFields) {
      const hasField = parsed.some((entry) => field in entry);
      expect(hasField).toBe(true);
    }
  });

  it('preserves name and scientific_name on all entries', () => {
    const parsed = JSON.parse(pruned) as Record<string, unknown>[];
    for (const entry of parsed) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('scientific_name');
    }
  });

  it('does not include null values', () => {
    const parsed = JSON.parse(pruned) as Record<string, unknown>[];
    for (const entry of parsed) {
      for (const value of Object.values(entry)) {
        expect(value).not.toBeNull();
      }
    }
  });

  it('fits within the token budget (< 140K tokens)', () => {
    const tokens = estimateTokens(pruned);
    expect(tokens).toBeLessThan(140_000);
    // Sanity check: should be at least some reasonable size
    expect(tokens).toBeGreaterThan(10_000);
  });

  it('is significantly smaller than the raw JSON', () => {
    const rawSize = JSON.stringify(speciesDataset).length;
    expect(pruned.length).toBeLessThan(rawSize);
  });
});

describe('estimateTokens', () => {
  it('estimates tokens from character count', () => {
    // 35 chars / 3.5 = 10 tokens
    expect(estimateTokens('a'.repeat(35))).toBe(10);
  });

  it('rounds up', () => {
    expect(estimateTokens('a')).toBe(1);
    expect(estimateTokens('ab')).toBe(1);
    expect(estimateTokens('abcd')).toBe(2);
  });
});

describe('REQUIRED_FIELDS', () => {
  it('includes all safety-critical field names', () => {
    expect(REQUIRED_FIELDS).toContain('possible_confusion');
    expect(REQUIRED_FIELDS).toContain('edibility_detail');
    expect(REQUIRED_FIELDS).toContain('diagnostic_features');
    expect(REQUIRED_FIELDS).toContain('safety_checks');
  });

  it('includes all morphological field names', () => {
    expect(REQUIRED_FIELDS).toContain('cap');
    expect(REQUIRED_FIELDS).toContain('under_cap_description');
    expect(REQUIRED_FIELDS).toContain('stem');
    expect(REQUIRED_FIELDS).toContain('flesh');
    expect(REQUIRED_FIELDS).toContain('habitat');
  });
});
