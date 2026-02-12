import type { Observation } from '@/types';
import type { FeatureRule } from './feature-rules';

/**
 * A negated term extracted from description_notes.
 * E.g. "not rolled" → { negatedTerm: 'rolled', fullPhrase: 'not rolled' }
 */
export interface NegatedTerm {
  negatedTerm: string;
  fullPhrase: string;
}

/**
 * Result of preprocessing description_notes for negations and genus exclusions.
 */
export interface PreprocessingResult {
  negations: NegatedTerm[];
  genusExclusions: string[];
  /** Synthetic contra-rules generated from negations matching existing positive rules */
  contraRules: FeatureRule[];
}

/**
 * Known genus names (capitalised) for matching in free text.
 */
const KNOWN_GENERA = [
  'Russula', 'Lactarius', 'Boletus', 'Amanita', 'Agaricus',
  'Cantharellus', 'Pleurotus', 'Macrolepiota', 'Coprinopsis',
  'Hydnum', 'Laetiporus', 'Fistulina', 'Marasmius', 'Craterellus',
  'Sparassis', 'Calvatia', 'Leccinum', 'Armillaria', 'Clitocybe',
  'Lepista',
];

/** Map from lowercase genus name → canonical capitalised form */
const GENUS_LOOKUP = new Map(
  KNOWN_GENERA.map((g) => [g.toLowerCase(), g]),
);

/**
 * Negation patterns: capture the word(s) after the negation keyword.
 * Each regex should have one capture group for the negated term.
 */
const NEGATION_PATTERNS: RegExp[] = [
  /\bnot\s+(\w+)/gi,
  /\bno\s+(\w+)/gi,
  /\bnever\s+(\w+)/gi,
  /\bwithout\s+(?:a\s+)?(\w+)/gi,
  /\bdoesn['']t\s+(\w+)/gi,
  /\bdoes\s+not\s+(\w+)/gi,
  /\bisn['']t\s+(\w+)/gi,
  /\bhasn['']t\s+(\w+)/gi,
  /\bhas\s+no\s+(\w+)/gi,
  /\blacks?\s+(?:a\s+)?(\w+)/gi,
  /\babsence\s+of\s+(\w+)/gi,
];

/**
 * Genus-exclusion patterns: "unlikely a Clitocybe", "not a Russula", "rules out Boletus", etc.
 * Each regex has one capture group for the genus name.
 */
const EXCLUSION_PATTERNS: RegExp[] = [
  /\bunlikely\s+(?:a\s+)?(\w+)/gi,
  /\bnot\s+(?:a\s+)?(\w+)/gi,
  /\brules?\s+out\s+(\w+)/gi,
  /\bcan['']t\s+be\s+(\w+)/gi,
  /\bcannot\s+be\s+(\w+)/gi,
  /\bprobably\s+not\s+(?:a\s+)?(\w+)/gi,
  /\bdefinitely\s+not\s+(?:a\s+)?(\w+)/gi,
  /\bexcludes?\s+(\w+)/gi,
];

/**
 * Parse negation patterns from a description string.
 * Returns all negated terms found.
 */
export function parseNegations(text: string): NegatedTerm[] {
  const results: NegatedTerm[] = [];
  const seen = new Set<string>();

  for (const pattern of NEGATION_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const negatedTerm = match[1]!.toLowerCase();
      // Skip genus names caught here — they're handled by parseGenusExclusions
      if (GENUS_LOOKUP.has(negatedTerm)) continue;
      // Skip very common filler words that aren't meaningful negations
      if (['the', 'a', 'an', 'it', 'this', 'that', 'very', 'quite'].includes(negatedTerm)) continue;

      if (!seen.has(negatedTerm)) {
        seen.add(negatedTerm);
        results.push({
          negatedTerm,
          fullPhrase: match[0],
        });
      }
    }
  }

  return results;
}

/**
 * Parse genus exclusion patterns from a description string.
 * Returns canonical genus names the user wants to exclude.
 */
export function parseGenusExclusions(text: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();

  for (const pattern of EXCLUSION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const candidate = match[1]!.toLowerCase();
      const canonical = GENUS_LOOKUP.get(candidate);
      if (canonical && !seen.has(canonical)) {
        seen.add(canonical);
        results.push(canonical);
      }
    }
  }

  return results;
}

/**
 * Preprocess description_notes to extract negations and genus exclusions,
 * then generate synthetic contra-rules that penalise genera whose positive
 * description_notes rules match the negated terms.
 */
export function preprocessDescriptionNotes(
  observation: Observation,
  rules: FeatureRule[],
): PreprocessingResult {
  const notes = observation.description_notes;
  if (!notes) {
    return { negations: [], genusExclusions: [], contraRules: [] };
  }

  const negations = parseNegations(notes);
  const genusExclusions = parseGenusExclusions(notes);
  const contraRules: FeatureRule[] = [];

  // For each negated term, find positive description_notes rules that match it
  // and generate contra-evidence against those genera.
  const descRules = rules.filter(
    (r) => r.field === 'description_notes' && r.supporting,
  );

  for (const neg of negations) {
    for (const rule of descRules) {
      if (rule.match.type !== 'includes') continue;
      const ruleValue = rule.match.value.toLowerCase();
      // If the negated term appears in the rule's search value or vice versa,
      // the user is negating something that would have supported this genus
      if (ruleValue.includes(neg.negatedTerm) || neg.negatedTerm.includes(ruleValue)) {
        contraRules.push({
          id: `negation-${neg.negatedTerm}-${rule.genus}`,
          field: 'description_notes',
          match: { type: 'present' }, // always matches when description_notes exists
          genus: rule.genus,
          tier: rule.tier, // Same weight as the rule being negated
          supporting: false, // Contra-evidence
          description: `User stated "${neg.fullPhrase}" — contradicts ${rule.description.toLowerCase()}`,
        });
      }
    }
  }

  // For each genus exclusion, generate a strong contra-rule
  for (const genus of genusExclusions) {
    contraRules.push({
      id: `exclusion-user-${genus}`,
      field: 'description_notes',
      match: { type: 'present' },
      genus,
      tier: 'strong',
      supporting: false,
      description: `User explicitly stated this is unlikely to be ${genus}`,
    });
  }

  return { negations, genusExclusions, contraRules };
}
