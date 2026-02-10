import { describe, it, expect } from 'vitest';
import { assembleResult } from './result-assembler';
import { featureRules } from './feature-rules';
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

  it('provides suggested next actions', () => {
    const obs: Observation = { gill_type: 'gills' };
    const result = assembleResult(obs, allGenera, featureRules);

    expect(result.suggested_actions.length).toBeGreaterThan(0);
    // Actions should reference specific features to check
    expect(result.suggested_actions[0]!.action.length).toBeGreaterThan(0);
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
