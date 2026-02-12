import type { Heuristic, HeuristicCategory, SuggestedAction, ConfidenceLevel } from '@/types';
import type { CandidateScore } from './scorer';

/**
 * A heuristic that has been matched to active candidates.
 */
export interface TriggeredHeuristic {
  heuristic_id: string;
  name: string;
  genus: string;
  category: HeuristicCategory;
  priority: 'critical' | 'standard' | 'supplementary';
  /** The procedure steps (if structured) or raw text */
  steps: string[];
  /** Safety notes associated with this heuristic */
  safety_notes: string[];
}

/** Map from confidence level names to numeric thresholds for comparison */
const CONFIDENCE_THRESHOLDS: Record<ConfidenceLevel, number> = {
  definitive: 0.9,
  high: 0.65,
  moderate: 0.4,
  low: 0.15,
  insufficient: 0,
};

/**
 * Check if a candidate's score meets a required confidence level.
 */
function meetsConfidence(score: number, required: ConfidenceLevel): boolean {
  return score >= CONFIDENCE_THRESHOLDS[required];
}

/**
 * Find all heuristics applicable to the current set of candidates.
 *
 * A heuristic is applicable when:
 * - Its `applies_to.genus` matches an active (non-eliminated, score > 0) candidate
 * - The candidate's confidence meets the heuristic's `confidence_required`
 */
export function findApplicableHeuristics(
  candidates: CandidateScore[],
  heuristics: Heuristic[],
): TriggeredHeuristic[] {
  const active = candidates.filter((c) => !c.eliminated && c.score > 0);
  if (active.length === 0) return [];

  const results: TriggeredHeuristic[] = [];

  for (const heuristic of heuristics) {
    const targetGenus = heuristic.applies_to.genus;
    if (!targetGenus) continue; // Skip heuristics without a specific genus

    const candidate = active.find((c) => c.genus === targetGenus);
    if (!candidate) continue;

    // Check confidence requirement
    const requiredConfidence = heuristic.applies_to.confidence_required;
    if (!meetsConfidence(candidate.score, requiredConfidence)) continue;

    // Extract procedure steps
    const steps: string[] = [];
    if (typeof heuristic.procedure === 'string') {
      // Split numbered steps from raw text
      steps.push(...heuristic.procedure.split('\n').filter((s) => s.trim()));
    } else if (heuristic.procedure.steps) {
      for (const step of heuristic.procedure.steps) {
        let text = step.instruction;
        if (step.safety_note) {
          text += ` (Safety: ${step.safety_note})`;
        }
        steps.push(text);
      }
    }

    results.push({
      heuristic_id: heuristic.heuristic_id,
      name: heuristic.name,
      genus: targetGenus,
      category: heuristic.category,
      priority: heuristic.priority ?? 'standard',
      steps,
      safety_notes: heuristic.safety_notes ?? [],
    });
  }

  // Sort: critical priority first, then discrimination before edibility
  results.sort((a, b) => {
    const priorityOrder = { critical: 0, standard: 1, supplementary: 2 };
    const pa = priorityOrder[a.priority];
    const pb = priorityOrder[b.priority];
    if (pa !== pb) return pa - pb;

    // Discrimination heuristics before edibility (need to narrow genus first)
    const categoryOrder: Record<string, number> = {
      safety_rule: 0,
      safety_screening: 1,
      discrimination: 2,
      edibility_determination: 3,
      ecological_context: 4,
      gestalt_recognition: 5,
    };
    return (categoryOrder[a.category] ?? 5) - (categoryOrder[b.category] ?? 5);
  });

  return results;
}

/**
 * Convert triggered heuristics into concrete SuggestedActions.
 *
 * Extracts the most important procedure steps from each heuristic
 * and returns them as prioritised actions the user should take next.
 */
export function generateHeuristicActions(
  triggered: TriggeredHeuristic[],
): SuggestedAction[] {
  if (triggered.length === 0) return [];

  const actions: SuggestedAction[] = [];

  for (const heuristic of triggered) {
    const isSafety = heuristic.category === 'safety_rule'
      || heuristic.category === 'safety_screening'
      || heuristic.category === 'discrimination';
    const priority = heuristic.priority === 'critical' ? 'critical' : 'recommended';

    // Add the first (most important) procedure step as a concrete action.
    // For structured procedures, the first step is usually the key test.
    if (heuristic.steps.length > 0) {
      actions.push({
        action: heuristic.steps[0]!,
        reason: `${heuristic.name} — targets ${heuristic.genus}`,
        priority,
        safety_relevant: isSafety,
      });

      // Add second step if it exists and is distinct enough
      if (heuristic.steps.length > 1) {
        actions.push({
          action: heuristic.steps[1]!,
          reason: `${heuristic.name} — targets ${heuristic.genus}`,
          priority: isSafety ? priority : 'recommended',
          safety_relevant: isSafety,
        });
      }
    }
  }

  return actions;
}
