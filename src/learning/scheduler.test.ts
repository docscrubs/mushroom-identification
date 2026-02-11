import { describe, it, expect } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import { createReviewCard, reviewCard, getDueCards, getSchedulerConfig } from './scheduler';
import type { ReviewCard } from '@/types/learning';

function makeCard(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    card_id: 'test-card-1',
    card_type: 'genus_recognition',
    genus: 'Russula',
    question: 'What family has brittle, snapping flesh?',
    answer: 'Russula (Brittlegills)',
    explanation: 'Russula species have characteristically brittle flesh that snaps cleanly like chalk.',
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    learning_steps: 0,
    state: State.New,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Scheduler', () => {
  describe('getSchedulerConfig', () => {
    it('returns FSRS configuration with 90% target retention', () => {
      const config = getSchedulerConfig();
      expect(config.request_retention).toBe(0.9);
    });

    it('sets maximum interval to 365 days', () => {
      const config = getSchedulerConfig();
      expect(config.maximum_interval).toBe(365);
    });

    it('enables fuzz for randomisation', () => {
      const config = getSchedulerConfig();
      expect(config.enable_fuzz).toBe(true);
    });
  });

  describe('createReviewCard', () => {
    it('creates a new card with FSRS initial state', () => {
      const card = createReviewCard({
        card_id: 'russula-genus-1',
        card_type: 'genus_recognition',
        genus: 'Russula',
        question: 'What family has brittle, snapping flesh?',
        answer: 'Russula (Brittlegills)',
        explanation: 'Russula species have characteristically brittle flesh.',
      });

      expect(card.card_id).toBe('russula-genus-1');
      expect(card.card_type).toBe('genus_recognition');
      expect(card.genus).toBe('Russula');
      expect(card.state).toBe(State.New);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.stability).toBe(0);
      expect(card.difficulty).toBe(0);
      expect(card.created_at).toBeTruthy();
      expect(card.due).toBeTruthy();
    });

    it('accepts optional competency_id', () => {
      const card = createReviewCard({
        card_id: 'test-1',
        card_type: 'safety_recognition',
        genus: 'Amanita',
        question: 'Q',
        answer: 'A',
        explanation: 'E',
        competency_id: 'safety.amanita',
      });

      expect(card.competency_id).toBe('safety.amanita');
    });

    it('accepts optional related_genera for discrimination pairs', () => {
      const card = createReviewCard({
        card_id: 'test-1',
        card_type: 'discrimination_pair',
        genus: 'Agaricus',
        related_genera: ['Amanita'],
        question: 'How do you distinguish Agaricus from Amanita?',
        answer: 'Check for volva at base',
        explanation: 'Amanita has a volva, Agaricus does not.',
      });

      expect(card.related_genera).toEqual(['Amanita']);
    });
  });

  describe('reviewCard', () => {
    it('advances a new card after rating Good', () => {
      const card = makeCard();
      const now = new Date();
      const result = reviewCard(card, Rating.Good, now);

      expect(result.card.state).not.toBe(State.New);
      expect(result.card.reps).toBe(1);
      expect(result.card.stability).toBeGreaterThan(0);
      expect(result.card.last_review).toBeTruthy();
    });

    it('returns a review log with the rating', () => {
      const card = makeCard();
      const now = new Date();
      const result = reviewCard(card, Rating.Good, now);

      expect(result.log.rating).toBe(Rating.Good);
    });

    it('schedules card further in the future for Easy vs Good', () => {
      const card = makeCard();
      const now = new Date();

      const goodResult = reviewCard(card, Rating.Good, now);
      const easyResult = reviewCard(card, Rating.Easy, now);

      const goodDue = new Date(goodResult.card.due).getTime();
      const easyDue = new Date(easyResult.card.due).getTime();

      // Easy should schedule further out than Good
      expect(easyDue).toBeGreaterThanOrEqual(goodDue);
    });

    it('schedules card sooner for Again than Good', () => {
      const card = makeCard();
      const now = new Date();

      const againResult = reviewCard(card, Rating.Again, now);
      const goodResult = reviewCard(card, Rating.Good, now);

      const againDue = new Date(againResult.card.due).getTime();
      const goodDue = new Date(goodResult.card.due).getTime();

      expect(againDue).toBeLessThanOrEqual(goodDue);
    });

    it('increases lapses when rated Again on a review card', () => {
      // First, advance the card to Review state
      const card = makeCard();
      const now = new Date();
      const afterGood = reviewCard(card, Rating.Good, now);

      // Simulate time passing so the card is due
      const futureDate = new Date(afterGood.card.due);
      const secondReview = reviewCard(afterGood.card, Rating.Good, futureDate);

      // Now rate Again
      const laterDate = new Date(secondReview.card.due);
      const afterAgain = reviewCard(secondReview.card, Rating.Again, laterDate);

      expect(afterAgain.card.lapses).toBeGreaterThanOrEqual(1);
    });

    it('preserves card metadata through reviews', () => {
      const card = makeCard({
        competency_id: 'genus.russula',
        difficulty_hint: 'Easy',
      });
      const now = new Date();
      const result = reviewCard(card, Rating.Good, now);

      expect(result.card.card_id).toBe(card.card_id);
      expect(result.card.card_type).toBe(card.card_type);
      expect(result.card.genus).toBe(card.genus);
      expect(result.card.question).toBe(card.question);
      expect(result.card.answer).toBe(card.answer);
      expect(result.card.competency_id).toBe('genus.russula');
      expect(result.card.difficulty_hint).toBe('Easy');
    });
  });

  describe('getDueCards', () => {
    it('returns cards that are due now', () => {
      const pastDue = makeCard({
        card_id: 'past',
        due: new Date(Date.now() - 1000).toISOString(),
      });
      const futureDue = makeCard({
        card_id: 'future',
        due: new Date(Date.now() + 86400000).toISOString(),
      });

      const due = getDueCards([pastDue, futureDue]);
      expect(due).toHaveLength(1);
      expect(due[0]!.card_id).toBe('past');
    });

    it('returns cards due right now', () => {
      const nowDue = makeCard({
        card_id: 'now',
        due: new Date().toISOString(),
      });

      const due = getDueCards([nowDue]);
      expect(due).toHaveLength(1);
    });

    it('returns empty array when no cards are due', () => {
      const future = makeCard({
        due: new Date(Date.now() + 86400000).toISOString(),
      });

      const due = getDueCards([future]);
      expect(due).toHaveLength(0);
    });

    it('sorts due cards by due date (oldest first)', () => {
      const older = makeCard({
        card_id: 'older',
        due: new Date(Date.now() - 3600000).toISOString(),
      });
      const newer = makeCard({
        card_id: 'newer',
        due: new Date(Date.now() - 1000).toISOString(),
      });

      const due = getDueCards([newer, older]);
      expect(due[0]!.card_id).toBe('older');
      expect(due[1]!.card_id).toBe('newer');
    });

    it('accepts optional limit parameter', () => {
      const cards = Array.from({ length: 5 }, (_, i) =>
        makeCard({
          card_id: `card-${i}`,
          due: new Date(Date.now() - (5 - i) * 1000).toISOString(),
        }),
      );

      const due = getDueCards(cards, 3);
      expect(due).toHaveLength(3);
    });
  });
});
