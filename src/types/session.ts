import type { Observation } from './observation';
import type { IdentificationResult } from './identification';
import type { LLMOpinion } from './llm';

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
