/** Heuristic categories from the plan */
export type HeuristicCategory =
  | 'safety_rule'
  | 'safety_screening'
  | 'edibility_determination'
  | 'discrimination'
  | 'ecological_context'
  | 'gestalt_recognition';

/** Priority levels for heuristic execution */
export type HeuristicPriority = 'critical' | 'standard' | 'supplementary';

/** Confidence level required/produced */
export type ConfidenceLevel =
  | 'definitive'
  | 'high'
  | 'moderate'
  | 'low'
  | 'insufficient';

/** What the rule concludes */
export type HeuristicConclusion =
  | 'EDIBLE'
  | 'REJECT'
  | 'CAUTION'
  | 'LIKELY_TOXIC'
  | 'AVOID'
  | 'PROCEED_WITH_CAUTION'
  | 'INVESTIGATE_FURTHER';

export interface HeuristicOutcome {
  id?: string;
  condition: string;
  conclusion: HeuristicConclusion;
  confidence: ConfidenceLevel;
  action: string;
  next_steps?: string[];
  disambiguation?: Array<{
    question: string;
    if_yes: string;
    if_no: string;
  }>;
}

export interface HeuristicException {
  species: string;
  note: string;
  action?: string;
}

export interface HeuristicAppliesTo {
  genus?: string;
  family?: string;
  morphology?: Record<string, string>;
  confidence_required: ConfidenceLevel;
}

export interface ProcedureStep {
  instruction: string;
  safety_note?: string;
  image_ref?: string;
}

export interface Heuristic {
  heuristic_id: string;
  version?: number;
  name: string;
  category: HeuristicCategory;
  priority?: HeuristicPriority;
  applies_to: HeuristicAppliesTo;
  prerequisites?: {
    competencies?: Record<string, string>;
    safety_checks?: string[];
  };
  procedure: string | { steps: ProcedureStep[]; estimated_time?: string };
  outcomes: HeuristicOutcome[];
  exceptions?: HeuristicException[];
  safety_notes?: string[];
  safety?: {
    false_positive_risk: 'low' | 'medium' | 'high';
    false_negative_risk: 'low' | 'medium' | 'high';
    failure_mode: string;
  };
  rationale?: string;
  source: string | {
    primary: string;
    reliability: 'proven' | 'established' | 'emerging' | 'anecdotal';
    last_verified?: string;
    verified_by?: string;
  };
  reliability?: 'proven' | 'established' | 'emerging' | 'anecdotal';
  llm_context?: string;
  user_editable?: {
    allow_notes: boolean;
    allow_exception_report: boolean;
    allow_fork: boolean;
    allow_regional_override: boolean;
  };
}
