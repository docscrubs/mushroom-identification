import { describe, it, expect } from 'vitest';
import type { Observation } from '@/types';
import { inferFeatures, type InferredFeature } from './feature-inference';

function findInference(inferences: InferredFeature[], field: string) {
  return inferences.find((i) => i.field === field);
}

describe('inferFeatures', () => {
  it('returns the original observation unchanged when all fields are populated', () => {
    const obs: Observation = {
      habitat: 'woodland',
      substrate: 'soil',
      growth_pattern: 'solitary',
      season_month: 9,
    };
    const result = inferFeatures(obs, new Date(2025, 8, 15));
    expect(result.observation).toEqual(obs);
    expect(result.inferences).toHaveLength(0);
  });

  it('does not mutate the input observation', () => {
    const obs: Observation = { habitat: 'parkland' };
    const original = { ...obs };
    inferFeatures(obs, new Date(2025, 8, 15));
    expect(obs).toEqual(original);
  });

  describe('habitat → substrate inference', () => {
    it('infers soil substrate from parkland habitat', () => {
      const obs: Observation = { habitat: 'parkland' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.substrate).toBe('soil');
      expect(findInference(result.inferences, 'substrate')).toBeDefined();
      expect(findInference(result.inferences, 'substrate')!.confidence).toBe('medium');
    });

    it('infers soil substrate from grassland habitat', () => {
      const obs: Observation = { habitat: 'grassland' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.substrate).toBe('soil');
    });

    it('does NOT override an explicitly set substrate', () => {
      const obs: Observation = { habitat: 'parkland', substrate: 'wood' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.substrate).toBe('wood');
      expect(findInference(result.inferences, 'substrate')).toBeUndefined();
    });
  });

  describe('growth_pattern → substrate inference', () => {
    it('infers wood substrate from tiered growth pattern', () => {
      const obs: Observation = { growth_pattern: 'tiered' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.substrate).toBe('wood');
      expect(findInference(result.inferences, 'substrate')!.confidence).toBe('high');
    });

    it('does NOT override an explicitly set substrate', () => {
      const obs: Observation = { growth_pattern: 'tiered', substrate: 'soil' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.substrate).toBe('soil');
    });
  });

  describe('substrate → habitat inference', () => {
    it('infers grassland habitat from dung substrate', () => {
      const obs: Observation = { substrate: 'dung' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.habitat).toBe('grassland');
      expect(findInference(result.inferences, 'habitat')!.confidence).toBe('medium');
    });

    it('does NOT override an explicitly set habitat', () => {
      const obs: Observation = { substrate: 'dung', habitat: 'parkland' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.habitat).toBe('parkland');
    });
  });

  describe('season_month auto-population', () => {
    it('auto-populates season_month from current date when not provided', () => {
      const obs: Observation = { habitat: 'woodland' };
      const result = inferFeatures(obs, new Date(2025, 9, 5)); // October
      expect(result.observation.season_month).toBe(10);
      expect(findInference(result.inferences, 'season_month')!.confidence).toBe('high');
    });

    it('does NOT override an explicitly set season_month', () => {
      const obs: Observation = { season_month: 7 };
      const result = inferFeatures(obs, new Date(2025, 9, 5)); // October
      expect(result.observation.season_month).toBe(7);
    });

    it('does NOT infer season_month on empty observations', () => {
      const obs: Observation = {};
      const result = inferFeatures(obs, new Date(2025, 9, 5));
      // With no other observations, season alone isn't useful
      expect(result.observation.season_month).toBeUndefined();
    });
  });

  describe('stem_present inference', () => {
    it('infers no stem from wood substrate + tiered growth', () => {
      const obs: Observation = { substrate: 'wood', growth_pattern: 'tiered' };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.stem_present).toBe(false);
      expect(findInference(result.inferences, 'stem_present')!.confidence).toBe('medium');
    });

    it('does NOT override explicitly set stem_present', () => {
      const obs: Observation = { substrate: 'wood', growth_pattern: 'tiered', stem_present: true };
      const result = inferFeatures(obs, new Date(2025, 8, 15));
      expect(result.observation.stem_present).toBe(true);
    });
  });

  it('applies multiple inferences at once', () => {
    const obs: Observation = { growth_pattern: 'tiered' };
    const result = inferFeatures(obs, new Date(2025, 8, 15));
    // Should infer: substrate: 'wood', stem_present: false, season_month: 9
    expect(result.observation.substrate).toBe('wood');
    expect(result.observation.stem_present).toBe(false);
    expect(result.observation.season_month).toBe(9);
    expect(result.inferences.length).toBeGreaterThanOrEqual(3);
  });
});
