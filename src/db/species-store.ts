import type { MushroomDB } from './database';
import type { DatasetSpecies } from '@/types/species';

/**
 * Bulk-load species data into IndexedDB.
 * Clears existing data first to ensure a clean load.
 */
export async function loadSpeciesData(
  db: MushroomDB,
  species: DatasetSpecies[],
): Promise<void> {
  await db.transaction('rw', db.species, async () => {
    await db.species.clear();
    await db.species.bulkAdd(species);
  });
}

/**
 * Get all species from the database.
 */
export async function getAllSpecies(db: MushroomDB): Promise<DatasetSpecies[]> {
  return db.species.toArray();
}

/**
 * Get a single species by scientific name.
 */
export async function getSpeciesByName(
  db: MushroomDB,
  scientificName: string,
): Promise<DatasetSpecies | undefined> {
  return db.species.get(scientificName);
}

/**
 * Get all species with deadly danger level.
 */
export async function getDeadlySpecies(
  db: MushroomDB,
): Promise<DatasetSpecies[]> {
  return db.species
    .where('edibility_detail.danger_level')
    .equals('deadly')
    .toArray();
}
