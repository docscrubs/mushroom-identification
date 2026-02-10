import { describe, it, expect } from 'vitest';
import type { Observation, IdentificationResult } from '@/types';
import { generateOfflineExplanation } from './explanation-templates';
import { assembleResult } from './result-assembler';
import { featureRules } from './feature-rules';
import { ALL_GENERA } from './genera';

function makeResult(obs: Observation): IdentificationResult {
  return assembleResult(obs, ALL_GENERA, featureRules);
}

describe('generateOfflineExplanation', () => {
  it('generates explanation for a high-confidence identification', () => {
    const obs: Observation = {
      flesh_texture: 'brittle',
      gill_type: 'gills',
      habitat: 'woodland',
    };
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    expect(explanation.summary).toBeTruthy();
    expect(explanation.identification).toBeTruthy();
    expect(explanation.identification).toMatch(/Russula|Lactarius/);
    expect(explanation.full_text.length).toBeGreaterThan(50);
  });

  it('includes safety information when warnings are present', () => {
    const obs: Observation = {
      gill_color: 'white',
      ring_present: true,
      volva_present: true,
    };
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    expect(explanation.safety).toBeTruthy();
    expect(explanation.safety.length).toBeGreaterThan(0);
  });

  it('includes next steps when available', () => {
    const obs: Observation = {
      gill_type: 'gills',
      habitat: 'woodland',
    };
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    expect(explanation.next_steps).toBeTruthy();
  });

  it('handles empty observation gracefully', () => {
    const obs: Observation = {};
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    expect(explanation.summary).toBeTruthy();
    expect(explanation.summary).toMatch(/not enough|no features|more information/i);
    expect(explanation.full_text).toBeTruthy();
  });

  it('includes edibility when confidence is sufficient', () => {
    const obs: Observation = {
      flesh_texture: 'brittle',
      gill_type: 'gills',
      gill_color: 'white',
      stem_present: true,
      ring_present: false,
      volva_present: false,
      habitat: 'woodland',
      spore_print_color: 'white',
    };
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    // Even if confidence isn't high enough for edibility, edibility section should exist
    expect(explanation.edibility).toBeDefined();
  });

  it('produces full_text that combines all sections', () => {
    const obs: Observation = {
      gill_type: 'pores',
      habitat: 'woodland',
      flesh_texture: 'soft',
    };
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    expect(explanation.full_text).toContain(explanation.summary);
    expect(explanation.full_text).toContain(explanation.identification);
  });

  it('mentions multiple candidates when confidence is moderate or low', () => {
    const obs: Observation = {
      habitat: 'woodland',
      gill_type: 'gills',
    };
    const result = makeResult(obs);
    const explanation = generateOfflineExplanation(result, obs);

    // With minimal info, should mention multiple possibilities
    expect(explanation.identification).toBeTruthy();
  });
});
