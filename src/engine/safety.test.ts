import { describe, it, expect } from 'vitest';
import { assembleResult } from './result-assembler';
import { featureRules } from './feature-rules';
import { ALL_GENERA } from './genera';
import type { Observation } from '@/types';

describe('Safety System', () => {
  describe('Dangerous genera warnings', () => {
    it('warns critically when Amanita is a candidate', () => {
      const obs: Observation = {
        gill_type: 'gills',
        gill_color: 'white',
        ring_present: true,
        volva_present: true,
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      expect(result.safety.warnings.some((w) => w.severity === 'critical')).toBe(true);
      expect(
        result.safety.warnings.some((w) => w.message.toLowerCase().includes('amanita')),
      ).toBe(true);
    });

    it('warns about Clitocybe when it is a candidate (contains deadly species)', () => {
      const obs: Observation = {
        gill_type: 'gills',
        ring_present: false,
        cap_shape: 'funnel',
        substrate: 'leaf litter',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      const clitocybeCandidate = result.candidates.some(
        (c) => c.genus === 'Clitocybe' && c.score > 0,
      );
      if (clitocybeCandidate) {
        expect(
          result.safety.warnings.some(
            (w) => w.message.toLowerCase().includes('clitocybe'),
          ),
        ).toBe(true);
      }
    });

    it('warns about Coprinopsis alcohol interaction', () => {
      const obs: Observation = {
        gill_type: 'gills',
        bruising_color: 'inky black',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      const coprinopsisCandidate = result.candidates.some(
        (c) => c.genus === 'Coprinopsis' && c.score > 0,
      );
      if (coprinopsisCandidate) {
        expect(
          result.safety.warnings.some(
            (w) => w.message.toLowerCase().includes('alcohol') || w.message.toLowerCase().includes('coprinopsis'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('Dangerous lookalike pairs', () => {
    it('flags Amanita as lookalike when Agaricus is a candidate', () => {
      const obs: Observation = {
        gill_type: 'gills',
        ring_present: true,
        habitat: 'grassland',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      const hasAgaricus = result.candidates.some((c) => c.genus === 'Agaricus' && c.score > 0);
      if (hasAgaricus) {
        expect(result.safety.dangerous_lookalikes.some((l) => l.genus === 'Amanita')).toBe(
          true,
        );
      }
    });

    it('flags Clitocybe as lookalike when Lepista is a candidate', () => {
      const obs: Observation = {
        gill_type: 'gills',
        ring_present: false,
        stem_color: 'lilac',
        habitat: 'woodland',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      const hasLepista = result.candidates.some((c) => c.genus === 'Lepista' && c.score > 0);
      if (hasLepista) {
        expect(result.safety.dangerous_lookalikes.some((l) => l.genus === 'Clitocybe')).toBe(
          true,
        );
      }
    });

    it('flags false chanterelle when Cantharellus is a candidate', () => {
      const obs: Observation = {
        gill_type: 'ridges',
        cap_color: 'yellow',
        habitat: 'woodland',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      // Should warn about Hygrophoropsis (false chanterelle)
      expect(
        result.safety.dangerous_lookalikes.some(
          (l) => l.genus === 'Hygrophoropsis' || l.species.toLowerCase().includes('false chanterelle'),
        ),
      ).toBe(true);
    });

    it('flags Amanita lookalike when Macrolepiota is a candidate', () => {
      const obs: Observation = {
        gill_type: 'gills',
        ring_present: true,
        volva_present: false,
        cap_size_cm: 20,
        habitat: 'grassland',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      const hasMacrolepiota = result.candidates.some(
        (c) => c.genus === 'Macrolepiota' && c.score > 0,
      );
      if (hasMacrolepiota) {
        expect(
          result.safety.dangerous_lookalikes.some(
            (l) => l.genus === 'Amanita' || l.species.toLowerCase().includes('lepiota'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('Confidence gating', () => {
    it('never gates identification on safety — dangerous species get full results', () => {
      const obs: Observation = {
        gill_type: 'gills',
        gill_color: 'white',
        ring_present: true,
        volva_present: true,
        habitat: 'woodland',
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it('sets confidence_sufficient_for_foraging = false when dangerous genus is candidate', () => {
      const obs: Observation = {
        gill_type: 'gills',
        gill_color: 'white',
        ring_present: true,
        volva_present: true,
      };
      const result = assembleResult(obs, ALL_GENERA, featureRules);
      expect(result.safety.confidence_sufficient_for_foraging).toBe(false);
    });
  });
});
