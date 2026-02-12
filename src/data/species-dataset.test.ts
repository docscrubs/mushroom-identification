import { speciesDataset } from './species-dataset';
import type { EdibilityDetail } from '@/types/species';

const VALID_EDIBILITY_STATUSES: EdibilityDetail['status'][] = [
  'edible',
  'edible_with_caution',
  'inedible',
  'toxic',
  'deadly',
];

const CRITICAL_DEADLY_SPECIES = [
  'Amanita phalloides', // Death Cap
  'Amanita virosa', // Destroying Angel
  'Cortinarius rubellus', // Deadly Webcap
  'Galerina marginata', // Funeral Bell
  'Clitocybe rivulosa', // Fool's Funnel
];

describe('species dataset', () => {
  it('loads as a valid array of DatasetSpecies', () => {
    expect(Array.isArray(speciesDataset)).toBe(true);
    expect(speciesDataset.length).toBeGreaterThan(0);
    // Verify it's properly typed — check the first entry has expected fields
    const first = speciesDataset[0]!;
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('scientific_name');
    expect(first).toHaveProperty('edibility');
    expect(first).toHaveProperty('edibility_detail');
    expect(first).toHaveProperty('season_start_month');
    expect(first).toHaveProperty('season_end_month');
  });

  it('contains exactly 268 entries', () => {
    expect(speciesDataset).toHaveLength(268);
  });

  it('every entry has non-empty name and scientific_name', () => {
    for (const entry of speciesDataset) {
      expect(entry.name).toBeTruthy();
      expect(entry.scientific_name).toBeTruthy();
    }
  });

  it('every entry has non-empty edibility string', () => {
    for (const entry of speciesDataset) {
      expect(entry.edibility).toBeTruthy();
    }
  });

  it('every entry has edibility_detail with valid status', () => {
    for (const entry of speciesDataset) {
      expect(entry.edibility_detail).toBeDefined();
      expect(VALID_EDIBILITY_STATUSES).toContain(entry.edibility_detail.status);
    }
  });

  it('every entry has numeric season months (1-12)', () => {
    for (const entry of speciesDataset) {
      expect(entry.season_start_month).toBeGreaterThanOrEqual(1);
      expect(entry.season_start_month).toBeLessThanOrEqual(12);
      expect(entry.season_end_month).toBeGreaterThanOrEqual(1);
      expect(entry.season_end_month).toBeLessThanOrEqual(12);
    }
  });

  it('contains all 6 critical deadly species', () => {
    const scientificNames = new Set(speciesDataset.map((s) => s.scientific_name));

    for (const species of CRITICAL_DEADLY_SPECIES) {
      expect(scientificNames.has(species)).toBe(true);
    }

    // At least one small Lepiota
    const hasSmallLepiota = speciesDataset.some(
      (s) =>
        s.scientific_name.startsWith('Lepiota') &&
        s.edibility_detail.danger_level === 'deadly',
    );
    expect(hasSmallLepiota).toBe(true);
  });

  it('Woolly Milkcap entry exists with correct data', () => {
    const woollyMilkcap = speciesDataset.find(
      (s) => s.scientific_name === 'Lactarius torminosus',
    );
    expect(woollyMilkcap).toBeDefined();
    expect(woollyMilkcap!.name).toBe('Woolly Milkcap');
    expect(woollyMilkcap!.edibility).toBe('Poisonous');
    expect(woollyMilkcap!.season_start_month).toBeGreaterThanOrEqual(1);
    expect(woollyMilkcap!.season_end_month).toBeLessThanOrEqual(12);
    // Habitat mentions birch
    expect(woollyMilkcap!.habitat).toMatch(/birch/i);
  });

  it('has no duplicate scientific names', () => {
    const names = speciesDataset.map((s) => s.scientific_name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('edibility_detail has all required fields', () => {
    for (const entry of speciesDataset) {
      const detail = entry.edibility_detail;
      expect(detail).toHaveProperty('status');
      expect(detail).toHaveProperty('danger_level');
      expect(typeof detail.requires_cooking).toBe('boolean');
      expect(typeof detail.beginner_safe).toBe('boolean');
      // notes is string | null
      expect(detail.notes === null || typeof detail.notes === 'string').toBe(true);
    }
  });
});
