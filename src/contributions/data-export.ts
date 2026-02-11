import type { MushroomDB } from '@/db/database';
import type { CompetencyRecord, UserContribution } from '@/types/user';
import type { ReviewCard, ReviewSession } from '@/types/learning';
import type { IdentificationSession } from '@/types';

/** Schema for exported user data */
export interface ExportedData {
  version: number;
  exported_at: string;
  competencies: CompetencyRecord[];
  reviewCards: ReviewCard[];
  reviewSessions: ReviewSession[];
  contributions: UserContribution[];
  sessions: IdentificationSession[];
}

export interface ImportSummary {
  competencies_imported: number;
  review_cards_imported: number;
  review_sessions_imported: number;
  contributions_imported: number;
  sessions_imported: number;
}

/**
 * Export all user data (excluding core KB and LLM cache).
 * Returns a serialisable object suitable for JSON download.
 */
export async function exportUserData(db: MushroomDB): Promise<ExportedData> {
  const [competencies, reviewCards, reviewSessions, contributions, sessions] = await Promise.all([
    db.competencies.toArray(),
    db.reviewCards.toArray(),
    db.reviewSessions.toArray(),
    db.userContributions.toArray(),
    db.identificationSessions.toArray(),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    competencies,
    reviewCards,
    reviewSessions,
    contributions,
    sessions,
  };
}

/**
 * Import user data from an exported blob.
 * Uses put semantics — existing records with the same key are overwritten.
 */
export async function importUserData(
  db: MushroomDB,
  data: ExportedData,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    competencies_imported: 0,
    review_cards_imported: 0,
    review_sessions_imported: 0,
    contributions_imported: 0,
    sessions_imported: 0,
  };

  if (data.competencies.length > 0) {
    await db.competencies.bulkPut(data.competencies);
    summary.competencies_imported = data.competencies.length;
  }

  if (data.reviewCards.length > 0) {
    await db.reviewCards.bulkPut(data.reviewCards);
    summary.review_cards_imported = data.reviewCards.length;
  }

  if (data.reviewSessions.length > 0) {
    await db.reviewSessions.bulkPut(data.reviewSessions);
    summary.review_sessions_imported = data.reviewSessions.length;
  }

  if (data.contributions.length > 0) {
    await db.userContributions.bulkPut(data.contributions);
    summary.contributions_imported = data.contributions.length;
  }

  if (data.sessions.length > 0) {
    await db.identificationSessions.bulkPut(data.sessions);
    summary.sessions_imported = data.sessions.length;
  }

  return summary;
}
