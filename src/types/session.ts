import type { Observation } from './observation';
import type { IdentificationResult } from './identification';

export type FieldConfidence = 'high' | 'medium' | 'low';

export interface LLMOpinion {
  genus_guess: string | null;
  species_guess: string | null;
  confidence: FieldConfidence;
  reasoning: string;
  agreed_with_rule_engine: boolean;
}

/** An identification session record */
export interface IdentificationSession {
  session_id: string;
  date: string;
  observation: Observation;
  result?: IdentificationResult;
  user_feedback?: {
    correct: boolean | null;
    actual_species?: string;
    notes?: string;
  };
  competencies_demonstrated?: string[];
  /** LLM's direct identification opinion, stored for calibration */
  llm_opinion?: LLMOpinion;
}
