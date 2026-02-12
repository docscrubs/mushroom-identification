import type { Observation } from '@/types';
import {
  parseNegations,
  parseGenusExclusions,
  preprocessDescriptionNotes,
} from './description-preprocessing';
import { featureRules, matchesRule } from './feature-rules';
import { scoreCandidate } from './scorer';

describe('parseNegations', () => {
  it('extracts "not rolled" as a negation', () => {
    const result = parseNegations('cap is not rolled at the edges');
    expect(result).toContainEqual(
      expect.objectContaining({ negatedTerm: 'rolled' }),
    );
  });

  it('extracts "no ring" as a negation', () => {
    const result = parseNegations('there is no ring on the stem');
    expect(result).toContainEqual(
      expect.objectContaining({ negatedTerm: 'ring' }),
    );
  });

  it('extracts "never sticky" as a negation', () => {
    const result = parseNegations('the cap is never sticky');
    expect(result).toContainEqual(
      expect.objectContaining({ negatedTerm: 'sticky' }),
    );
  });

  it('extracts "without a volva" as a negation', () => {
    const result = parseNegations('stem without a volva');
    expect(result).toContainEqual(
      expect.objectContaining({ negatedTerm: 'volva' }),
    );
  });

  it('extracts "doesn\'t bruise" as a negation', () => {
    const result = parseNegations("it doesn't bruise blue");
    expect(result).toContainEqual(
      expect.objectContaining({ negatedTerm: 'bruise' }),
    );
  });

  it('extracts "does not deliquesce" as a negation', () => {
    const result = parseNegations('does not deliquesce');
    expect(result).toContainEqual(
      expect.objectContaining({ negatedTerm: 'deliquesce' }),
    );
  });

  it('returns empty array when no negations are present', () => {
    const result = parseNegations('cap is bright red with white warts');
    expect(result).toEqual([]);
  });

  it('handles multiple negations in one description', () => {
    const result = parseNegations('not rolled, no ring, never sticky');
    expect(result.length).toBe(3);
  });
});

describe('parseGenusExclusions', () => {
  it('extracts "unlikely a Clitocybe" as genus exclusion', () => {
    const result = parseGenusExclusions('cap is not rolled at the edges so unlikely a Clitocybe');
    expect(result).toContain('Clitocybe');
  });

  it('extracts "not a Russula" as genus exclusion', () => {
    const result = parseGenusExclusions('probably not a Russula');
    expect(result).toContain('Russula');
  });

  it('extracts "unlikely Amanita" as genus exclusion', () => {
    const result = parseGenusExclusions('unlikely Amanita');
    expect(result).toContain('Amanita');
  });

  it('extracts "rules out Boletus" as genus exclusion', () => {
    const result = parseGenusExclusions('the gills rules out Boletus');
    expect(result).toContain('Boletus');
  });

  it('extracts "can\'t be Agaricus" as genus exclusion', () => {
    const result = parseGenusExclusions("can't be Agaricus");
    expect(result).toContain('Agaricus');
  });

  it('is case-insensitive for genus names', () => {
    const result = parseGenusExclusions('unlikely a clitocybe');
    expect(result).toContain('Clitocybe');
  });

  it('returns empty array when no exclusions are present', () => {
    const result = parseGenusExclusions('cap is depressed with rings of colour');
    expect(result).toEqual([]);
  });

  it('handles multiple exclusions', () => {
    const result = parseGenusExclusions('not a Clitocybe or Amanita; unlikely Boletus');
    expect(result).toContain('Clitocybe');
    expect(result).toContain('Boletus');
  });
});

