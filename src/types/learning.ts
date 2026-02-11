import type { State } from 'ts-fsrs';

// --- Card Types ---

/** Types of knowledge items that can be reviewed via spaced repetition */
export type CardType =
  | 'safety_recognition'     // Identify dangerous species from description
  | 'feature_recognition'    // Identify morphological features
  | 'genus_recognition'      // Identify genus from gestalt features
  | 'discrimination_pair'    // Distinguish lookalike species
  | 'heuristic_recall';      // Remember and apply foraging heuristics

/** A reviewable flashcard stored in IndexedDB */
export interface ReviewCard {
  card_id: string;
  card_type: CardType;
  genus: string;                    // Primary genus this card tests
  related_genera?: string[];        // For discrimination pairs

  // Content
  question: string;
  answer: string;
  explanation: string;              // Shown after answering
  difficulty_hint?: string;         // "Easy" / "Moderate" / "Hard"

  // FSRS scheduling state
  due: string;                      // ISO date
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: State;
  last_review?: string;             // ISO date

  // Metadata
  created_at: string;
  competency_id?: string;           // Links to CompetencyRecord.skill_id
}

/** Result of a single review */
export interface ReviewResult {
  card_id: string;
  rating: 1 | 2 | 3 | 4;          // Again=1, Hard=2, Good=3, Easy=4
  reviewed_at: string;              // ISO date
  response_time_ms?: number;
}

/** A review session (collection of reviews) */
export interface ReviewSession {
  session_id: string;
  started_at: string;
  completed_at?: string;
  cards_reviewed: number;
  cards_correct: number;            // Rating >= Good
  results: ReviewResult[];
}

// --- Training Content ---

/** A training module that teaches a concept */
export interface TrainingModule {
  module_id: string;
  title: string;
  description: string;
  genus?: string;
  card_type: CardType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: TrainingContent[];
  associated_card_ids: string[];    // Cards unlocked by completing this module
}

export interface TrainingContent {
  type: 'text' | 'image' | 'quiz';
  content: string;
  image_ref?: string;
  quiz_options?: string[];
  quiz_correct_index?: number;
}
