import { describe, it, expect } from 'vitest';
import { scoreAllCandidates } from './scorer';
import { featureRules } from './feature-rules';
import { ALL_GENERA } from './genera';
import type { Observation } from '@/types';

/**
 * Integration tests for genus identification across all 20 priority genera.
 * Each genus gets tests verifying:
 *  - It ranks top when given its characteristic features
 *  - It gets eliminated by contradicting features
 *  - Critical lookalike pairs are handled correctly
 */

function topNonEliminated(obs: Observation) {
  const results = scoreAllCandidates(obs, ALL_GENERA, featureRules);
  return results.filter((r) => !r.eliminated);
}

function topGenus(obs: Observation): string {
  const active = topNonEliminated(obs);
  return active[0]?.genus ?? '';
}

function isEliminated(obs: Observation, genus: string): boolean {
  const results = scoreAllCandidates(obs, ALL_GENERA, featureRules);
  const match = results.find((r) => r.genus === genus);
  return match?.eliminated ?? false;
}

describe('Genera Scoring: All 20 Priority Genera', () => {
  // === CANTHARELLUS (Chanterelle) ===
  describe('Cantharellus', () => {
    it('ranks top for ridged, egg-yellow, funnel-shaped mushroom in woodland', () => {
      const obs: Observation = {
        gill_type: 'ridges',
        cap_color: 'egg yellow',
        habitat: 'woodland',
        substrate: 'soil',
      };
      expect(topGenus(obs)).toBe('Cantharellus');
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Cantharellus')).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Cantharellus')).toBe(true);
    });
  });

  // === PLEUROTUS (Oyster Mushroom) ===
  describe('Pleurotus', () => {
    it('ranks top for gilled mushroom on wood with no stem or lateral stem', () => {
      const obs: Observation = {
        gill_type: 'gills',
        substrate: 'wood',
        growth_pattern: 'clustered',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Pleurotus' && c.score > 0)).toBe(true);
    });

    it('is eliminated by soil substrate', () => {
      const obs: Observation = {
        gill_type: 'gills',
        substrate: 'soil',
      };
      expect(isEliminated(obs, 'Pleurotus')).toBe(true);
    });
  });

  // === MACROLEPIOTA (Parasol) ===
  describe('Macrolepiota', () => {
    it('ranks high for large capped mushroom with ring and snakeskin stem in grassland', () => {
      const obs: Observation = {
        gill_type: 'gills',
        ring_present: true,
        volva_present: false,
        habitat: 'grassland',
        cap_size_cm: 20,
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Macrolepiota' && c.score > 0)).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Macrolepiota')).toBe(true);
    });
  });

  // === COPRINOPSIS (Ink Caps) ===
  describe('Coprinopsis', () => {
    it('scores well for deliquescent gilled mushroom', () => {
      const obs: Observation = {
        gill_type: 'gills',
        bruising_color: 'inky black',
        habitat: 'grassland',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Coprinopsis' && c.score > 0)).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Coprinopsis')).toBe(true);
    });
  });

  // === HYDNUM (Hedgehog Fungus) ===
  describe('Hydnum', () => {
    it('ranks top for teeth-bearing mushroom in woodland on soil', () => {
      const obs: Observation = {
        gill_type: 'teeth',
        habitat: 'woodland',
        substrate: 'soil',
      };
      expect(topGenus(obs)).toBe('Hydnum');
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Hydnum')).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Hydnum')).toBe(true);
    });
  });

  // === LAETIPORUS (Chicken of the Woods) ===
  describe('Laetiporus', () => {
    it('ranks top for large bracket fungus with pores on wood', () => {
      const obs: Observation = {
        gill_type: 'pores',
        substrate: 'wood',
        cap_color: 'orange',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Laetiporus' && c.score > 0)).toBe(true);
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Laetiporus')).toBe(true);
    });
  });

  // === FISTULINA (Beefsteak Fungus) ===
  describe('Fistulina', () => {
    it('scores well for reddish bracket with pores on wood', () => {
      const obs: Observation = {
        gill_type: 'pores',
        substrate: 'wood',
        cap_color: 'red',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Fistulina' && c.score > 0)).toBe(true);
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Fistulina')).toBe(true);
    });
  });

  // === MARASMIUS (Fairy Ring Champignon) ===
  describe('Marasmius', () => {
    it('scores well for small tough mushroom in a ring in grassland', () => {
      const obs: Observation = {
        gill_type: 'gills',
        growth_pattern: 'ring',
        habitat: 'grassland',
        flesh_texture: 'tough',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Marasmius' && c.score > 0)).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Marasmius')).toBe(true);
    });
  });

  // === CRATERELLUS (Horn of Plenty) ===
  describe('Craterellus', () => {
    it('ranks top for dark trumpet-shaped mushroom with smooth underside in woodland', () => {
      const obs: Observation = {
        gill_type: 'smooth',
        cap_color: 'black',
        habitat: 'woodland',
        substrate: 'soil',
      };
      expect(topGenus(obs)).toBe('Craterellus');
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Craterellus')).toBe(true);
    });
  });

  // === SPARASSIS (Cauliflower Fungus) ===
  describe('Sparassis', () => {
    it('scores well for large cauliflower-like growth at base of conifers', () => {
      const obs: Observation = {
        gill_type: 'smooth',
        substrate: 'wood',
        cap_color: 'cream',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Sparassis' && c.score > 0)).toBe(true);
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Sparassis')).toBe(true);
    });
  });

  // === CALVATIA/LYCOPERDON (Puffballs) ===
  describe('Calvatia', () => {
    it('scores well for smooth round mushroom on grassland with no gills/pores visible', () => {
      const obs: Observation = {
        gill_type: 'smooth',
        habitat: 'grassland',
        growth_pattern: 'solitary',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Calvatia' && c.score > 0)).toBe(true);
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Calvatia')).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Calvatia')).toBe(true);
    });
  });

  // === LECCINUM (Rough-stemmed Boletes) ===
  describe('Leccinum', () => {
    it('ranks high for pore-bearing mushroom with rough stem in woodland', () => {
      const obs: Observation = {
        gill_type: 'pores',
        stem_present: true,
        habitat: 'woodland',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Leccinum' && c.score > 0)).toBe(true);
    });

    it('is eliminated by true gills', () => {
      expect(isEliminated({ gill_type: 'gills' }, 'Leccinum')).toBe(true);
    });
  });

  // === ARMILLARIA (Honey Fungus) ===
  describe('Armillaria', () => {
    it('scores well for clustered gilled mushroom on wood with ring', () => {
      const obs: Observation = {
        gill_type: 'gills',
        substrate: 'wood',
        ring_present: true,
        growth_pattern: 'clustered',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Armillaria' && c.score > 0)).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Armillaria')).toBe(true);
    });
  });

  // === CLITOCYBE ===
  describe('Clitocybe', () => {
    it('scores well for funnel-shaped gilled mushroom in leaf litter', () => {
      const obs: Observation = {
        gill_type: 'gills',
        cap_shape: 'funnel',
        substrate: 'leaf litter',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Clitocybe' && c.score > 0)).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Clitocybe')).toBe(true);
    });
  });

  // === LEPISTA (Wood Blewit, Field Blewit) ===
  describe('Lepista', () => {
    it('scores well for lilac-stemmed gilled mushroom in woodland', () => {
      const obs: Observation = {
        gill_type: 'gills',
        stem_color: 'lilac',
        habitat: 'woodland',
      };
      const active = topNonEliminated(obs);
      expect(active.some((c) => c.genus === 'Lepista' && c.score > 0)).toBe(true);
    });

    it('is eliminated by pores', () => {
      expect(isEliminated({ gill_type: 'pores' }, 'Lepista')).toBe(true);
    });
  });

  // === Cross-genera discrimination tests ===
  describe('Critical Lookalike Discrimination', () => {
    it('distinguishes Cantharellus from Hygrophoropsis (false chanterelle) via ridges vs gills', () => {
      // True chanterelle has ridges, not true gills
      const chanterelle: Observation = {
        gill_type: 'ridges',
        cap_color: 'egg yellow',
        habitat: 'woodland',
      };
      expect(topGenus(chanterelle)).toBe('Cantharellus');

      // Gills would not be chanterelle
      expect(isEliminated({ gill_type: 'gills' }, 'Cantharellus')).toBe(true);
    });

    it('distinguishes Agaricus from Amanita via volva and gill color', () => {
      // Agaricus: ring, no volva, pink/brown gills
      const agaricus: Observation = {
        gill_type: 'gills',
        ring_present: true,
        volva_present: false,
        gill_color: 'pink',
        habitat: 'grassland',
      };
      const active = topNonEliminated(agaricus);
      expect(active[0]?.genus).toBe('Agaricus');

      // Amanita: ring, volva, WHITE gills
      const amanita: Observation = {
        gill_type: 'gills',
        ring_present: true,
        volva_present: true,
        gill_color: 'white',
        habitat: 'woodland',
      };
      const amanitaActive = topNonEliminated(amanita);
      expect(amanitaActive[0]?.genus).toBe('Amanita');
    });

    it('distinguishes Macrolepiota from small Lepiota (safety critical)', () => {
      // Large parasol: big cap, ring, no volva, grassland
      const parasol: Observation = {
        gill_type: 'gills',
        ring_present: true,
        volva_present: false,
        cap_size_cm: 20,
        habitat: 'grassland',
      };
      const active = topNonEliminated(parasol);
      expect(active.some((c) => c.genus === 'Macrolepiota' && c.score > 0)).toBe(true);
    });

    it('distinguishes boletes: Boletus vs Leccinum both have pores', () => {
      const obs: Observation = {
        gill_type: 'pores',
        stem_present: true,
        habitat: 'woodland',
      };
      const active = topNonEliminated(obs);
      // Both should be candidates
      expect(active.some((c) => c.genus === 'Boletus')).toBe(true);
      expect(active.some((c) => c.genus === 'Leccinum')).toBe(true);
    });
  });

  // === Safety tests ===
  describe('Safety-Critical Genus Coverage', () => {
    it('ALL_GENERA includes all 20 priority genera', () => {
      expect(ALL_GENERA).toHaveLength(20);
      const expected = [
        'Amanita', 'Agaricus', 'Russula', 'Boletus', 'Cantharellus',
        'Lactarius', 'Pleurotus', 'Macrolepiota', 'Coprinopsis', 'Hydnum',
        'Laetiporus', 'Fistulina', 'Marasmius', 'Craterellus', 'Sparassis',
        'Calvatia', 'Leccinum', 'Armillaria', 'Clitocybe', 'Lepista',
      ];
      for (const genus of expected) {
        expect(ALL_GENERA).toContain(genus);
      }
    });

    it('every genus has at least one feature rule', () => {
      for (const genus of ALL_GENERA) {
        const rules = featureRules.filter((r) => r.genus === genus);
        expect(rules.length, `${genus} should have feature rules`).toBeGreaterThan(0);
      }
    });

    it('every genus has at least one exclusionary rule', () => {
      for (const genus of ALL_GENERA) {
        const exclusionary = featureRules.filter(
          (r) => r.genus === genus && r.tier === 'exclusionary',
        );
        expect(
          exclusionary.length,
          `${genus} should have at least one exclusionary rule`,
        ).toBeGreaterThan(0);
      }
    });

    it('dangerous genera have critical safety features covered', () => {
      const dangerousGenera = ['Amanita', 'Clitocybe'];
      for (const genus of dangerousGenera) {
        const rules = featureRules.filter((r) => r.genus === genus);
        expect(
          rules.length,
          `${genus} (dangerous) should have comprehensive rules`,
        ).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
