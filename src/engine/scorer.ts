import type { Observation, ConfidenceLevel, EvidenceTier } from '@/types';
import { type FeatureRule, matchesRule } from './feature-rules';

/** Weight assigned to each evidence tier */
const TIER_WEIGHTS: Record<EvidenceTier, number> = {
  definitive: 0.80,
  strong: 0.35,
  moderate: 0.12,
  weak: 0.04,
  exclusionary: 0, // handled separately — eliminates outright
};

/** Diminishing returns factor for multiple moderate/weak evidence */
const DIMINISHING_FACTOR = 0.6;

export interface MatchedEvidence {
  rule_id: string;
  field: string;
  tier: EvidenceTier;
  supporting: boolean;
  description: string;
}

export interface CandidateScore {
  genus: string;
  score: number; // 0 to 1
  eliminated: boolean;
  elimination_reason?: string;
  matching: MatchedEvidence[];
  contradicting: MatchedEvidence[];
  missing: MatchedEvidence[];
}

/**
 * Score a single candidate genus against an observation.
 * Uses hierarchical, non-additive evidence model:
 *  1. Exclusionary features eliminate immediately
 *  2. Definitive features establish strong baseline
 *  3. Strong features refine
 *  4. Moderate features adjust with diminishing returns
 *  5. Weak features break ties
 */
export function scoreCandidate(
  observation: Observation,
  genus: string,
  rules: FeatureRule[],
): CandidateScore {
  const genusRules = rules.filter((r) => r.genus === genus);

  const matching: MatchedEvidence[] = [];
  const contradicting: MatchedEvidence[] = [];
  const missing: MatchedEvidence[] = [];

  for (const rule of genusRules) {
    const fieldValue = observation[rule.field];
    const observed = fieldValue !== null && fieldValue !== undefined;

    if (!observed && rule.match.type !== 'absent') {
      missing.push(toEvidence(rule));
      continue;
    }

    const matches = matchesRule(observation, rule);

    if (matches && rule.supporting) {
      matching.push(toEvidence(rule));
    } else if (matches && !rule.supporting) {
      contradicting.push(toEvidence(rule));
    }
    // If the rule doesn't match and is a supporting rule for an observed field,
    // it's mild contradicting evidence (the field was observed but didn't match).
    // Exception: description_notes is a free-text field where many independent
    // observations coexist. A non-matching description rule just means that
    // specific trait wasn't mentioned — NOT that it contradicts.
    else if (!matches && rule.supporting && observed && rule.match.type !== 'absent'
      && rule.field !== 'description_notes') {
      contradicting.push(toEvidence(rule));
    }
  }

  // Step 1: Check for exclusionary evidence
  const exclusion = contradicting.find((e) => e.tier === 'exclusionary');
  if (exclusion) {
    return {
      genus,
      score: 0,
      eliminated: true,
      elimination_reason: exclusion.description,
      matching,
      contradicting,
      missing,
    };
  }

  // Step 2: No evidence at all = 0 score
  if (matching.length === 0) {
    return { genus, score: 0, eliminated: false, matching, contradicting, missing };
  }

  // Step 3: Compute hierarchical score
  let score = 0;

  // Definitive features
  const definitiveMatches = matching.filter((e) => e.tier === 'definitive');
  if (definitiveMatches.length > 0) {
    score = TIER_WEIGHTS.definitive;
  }

  // Strong features — each adds, but with slight diminishing returns
  const strongMatches = matching.filter((e) => e.tier === 'strong');
  let strongAccum = 0;
  for (let i = 0; i < strongMatches.length; i++) {
    strongAccum += TIER_WEIGHTS.strong * Math.pow(DIMINISHING_FACTOR, i);
  }
  score += strongAccum;

  // Moderate features — more diminishing returns
  const moderateMatches = matching.filter((e) => e.tier === 'moderate');
  let moderateAccum = 0;
  for (let i = 0; i < moderateMatches.length; i++) {
    moderateAccum += TIER_WEIGHTS.moderate * Math.pow(DIMINISHING_FACTOR, i);
  }
  score += moderateAccum;

  // Weak features
  const weakMatches = matching.filter((e) => e.tier === 'weak');
  let weakAccum = 0;
  for (let i = 0; i < weakMatches.length; i++) {
    weakAccum += TIER_WEIGHTS.weak * Math.pow(DIMINISHING_FACTOR, i);
  }
  score += weakAccum;

  // Contradicting (non-exclusionary) evidence reduces score
  const contradictions = contradicting.filter((e) => e.tier !== 'exclusionary');
  for (const c of contradictions) {
    score -= TIER_WEIGHTS[c.tier] * 0.5;
  }

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, score));

  return { genus, score, eliminated: false, matching, contradicting, missing };
}

/**
 * Score all candidate genera against an observation.
 * Returns sorted by score descending (eliminated candidates at the end).
 */
export function scoreAllCandidates(
  observation: Observation,
  genera: string[],
  rules: FeatureRule[],
): CandidateScore[] {
  const scores = genera.map((genus) => scoreCandidate(observation, genus, rules));

  return scores.sort((a, b) => {
    // Eliminated candidates go to the end
    if (a.eliminated && !b.eliminated) return 1;
    if (!a.eliminated && b.eliminated) return -1;
    return b.score - a.score;
  });
}

/**
 * Map a numeric score to a named confidence level.
 */
export function scoreToConfidence(score: number): ConfidenceLevel {
  if (score >= 0.9) return 'definitive';
  if (score >= 0.65) return 'high';
  if (score >= 0.4) return 'moderate';
  if (score >= 0.15) return 'low';
  return 'insufficient';
}

function toEvidence(rule: FeatureRule): MatchedEvidence {
  return {
    rule_id: rule.id,
    field: rule.field,
    tier: rule.tier,
    supporting: rule.supporting,
    description: rule.description,
  };
}
