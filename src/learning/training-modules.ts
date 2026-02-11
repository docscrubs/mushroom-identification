import type { GenusProfile } from '@/types/genus';
import type { TrainingModule, TrainingContent } from '@/types/learning';

/**
 * Generate training modules from a genus profile.
 * Returns 1-3 modules depending on available data:
 *   1. Genus overview (always)
 *   2. Lookalike comparison (if lookalikes exist)
 *   3. Foraging heuristics (if heuristics exist)
 */
export function generateTrainingModules(profile: GenusProfile): TrainingModule[] {
  const modules: TrainingModule[] = [];

  modules.push(buildOverviewModule(profile));

  if (profile.lookalike_genera.length > 0) {
    modules.push(buildLookalikeModule(profile));
  }

  if (profile.foraging_heuristics.length > 0) {
    modules.push(buildHeuristicModule(profile));
  }

  return modules;
}

/** Get training modules for a specific genus */
export function getModuleForGenus(
  profiles: GenusProfile[],
  genus: string,
): TrainingModule[] {
  const profile = profiles.find((p) => p.genus === genus);
  if (!profile) return [];
  return generateTrainingModules(profile);
}

function buildOverviewModule(profile: GenusProfile): TrainingModule {
  const content: TrainingContent[] = [];

  // Identification narrative
  if (profile.identification_narrative) {
    content.push({
      type: 'text',
      content: profile.identification_narrative,
    });
  }

  // Key markers
  const markers = [
    ...profile.confidence_markers.high.map((m) => `[High confidence] ${m}`),
    ...profile.confidence_markers.moderate.map((m) => `[Moderate] ${m}`),
  ];
  if (markers.length > 0) {
    content.push({
      type: 'text',
      content: `Key identification features:\n${markers.map((m) => `- ${m}`).join('\n')}`,
    });
  }

  // Ecology
  const eco = profile.ecological_context;
  const ecoLines: string[] = [];
  if (eco.habitat.length > 0) ecoLines.push(`Habitat: ${eco.habitat.join(', ')}`);
  if (eco.associations.length > 0) ecoLines.push(`Associated with: ${eco.associations.join(', ')}`);
  if (eco.season.UK.length > 0) ecoLines.push(`UK season: ${eco.season.UK.join(', ')}`);
  ecoLines.push(`Substrate: ${eco.substrate}`);
  content.push({
    type: 'text',
    content: `Ecology:\n${ecoLines.map((l) => `- ${l}`).join('\n')}`,
  });

  // Key species
  const edibles = profile.key_species_uk.edible;
  const toxics = profile.key_species_uk.toxic_or_inedible;

  if (edibles.length > 0) {
    const speciesList = edibles
      .map((s) => `- ${s.common_name} (${s.species}): ${s.notes}`)
      .join('\n');
    content.push({
      type: 'text',
      content: `Notable edible species:\n${speciesList}`,
    });
  }

  if (toxics.length > 0) {
    const speciesList = toxics
      .map((s) => `- ${s.common_name} (${s.species}): ${s.notes}`)
      .join('\n');
    content.push({
      type: 'text',
      content: `Toxic or inedible species to watch for:\n${speciesList}`,
    });
  }

  // Quiz: what's the defining feature?
  if (profile.confidence_markers.high.length > 0) {
    const correct = profile.confidence_markers.high[0]!;
    const wrong = [
      'Grows exclusively on dead wood',
      'Always has a ring on the stem',
      'Spore print is always black',
    ];
    const options = [correct, ...wrong];
    // Shuffle the correct answer to a random but deterministic position
    const correctIdx = profile.genus.length % options.length;
    const temp = options[correctIdx]!;
    options[correctIdx] = correct;
    options[0] = temp;

    content.push({
      type: 'quiz',
      content: `What is a high-confidence identification feature of ${profile.genus}?`,
      quiz_options: options,
      quiz_correct_index: correctIdx,
    });
  }

  return {
    module_id: `${profile.genus.toLowerCase()}_overview`,
    title: `${profile.genus} (${profile.common_names.join(', ')})`,
    description: `Overview of ${profile.genus} identification, ecology, and key species.`,
    genus: profile.genus,
    card_type: 'genus_recognition',
    difficulty: 'beginner',
    content,
    associated_card_ids: [],
  };
}

function buildLookalikeModule(profile: GenusProfile): TrainingModule {
  const content: TrainingContent[] = [];

  content.push({
    type: 'text',
    content: `${profile.genus} can be confused with the following genera. Learning the distinguishing features is essential for safe foraging.`,
  });

  for (const lookalike of profile.lookalike_genera) {
    content.push({
      type: 'text',
      content: `${lookalike.genus} (danger: ${lookalike.danger_level})\n${lookalike.distinction}`,
    });
  }

  // Quiz: distinguish from top lookalike
  if (profile.lookalike_genera.length > 0) {
    const top = profile.lookalike_genera[0]!;
    content.push({
      type: 'quiz',
      content: `How do you distinguish ${profile.genus} from ${top.genus}?`,
      quiz_options: [
        top.distinction,
        `${profile.genus} always grows on wood`,
        `${top.genus} has a ring on the stem`,
        'They cannot be distinguished in the field',
      ],
      quiz_correct_index: 0,
    });
  }

  return {
    module_id: `${profile.genus.toLowerCase()}_lookalike`,
    title: `${profile.genus} vs Lookalikes`,
    description: `Learn to distinguish ${profile.genus} from similar genera.`,
    genus: profile.genus,
    card_type: 'discrimination_pair',
    difficulty: 'intermediate',
    content,
    associated_card_ids: [],
  };
}

function buildHeuristicModule(profile: GenusProfile): TrainingModule {
  const content: TrainingContent[] = [];

  content.push({
    type: 'text',
    content: `Field techniques for ${profile.genus}:`,
  });

  for (const h of profile.foraging_heuristics) {
    content.push({
      type: 'text',
      content: `${h.heuristic_id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}: ${h.description}`,
    });
  }

  // Quiz on the first heuristic
  if (profile.foraging_heuristics.length > 0) {
    const h = profile.foraging_heuristics[0]!;
    content.push({
      type: 'quiz',
      content: `What is the purpose of the "${h.heuristic_id.replace(/_/g, ' ')}" technique?`,
      quiz_options: [
        h.description,
        'To determine the age of the specimen',
        'To identify the substrate type',
        'To measure spore size',
      ],
      quiz_correct_index: 0,
    });
  }

  return {
    module_id: `${profile.genus.toLowerCase()}_heuristic`,
    title: `${profile.genus} Field Techniques`,
    description: `Practical heuristics and field tests for ${profile.genus}.`,
    genus: profile.genus,
    card_type: 'heuristic_recall',
    difficulty: 'intermediate',
    content,
    associated_card_ids: [],
  };
}
