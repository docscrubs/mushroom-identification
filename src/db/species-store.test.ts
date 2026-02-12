import 'fake-indexeddb/auto';
import { MushroomDB } from './database';
import { loadSpeciesData, getAllSpecies, getSpeciesByName, getDeadlySpecies } from './species-store';
import { speciesDataset } from '@/data/species-dataset';

describe('species-store', () => {
  let db: MushroomDB;

  beforeEach(async () => {
    // Use a unique name per test to avoid cross-test contamination
    db = new MushroomDB(`test-species-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('loadSpeciesData', () => {
    it('bulk-loads all 268 species', async () => {
      await loadSpeciesData(db, speciesDataset);
      const count = await db.species.count();
      expect(count).toBe(268);
    });

    it('clears existing data before loading', async () => {
      // Load twice — should still have 268
      await loadSpeciesData(db, speciesDataset);
      await loadSpeciesData(db, speciesDataset);
      const count = await db.species.count();
      expect(count).toBe(268);
    });
  });

  describe('getAllSpecies', () => {
    it('retrieves all loaded species', async () => {
      await loadSpeciesData(db, speciesDataset);
      const all = await getAllSpecies(db);
      expect(all).toHaveLength(268);
    });
  });

  describe('getSpeciesByName', () => {
    it('retrieves a species by scientific name', async () => {
      await loadSpeciesData(db, speciesDataset);
      const species = await getSpeciesByName(db, 'Lactarius torminosus');
      expect(species).toBeDefined();
      expect(species!.name).toBe('Woolly Milkcap');
    });

    it('returns undefined for unknown species', async () => {
      await loadSpeciesData(db, speciesDataset);
      const species = await getSpeciesByName(db, 'Nonexistent imaginary');
      expect(species).toBeUndefined();
    });
  });

  describe('getDeadlySpecies', () => {
    it('returns only species with deadly danger level', async () => {
      await loadSpeciesData(db, speciesDataset);
      const deadly = await getDeadlySpecies(db);
      expect(deadly.length).toBeGreaterThan(0);
      for (const species of deadly) {
        expect(species.edibility_detail.danger_level).toBe('deadly');
      }
    });

    it('includes Amanita phalloides', async () => {
      await loadSpeciesData(db, speciesDataset);
      const deadly = await getDeadlySpecies(db);
      const deathCap = deadly.find((s) => s.scientific_name === 'Amanita phalloides');
      expect(deathCap).toBeDefined();
    });
  });

  describe('coexistence with existing tables', () => {
    it('species table coexists with genusProfiles and heuristics', async () => {
      await loadSpeciesData(db, speciesDataset);
      // Existing tables should be accessible
      const genusCount = await db.genusProfiles.count();
      expect(genusCount).toBe(0); // Empty but accessible
      const heuristicsCount = await db.heuristics.count();
      expect(heuristicsCount).toBe(0); // Empty but accessible
      // Species loaded
      const speciesCount = await db.species.count();
      expect(speciesCount).toBe(268);
    });
  });
});
