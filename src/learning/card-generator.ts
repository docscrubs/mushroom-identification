import type { GenusProfile } from '@/types';
import type { ReviewCard } from '@/types/learning';
import { createReviewCard } from './scheduler';

/** Generate genus recognition and feature recognition cards from a genus profile */
export function generateGenusCards(genus: GenusProfile): ReviewCard[] {
  const cards: ReviewCard[] = [];

  // 1. Genus recognition card: "What genus has these features?"
  const highMarkers = genus.confidence_markers.high ?? [];
  const moderateMarkers = genus.confidence_markers.moderate ?? [];
  const allMarkers = [...highMarkers, ...moderateMarkers];

  if (allMarkers.length > 0) {
    cards.push(
      createReviewCard({
        card_id: `genus_recog_${genus.genus}`,
        card_type: 'genus_recognition',
        genus: genus.genus,
        question: `Which genus has these key features: ${highMarkers.slice(0, 2).join('; ')}?`,
        answer: `${genus.genus} (${genus.common_names[0] ?? genus.genus})`,
        explanation: genus.identification_narrative
          ?? `Key features: ${allMarkers.join('. ')}.`,
        competency_id: `genus_recognition.${genus.genus}`,
        difficulty_hint: 'Moderate',
      }),
    );
  }

  // 2. Feature recognition cards: "What does [feature] indicate?"
  for (const marker of highMarkers) {
    cards.push(
      createReviewCard({
        card_id: `feature_${genus.genus}_${slugify(marker)}`,
        card_type: 'feature_recognition',
        genus: genus.genus,
        question: `You observe: "${marker}". Which genus does this strongly indicate?`,
        answer: `${genus.genus} (${genus.common_names[0] ?? genus.genus})`,
        explanation: `This is a high-confidence marker for ${genus.genus}. ${genus.identification_narrative ?? ''}`,
        competency_id: `feature_recognition.${genus.genus}`,
        difficulty_hint: 'Easy',
      }),
    );
  }

  // 3. Heuristic recall cards: "What test do you use for [genus]?"
  for (const heuristic of genus.foraging_heuristics) {
    cards.push(
      createReviewCard({
        card_id: `heuristic_${genus.genus}_${heuristic.heuristic_id}`,
        card_type: 'heuristic_recall',
        genus: genus.genus,
        question: `What is the key test/heuristic for ${genus.genus} (${genus.common_names[0] ?? ''})? Hint: ${heuristic.description}`,
        answer: `${heuristic.description}`,
        explanation: `The ${heuristic.heuristic_id.replace(/_/g, ' ')} is a key foraging heuristic for ${genus.genus}.`,
        competency_id: `heuristic_recall.${heuristic.heuristic_id}`,
      }),
    );
  }

  return cards;
}

/** Generate safety recognition cards for genera with toxic species */
export function generateSafetyCards(genus: GenusProfile): ReviewCard[] {
  const toxicSpecies = genus.key_species_uk.toxic_or_inedible ?? [];
  if (toxicSpecies.length === 0) return [];

  return toxicSpecies.map((species) =>
    createReviewCard({
      card_id: `safety_${genus.genus}_${species.species}`,
      card_type: 'safety_recognition',
      genus: genus.genus,
      question: `What danger does ${genus.genus} ${species.species} (${species.common_name}) pose?`,
      answer: `${species.common_name} (${genus.genus} ${species.species}): ${species.notes}`,
      explanation: `${species.common_name} is a ${species.notes.toLowerCase().includes('lethal') ? 'lethally toxic' : 'toxic/inedible'} species. ${genus.notes ?? ''}`,
      competency_id: `safety_recognition.${genus.genus}`,
      difficulty_hint: 'Critical',
    }),
  );
}

/** Generate discrimination pair cards from lookalike relationships */
export function generateDiscriminationCards(
  genus: GenusProfile,
  _allGenera: GenusProfile[],
): ReviewCard[] {
  if (!genus.lookalike_genera || genus.lookalike_genera.length === 0) return [];

  return genus.lookalike_genera.map((lookalike) =>
    createReviewCard({
      card_id: `disc_${genus.genus}_${lookalike.genus}`,
      card_type: 'discrimination_pair',
      genus: genus.genus,
      related_genera: [lookalike.genus],
      question: `How do you distinguish ${genus.genus} from ${lookalike.genus}?`,
      answer: lookalike.distinction,
      explanation: `This distinction is ${lookalike.danger_level === 'critical' ? 'safety-critical' : 'important'}: ${lookalike.distinction}. Danger level: ${lookalike.danger_level}.`,
      competency_id: `discrimination.${genus.genus}_${lookalike.genus}`,
      difficulty_hint: lookalike.danger_level === 'critical' ? 'Critical' : 'Moderate',
    }),
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}
