import { describe, it, expect, beforeEach } from 'vitest';
import { MushroomDB } from '@/db/database';
import { seedReviewCards } from './seed-cards';
import type { GenusProfile } from '@/types';

const testGenus: GenusProfile = {
  genus: 'Russula',
  common_names: ['Brittlegills'],
  confidence_markers: {
    high: ['Brittle flesh that snaps cleanly'],
    moderate: ['White to cream spore print'],
  },
  ecological_context: {
    habitat: ['deciduous woodland'],
    substrate: 'soil near trees',
    associations: ['oak', 'birch'],
    season: { UK: ['July', 'August', 'September', 'October'] },
  },
  uk_occurrence: 'very common',
  lookalike_genera: [
    { genus: 'Lactarius', distinction: 'Lactarius exudes milk', danger_level: 'low' },
  ],
  key_species_uk: {
    edible: [{ species: 'cyanoxantha', common_name: 'Charcoal Burner', notes: 'Choice edible' }],
    toxic_or_inedible: [{ species: 'emetica', common_name: 'The Sickener', notes: 'Causes vomiting' }],
  },
  foraging_heuristics: [
    { heuristic_id: 'russula_taste_test', description: 'Taste test for edibility' },
  ],
  notes: 'Good beginner genus',
  identification_narrative: 'Russula have brittle flesh.',
};

describe('seedReviewCards', () => {
  let db: MushroomDB;

  beforeEach(async () => {
    db = new MushroomDB(`test-seed-${Date.now()}-${Math.random()}`);
  });

  it('generates cards from genus profiles in the database', async () => {
    await db.genusProfiles.add(testGenus);

    const count = await seedReviewCards(db);
    expect(count).toBeGreaterThan(0);

    const cards = await db.reviewCards.toArray();
    expect(cards.length).toBeGreaterThan(0);
  });

  it('creates genus recognition cards', async () => {
    await db.genusProfiles.add(testGenus);
    await seedReviewCards(db);

    const genusCards = await db.reviewCards
      .where('card_type')
      .equals('genus_recognition')
      .toArray();
    expect(genusCards.length).toBeGreaterThanOrEqual(1);
  });

  it('creates safety cards for genera with toxic species', async () => {
    await db.genusProfiles.add(testGenus);
    await seedReviewCards(db);

    const safetyCards = await db.reviewCards
      .where('card_type')
      .equals('safety_recognition')
      .toArray();
    expect(safetyCards.length).toBeGreaterThanOrEqual(1);
  });

  it('does not duplicate cards on re-run', async () => {
    await db.genusProfiles.add(testGenus);

    await seedReviewCards(db);
    const firstCount = await db.reviewCards.count();

    await seedReviewCards(db);
    const secondCount = await db.reviewCards.count();

    expect(secondCount).toBe(firstCount);
  });

  it('adds new cards for new genera without affecting existing ones', async () => {
    await db.genusProfiles.add(testGenus);
    await seedReviewCards(db);
    const firstCount = await db.reviewCards.count();

    // Add a second genus
    await db.genusProfiles.add({
      ...testGenus,
      genus: 'Boletus',
      common_names: ['Boletes'],
      key_species_uk: {
        edible: [{ species: 'edulis', common_name: 'Penny Bun', notes: 'Choice edible' }],
        toxic_or_inedible: [],
      },
      lookalike_genera: [],
      foraging_heuristics: [],
    });

    await seedReviewCards(db);
    const secondCount = await db.reviewCards.count();

    expect(secondCount).toBeGreaterThan(firstCount);
  });
});
