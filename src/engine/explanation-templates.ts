import type { Observation, IdentificationResult } from '@/types';
import { summarizeAllObservations } from './evidence-summary';

export interface OfflineExplanation {
  /** One-line summary of the identification */
  summary: string;
  /** Paragraph about candidates and evidence */
  identification: string;
  /** Safety paragraph (always present) */
  safety: string;
  /** Edibility paragraph */
  edibility: string;
  /** What to check next */
  next_steps: string;
  /** Combined human-readable text */
  full_text: string;
}

/**
 * Generate a human-readable explanation from rule engine output.
 * Used for offline mode when LLM is not available.
 */
export function generateOfflineExplanation(
  result: IdentificationResult,
  observation: Observation,
): OfflineExplanation {
  const observationSummaries = summarizeAllObservations(observation);
  const activeCandidates = result.candidates.filter(
    (c) => !c.contradicting_evidence.some((e) => e.tier === 'exclusionary') && c.score > 0,
  );

  const summary = buildSummary(activeCandidates);
  const identification = buildIdentification(activeCandidates, observationSummaries);
  const safety = buildSafety(result);
  const edibility = buildEdibility(result);
  const next_steps = buildNextSteps(result);

  const sections = [summary, identification, safety, edibility, next_steps].filter(Boolean);
  const full_text = sections.join('\n\n');

  return { summary, identification, safety, edibility, next_steps, full_text };
}

function buildSummary(
  activeCandidates: IdentificationResult['candidates'],
): string {
  if (activeCandidates.length === 0) {
    return 'Not enough information to identify candidates. More observations are needed.';
  }

  const top = activeCandidates[0]!;
  if (top.confidence === 'definitive' || top.confidence === 'high') {
    return `Most likely ${top.genus} (${top.confidence} confidence).`;
  }
  if (top.confidence === 'moderate') {
    return `Probably ${top.genus}, but other candidates remain possible.`;
  }
  return `Multiple candidates possible. More information needed to narrow down.`;
}

function buildIdentification(
  activeCandidates: IdentificationResult['candidates'],
  observationSummaries: string[],
): string {
  const parts: string[] = [];

  if (observationSummaries.length > 0) {
    parts.push(`Based on your observations (${observationSummaries.join(', ')})`);
  } else {
    parts.push('With no specific observations provided');
  }

  if (activeCandidates.length === 0) {
    parts.push('no candidates could be confidently identified. Try providing basic observations such as gill type, flesh texture, or habitat.');
    return parts.join(', ');
  }

  const top = activeCandidates[0]!;
  parts.push(`the leading candidate is ${top.genus} with ${top.confidence} confidence.`);

  // Add supporting evidence
  if (top.matching_evidence.length > 0) {
    const evidenceSummaries = top.matching_evidence
      .slice(0, 3)
      .map((e) => e.summary)
      .join(', ');
    parts.push(`Key evidence: ${evidenceSummaries}.`);
  }

  // Other candidates
  if (activeCandidates.length > 1) {
    const others = activeCandidates
      .slice(1, 4)
      .map((c) => `${c.genus} (${c.confidence})`)
      .join(', ');
    parts.push(`Other possibilities: ${others}.`);
  }

  return parts.join(' ');
}

function buildSafety(result: IdentificationResult): string {
  const parts: string[] = [];

  if (result.safety.warnings.length > 0) {
    for (const w of result.safety.warnings) {
      parts.push(w.message);
    }
  }

  if (result.safety.dangerous_lookalikes.length > 0) {
    for (const l of result.safety.dangerous_lookalikes) {
      parts.push(
        `Watch out for ${l.species} (${l.danger_level}). Distinguishing features: ${l.distinguishing_features.slice(0, 2).join('; ')}.`,
      );
    }
  }

  if (parts.length === 0) {
    if (result.safety.confidence_sufficient_for_foraging) {
      return 'No specific safety concerns identified for the top candidate at this confidence level.';
    }
    return 'Always exercise caution. When in doubt, leave it out.';
  }

  return parts.join(' ');
}

function buildEdibility(result: IdentificationResult): string {
  if (!result.edibility) {
    return 'Edibility assessment not available — no candidates identified.';
  }

  if (!result.edibility.available) {
    return result.edibility.reason_unavailable ?? 'Confidence is too low to advise on edibility.';
  }

  return result.edibility.notes;
}

function buildNextSteps(result: IdentificationResult): string {
  if (result.suggested_actions.length === 0) {
    return '';
  }

  const steps = result.suggested_actions
    .slice(0, 3)
    .map((a) => `${a.priority === 'critical' ? '[CRITICAL] ' : ''}${a.action}`)
    .join('. ');

  return `To increase confidence: ${steps}.`;
}
