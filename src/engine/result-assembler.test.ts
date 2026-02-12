import { describe, it, expect } from 'vitest';
import { assembleResult } from './result-assembler';
import { featureRules } from './feature-rules';
import { ALL_GENERA } from './genera';
import type { Observation } from '@/types';

const allGenera = ['Russula', 'Lactarius', 'Boletus', 'Amanita', 'Agaricus'];

describe('Result Assembler', () => {
  it('returns candidates sorted by score', () => {
    const obs: Observation = { flesh_texture: 'brittle', gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);

    expect(result.candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i]!.score).toBeLessThanOrEqual(
        result.candidates[i - 1]!.score,
      );
    }
  });

  it('includes a reasoning chain', () => {
    const obs: Observation = { flesh_texture: 'brittle', gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);

    expect(result.reasoning_chain.length).toBeGreaterThan(0);
    expect(result.reasoning_chain[0]).toContain('Observed');
  });

  it('attaches safety warnings when dangerous genera are candidates', () => {
    const obs: Observation = {
      gill_type: 'gills',
      gill_color: 'white',
      ring_present: true,
      volva_present: true,
    };
    const result = assembleResult(obs, allGenera, featureRules);

    // Amanita should be a candidate and safety should have warnings
    expect(result.safety.warnings.length).toBeGreaterThan(0);
    expect(
      result.safety.warnings.some((w) => w.severity === 'critical'),
    ).toBe(true);
  });

  it('reports dangerous lookalikes', () => {
    const obs: Observation = {
      gill_type: 'gills',
      ring_present: true,
      habitat: 'grassland',
    };
    const result = assembleResult(obs, allGenera, featureRules);

    // When Agaricus is a candidate, Amanita should be flagged as a lookalike
    if (result.candidates.some((c) => c.genus === 'Agaricus' && c.score > 0)) {
      expect(result.safety.dangerous_lookalikes.length).toBeGreaterThan(0);
    }
  });

  it('does NOT gate identification on safety', () => {
    // Even dangerous species should get a full identification
    const obs: Observation = {
      gill_type: 'gills',
      gill_color: 'white',
      ring_present: true,
      volva_present: true,
      habitat: 'woodland',
    };
    const result = assembleResult(obs, allGenera, featureRules);

    // Should have candidates even though one is deadly
    expect(result.candidates.length).toBeGreaterThan(0);
    // Should still assemble a result
    expect(result.reasoning_chain.length).toBeGreaterThan(0);
  });

  it('provides interactive follow-up questions', () => {
    const obs: Observation = { gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);

    expect(result.follow_up_questions.length).toBeGreaterThan(0);
    const first = result.follow_up_questions[0]!;
    // Should have question text, feature name, and impact note
    expect(first.question.length).toBeGreaterThan(0);
    expect(first.feature.length).toBeGreaterThan(0);
    expect(first.impact_note.length).toBeGreaterThan(0);
  });

  it('marks previously-available form fields in follow-up questions', () => {
    // User only provides gill_type — many form fields left empty
    const obs: Observation = { gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);

    const formFieldQuestions = result.follow_up_questions.filter((q) => q.previously_available);
    const newTestQuestions = result.follow_up_questions.filter((q) => !q.previously_available);
    // Should have both categories
    expect(formFieldQuestions.length).toBeGreaterThan(0);
    // Active tests (spore print, bruising) should NOT be marked previously_available
    const sporePrintQ = result.follow_up_questions.find((q) => q.feature === 'spore_print_color');
    if (sporePrintQ) {
      expect(sporePrintQ.previously_available).toBe(false);
    }
    const bruisingQ = result.follow_up_questions.find((q) => q.feature === 'bruising_color');
    if (bruisingQ) {
      expect(bruisingQ.previously_available).toBe(false);
    }
  });

  it('gates edibility on confidence', () => {
    // Low-confidence result should not provide edibility advice
    const obs: Observation = { gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);

    if (result.edibility) {
      expect(result.edibility.available).toBe(false);
      expect(result.edibility.reason_unavailable).toBeTruthy();
    }
  });

  it('sets confidence_sufficient_for_foraging appropriately', () => {
    // With minimal observation, shouldn't be confident enough
    const obs: Observation = { gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);
    expect(result.safety.confidence_sufficient_for_foraging).toBe(false);
  });

  it('handles empty observation gracefully', () => {
    const obs: Observation = {};
    const result = assembleResult(obs, allGenera, featureRules);

    expect(result.candidates.length).toBe(allGenera.length);
    expect(result.reasoning_chain.length).toBeGreaterThan(0);
    expect(result.safety).toBeDefined();
    expect(result.suggested_actions.length).toBeGreaterThan(0);
  });
});

