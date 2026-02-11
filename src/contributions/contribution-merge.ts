import type { UserContribution } from '@/types/user';
import type { GenusProfile } from '@/types/genus';

/**
 * Get personal notes matching a genus.
 * Matches contributions whose heuristic_id starts with the genus name (case-insensitive).
 */
export function getNotesForGenus(
  contributions: UserContribution[],
  genus: string,
): UserContribution[] {
  const lowerGenus = genus.toLowerCase();
  return contributions.filter(
    (c) =>
      c.type === 'personal_note' &&
      c.heuristic_id?.toLowerCase().startsWith(lowerGenus),
  );
}

/** Get all regional override contributions */
export function getRegionalOverrides(contributions: UserContribution[]): UserContribution[] {
  return contributions.filter((c) => c.type === 'regional_override');
}

/** Get all exception report contributions */
export function getExceptionReports(contributions: UserContribution[]): UserContribution[] {
  return contributions.filter((c) => c.type === 'exception_report');
}

interface SeasonOverridePayload {
  field: string;
  genus: string;
  value: string[];
}

/**
 * Merge season overrides from user contributions onto a genus profile.
 * Returns a new profile with the override applied (does not mutate the original).
 * Silently ignores malformed overrides.
 */
export function mergeSeasonOverride(
  profile: GenusProfile,
  contributions: UserContribution[],
): GenusProfile {
  const overrides = contributions.filter((c) => c.type === 'regional_override');

  for (const override of overrides) {
    let payload: SeasonOverridePayload;
    try {
      payload = JSON.parse(override.content);
    } catch {
      continue;
    }

    if (
      payload.field === 'season.UK' &&
      payload.genus === profile.genus &&
      Array.isArray(payload.value)
    ) {
      return {
        ...profile,
        ecological_context: {
          ...profile.ecological_context,
          season: {
            ...profile.ecological_context.season,
            UK: payload.value,
          },
        },
      };
    }
  }

  return profile;
}
