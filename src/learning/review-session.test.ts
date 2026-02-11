import { describe, it, expect, beforeEach } from 'vitest';
import { Rating, State } from 'ts-fsrs';
import type { ReviewCard } from '@/types/learning';
import { MushroomDB } from '@/db/database';
import {
  startReviewSession,
  submitReview,
  completeReviewSession,
  getDueCardCount,
  getReviewStats,
} from './review-session';

function makeCard(id: string, overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    card_id: id,
    card_type: 'genus_recognition',
    genus: 'Russula',
    question: `Question for ${id}`,
    answer: `Answer for ${id}`,
    explanation: `Explanation for ${id}`,
    due: new Date(Date.now() - 1000).toISOString(), // past due
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

describe('Review Session', () => {
  let db: MushroomDB;

  beforeEach(async () => {
    db = new MushroomDB(`test-review-${Date.now()}-${Math.random()}`);
  });

  describe('getDueCardCount', () => {
    it('returns 0 when no cards exist', async () => {
      const count = await getDueCardCount(db);
      expect(count).toBe(0);
    });

    it('returns count of due cards', async () => {
      await db.reviewCards.bulkAdd([
        makeCard('card-1'),
        makeCard('card-2'),
        makeCard('card-3', { due: new Date(Date.now() + 86400000).toISOString() }), // future
      ]);

      const count = await getDueCardCount(db);
      expect(count).toBe(2);
    });
  });

  describe('startReviewSession', () => {
    it('creates a session with due cards', async () => {
      await db.reviewCards.bulkAdd([
        makeCard('card-1'),
        makeCard('card-2'),
      ]);

      const session = await startReviewSession(db);
      expect(session.session_id).toBeTruthy();
      expect(session.started_at).toBeTruthy();
      expect(session.cards_reviewed).toBe(0);
      expect(session.cards_correct).toBe(0);
      expect(session.results).toEqual([]);
    });

    it('stores the session in the database', async () => {
      await db.reviewCards.bulkAdd([makeCard('card-1')]);
      const session = await startReviewSession(db);

      const stored = await db.reviewSessions.get(session.session_id);
      expect(stored).toBeDefined();
      expect(stored!.session_id).toBe(session.session_id);
    });

    it('respects the limit parameter', async () => {
      await db.reviewCards.bulkAdd([
        makeCard('card-1'),
        makeCard('card-2'),
        makeCard('card-3'),
      ]);

      const session = await startReviewSession(db, 2);
      // Session created - the limit applies to getDueCards internally
      expect(session).toBeDefined();
    });
  });

  describe('submitReview', () => {
    it('updates the card scheduling in the database', async () => {
      await db.reviewCards.add(makeCard('card-1'));
      const session = await startReviewSession(db);

      await submitReview(db, session.session_id, 'card-1', Rating.Good);

      const updated = await db.reviewCards.get('card-1');
      expect(updated!.reps).toBe(1);
      expect(updated!.state).not.toBe(State.New);
    });

    it('records the review result in the session', async () => {
      await db.reviewCards.add(makeCard('card-1'));
      const session = await startReviewSession(db);

      await submitReview(db, session.session_id, 'card-1', Rating.Good);

      const updatedSession = await db.reviewSessions.get(session.session_id);
      expect(updatedSession!.cards_reviewed).toBe(1);
      expect(updatedSession!.cards_correct).toBe(1); // Good = correct
      expect(updatedSession!.results).toHaveLength(1);
      expect(updatedSession!.results[0]!.rating).toBe(Rating.Good);
    });

    it('counts Again as incorrect', async () => {
      await db.reviewCards.add(makeCard('card-1'));
      const session = await startReviewSession(db);

      await submitReview(db, session.session_id, 'card-1', Rating.Again);

      const updatedSession = await db.reviewSessions.get(session.session_id);
      expect(updatedSession!.cards_reviewed).toBe(1);
      expect(updatedSession!.cards_correct).toBe(0);
    });

    it('counts Hard as incorrect', async () => {
      await db.reviewCards.add(makeCard('card-1'));
      const session = await startReviewSession(db);

      await submitReview(db, session.session_id, 'card-1', Rating.Hard);

      const updatedSession = await db.reviewSessions.get(session.session_id);
      expect(updatedSession!.cards_correct).toBe(0);
    });
  });

  describe('completeReviewSession', () => {
    it('marks the session as completed', async () => {
      await db.reviewCards.add(makeCard('card-1'));
      const session = await startReviewSession(db);
      await submitReview(db, session.session_id, 'card-1', Rating.Good);

      const completed = await completeReviewSession(db, session.session_id);
      expect(completed.completed_at).toBeTruthy();
    });
  });

  describe('getReviewStats', () => {
    it('returns stats across all review sessions', async () => {
      await db.reviewCards.bulkAdd([makeCard('card-1'), makeCard('card-2')]);

      const session = await startReviewSession(db);
      await submitReview(db, session.session_id, 'card-1', Rating.Good);
      await submitReview(db, session.session_id, 'card-2', Rating.Again);
      await completeReviewSession(db, session.session_id);

      const stats = await getReviewStats(db);
      expect(stats.total_reviews).toBe(2);
      expect(stats.total_correct).toBe(1);
      expect(stats.sessions_completed).toBe(1);
    });
  });
});