describe('Description negation & genus exclusion integration', () => {
  const baseDescription =
    'central depression in cap that is darker than the rest of the cap; there are rings of colour on the cap; gills are widely spaced and almost the same colour as the cap; stipe is fibrous and almost striped';

  const descriptionWithNegation =
    baseDescription + '; cap is not rolled at the edges so unlikely a Clitocybe';

  it('base description scores Russula higher than without description', () => {
    const withDesc: Observation = { description_notes: baseDescription, gill_type: 'gills' };
    const withoutDesc: Observation = { gill_type: 'gills' };

    const resultWith = assembleResult(withDesc, ALL_GENERA, featureRules);
    const resultWithout = assembleResult(withoutDesc, ALL_GENERA, featureRules);

    const russulWith = resultWith.candidates.find((c) => c.genus === 'Russula');
    const russulWithout = resultWithout.candidates.find((c) => c.genus === 'Russula');
    expect(russulWith!.score).toBeGreaterThan(russulWithout!.score);
  });

  it('base description scores Lactarius higher than without description', () => {
    const withDesc: Observation = { description_notes: baseDescription, gill_type: 'gills' };
    const withoutDesc: Observation = { gill_type: 'gills' };

    const resultWith = assembleResult(withDesc, ALL_GENERA, featureRules);
    const resultWithout = assembleResult(withoutDesc, ALL_GENERA, featureRules);

    const lacWith = resultWith.candidates.find((c) => c.genus === 'Lactarius');
    const lacWithout = resultWithout.candidates.find((c) => c.genus === 'Lactarius');
    expect(lacWith!.score).toBeGreaterThan(lacWithout!.score);
  });

  it('negation text penalises Clitocybe compared to base description', () => {
    const baseObs: Observation = { description_notes: baseDescription, gill_type: 'gills' };
    const negObs: Observation = { description_notes: descriptionWithNegation, gill_type: 'gills' };

    const baseResult = assembleResult(baseObs, ALL_GENERA, featureRules);
    const negResult = assembleResult(negObs, ALL_GENERA, featureRules);

    const clitBase = baseResult.candidates.find((c) => c.genus === 'Clitocybe');
    const clitNeg = negResult.candidates.find((c) => c.genus === 'Clitocybe');
    expect(clitNeg!.score).toBeLessThan(clitBase!.score);
  });

  it('with negation, Russula or Lactarius ranks above Clitocybe', () => {
    const obs: Observation = {
      description_notes: descriptionWithNegation,
      gill_type: 'gills',
    };
    const result = assembleResult(obs, ALL_GENERA, featureRules);

    const russulScore = result.candidates.find((c) => c.genus === 'Russula')!.score;
    const lactarScore = result.candidates.find((c) => c.genus === 'Lactarius')!.score;
    const clitScore = result.candidates.find((c) => c.genus === 'Clitocybe')!.score;

    // At least one of Russula/Lactarius should be above Clitocybe
    expect(Math.max(russulScore, lactarScore)).toBeGreaterThan(clitScore);
  });

  it('"does not deliquesce" penalises Coprinopsis', () => {
    const obs: Observation = {
      description_notes: 'gills do not deliquesce into liquid',
      gill_type: 'gills',
    };
    const baseObs: Observation = {
      description_notes: 'gills deliquesce into liquid',
      gill_type: 'gills',
    };

    const negResult = assembleResult(obs, ALL_GENERA, featureRules);
    const baseResult = assembleResult(baseObs, ALL_GENERA, featureRules);

    const copNeg = negResult.candidates.find((c) => c.genus === 'Coprinopsis')!.score;
    const copBase = baseResult.candidates.find((c) => c.genus === 'Coprinopsis')!.score;
    expect(copNeg).toBeLessThan(copBase);
  });

  it('"probably not a Russula" penalises Russula', () => {
    const obs: Observation = {
      description_notes: 'tough flesh, probably not a Russula',
      gill_type: 'gills',
    };

    const result = assembleResult(obs, ALL_GENERA, featureRules);
    const russula = result.candidates.find((c) => c.genus === 'Russula');
    // User exclusion should have penalised Russula — verify contradicting evidence exists
    expect(russula!.contradicting_evidence.length).toBeGreaterThan(0);
  });
});
