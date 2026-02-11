import { Rating } from 'ts-fsrs';
import type { MushroomDB } from '@/db/database';
import type { ReviewSession } from '@/types/learning';
import { reviewCard, type ReviewRating } from './scheduler';

/** Get the count of cards currently due for review */
export async function getDueCardCount(db: MushroomDB): Promise<number> {
  const now = new Date().toISOString();
  const dueCards = await db.reviewCards
    .where('due')
    .belowOrEqual(now)
    .count();
  return dueCards;
}

/** Start a new review session, loading due cards from the database */
export async function startReviewSession(
  db: MushroomDB,
  _limit?: number,
): Promise<ReviewSession> {
  const session: ReviewSession = {
    session_id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    started_at: new Date().toISOString(),
    cards_reviewed: 0,
    cards_correct: 0,
    results: [],
  };

  await db.reviewSessions.add(session);
  return session;
}

/** Submit a review for a card. Updates the card scheduling and session stats. */
export async function submitReview(
  db: MushroomDB,
  sessionId: string,
  cardId: string,
  rating: ReviewRating,
): Promise<void> {
  // Get the card
  const card = await db.reviewCards.get(cardId);
  if (!card) throw new Error(`Card not found: ${cardId}`);

  // Apply FSRS scheduling
  const { card: updatedCard } = reviewCard(card, rating);

  // Save updated card
  await db.reviewCards.put(updatedCard);

  // Update session
  const session = await db.reviewSessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const isCorrect = rating >= Rating.Good;

  await db.reviewSessions.update(sessionId, {
    cards_reviewed: session.cards_reviewed + 1,
    cards_correct: session.cards_correct + (isCorrect ? 1 : 0),
    results: [
      ...session.results,
      {
        card_id: cardId,
        rating: rating as 1 | 2 | 3 | 4,
        reviewed_at: new Date().toISOString(),
      },
    ],
  });
}

/** Mark a review session as completed */
export async function completeReviewSession(
  db: MushroomDB,
  sessionId: string,
): Promise<ReviewSession> {
  await db.reviewSessions.update(sessionId, {
    completed_at: new Date().toISOString(),
  });

  const session = await db.reviewSessions.get(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  return session;
}

/** Get aggregate review statistics */
export async function getReviewStats(db: MushroomDB): Promise<{
  total_reviews: number;
  total_correct: number;
  sessions_completed: number;
  accuracy: number;
}> {
  const sessions = await db.reviewSessions.toArray();
  const completed = sessions.filter((s) => s.completed_at);

  let totalReviews = 0;
  let totalCorrect = 0;

  for (const session of sessions) {
    totalReviews += session.cards_reviewed;
    totalCorrect += session.cards_correct;
  }

  return {
    total_reviews: totalReviews,
    total_correct: totalCorrect,
    sessions_completed: completed.length,
    accuracy: totalReviews > 0 ? totalCorrect / totalReviews : 0,
  };
}
