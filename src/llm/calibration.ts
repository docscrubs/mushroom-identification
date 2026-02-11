import type { LLMDirectIdentification, LLMOpinion, IdentificationResult } from '@/types';
import type { MushroomDB } from '@/db/database';

export interface CalibrationSummary {
  total: number;
  agreements: number;
  disagreements: number;
  agreement_rate: number;
}

/**
 * Compare the LLM's direct identification against the rule engine result
 * and return a structured opinion record for storage.
 */
export async function recordCalibration(
  _db: MushroomDB,
  llmOpinion: LLMDirectIdentification,
  ruleEngineResult: IdentificationResult,
  _sessionId: string,
): Promise<LLMOpinion> {
  const topCandidate = ruleEngineResult.candidates.find((c) => c.score > 0);
  const ruleEngineGenus = topCandidate?.genus ?? null;

  const agreed =
    llmOpinion.genus_guess !== null &&
    ruleEngineGenus !== null &&
    llmOpinion.genus_guess === ruleEngineGenus;

  return {
    genus_guess: llmOpinion.genus_guess,
    species_guess: llmOpinion.species_guess,
    confidence: llmOpinion.confidence,
    reasoning: llmOpinion.reasoning,
    agreed_with_rule_engine: agreed,
  };
}

/**
 * Get aggregate calibration statistics from stored sessions.
 */
export async function getCalibrationSummary(db: MushroomDB): Promise<CalibrationSummary> {
  const sessions = await db.identificationSessions
    .filter((s) => s.llm_opinion !== undefined)
    .toArray();

  const total = sessions.length;
  const agreements = sessions.filter((s) => s.llm_opinion!.agreed_with_rule_engine).length;
  const disagreements = total - agreements;

  return {
    total,
    agreements,
    disagreements,
    agreement_rate: total > 0 ? agreements / total : 0,
  };
}
