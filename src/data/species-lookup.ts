import type { DatasetSpecies } from '@/types/species';
import { pruneForPrompt } from './species-pruning';

/**
 * Dangerous species that should be auto-included when candidates share
 * genus-level similarity. Maps genus keywords to scientific names of
 * critical danger species that could be confused.
 */
const SAFETY_SPECIES_BY_GENUS: Record<string, string[]> = {
  // Any Agaricus (field/horse mushroom) → include Death Cap + Destroying Angel + Fool's Funnel
  Agaricus: [
    'Amanita phalloides', // Death Cap
    'Amanita virosa', // Destroying Angel
    'Clitocybe rivulosa', // Fool's Funnel
  ],
  // Any Amanita → include Death Cap + Destroying Angel + Panthercap
  Amanita: [
    'Amanita phalloides',
    'Amanita virosa',
    'Amanita pantherina',
  ],
  // Any Clitocybe → include Fool's Funnel
  Clitocybe: ['Clitocybe rivulosa'],
  // Any Galerina → include Funeral Bell
  Galerina: ['Galerina marginata'],
  // Any Cortinarius → include Deadly Webcap
  Cortinarius: ['Cortinarius rubellus'],
  // Any small Lepiota → include deadly Lepiota
  Lepiota: ['Lepiota brunneoincarnata'],
};

/**
 * Normalise a name for fuzzy matching.
 * Strips spaces, hyphens, "the " prefix, and lowercases.
 */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[\s\-]/g, '');
}

/**
 * Find a single species by common name or scientific name.
 * Tries exact match first, then case-insensitive, then fuzzy (spacing/hyphens).
 * Also matches partial scientific names against slash-separated values
 * (e.g. "Rubroboletus satanas" matches "Boletus / Rubroboletus satanas").
 */
export function findSpeciesByName(
  name: string,
  dataset: DatasetSpecies[],
): DatasetSpecies | undefined {
  // Exact match on name or scientific_name
  const exact = dataset.find(
    (s) => s.name === name || s.scientific_name === name,
  );
  if (exact) return exact;

  // Case-insensitive match
  const lower = name.toLowerCase();
  const caseInsensitive = dataset.find(
    (s) =>
      s.name.toLowerCase() === lower ||
      s.scientific_name.toLowerCase() === lower,
  );
  if (caseInsensitive) return caseInsensitive;

  // Fuzzy match: normalise away spaces, hyphens, "the " prefix
  const normalised = normaliseName(name);
  const fuzzy = dataset.find(
    (s) =>
      normaliseName(s.name) === normalised ||
      normaliseName(s.scientific_name) === normalised,
  );
  if (fuzzy) return fuzzy;

  // Slash-separated scientific name match (e.g. "Boletus / Rubroboletus satanas")
  const slashMatch = dataset.find((s) => {
    if (!s.scientific_name.includes('/')) return false;
    const parts = s.scientific_name.split('/').map((p) => p.trim().toLowerCase());
    return parts.some((part) => part === lower);
  });
  if (slashMatch) return slashMatch;

  return undefined;
}

/**
 * Extract scientific names of confusion species from a species entry's
 * `possible_confusion` text. Looks for patterns like "Name (Scientific name)".
 */
export function extractConfusionSpeciesNames(
  species: DatasetSpecies,
): string[] {
  if (!species.possible_confusion) return [];

  // Match scientific names in parentheses — pattern: (Genus species)
  // where Genus starts with uppercase and species is lowercase
  const regex = /\(([A-Z][a-z]+\s+[a-z]+(?:\s+var\.\s+[a-z]+)?)\)/g;
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(species.possible_confusion)) !== null) {
    const scientificName = match[1]!;
    if (!names.includes(scientificName)) {
      names.push(scientificName);
    }
  }

  return names;
}

export interface LookupOptions {
  maxResults?: number;
}

/**
 * Look up candidate species from the dataset, including confusion species
 * and safety-critical species for related genera.
 *
 * Returns deduplicated species entries, prioritising direct matches over
 * confusion/safety species when capped by maxResults.
 */
export function lookupCandidateSpecies(
  candidateNames: string[],
  dataset: DatasetSpecies[],
  options: LookupOptions = {},
): DatasetSpecies[] {
  const { maxResults } = options;

  // Phase 1: Direct matches
  const directMatches: DatasetSpecies[] = [];
  const seen = new Set<string>();

  for (const name of candidateNames) {
    const species = findSpeciesByName(name, dataset);
    if (species && !seen.has(species.scientific_name)) {
      directMatches.push(species);
      seen.add(species.scientific_name);
    }
  }

  // Phase 2: Confusion species from direct matches
  const confusionMatches: DatasetSpecies[] = [];
  for (const species of directMatches) {
    const confusionNames = extractConfusionSpeciesNames(species);
    for (const confName of confusionNames) {
      if (seen.has(confName)) continue;
      const confSpecies = findSpeciesByName(confName, dataset);
      if (confSpecies) {
        confusionMatches.push(confSpecies);
        seen.add(confSpecies.scientific_name);
      }
    }
  }

  // Phase 3: Safety species based on genus of direct matches
  const safetyMatches: DatasetSpecies[] = [];
  for (const species of directMatches) {
    const genus = species.scientific_name.split(' ')[0]!;
    const safetySpeciesNames = SAFETY_SPECIES_BY_GENUS[genus];
    if (!safetySpeciesNames) continue;

    for (const safetyName of safetySpeciesNames) {
      if (seen.has(safetyName)) continue;
      const safetySpecies = dataset.find(
        (s) => s.scientific_name === safetyName,
      );
      if (safetySpecies) {
        safetyMatches.push(safetySpecies);
        seen.add(safetySpecies.scientific_name);
      }
    }
  }

  // Combine: direct matches first, then confusion, then safety
  const combined = [...directMatches, ...confusionMatches, ...safetyMatches];

  if (maxResults && combined.length > maxResults) {
    // Always keep direct matches, then fill with confusion + safety
    if (directMatches.length >= maxResults) {
      return directMatches.slice(0, maxResults);
    }
    const remaining = maxResults - directMatches.length;
    const extras = [...confusionMatches, ...safetyMatches].slice(0, remaining);
    return [...directMatches, ...extras];
  }

  return combined;
}

/**
 * Serialize species entries for injection into the Stage 2 verification prompt.
 * Reuses the existing pruneForPrompt to strip unnecessary fields and nulls.
 */
export function serializeForVerification(species: DatasetSpecies[]): string {
  return pruneForPrompt(species);
}