describe('preprocessDescriptionNotes', () => {
  it('generates contra-evidence rules for negated terms that match existing positive rules', () => {
    // "not rolled" should generate contra-evidence for genera that have
    // "rolled" or "inrolled" as supporting evidence in description_notes rules
    const obs: Observation = {
      description_notes: 'cap is not rolled at the edges so unlikely a Clitocybe',
    };
    const result = preprocessDescriptionNotes(obs, featureRules);

    // Should have genus exclusions for Clitocybe
    expect(result.genusExclusions).toContain('Clitocybe');
  });

  it('returns negated terms that can be used by the scorer', () => {
    const obs: Observation = {
      description_notes: 'does not deliquesce, no milk when cut',
    };
    const result = preprocessDescriptionNotes(obs, featureRules);

    // Should have negations for terms that match existing rules
    expect(result.negations.length).toBeGreaterThan(0);
  });

  it('handles empty description_notes', () => {
    const obs: Observation = {};
    const result = preprocessDescriptionNotes(obs, featureRules);
    expect(result.negations).toEqual([]);
    expect(result.genusExclusions).toEqual([]);
  });

  it('returns contra-rules that penalise genera with matching positive description_notes rules', () => {
    const obs: Observation = {
      description_notes: 'does not deliquesce into liquid',
    };
    const result = preprocessDescriptionNotes(obs, featureRules);

    // "deliquesce" appears in notes-coprinopsis-deliquesce as supporting evidence
    // Negating it should produce a contra-rule against Coprinopsis
    expect(result.contraRules.length).toBeGreaterThan(0);
    expect(result.contraRules.some(r => r.genus === 'Coprinopsis' && !r.supporting)).toBe(true);
  });
});

describe('Synonym rules', () => {
  it('"widely spaced" matches Russula', () => {
    const obs: Observation = { description_notes: 'gills are widely spaced' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Russula' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"widely spaced" matches Marasmius', () => {
    const obs: Observation = { description_notes: 'gills are widely spaced' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Marasmius' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"central depression" matches Russula', () => {
    const obs: Observation = { description_notes: 'central depression in cap' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Russula' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"central depression" matches Lactarius', () => {
    const obs: Observation = { description_notes: 'central depression in cap' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Lactarius' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"fibrous stem" matches Macrolepiota', () => {
    const obs: Observation = { description_notes: 'stipe is fibrous' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Macrolepiota' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"rings of colour" also matches Russula', () => {
    const obs: Observation = { description_notes: 'rings of colour on the cap' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Russula' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"peppery" matches Russula taste rule', () => {
    const obs: Observation = { description_notes: 'taste is peppery' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Russula' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"acrid taste" matches Russula', () => {
    const obs: Observation = { description_notes: 'acrid taste when tested' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Russula' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('"mild taste" matches Russula', () => {
    const obs: Observation = { description_notes: 'mild taste, pleasant' };
    const notesRules = featureRules.filter(
      (r) => r.genus === 'Russula' && r.field === 'description_notes',
    );
    const matches = notesRules.filter((r) => matchesRule(obs, r));
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('User scenario: original description', () => {
  const userText =
    'central depression in cap that is darker than the rest of the cap; there are rings of colour on the cap; gills are widely spaced and almost the same colour as the cap; stipe is fibrous and almost striped';

  it('matches multiple Russula description rules', () => {
    const obs: Observation = { description_notes: userText };
    const matches = featureRules.filter(
      (r) =>
        r.genus === 'Russula' &&
        r.field === 'description_notes' &&
        matchesRule(obs, r),
    );
    // Should match: depressed/dipped, distant/widely spaced, rings of colour, central depression
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('matches multiple Lactarius description rules', () => {
    const obs: Observation = { description_notes: userText };
    const matches = featureRules.filter(
      (r) =>
        r.genus === 'Lactarius' &&
        r.field === 'description_notes' &&
        matchesRule(obs, r),
    );
    // Should match: depressed, rings of colour, central depression
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('User scenario: with negation', () => {
  const userTextWithNegation =
    'central depression in cap that is darker than the rest of the cap; there are rings of colour on the cap; gills are widely spaced and almost the same colour as the cap; stipe is fibrous and almost striped; cap is not rolled at the edges so unlikely a Clitocybe';

  it('preprocessor detects Clitocybe exclusion', () => {
    const obs: Observation = { description_notes: userTextWithNegation };
    const result = preprocessDescriptionNotes(obs, featureRules);
    expect(result.genusExclusions).toContain('Clitocybe');
  });

  it('preprocessor detects negation of "rolled"', () => {
    const obs: Observation = { description_notes: userTextWithNegation };
    const result = preprocessDescriptionNotes(obs, featureRules);
    expect(result.negations).toContainEqual(
      expect.objectContaining({ negatedTerm: 'rolled' }),
    );
  });
});
