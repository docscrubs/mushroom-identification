import type { MushroomDB } from './database';

const EXPORT_VERSION = 1;

export interface ExportData {
  exportVersion: number;
  exportedAt: string;
  userModels: unknown[];
  identificationSessions: unknown[];
  userContributions: unknown[];
}

/**
 * Export user data (not core KB, not LLM cache) as a JSON string.
 * This is the user's personal data: their model, sessions, and contributions.
 */
export async function exportUserData(db: MushroomDB): Promise<string> {
  const [userModels, identificationSessions, userContributions] =
    await Promise.all([
      db.userModels.toArray(),
      db.identificationSessions.toArray(),
      db.userContributions.toArray(),
    ]);

  const data: ExportData = {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    userModels,
    identificationSessions,
    userContributions,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Create a downloadable Blob from exported JSON string.
 */
export function createExportBlob(json: string): Blob {
  return new Blob([json], { type: 'application/json' });
}

/**
 * Import user data from a previously exported JSON string.
 * Overwrites existing user data (clears then inserts).
 */
export async function importUserData(
  db: MushroomDB,
  json: string,
): Promise<void> {
  const data: ExportData = JSON.parse(json);

  await db.transaction(
    'rw',
    [db.userModels, db.identificationSessions, db.userContributions],
    async () => {
      await db.userModels.clear();
      await db.identificationSessions.clear();
      await db.userContributions.clear();

      if (data.userModels.length > 0) {
        await db.userModels.bulkAdd(data.userModels as never[]);
      }
      if (data.identificationSessions.length > 0) {
        await db.identificationSessions.bulkAdd(
          data.identificationSessions as never[],
        );
      }
      if (data.userContributions.length > 0) {
        await db.userContributions.bulkAdd(
          data.userContributions as never[],
        );
      }
    },
  );
}
