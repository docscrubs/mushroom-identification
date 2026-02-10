/** Competency status levels */
export type CompetencyStatus =
  | 'not_started'
  | 'aware'
  | 'aware_not_confident'
  | 'learning'
  | 'confident'
  | 'expert';

/** Types of evidence for competency tracking */
export type EvidenceType =
  | 'correct_identification'
  | 'correct_rejection'
  | 'false_positive'
  | 'false_negative'
  | 'training_completed'
  | 'assisted_identification';

export interface EvidenceEntry {
  date: string;
  type: EvidenceType;
  details: string;
  session_id?: string;
}

export interface CompetencyRecord {
  skill_id: string;
  status: CompetencyStatus;
  first_exposure?: string;
  evidence: EvidenceEntry[];
  gaps: string[];
  unlocks: string[];
  last_demonstrated?: string;
  fsrs_card_ids: string[];
}

export interface CalibrationData {
  false_positives: number;
  false_negatives: number;
  appropriate_uncertainty: number;
  overconfidence_incidents: number;
  notes: string;
}

export interface UserModel {
  user_id: string;
  created: string;
  last_active: string;
  region?: string;
  competencies: CompetencyRecord[];
  calibration: CalibrationData;
  total_sessions: number;
  genera_encountered: string[];
  seasons_active: string[];
  habitats: string[];
  regions: string[];
}

/** User contribution types */
export type ContributionType =
  | 'personal_note'
  | 'regional_override'
  | 'exception_report'
  | 'draft_heuristic';

export type ContributionStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'verified'
  | 'rejected';

export interface UserContribution {
  id: string;
  type: ContributionType;
  heuristic_id?: string;
  content: string;
  location?: { region: string; habitat?: string };
  date: string;
  status: ContributionStatus;
}
