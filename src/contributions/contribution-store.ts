import type { MushroomDB } from '@/db/database';
import type { UserContribution, ContributionType, ContributionStatus } from '@/types/user';

/** Add a user contribution to the database */
export async function addContribution(
  db: MushroomDB,
  contribution: UserContribution,
): Promise<string> {
  await db.userContributions.put(contribution);
  return contribution.id;
}

/** Get all user contributions */
export async function getContributions(db: MushroomDB): Promise<UserContribution[]> {
  return db.userContributions.toArray();
}

/** Get contributions filtered by type */
export async function getContributionsByType(
  db: MushroomDB,
  type: ContributionType,
): Promise<UserContribution[]> {
  return db.userContributions.where('type').equals(type).toArray();
}

/** Get contributions for a specific heuristic */
export async function getContributionsForHeuristic(
  db: MushroomDB,
  heuristicId: string,
): Promise<UserContribution[]> {
  return db.userContributions.where('heuristic_id').equals(heuristicId).toArray();
}

/** Update the status of a contribution */
export async function updateContributionStatus(
  db: MushroomDB,
  id: string,
  status: ContributionStatus,
): Promise<void> {
  await db.userContributions.update(id, { status });
}

/** Delete a contribution by id */
export async function deleteContribution(db: MushroomDB, id: string): Promise<void> {
  await db.userContributions.delete(id);
}
