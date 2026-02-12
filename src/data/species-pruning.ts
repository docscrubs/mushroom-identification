import type { DatasetSpecies } from '@/types/species';

/**
 * Fields to strip from species data before injecting into the LLM system prompt.
 * These are either not useful for identification or too large/redundant.
 */
const FIELDS_TO_STRIP: (keyof DatasetSpecies)[] = [
  'source_url',
  'other_facts',
  'synonyms',
  'common_names',
  'extra_features',
  'frequency',
];

/**
 * Fields that must always be preserved in the pruned output.
 * Safety-critical and morphological fields the LLM needs for identification.
 */
export const REQUIRED_FIELDS: (keyof DatasetSpecies)[] = [
  'name',
  'scientific_name',
  'edibility',
  'cap',
  'under_cap_description',
  'stem',
  'flesh',
  'habitat',
  'possible_confusion',
  'spore_print',
  'taste',
  'smell',
  'edibility_detail',
  'diagnostic_features',
  'safety_checks',
];

/**
 * Strip unnecessary fields and null values from species data
 * to fit within the LLM context window.
 *
 * Returns a minified JSON string ready for system prompt injection.
 */
export function pruneForPrompt(species: DatasetSpecies[]): string {
  const pruned = species.map((entry) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      // Skip stripped fields
      if (FIELDS_TO_STRIP.includes(key as keyof DatasetSpecies)) continue;
      // Skip null values
      if (value === null) continue;
      result[key] = value;
    }
    return result;
  });

  return JSON.stringify(pruned);
}

/**
 * Estimate token count from character count.
 * Uses ~3.5 characters per token as a rough heuristic for English + JSON.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}
