import type { Observation } from '@/types';
import type { CandidateScore } from './scorer';
import type { FeatureRule } from './feature-rules';

/** Safety-critical features that should be asked first when relevant genera are candidates */
const SAFETY_FEATURES: Record<string, string[]> = {
  Amanita: ['volva_present', 'ring_present', 'gill_color'],
  Agaricus: ['volva_present', 'gill_color'],
  Clitocybe: ['ring_present', 'spore_print_color', 'cap_shape'],
  Macrolepiota: ['volva_present', 'cap_size_cm'],
  Armillaria: ['spore_print_color'],
  Coprinopsis: ['bruising_color'],
  Lepista: ['stem_color', 'spore_print_color'],
};

/** Human-readable question text for each observation field */
const QUESTION_TEXT: Record<string, string> = {
  flesh_texture: 'What is the flesh texture? (Does it snap like chalk, or is it fibrous?)',
  gill_type: 'What is under the cap? (Gills, pores/sponge, teeth, or smooth?)',
  gill_color: 'What colour are the gills?',
  gill_attachment: 'How are the gills attached to the stem?',
  ring_present: 'Is there a ring (skirt) on the stem?',
  volva_present: 'Is there a volva (cup/bag) at the base? (Dig gently to check)',
  cap_color: 'What colour is the cap?',
  cap_texture: 'What is the cap surface texture? (Smooth, slimy, scaly, etc.)',
  stem_present: 'Does it have a stem?',
  stem_color: 'What colour is the stem?',
  spore_print_color: 'Have you taken a spore print? What colour is it?',
  habitat: 'What habitat is it growing in? (Woodland, grassland, etc.)',
  substrate: 'What is it growing on? (Soil, wood, dung, etc.)',
  nearby_trees: 'What trees are nearby?',
  season_month: 'What month is it?',
  smell: 'Does it have a distinctive smell?',
  bruising_color: 'Does the flesh change colour when bruised or cut?',
  growth_pattern: 'How is it growing? (Solitary, clustered, in a ring, etc.)',
};

export interface DisambiguationQuestion {
  question: string;
  feature: string;
  information_gain: number;
  safety_relevant: boolean;
  skippable: true;
}

/**
 * Select the best disambiguation questions to ask next.
 * Prioritises: safety-relevant > high information gain.
 * Only asks about features not yet observed.
 */
export function selectQuestions(
  candidates: CandidateScore[],
  observation: Observation,
  rules: FeatureRule[],
): DisambiguationQuestion[] {
  const activeCandidates = candidates.filter((c) => !c.eliminated && c.score > 0);

  // No questions needed if 0 or 1 candidates remain
  if (activeCandidates.length <= 1) {
    return [];
  }

  const activeGenera = new Set(activeCandidates.map((c) => c.genus));

  // Find all features that are (a) not yet observed and (b) have rules for active candidates
  const relevantRules = rules.filter((r) => activeGenera.has(r.genus));
  const observedFields = new Set<string>();
  for (const key of Object.keys(observation) as Array<keyof Observation>) {
    if (observation[key] !== null && observation[key] !== undefined) {
      observedFields.add(key);
    }
  }

  const unobservedFeatures = new Set<string>();
  for (const rule of relevantRules) {
    if (!observedFields.has(rule.field) && rule.match.type !== 'absent') {
      unobservedFeatures.add(rule.field);
    }
  }

  // Score each unobserved feature by information gain
  const questions: DisambiguationQuestion[] = [];

  for (const feature of unobservedFeatures) {
    const featureRulesForField = relevantRules.filter((r) => r.field === feature);

    // Information gain: how many distinct genera does this feature discriminate?
    // A feature that has different expected values for different genera is more useful.
    const generaWithRules = new Set(featureRulesForField.map((r) => r.genus));
    const discriminativePower = generaWithRules.size / activeGenera.size;

    // Check for exclusionary rules — features that can eliminate candidates are high-value
    const hasExclusionary = featureRulesForField.some((r) => r.tier === 'exclusionary');
    const hasDefinitive = featureRulesForField.some((r) => r.tier === 'definitive');

    let informationGain = discriminativePower;
    if (hasExclusionary) informationGain += 0.3;
    if (hasDefinitive) informationGain += 0.4;

    // Check safety relevance
    const isSafetyRelevant = Array.from(activeGenera).some((genus) => {
      const safetyFeatures = SAFETY_FEATURES[genus];
      return safetyFeatures?.includes(feature);
    });

    const questionText = QUESTION_TEXT[feature] ?? `What is the ${feature.replace(/_/g, ' ')}?`;

    questions.push({
      question: questionText,
      feature,
      information_gain: informationGain,
      safety_relevant: isSafetyRelevant,
      skippable: true,
    });
  }

  // Sort: safety-relevant first, then by information gain
  questions.sort((a, b) => {
    if (a.safety_relevant && !b.safety_relevant) return -1;
    if (!a.safety_relevant && b.safety_relevant) return 1;
    return b.information_gain - a.information_gain;
  });

  return questions;
}
