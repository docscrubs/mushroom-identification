import type { MushroomDB } from './database';
import { seedGenera } from '@/data/seed-genera';
import { seedHeuristics } from '@/data/seed-heuristics';

/**
 * Check whether the knowledge base has been loaded into the database.
 */
export async function isKBLoaded(db: MushroomDB): Promise<boolean> {
  const count = await db.genusProfiles.count();
  return count > 0;
}

/**
 * Load the seed knowledge base (genera + heuristics) into IndexedDB.
 * Idempotent — skips if data is already present.
 */
export async function loadKnowledgeBase(db: MushroomDB): Promise<void> {
  const alreadyLoaded = await isKBLoaded(db);
  if (alreadyLoaded) return;

  await db.transaction(
    'rw',
    [db.genusProfiles, db.heuristics],
    async () => {
      await db.genusProfiles.bulkAdd(seedGenera);
      await db.heuristics.bulkAdd(seedHeuristics);
    },
  );
}
