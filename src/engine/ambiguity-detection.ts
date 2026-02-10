import type { Observation } from '@/types';

export interface AmbiguityFlag {
  id: string;
  fields: Array<keyof Observation>;
  question: string;
  explanation: string;
  relevant_genera: string[];
}

/**
 * Detect ambiguous observations that warrant follow-up prompts.
 * These are contextual checks where the user's observation could
 * plausibly mean different things that affect identification.
 */
export function detectAmbiguities(
  observation: Observation,
  activeCandidateGenera: string[],
): AmbiguityFlag[] {
  const flags: AmbiguityFlag[] = [];
  const genera = new Set(activeCandidateGenera);

  // Soil in woodland/parkland → could be buried wood
  if (
    observation.substrate === 'soil' &&
    (observation.habitat === 'woodland' || observation.habitat === 'parkland')
  ) {
    flags.push({
      id: 'buried_wood',
      fields: ['substrate', 'habitat'],
      question: 'Could there be buried wood underneath? Near trees, mushrooms appearing to grow from soil may actually be on buried roots or wood.',
      explanation: 'Many wood-decaying species (Armillaria, Pleurotus) grow from buried wood that looks like soil. This matters for identification.',
      relevant_genera: activeCandidateGenera.filter((g) =>
        ['Armillaria', 'Pleurotus', 'Laetiporus', 'Fistulina'].includes(g),
      ),
    });
  }

  // Grassland with nearby trees → mycorrhizal association possible
  if (
    observation.habitat === 'grassland' &&
    observation.nearby_trees &&
    observation.nearby_trees.length > 0
  ) {
    flags.push({
      id: 'grassland_trees',
      fields: ['habitat', 'nearby_trees'],
      question: 'Are the trees within a few metres? Some species form mycorrhizal associations even in apparent grassland near trees.',
      explanation: 'Mycorrhizal species like Russula and Boletus need tree roots. If trees are close, these genera become candidates even in grassland.',
      relevant_genera: activeCandidateGenera.filter((g) =>
        ['Russula', 'Boletus', 'Leccinum', 'Cantharellus', 'Lactarius', 'Amanita'].includes(g),
      ),
    });
  }

  // Ridges → chanterelle vs false chanterelle distinction
  if (observation.gill_type === 'ridges' && genera.has('Cantharellus')) {
    flags.push({
      id: 'ridge_vs_gill',
      fields: ['gill_type'],
      question: 'Are the ridges forked and vein-like (running down the stem), or thin, blade-like, and evenly spaced?',
      explanation: 'True chanterelles have irregular forked ridges/veins. False chanterelles have thinner, more regular, blade-like gills. This is the key distinction.',
      relevant_genera: ['Cantharellus', 'Hygrophoropsis'],
    });
  }

  // White gills → Amanita vs Agaricus ambiguity
  if (
    observation.gill_color === 'white' &&
    genera.has('Amanita') &&
    genera.has('Agaricus')
  ) {
    flags.push({
      id: 'white_gill_ambiguity',
      fields: ['gill_color'],
      question: 'Are the gills truly white, or could they be very pale pink? Young Agaricus have pale pink gills that darken with age.',
      explanation: 'Amanita gills stay white. Agaricus gills start pale pink and turn brown. This distinction is safety-critical.',
      relevant_genera: ['Amanita', 'Agaricus'],
    });
  }

  // Macrolepiota without cap size → dangerous Lepiota confusion
  if (genera.has('Macrolepiota') && observation.cap_size_cm == null) {
    flags.push({
      id: 'parasol_size',
      fields: ['cap_size_cm'],
      question: 'What is the cap diameter? This is critical — small "parasols" (under 10cm) may be deadly Lepiota species, not true Parasols.',
      explanation: 'Macrolepiota (Parasol) has caps 10-30cm. Small Lepiota species look similar but are lethally toxic. Size is the first safety check.',
      relevant_genera: ['Macrolepiota'],
    });
  }

  return flags;
}
