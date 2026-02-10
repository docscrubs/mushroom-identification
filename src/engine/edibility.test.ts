import { describe, it, expect } from 'vitest';
import { getGenusEdibility } from './edibility';
import { ALL_GENERA } from './genera';

describe('Genus Edibility Data', () => {
  it('has edibility data for all 20 genera', () => {
    for (const genus of ALL_GENERA) {
      const info = getGenusEdibility(genus);
      expect(info, `${genus} should have edibility info`).toBeDefined();
      expect(info!.genus).toBe(genus);
    }
  });

  it('marks Amanita as deadly', () => {
    const info = getGenusEdibility('Amanita')!;
    expect(info.default_safety).toBe('deadly');
    expect(info.foraging_advice).toContain('NEVER');
  });

  it('marks Clitocybe as dangerous', () => {
    const info = getGenusEdibility('Clitocybe')!;
    expect(info.default_safety).toBe('deadly');
  });

  it('marks Russula as edible with caution', () => {
    const info = getGenusEdibility('Russula')!;
    expect(['edible', 'edible_with_caution']).toContain(info.default_safety);
    expect(info.requires_cooking).toBe(false);
  });

  it('marks Hydnum as safe beginner edible', () => {
    const info = getGenusEdibility('Hydnum')!;
    expect(info.default_safety).toBe('edible');
    expect(info.beginner_safe).toBe(true);
  });

  it('marks Cantharellus as safe beginner edible', () => {
    const info = getGenusEdibility('Cantharellus')!;
    expect(info.default_safety).toBe('edible');
    expect(info.beginner_safe).toBe(true);
  });

  it('marks Coprinopsis with alcohol warning', () => {
    const info = getGenusEdibility('Coprinopsis')!;
    expect(info.warnings.some((w) => w.toLowerCase().includes('alcohol'))).toBe(true);
  });

  it('marks Armillaria as requiring cooking', () => {
    const info = getGenusEdibility('Armillaria')!;
    expect(info.requires_cooking).toBe(true);
  });

  it('returns undefined for unknown genus', () => {
    expect(getGenusEdibility('Nonexistent')).toBeUndefined();
  });
});
