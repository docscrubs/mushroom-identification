import { describe, it, expect } from 'vitest';
import { scoreCandidate, scoreAllCandidates, scoreToConfidence } from './scorer';
import { featureRules } from './feature-rules';
import type { Observation } from '@/types';

const allGenera = ['Russula', 'Lactarius', 'Boletus', 'Amanita', 'Agaricus'];

describe('Candidate Scorer', () => {
  describe('scoreCandidate', () => {
    it('returns 0 score with no observation data', () => {
      const obs: Observation = {};
      const result = scoreCandidate(obs, 'Russula', featureRules);
      expect(result.score).toBe(0);
      expect(result.matching.length).toBe(0);
      expect(result.contradicting.length).toBe(0);
    });

    it('gives high score for definitive matching feature', () => {
      const obs: Observation = { flesh_texture: 'brittle' };
      const result = scoreCandidate(obs, 'Russula', featureRules);
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('eliminates candidate when exclusionary feature matches', () => {
      const obs: Observation = { gill_type: 'pores' };
      const russula = scoreCandidate(obs, 'Russula', featureRules);
      expect(russula.eliminated).toBe(true);
      expect(russula.score).toBe(0);
    });

    it('boosts score with multiple strong features', () => {
      const obsOne: Observation = { ring_present: false };
      const obsTwo: Observation = { ring_present: false, volva_present: false };
      const scoreOne = scoreCandidate(obsOne, 'Russula', featureRules).score;
      const scoreTwo = scoreCandidate(obsTwo, 'Russula', featureRules).score;
      expect(scoreTwo).toBeGreaterThan(scoreOne);
    });

    it('moderate features add less than strong features', () => {
      const obsStrong: Observation = { ring_present: false };
      const obsModerate: Observation = { habitat: 'woodland' };
      const strong = scoreCandidate(obsStrong, 'Russula', featureRules).score;
      const moderate = scoreCandidate(obsModerate, 'Russula', featureRules).score;
      expect(strong).toBeGreaterThan(moderate);
    });

    it('tracks matching and contradicting evidence', () => {
      const obs: Observation = {
        flesh_texture: 'brittle',
        gill_type: 'gills',
        ring_present: false,
      };
      const result = scoreCandidate(obs, 'Russula', featureRules);
      expect(result.matching.length).toBeGreaterThan(0);
      expect(result.matching.some((e) => e.tier === 'definitive')).toBe(true);
    });

    it('reports which features are missing (not observed)', () => {
      const obs: Observation = { flesh_texture: 'brittle' };
      const result = scoreCandidate(obs, 'Russula', featureRules);
      // There are rules for ring_present, volva_present, etc. that weren't observed
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('scoreAllCandidates', () => {
    it('scores all genera and returns sorted candidates', () => {
      const obs: Observation = {
        flesh_texture: 'brittle',
        gill_type: 'gills',
        ring_present: false,
        volva_present: false,
      };

      const results = scoreAllCandidates(obs, allGenera, featureRules);
      expect(results.length).toBe(allGenera.length);
      // Should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.score).toBeLessThanOrEqual(results[i - 1]!.score);
      }
    });

    it('ranks Russula/Lactarius top for brittle-fleshed gilled mushroom', () => {
      const obs: Observation = {
        flesh_texture: 'brittle',
        gill_type: 'gills',
        ring_present: false,
        volva_present: false,
      };

      const results = scoreAllCandidates(obs, allGenera, featureRules);
      const topTwo = results.slice(0, 2).map((r) => r.genus);
      expect(topTwo).toContain('Russula');
      expect(topTwo).toContain('Lactarius');
    });

    it('ranks Boletus top for pore-bearing mushroom', () => {
      const obs: Observation = {
        gill_type: 'pores',
        stem_present: true,
        habitat: 'woodland',
      };

      const results = scoreAllCandidates(obs, allGenera, featureRules);
      expect(results[0]!.genus).toBe('Boletus');
      // Gilled genera should be eliminated
      const eliminated = results.filter((r) => r.eliminated);
      expect(eliminated.some((r) => r.genus === 'Russula')).toBe(true);
      expect(eliminated.some((r) => r.genus === 'Amanita')).toBe(true);
    });

    it('ranks Amanita high for white-gilled mushroom with ring and volva', () => {
      const obs: Observation = {
        gill_type: 'gills',
        gill_color: 'white',
        ring_present: true,
        volva_present: true,
        habitat: 'woodland',
      };

      const results = scoreAllCandidates(obs, allGenera, featureRules);
      const nonEliminated = results.filter((r) => !r.eliminated);
      expect(nonEliminated[0]!.genus).toBe('Amanita');
    });

    it('ranks Agaricus high for pink-gilled grassland mushroom with ring', () => {
      const obs: Observation = {
        gill_type: 'gills',
        gill_color: 'pink',
        ring_present: true,
        volva_present: false,
        habitat: 'grassland',
      };

      const results = scoreAllCandidates(obs, allGenera, featureRules);
      const nonEliminated = results.filter((r) => !r.eliminated);
      expect(nonEliminated[0]!.genus).toBe('Agaricus');
    });

    it('eliminates boletes when gills are observed', () => {
      const obs: Observation = { gill_type: 'gills' };
      const results = scoreAllCandidates(obs, allGenera, featureRules);
      const boletus = results.find((r) => r.genus === 'Boletus');
      expect(boletus!.eliminated).toBe(true);
    });

    it('handles empty observation gracefully', () => {
      const obs: Observation = {};
      const results = scoreAllCandidates(obs, allGenera, featureRules);
      expect(results.length).toBe(allGenera.length);
      // All should have score 0, none eliminated
      results.forEach((r) => {
        expect(r.score).toBe(0);
        expect(r.eliminated).toBe(false);
      });
    });
  });

  describe('scoreToConfidence', () => {
    it('maps zero score to insufficient', () => {
      expect(scoreToConfidence(0)).toBe('insufficient');
    });

    it('maps very high score to definitive', () => {
      expect(scoreToConfidence(0.95)).toBe('definitive');
    });

    it('maps mid-range score to moderate', () => {
      const confidence = scoreToConfidence(0.5);
      expect(['moderate', 'low']).toContain(confidence);
    });

    it('returns ordered levels (higher score = higher confidence)', () => {
      const levels = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map(scoreToConfidence);
      const order = ['insufficient', 'low', 'moderate', 'high', 'definitive'];
      let lastIndex = -1;
      for (const level of levels) {
        const idx = order.indexOf(level);
        expect(idx).toBeGreaterThanOrEqual(lastIndex);
        lastIndex = idx;
      }
    });
  });
});
