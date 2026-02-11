import type { MushroomDB } from '@/db/database';
import { generateGenusCards, generateSafetyCards, generateDiscriminationCards } from './card-generator';

/**
 * Seed review cards from all genus profiles in the database.
 * Only adds cards that don't already exist (idempotent).
 * Returns the number of new cards added.
 */
export async function seedReviewCards(db: MushroomDB): Promise<number> {
  const genera = await db.genusProfiles.toArray();
  const existingIds = new Set(
    (await db.reviewCards.toArray()).map((c) => c.card_id),
  );

  const newCards = [];

  for (const genus of genera) {
    const genusCards = generateGenusCards(genus);
    const safetyCards = generateSafetyCards(genus);
    const discCards = generateDiscriminationCards(genus, genera);

    for (const card of [...genusCards, ...safetyCards, ...discCards]) {
      if (!existingIds.has(card.card_id)) {
        newCards.push(card);
        existingIds.add(card.card_id);
      }
    }
  }

  if (newCards.length > 0) {
    await db.reviewCards.bulkAdd(newCards);
  }

  return newCards.length;
}
