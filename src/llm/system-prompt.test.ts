import { buildSystemPrompt, buildPromptSpeciesData } from './system-prompt';
import { speciesDataset } from '@/data/species-dataset';
import { estimateTokens } from '@/data/species-pruning';

describe('buildSystemPrompt', () => {
  let prompt: string;

  beforeAll(() => {
    prompt = buildSystemPrompt(speciesDataset);
  });

  it('returns a non-empty string', () => {
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('contains the role definition', () => {
    expect(prompt).toContain('mushroom identification guide');
    expect(prompt).toContain('conversational identification assistant');
  });

  it('embeds species data (known species names appear)', () => {
    expect(prompt).toContain('Lactarius torminosus');
    expect(prompt).toContain('Amanita phalloides');
    expect(prompt).toContain('Horse Mushroom');
  });

  it('includes species count', () => {
    expect(prompt).toContain('268');
  });

  describe('safety species', () => {
    it('mentions Amanita phalloides (Death Cap)', () => {
      expect(prompt).toContain('Amanita phalloides');
      expect(prompt).toContain('Death Cap');
    });

    it('mentions Amanita virosa (Destroying Angel)', () => {
      expect(prompt).toContain('Amanita virosa');
      expect(prompt).toContain('Destroying Angel');
    });

    it('mentions Cortinarius rubellus (Deadly Webcap)', () => {
      expect(prompt).toContain('Cortinarius rubellus');
    });

    it('mentions Galerina marginata (Funeral Bell)', () => {
      expect(prompt).toContain('Galerina marginata');
      expect(prompt).toContain('Funeral Bell');
    });

    it('mentions Clitocybe rivulosa (Fool\'s Funnel)', () => {
      expect(prompt).toContain('Clitocybe rivulosa');
    });

    it('mentions small Lepiota danger', () => {
      expect(prompt).toMatch(/lepiota/i);
      expect(prompt).toContain('amatoxins');
    });
  });

  describe('mandatory physical tests', () => {
    it('includes puffball slice test', () => {
      expect(prompt).toMatch(/puffball/i);
      expect(prompt).toMatch(/slice/i);
    });

    it('includes volva check', () => {
      expect(prompt).toMatch(/volva/i);
    });

    it('includes taste test for Russula', () => {
      expect(prompt).toMatch(/taste test/i);
      expect(prompt).toMatch(/russula/i);
    });

    it('includes spore print instructions', () => {
      expect(prompt).toMatch(/spore print/i);
    });

    it('includes milk colour test for Lactarius', () => {
      expect(prompt).toMatch(/milk colour/i);
    });

    it('includes alcohol warning for Coprinopsis', () => {
      expect(prompt).toMatch(/alcohol/i);
      expect(prompt).toMatch(/coprinopsis/i);
    });
  });

  describe('contradiction detection', () => {
    it('distinguishes missing features from contradicting features', () => {
      expect(prompt).toMatch(/missing/i);
      expect(prompt).toMatch(/contradict/i);
    });

    it('instructs to eliminate candidates with contradicting features', () => {
      expect(prompt).toMatch(/eliminate|heavily depriori/i);
    });

    it('explicitly states contradictions are stronger than partial matches', () => {
      expect(prompt).toContain('Six matching features plus one contradiction is WEAKER');
    });

    it('instructs to flag contradictions explicitly in response', () => {
      expect(prompt).toMatch(/flag contradictions explicitly/i);
    });
  });

  describe('response format', () => {
    it('includes What you\'re thinking section', () => {
      expect(prompt).toContain("What you're thinking");
    });

    it('includes Diagnostic reasoning section', () => {
      expect(prompt).toContain('Diagnostic reasoning');
    });

    it('instructs to show ruled-out species with reasons', () => {
      expect(prompt).toMatch(/ruled out/i);
    });

    it('instructs to show matching, missing, and contradicting features per candidate', () => {
      expect(prompt).toMatch(/match.*missing.*contradict/i);
    });

    it('includes Key candidates section', () => {
      expect(prompt).toContain('Key candidates');
    });

    it('includes What would help section', () => {
      expect(prompt).toContain('What would help');
    });

    it('includes Safety notes section', () => {
      expect(prompt).toContain('Safety notes');
    });
  });

  it('total token estimate is under 145K', () => {
    const tokens = estimateTokens(prompt);
    expect(tokens).toBeLessThan(145_000);
    // Should be substantial — at least 30K for prompt + species data
    expect(tokens).toBeGreaterThan(30_000);
  });
});

describe('buildPromptSpeciesData', () => {
  it('returns a JSON string', () => {
    const json = buildPromptSpeciesData(speciesDataset);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('contains 268 entries', () => {
    const json = buildPromptSpeciesData(speciesDataset);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(268);
  });
});
