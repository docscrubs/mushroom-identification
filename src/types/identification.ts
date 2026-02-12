import type { ConfidenceLevel } from './heuristic';

/** Evidence tier for the weighted confidence model */
export type EvidenceTier =
  | 'definitive'
  | 'strong'
  | 'moderate'
  | 'weak'
  | 'exclusionary';

/** Toxicity classification */
export type ToxicityLevel =
  | 'deadly'
  | 'seriously_toxic'
  | 'toxic'
  | 'mildly_toxic'
  | 'inedible'
  | 'edible_with_caution'
  | 'edible'
  | 'choice_edible'
  | 'unknown';

/** Edibility status */
export type EdibilityStatus =
  | 'edible'
  | 'edible_with_caution'
  | 'inedible'
  | 'toxic'
  | 'deadly';

export interface Evidence {
  feature: string;
  observed_value: string;
  expected_value: string;
  tier: EvidenceTier;
  supports: boolean;
  /** Human-readable summary, e.g. "no ring" or "brittle flesh" */
  summary: string;
}

export interface Candidate {
  species?: string;
  genus: string;
  common_name: string;
  confidence: ConfidenceLevel;
  score: number;
  matching_evidence: Evidence[];
  contradicting_evidence: Evidence[];
  missing_evidence: Evidence[];
}

export interface SafetyWarning {
  type: 'deadly_lookalike' | 'toxic_lookalike' | 'requires_confirmation' | 'general';
  message: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
}

export interface LookalikeWarning {
  species: string;
  genus: string;
  danger_level: string;
  distinguishing_features: string[];
}

export interface SafetyAssessment {
  toxicity: ToxicityLevel;
  warnings: SafetyWarning[];
  dangerous_lookalikes: LookalikeWarning[];
  confidence_sufficient_for_foraging: boolean;
}

export interface EdibilityInfo {
  status: EdibilityStatus;
  notes: string;
  preparation_notes?: string;
  available: boolean;
  reason_unavailable?: string;
}

export interface SuggestedAction {
  action: string;
  reason: string;
  priority: 'critical' | 'recommended' | 'optional';
  safety_relevant: boolean;
}

/** Ambiguity that warrants a follow-up question */
export interface AmbiguityFlag {
  id: string;
  fields: Array<string>;
  question: string;
  explanation: string;
  relevant_genera: string[];
}

/** A heuristic that has been activated by the current identification */
export interface ActivatedHeuristic {
  heuristic_id: string;
  name: string;
  genus: string;
  category: string;
  /** Concrete steps the user should follow */
  steps: string[];
  safety_notes: string[];
}

/** An interactive follow-up question derived from disambiguation */
export interface FollowUpQuestion {
  question: string;
  /** The observation field this question targets */
  feature: string;
  information_gain: number;
  safety_relevant: boolean;
  /** True if this field was already visible in the form but left empty */
  previously_available: boolean;
  /** Why answering this matters — which genera it helps distinguish */
  impact_note: string;
}

export interface IdentificationResult {
  candidates: Candidate[];
  reasoning_chain: string[];
  safety: SafetyAssessment;
  edibility?: EdibilityInfo;
  suggested_actions: SuggestedAction[];
  /** Interactive follow-up questions derived from disambiguation */
  follow_up_questions: FollowUpQuestion[];
  ambiguities: AmbiguityFlag[];
  /** Heuristics triggered by the current identification results */
  triggered_heuristics: ActivatedHeuristic[];
}

/** Rule activation state during identification */
export type RuleRelevance = 'active' | 'deprioritised' | 'inactive';

export interface RuleActivation {
  rule_id: string;
  relevance: RuleRelevance;
  reason: string;
}

/** Disambiguation question for interactive flow */
export interface DisambiguationQuestion {
  question: string;
  feature_tested: string;
  information_gain: number;
  eliminates_if_yes: string[];
  eliminates_if_no: string[];
  skippable: boolean;
  skip_cost: number;
  safety_relevant: boolean;
}
