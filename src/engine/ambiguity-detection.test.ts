import { describe, it, expect } from 'vitest';
import type { Observation } from '@/types';
import { detectAmbiguities } from './ambiguity-detection';

describe('detectAmbiguities', () => {
  it('returns empty array for unambiguous observation', () => {
    const obs: Observation = { gill_type: 'pores', substrate: 'soil', habitat: 'grassland' };
    const result = detectAmbiguities(obs, ['Boletus']);
    expect(result).toHaveLength(0);
  });

  it('flags soil in woodland as possible buried wood', () => {
    const obs: Observation = { habitat: 'woodland', substrate: 'soil' };
    const result = detectAmbiguities(obs, ['Armillaria', 'Russula']);
    const flag = result.find((a) => a.id === 'buried_wood');
    expect(flag).toBeDefined();
    expect(flag!.fields).toContain('substrate');
    expect(flag!.question).toMatch(/buried wood/i);
  });

  it('flags soil in parkland as possible buried wood', () => {
    const obs: Observation = { habitat: 'parkland', substrate: 'soil' };
    const result = detectAmbiguities(obs, ['Armillaria']);
    expect(result.find((a) => a.id === 'buried_wood')).toBeDefined();
  });

  it('does NOT flag buried wood when habitat is grassland', () => {
    const obs: Observation = { habitat: 'grassland', substrate: 'soil' };
    const result = detectAmbiguities(obs, ['Agaricus']);
    expect(result.find((a) => a.id === 'buried_wood')).toBeUndefined();
  });

  it('flags grassland with nearby trees as possible mycorrhizal association', () => {
    const obs: Observation = { habitat: 'grassland', nearby_trees: ['oak'] };
    const result = detectAmbiguities(obs, ['Russula', 'Agaricus']);
    const flag = result.find((a) => a.id === 'grassland_trees');
    expect(flag).toBeDefined();
    expect(flag!.question).toMatch(/trees/i);
  });

  it('flags ridges vs gills when chanterelle is a candidate', () => {
    const obs: Observation = { gill_type: 'ridges' };
    const result = detectAmbiguities(obs, ['Cantharellus', 'Hygrophoropsis']);
    const flag = result.find((a) => a.id === 'ridge_vs_gill');
    expect(flag).toBeDefined();
    expect(flag!.question).toMatch(/forked/i);
  });

  it('does NOT flag ridges when chanterelle is not a candidate', () => {
    const obs: Observation = { gill_type: 'ridges' };
    const result = detectAmbiguities(obs, ['Russula']);
    expect(result.find((a) => a.id === 'ridge_vs_gill')).toBeUndefined();
  });

  it('flags white gills when both Amanita and Agaricus are candidates', () => {
    const obs: Observation = { gill_color: 'white' };
    const result = detectAmbiguities(obs, ['Amanita', 'Agaricus']);
    const flag = result.find((a) => a.id === 'white_gill_ambiguity');
    expect(flag).toBeDefined();
    expect(flag!.question).toMatch(/truly white|pale pink/i);
  });

  it('does NOT flag white gills when only one of the pair is a candidate', () => {
    const obs: Observation = { gill_color: 'white' };
    const result = detectAmbiguities(obs, ['Agaricus', 'Russula']);
    expect(result.find((a) => a.id === 'white_gill_ambiguity')).toBeUndefined();
  });

  it('flags missing cap size when Macrolepiota is a candidate', () => {
    const obs: Observation = { ring_present: true };
    const result = detectAmbiguities(obs, ['Macrolepiota', 'Amanita']);
    const flag = result.find((a) => a.id === 'parasol_size');
    expect(flag).toBeDefined();
    expect(flag!.question).toMatch(/cap.*size|diameter/i);
  });

  it('does NOT flag cap size when Macrolepiota is not a candidate', () => {
    const obs: Observation = { ring_present: true };
    const result = detectAmbiguities(obs, ['Amanita']);
    expect(result.find((a) => a.id === 'parasol_size')).toBeUndefined();
  });
});
