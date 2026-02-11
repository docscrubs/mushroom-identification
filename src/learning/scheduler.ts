import { fsrs, createEmptyCard, Rating, type RecordLog, State } from 'ts-fsrs';
import type { ReviewCard, CardType } from '@/types/learning';

/** FSRS scheduler configuration */
export function getSchedulerConfig() {
  return {
    request_retention: 0.9,       // 90% target retention
    maximum_interval: 365,         // Max 1 year between reviews
    enable_fuzz: true,             // Slight randomisation to avoid clumping
    enable_short_term: true,       // Enable short-term scheduling for learning steps
  };
}

const scheduler = fsrs(getSchedulerConfig());

/** Create a new review card with FSRS initial state */
export function createReviewCard(params: {
  card_id: string;
  card_type: CardType;
  genus: string;
  related_genera?: string[];
  question: string;
  answer: string;
  explanation: string;
  competency_id?: string;
  difficulty_hint?: string;
}): ReviewCard {
  const empty = createEmptyCard();
  const now = new Date().toISOString();

  return {
    card_id: params.card_id,
    card_type: params.card_type,
    genus: params.genus,
    related_genera: params.related_genera,
    question: params.question,
    answer: params.answer,
    explanation: params.explanation,
    competency_id: params.competency_id,
    difficulty_hint: params.difficulty_hint,
    due: empty.due instanceof Date ? empty.due.toISOString() : String(empty.due),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    learning_steps: empty.learning_steps,
    state: empty.state,
    created_at: now,
  };
}

/** Convert our ReviewCard to the ts-fsrs Card format */
function toFsrsCard(card: ReviewCard) {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learning_steps: card.learning_steps,
    state: card.state as State,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}

/** Valid ratings for review (excludes Manual) */
export type ReviewRating = typeof Rating.Again | typeof Rating.Hard | typeof Rating.Good | typeof Rating.Easy;

/** Review a card with a given rating. Returns updated card and review log. */
export function reviewCard(
  card: ReviewCard,
  rating: ReviewRating,
  now: Date = new Date(),
): { card: ReviewCard; log: RecordLog[keyof RecordLog]['log'] } {
  const fsrsCard = toFsrsCard(card);
  const result = scheduler.repeat(fsrsCard, now);
  const selected = result[rating as 1 | 2 | 3 | 4];

  const updatedFsrs = selected.card;

  const updatedCard: ReviewCard = {
    ...card,
    due: updatedFsrs.due instanceof Date ? updatedFsrs.due.toISOString() : String(updatedFsrs.due),
    stability: updatedFsrs.stability,
    difficulty: updatedFsrs.difficulty,
    elapsed_days: updatedFsrs.elapsed_days,
    scheduled_days: updatedFsrs.scheduled_days,
    reps: updatedFsrs.reps,
    lapses: updatedFsrs.lapses,
    learning_steps: updatedFsrs.learning_steps,
    state: updatedFsrs.state,
    last_review: updatedFsrs.last_review
      ? (updatedFsrs.last_review instanceof Date
        ? updatedFsrs.last_review.toISOString()
        : String(updatedFsrs.last_review))
      : now.toISOString(),
  };

  return { card: updatedCard, log: selected.log };
}

/** Get cards that are due for review, sorted by due date (oldest first) */
export function getDueCards(cards: ReviewCard[], limit?: number): ReviewCard[] {
  const now = new Date();
  const due = cards
    .filter((c) => new Date(c.due) <= now)
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  return limit !== undefined ? due.slice(0, limit) : due;
}
