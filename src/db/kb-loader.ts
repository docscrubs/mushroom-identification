import type { MushroomDB } from './database';
import { seedGenera } from '@/data/seed-genera';
import { seedHeuristics } from '@/data/seed-heuristics';
import { speciesDataset } from '@/data/species-dataset';
import { loadSpeciesData } from './species-store';

/**
 * Bump this version whenever seed data changes (e.g., new fields, new species).
 * When the stored version is older, the KB is cleared and re-seeded.
 */
export const KB_VERSION = 4;
const KB_VERSION_KEY = 'mushroom-kb-version';

/**
 * Check whether the knowledge base has been loaded into the database.
 */
export async function isKBLoaded(db: MushroomDB): Promise<boolean> {
  const count = await db.genusProfiles.count();
  return count > 0;
}

function getStoredKBVersion(): number {
  const stored = localStorage.getItem(KB_VERSION_KEY);
  return stored ? Number(stored) : 0;
}

function setStoredKBVersion(version: number): void {
  localStorage.setItem(KB_VERSION_KEY, String(version));
}

/**
 * Load the seed knowledge base (genera + heuristics) into IndexedDB.
 * Idempotent — skips if data is already present and up-to-date.
 * Re-seeds if the KB version has been bumped (e.g., new fields added).
 */
export async function loadKnowledgeBase(db: MushroomDB): Promise<void> {
  const alreadyLoaded = await isKBLoaded(db);
  const storedVersion = getStoredKBVersion();
  const needsUpdate = storedVersion < KB_VERSION;

  if (alreadyLoaded && !needsUpdate) return;

  await db.transaction(
    'rw',
    [db.genusProfiles, db.heuristics],
    async () => {
      if (needsUpdate && alreadyLoaded) {
        await db.genusProfiles.clear();
        await db.heuristics.clear();
      }
      await db.genusProfiles.bulkAdd(seedGenera);
      await db.heuristics.bulkAdd(seedHeuristics);
    },
  );

  // Load species dataset (separate transaction — clear + bulk load)
  await loadSpeciesData(db, speciesDataset);

  setStoredKBVersion(KB_VERSION);
}
