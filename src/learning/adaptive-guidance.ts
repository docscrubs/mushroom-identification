import type { CompetencyStatus } from '@/types/user';

/**
 * Guidance levels map competency statuses to explanation detail tiers.
 * - beginner: define terms, step-by-step reasoning, emphasise safety
 * - intermediate: explain reasoning chains, mention related species
 * - advanced: contextual info, seasonal/regional nuances
 * - expert: skip basics, focus on edge cases and subtle distinctions
 */
export type GuidanceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface GenusTip {
  genus: string;
  level: GuidanceLevel;
}

export interface GuidanceContext {
  /** Overall guidance level (driven by the weakest relevant genus) */
  overallLevel: GuidanceLevel;
  /** Per-genus competency tips */
  genusTips: Record<string, GenusTip>;
  /** Ready-to-inject prompt fragment for LLM calls */
  promptHint: string;
}

/** Map a competency status to a guidance level */
export function getGuidanceLevel(status: CompetencyStatus | undefined): GuidanceLevel {
  switch (status) {
    case 'expert':
      return 'expert';
    case 'confident':
      return 'advanced';
    case 'learning':
      return 'intermediate';
    case 'aware':
    case 'aware_not_confident':
    case 'not_started':
    default:
      return 'beginner';
  }
}

const LEVEL_RANK: Record<GuidanceLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  expert: 3,
};

const PROMPT_HINTS: Record<GuidanceLevel, string> = {
  beginner:
    'TARGET AUDIENCE: beginner forager. Define all technical terms (e.g. "adnate", "decurrent"). Walk through reasoning step-by-step. Emphasise safety at every step. Explain what each feature means and why it matters.',
  intermediate:
    'TARGET AUDIENCE: intermediate forager with some field experience. Explain reasoning chains clearly but don\'t define basic terms like "gills" or "cap". Mention related species and common confusions. Include practical field tips.',
  advanced:
    'TARGET AUDIENCE: advanced forager with established knowledge. Include contextual information about seasonal and regional variations. Discuss subtle distinguishing features. Keep explanations concise.',
  expert:
    'TARGET AUDIENCE: expert forager. Skip basic definitions entirely. Focus on edge cases, atypical specimens, and subtle morphological distinctions. Discuss taxonomic nuances where relevant. Be concise and precise.',
};

/**
 * Build a guidance context from competency records and candidate genera.
 * The overall level is driven by the *lowest* competency among relevant genera,
 * so explanations are never pitched above the user's weakest area.
 */
export function buildGuidanceContext(
  competencies: Pick<{ skill_id: string; status: CompetencyStatus }, 'skill_id' | 'status'>[],
  candidateGenera: string[],
): GuidanceContext {
  const genusTips: Record<string, GenusTip> = {};
  let lowestRank = Infinity;

  for (const genus of candidateGenera) {
    const skillId = `genus_recognition.${genus}`;
    const comp = competencies.find((c) => c.skill_id === skillId);
    const level = getGuidanceLevel(comp?.status);
    genusTips[genus] = { genus, level };

    const rank = LEVEL_RANK[level];
    if (rank < lowestRank) lowestRank = rank;
  }

  // Default to beginner if no genera or all unknown
  const overallLevel: GuidanceLevel =
    candidateGenera.length === 0 || lowestRank === Infinity
      ? 'beginner'
      : (Object.entries(LEVEL_RANK).find(([, r]) => r === lowestRank)?.[0] as GuidanceLevel) ??
        'beginner';

  return {
    overallLevel,
    genusTips,
    promptHint: PROMPT_HINTS[overallLevel],
  };
}
