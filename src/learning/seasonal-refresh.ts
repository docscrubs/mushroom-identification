import type { GenusProfile } from '@/types/genus';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface SeasonalRefreshPrompt {
  /** Month name this prompt is for */
  month: string;
  /** Genera currently in season */
  genera: string[];
  /** Genera approaching season (in-season next month but not this month) */
  approaching: string[];
  /** Human-readable prompt message */
  message: string;
}

/** Get the current month name (UK season format). Accepts optional date for testing. */
export function getCurrentSeasonMonth(now: Date = new Date()): string {
  return MONTH_NAMES[now.getMonth()]!;
}

/** Filter genus profiles to those in season for a given month */
export function getSeasonalGenera(
  profiles: GenusProfile[],
  month: string,
): GenusProfile[] {
  return profiles.filter((p) => p.ecological_context.season.UK.includes(month));
}

/** Build a seasonal refresh prompt for the given month, or null if nothing is in season */
export function getSeasonalRefreshPrompt(
  profiles: GenusProfile[],
  month: string,
): SeasonalRefreshPrompt | null {
  const inSeason = getSeasonalGenera(profiles, month);
  const genera = inSeason.map((p) => p.genus);

  // Find next month's genera that aren't currently in season
  const monthIndex = MONTH_NAMES.indexOf(month as typeof MONTH_NAMES[number]);
  const nextMonth = MONTH_NAMES[(monthIndex + 1) % 12]!;
  const nextMonthGenera = getSeasonalGenera(profiles, nextMonth);
  const approaching = nextMonthGenera
    .filter((p) => !genera.includes(p.genus))
    .map((p) => p.genus);

  if (genera.length === 0 && approaching.length === 0) return null;

  const parts: string[] = [];
  if (genera.length > 0) {
    parts.push(
      `${month} is a good time to review ${genera.join(', ')} — they're in season now.`,
    );
  }
  if (approaching.length > 0) {
    parts.push(
      `Coming up next month: ${approaching.join(', ')}.`,
    );
  }

  return {
    month,
    genera,
    approaching,
    message: parts.join(' '),
  };
}
