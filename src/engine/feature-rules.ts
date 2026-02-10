import type { EvidenceTier } from '@/types';
import type { Observation } from '@/types';

/**
 * How a feature rule matches against an observation field.
 */
export type FeatureMatch =
  | { type: 'equals'; value: string | boolean | number }
  | { type: 'includes'; value: string }
  | { type: 'one_of'; values: string[] }
  | { type: 'range'; min?: number; max?: number }
  | { type: 'present' }
  | { type: 'absent' };

/**
 * A structured rule that maps an observation field to evidence for/against a genus.
 *
 * Example: { field: 'flesh_texture', match: { type: 'equals', value: 'brittle' },
 *            genus: 'Russula', tier: 'definitive', supporting: true }
 * Means: if the user says flesh_texture is 'brittle', that's definitive evidence FOR Russula.
 */
export interface FeatureRule {
  id: string;
  field: keyof Observation;
  match: FeatureMatch;
  genus: string;
  tier: EvidenceTier;
  supporting: boolean; // true = FOR this genus, false = AGAINST
  description: string; // human-readable explanation
}

/**
 * Check whether a single feature rule matches an observation.
 */
export function matchesRule(
  observation: Observation,
  rule: FeatureRule,
): boolean {
  const value = observation[rule.field];

  // If the field isn't observed, the rule can't match
  // (except 'absent' which matches when field IS null/undefined)
  if (rule.match.type === 'absent') {
    return value === null || value === undefined;
  }

  if (rule.match.type === 'present') {
    return value !== null && value !== undefined;
  }

  if (value === null || value === undefined) {
    return false;
  }

  switch (rule.match.type) {
    case 'equals':
      return value === rule.match.value;
    case 'includes': {
      const needle = rule.match.value.toLowerCase();
      if (typeof value === 'string') {
        return value.toLowerCase().includes(needle);
      }
      if (Array.isArray(value)) {
        return value.some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(needle),
        );
      }
      return false;
    }
    case 'one_of': {
      if (typeof value === 'string') {
        return rule.match.values.some(
          (v) => v.toLowerCase() === value.toLowerCase(),
        );
      }
      return false;
    }
    case 'range': {
      if (typeof value !== 'number') return false;
      const { min, max } = rule.match;
      if (min !== undefined && value < min) return false;
      if (max !== undefined && value > max) return false;
      return true;
    }
  }
}

/**
 * Core feature rules for the seed genera.
 * These define how observation fields map to evidence for/against each genus.
 */
export const featureRules: FeatureRule[] = [
  // === RUSSULA ===
  // Definitive
  {
    id: 'russula-brittle-flesh',
    field: 'flesh_texture',
    match: { type: 'equals', value: 'brittle' },
    genus: 'Russula',
    tier: 'definitive',
    supporting: true,
    description: 'Brittle, chalky flesh that snaps cleanly is definitive for Russula/Lactarius',
  },
  // Strong
  {
    id: 'russula-no-ring',
    field: 'ring_present',
    match: { type: 'equals', value: false },
    genus: 'Russula',
    tier: 'strong',
    supporting: true,
    description: 'Russula never has a ring',
  },
  {
    id: 'russula-no-volva',
    field: 'volva_present',
    match: { type: 'equals', value: false },
    genus: 'Russula',
    tier: 'strong',
    supporting: true,
    description: 'Russula never has a volva',
  },
  {
    id: 'russula-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Russula',
    tier: 'strong',
    supporting: true,
    description: 'Russula has gills (not pores or teeth)',
  },
  // Moderate
  {
    id: 'russula-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'parkland'] },
    genus: 'Russula',
    tier: 'moderate',
    supporting: true,
    description: 'Russula grows in woodland, forest edges, and parkland',
  },
  {
    id: 'russula-soil',
    field: 'substrate',
    match: { type: 'includes', value: 'soil' },
    genus: 'Russula',
    tier: 'moderate',
    supporting: true,
    description: 'Russula grows from soil (never on wood)',
  },
  {
    id: 'russula-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Russula',
    tier: 'moderate',
    supporting: true,
    description: 'Russula fruits July-November in the UK',
  },
  {
    id: 'russula-spore-print',
    field: 'spore_print_color',
    match: { type: 'one_of', values: ['white', 'cream', 'pale cream'] },
    genus: 'Russula',
    tier: 'moderate',
    supporting: true,
    description: 'Most Russula have white to cream spore prints',
  },
  // Exclusionary
  {
    id: 'russula-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Russula',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Russula entirely',
  },
  {
    id: 'russula-exclude-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Russula',
    tier: 'exclusionary',
    supporting: false,
    description: 'A ring rules out Russula',
  },
  {
    id: 'russula-exclude-volva',
    field: 'volva_present',
    match: { type: 'equals', value: true },
    genus: 'Russula',
    tier: 'exclusionary',
    supporting: false,
    description: 'A volva rules out Russula',
  },
  {
    id: 'russula-exclude-wood',
    field: 'substrate',
    match: { type: 'equals', value: 'wood' },
    genus: 'Russula',
    tier: 'exclusionary',
    supporting: false,
    description: 'Growing on wood rules out Russula (strictly mycorrhizal)',
  },

  // === LACTARIUS ===
  // Definitive
  {
    id: 'lactarius-brittle-flesh',
    field: 'flesh_texture',
    match: { type: 'equals', value: 'brittle' },
    genus: 'Lactarius',
    tier: 'definitive',
    supporting: true,
    description: 'Brittle flesh is definitive for Russula/Lactarius family',
  },
  // Strong
  {
    id: 'lactarius-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Lactarius',
    tier: 'strong',
    supporting: true,
    description: 'Lactarius has gills',
  },
  // Moderate
  {
    id: 'lactarius-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'parkland'] },
    genus: 'Lactarius',
    tier: 'moderate',
    supporting: true,
    description: 'Lactarius grows in woodland (mycorrhizal)',
  },
  {
    id: 'lactarius-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Lactarius',
    tier: 'moderate',
    supporting: true,
    description: 'Lactarius fruits July-November in the UK',
  },
  // Exclusionary
  {
    id: 'lactarius-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Lactarius',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Lactarius',
  },

  // === BOLETUS (Boletaceae) ===
  // Definitive
  {
    id: 'boletus-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Boletus',
    tier: 'definitive',
    supporting: true,
    description: 'Sponge-like pore surface is definitive for boletes',
  },
  // Strong
  {
    id: 'boletus-stem',
    field: 'stem_present',
    match: { type: 'equals', value: true },
    genus: 'Boletus',
    tier: 'strong',
    supporting: true,
    description: 'Boletes have a central stem',
  },
  // Moderate
  {
    id: 'boletus-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'parkland'] },
    genus: 'Boletus',
    tier: 'moderate',
    supporting: true,
    description: 'Most boletes are woodland mycorrhizal species',
  },
  {
    id: 'boletus-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Boletus',
    tier: 'moderate',
    supporting: true,
    description: 'Boletes fruit mainly July-November',
  },
  // Exclusionary
  {
    id: 'boletus-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Boletus',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out boletes',
  },

  // === AMANITA ===
  // Strong (volva is the key Amanita marker)
  {
    id: 'amanita-volva',
    field: 'volva_present',
    match: { type: 'equals', value: true },
    genus: 'Amanita',
    tier: 'strong',
    supporting: true,
    description: 'A volva at the base is a strong Amanita signal',
  },
  {
    id: 'amanita-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Amanita',
    tier: 'strong',
    supporting: true,
    description: 'Most Amanita have a ring on the stem',
  },
  {
    id: 'amanita-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Amanita',
    tier: 'strong',
    supporting: true,
    description: 'Amanita has gills',
  },
  {
    id: 'amanita-white-gills',
    field: 'gill_color',
    match: { type: 'one_of', values: ['white', 'pure white'] },
    genus: 'Amanita',
    tier: 'strong',
    supporting: true,
    description: 'Amanita typically has white gills',
  },
  // Moderate
  {
    id: 'amanita-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'parkland'] },
    genus: 'Amanita',
    tier: 'moderate',
    supporting: true,
    description: 'Amanita grows with trees (mycorrhizal)',
  },
  {
    id: 'amanita-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Amanita',
    tier: 'moderate',
    supporting: true,
    description: 'Amanita fruits mainly late summer to autumn',
  },
  // Exclusionary
  {
    id: 'amanita-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Amanita',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Amanita',
  },
  {
    id: 'amanita-exclude-brittle',
    field: 'flesh_texture',
    match: { type: 'equals', value: 'brittle' },
    genus: 'Amanita',
    tier: 'exclusionary',
    supporting: false,
    description: 'Brittle flesh rules out Amanita (Amanita flesh is fibrous)',
  },

  // === AGARICUS ===
  // Strong
  {
    id: 'agaricus-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Agaricus',
    tier: 'strong',
    supporting: true,
    description: 'Agaricus has gills',
  },
  {
    id: 'agaricus-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Agaricus',
    tier: 'strong',
    supporting: true,
    description: 'Agaricus typically has a ring',
  },
  {
    id: 'agaricus-pink-brown-gills',
    field: 'gill_color',
    match: { type: 'one_of', values: ['pink', 'brown', 'chocolate brown', 'dark brown'] },
    genus: 'Agaricus',
    tier: 'strong',
    supporting: true,
    description: 'Agaricus gills are pink (young) to chocolate brown (mature)',
  },
  {
    id: 'agaricus-brown-spore',
    field: 'spore_print_color',
    match: { type: 'one_of', values: ['brown', 'dark brown', 'chocolate brown'] },
    genus: 'Agaricus',
    tier: 'strong',
    supporting: true,
    description: 'Agaricus has a dark brown/chocolate spore print',
  },
  // Moderate
  {
    id: 'agaricus-grassland',
    field: 'habitat',
    match: { type: 'one_of', values: ['grassland', 'meadow', 'field', 'lawn', 'pasture'] },
    genus: 'Agaricus',
    tier: 'moderate',
    supporting: true,
    description: 'Many Agaricus species grow in grassland',
  },
  {
    id: 'agaricus-anise-smell',
    field: 'smell',
    match: { type: 'one_of', values: ['anise', 'aniseed', 'mushroomy'] },
    genus: 'Agaricus',
    tier: 'moderate',
    supporting: true,
    description: 'Many Agaricus smell of anise or have a mushroomy smell',
  },
  // Exclusionary
  {
    id: 'agaricus-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Agaricus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Agaricus',
  },
  {
    id: 'agaricus-exclude-white-gills',
    field: 'gill_color',
    match: { type: 'one_of', values: ['white', 'pure white'] },
    genus: 'Agaricus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pure white gills rule out Agaricus (would suggest Amanita)',
  },

  // === CANTHARELLUS (Chanterelle) ===
  // Definitive
  {
    id: 'cantharellus-ridges',
    field: 'gill_type',
    match: { type: 'equals', value: 'ridges' },
    genus: 'Cantharellus',
    tier: 'definitive',
    supporting: true,
    description: 'Chanterelles have forked ridges, not true gills',
  },
  // Strong
  {
    id: 'cantharellus-yellow-cap',
    field: 'cap_color',
    match: { type: 'includes', value: 'yellow' },
    genus: 'Cantharellus',
    tier: 'strong',
    supporting: true,
    description: 'Chanterelles are typically egg-yellow to golden',
  },
  {
    id: 'cantharellus-apricot-smell',
    field: 'smell',
    match: { type: 'one_of', values: ['apricot', 'fruity', 'apricots'] },
    genus: 'Cantharellus',
    tier: 'strong',
    supporting: true,
    description: 'Chanterelles have a distinctive apricot/fruity smell',
  },
  // Moderate
  {
    id: 'cantharellus-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'parkland'] },
    genus: 'Cantharellus',
    tier: 'moderate',
    supporting: true,
    description: 'Chanterelles grow in woodland (mycorrhizal)',
  },
  {
    id: 'cantharellus-soil',
    field: 'substrate',
    match: { type: 'includes', value: 'soil' },
    genus: 'Cantharellus',
    tier: 'moderate',
    supporting: true,
    description: 'Chanterelles grow from soil, not wood',
  },
  {
    id: 'cantharellus-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Cantharellus',
    tier: 'moderate',
    supporting: true,
    description: 'Chanterelles fruit July-November in the UK',
  },
  // Exclusionary
  {
    id: 'cantharellus-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Cantharellus',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Cantharellus (has ridges/false gills)',
  },
  {
    id: 'cantharellus-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Cantharellus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Cantharellus',
  },

  // === PLEUROTUS (Oyster Mushroom) ===
  // Strong
  {
    id: 'pleurotus-wood',
    field: 'substrate',
    match: { type: 'equals', value: 'wood' },
    genus: 'Pleurotus',
    tier: 'strong',
    supporting: true,
    description: 'Oyster mushrooms grow on wood (saprotrophic)',
  },
  {
    id: 'pleurotus-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Pleurotus',
    tier: 'strong',
    supporting: true,
    description: 'Oyster mushrooms have decurrent gills',
  },
  {
    id: 'pleurotus-clustered',
    field: 'growth_pattern',
    match: { type: 'one_of', values: ['clustered', 'overlapping', 'tiered'] },
    genus: 'Pleurotus',
    tier: 'strong',
    supporting: true,
    description: 'Oyster mushrooms grow in overlapping clusters on wood',
  },
  // Moderate
  {
    id: 'pleurotus-white-spore',
    field: 'spore_print_color',
    match: { type: 'one_of', values: ['white', 'cream', 'pale lilac'] },
    genus: 'Pleurotus',
    tier: 'moderate',
    supporting: true,
    description: 'Oyster mushroom spore print is white to pale lilac',
  },
  {
    id: 'pleurotus-anise-smell',
    field: 'smell',
    match: { type: 'one_of', values: ['anise', 'aniseed', 'mushroomy', 'pleasant'] },
    genus: 'Pleurotus',
    tier: 'moderate',
    supporting: true,
    description: 'Oyster mushrooms have a pleasant anise/mushroomy smell',
  },
  // Exclusionary
  {
    id: 'pleurotus-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Pleurotus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Pleurotus',
  },
  {
    id: 'pleurotus-exclude-soil',
    field: 'substrate',
    match: { type: 'equals', value: 'soil' },
    genus: 'Pleurotus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Growing from soil rules out Pleurotus (must be on wood)',
  },

  // === MACROLEPIOTA (Parasol) ===
  // Strong
  {
    id: 'macrolepiota-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Macrolepiota',
    tier: 'strong',
    supporting: true,
    description: 'Parasol mushrooms have free white gills',
  },
  {
    id: 'macrolepiota-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Macrolepiota',
    tier: 'strong',
    supporting: true,
    description: 'Parasol mushrooms have a large, movable double ring',
  },
  {
    id: 'macrolepiota-no-volva',
    field: 'volva_present',
    match: { type: 'equals', value: false },
    genus: 'Macrolepiota',
    tier: 'strong',
    supporting: true,
    description: 'Parasol mushrooms do NOT have a volva (unlike Amanita)',
  },
  {
    id: 'macrolepiota-large',
    field: 'cap_size_cm',
    match: { type: 'range', min: 10 },
    genus: 'Macrolepiota',
    tier: 'strong',
    supporting: true,
    description: 'Parasol cap is typically 10-30cm across',
  },
  // Moderate
  {
    id: 'macrolepiota-grassland',
    field: 'habitat',
    match: { type: 'one_of', values: ['grassland', 'meadow', 'field', 'parkland'] },
    genus: 'Macrolepiota',
    tier: 'moderate',
    supporting: true,
    description: 'Parasol mushrooms favour grassland and woodland edges',
  },
  {
    id: 'macrolepiota-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Macrolepiota',
    tier: 'moderate',
    supporting: true,
    description: 'Parasol fruits July-November',
  },
  // Exclusionary
  {
    id: 'macrolepiota-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Macrolepiota',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Macrolepiota',
  },
  {
    id: 'macrolepiota-exclude-volva',
    field: 'volva_present',
    match: { type: 'equals', value: true },
    genus: 'Macrolepiota',
    tier: 'exclusionary',
    supporting: false,
    description: 'A volva rules out Macrolepiota (suggests Amanita)',
  },

  // === COPRINOPSIS (Ink Caps) ===
  // Strong
  {
    id: 'coprinopsis-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Coprinopsis',
    tier: 'strong',
    supporting: true,
    description: 'Ink caps have crowded, thin gills',
  },
  {
    id: 'coprinopsis-inky',
    field: 'bruising_color',
    match: { type: 'includes', value: 'ink' },
    genus: 'Coprinopsis',
    tier: 'strong',
    supporting: true,
    description: 'Ink caps deliquesce (dissolve) into inky black liquid',
  },
  // Moderate
  {
    id: 'coprinopsis-grassland',
    field: 'habitat',
    match: { type: 'one_of', values: ['grassland', 'garden', 'lawn', 'parkland', 'woodland'] },
    genus: 'Coprinopsis',
    tier: 'moderate',
    supporting: true,
    description: 'Ink caps grow in a variety of habitats',
  },
  {
    id: 'coprinopsis-clustered',
    field: 'growth_pattern',
    match: { type: 'one_of', values: ['clustered', 'scattered'] },
    genus: 'Coprinopsis',
    tier: 'moderate',
    supporting: true,
    description: 'Ink caps often grow in groups',
  },
  // Exclusionary
  {
    id: 'coprinopsis-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Coprinopsis',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Coprinopsis',
  },

  // === HYDNUM (Hedgehog Fungus) ===
  // Definitive
  {
    id: 'hydnum-teeth',
    field: 'gill_type',
    match: { type: 'equals', value: 'teeth' },
    genus: 'Hydnum',
    tier: 'definitive',
    supporting: true,
    description: 'Teeth/spines under the cap are definitive for Hydnum',
  },
  // Strong
  {
    id: 'hydnum-cream-cap',
    field: 'cap_color',
    match: { type: 'one_of', values: ['cream', 'pale orange', 'buff', 'peach'] },
    genus: 'Hydnum',
    tier: 'strong',
    supporting: true,
    description: 'Hedgehog fungus has a cream to pale orange cap',
  },
  // Moderate
  {
    id: 'hydnum-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest'] },
    genus: 'Hydnum',
    tier: 'moderate',
    supporting: true,
    description: 'Hedgehog fungus grows in woodland',
  },
  {
    id: 'hydnum-soil',
    field: 'substrate',
    match: { type: 'includes', value: 'soil' },
    genus: 'Hydnum',
    tier: 'moderate',
    supporting: true,
    description: 'Hedgehog fungus grows from soil',
  },
  {
    id: 'hydnum-season',
    field: 'season_month',
    match: { type: 'range', min: 8, max: 12 },
    genus: 'Hydnum',
    tier: 'moderate',
    supporting: true,
    description: 'Hedgehog fungus fruits August-December',
  },
  // Exclusionary
  {
    id: 'hydnum-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Hydnum',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Hydnum (has teeth)',
  },
  {
    id: 'hydnum-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Hydnum',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Hydnum',
  },

  // === LAETIPORUS (Chicken of the Woods) ===
  // Strong
  {
    id: 'laetiporus-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Laetiporus',
    tier: 'strong',
    supporting: true,
    description: 'Chicken of the Woods has a pore surface',
  },
  {
    id: 'laetiporus-wood',
    field: 'substrate',
    match: { type: 'equals', value: 'wood' },
    genus: 'Laetiporus',
    tier: 'strong',
    supporting: true,
    description: 'Chicken of the Woods grows on living/dead trees',
  },
  {
    id: 'laetiporus-orange',
    field: 'cap_color',
    match: { type: 'includes', value: 'orange' },
    genus: 'Laetiporus',
    tier: 'strong',
    supporting: true,
    description: 'Chicken of the Woods is bright orange/yellow',
  },
  // Moderate
  {
    id: 'laetiporus-no-stem',
    field: 'stem_present',
    match: { type: 'equals', value: false },
    genus: 'Laetiporus',
    tier: 'moderate',
    supporting: true,
    description: 'Chicken of the Woods is a bracket fungus (no true stem)',
  },
  {
    id: 'laetiporus-tiered',
    field: 'growth_pattern',
    match: { type: 'one_of', values: ['tiered', 'clustered', 'overlapping'] },
    genus: 'Laetiporus',
    tier: 'moderate',
    supporting: true,
    description: 'Grows in overlapping tiers on tree trunks',
  },
  {
    id: 'laetiporus-season',
    field: 'season_month',
    match: { type: 'range', min: 5, max: 10 },
    genus: 'Laetiporus',
    tier: 'moderate',
    supporting: true,
    description: 'Fruits May-October',
  },
  // Exclusionary
  {
    id: 'laetiporus-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Laetiporus',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Laetiporus',
  },
  {
    id: 'laetiporus-exclude-soil',
    field: 'substrate',
    match: { type: 'equals', value: 'soil' },
    genus: 'Laetiporus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Growing from soil rules out Laetiporus (must be on wood)',
  },

  // === FISTULINA (Beefsteak Fungus) ===
  // Strong
  {
    id: 'fistulina-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Fistulina',
    tier: 'strong',
    supporting: true,
    description: 'Beefsteak fungus has a pore surface (tubular)',
  },
  {
    id: 'fistulina-wood',
    field: 'substrate',
    match: { type: 'equals', value: 'wood' },
    genus: 'Fistulina',
    tier: 'strong',
    supporting: true,
    description: 'Beefsteak fungus grows on oak and sweet chestnut',
  },
  {
    id: 'fistulina-red',
    field: 'cap_color',
    match: { type: 'one_of', values: ['red', 'dark red', 'blood red', 'liver'] },
    genus: 'Fistulina',
    tier: 'strong',
    supporting: true,
    description: 'Beefsteak fungus is dark red, resembling raw meat',
  },
  // Moderate
  {
    id: 'fistulina-no-stem',
    field: 'stem_present',
    match: { type: 'equals', value: false },
    genus: 'Fistulina',
    tier: 'moderate',
    supporting: true,
    description: 'Beefsteak fungus is a bracket (no stem or very short)',
  },
  {
    id: 'fistulina-season',
    field: 'season_month',
    match: { type: 'range', min: 8, max: 11 },
    genus: 'Fistulina',
    tier: 'moderate',
    supporting: true,
    description: 'Fruits August-November',
  },
  // Exclusionary
  {
    id: 'fistulina-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Fistulina',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Fistulina',
  },
  {
    id: 'fistulina-exclude-soil',
    field: 'substrate',
    match: { type: 'equals', value: 'soil' },
    genus: 'Fistulina',
    tier: 'exclusionary',
    supporting: false,
    description: 'Growing from soil rules out Fistulina (must be on wood)',
  },

  // === MARASMIUS (Fairy Ring Champignon) ===
  // Strong
  {
    id: 'marasmius-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Marasmius',
    tier: 'strong',
    supporting: true,
    description: 'Fairy ring champignon has widely-spaced gills',
  },
  {
    id: 'marasmius-tough',
    field: 'flesh_texture',
    match: { type: 'equals', value: 'tough' },
    genus: 'Marasmius',
    tier: 'strong',
    supporting: true,
    description: 'Marasmius has tough, wiry flesh that revives when wet',
  },
  {
    id: 'marasmius-ring-growth',
    field: 'growth_pattern',
    match: { type: 'one_of', values: ['ring', 'fairy ring', 'arc'] },
    genus: 'Marasmius',
    tier: 'strong',
    supporting: true,
    description: 'Fairy ring champignon often grows in rings or arcs',
  },
  // Moderate
  {
    id: 'marasmius-grassland',
    field: 'habitat',
    match: { type: 'one_of', values: ['grassland', 'lawn', 'meadow', 'parkland'] },
    genus: 'Marasmius',
    tier: 'moderate',
    supporting: true,
    description: 'Fairy ring champignon typically grows in grassland',
  },
  {
    id: 'marasmius-season',
    field: 'season_month',
    match: { type: 'range', min: 6, max: 11 },
    genus: 'Marasmius',
    tier: 'moderate',
    supporting: true,
    description: 'Fruits June-November',
  },
  // Exclusionary
  {
    id: 'marasmius-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Marasmius',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Marasmius',
  },

  // === CRATERELLUS (Horn of Plenty) ===
  // Definitive
  {
    id: 'craterellus-smooth',
    field: 'gill_type',
    match: { type: 'equals', value: 'smooth' },
    genus: 'Craterellus',
    tier: 'definitive',
    supporting: true,
    description: 'Horn of Plenty has a smooth to slightly wrinkled underside (no gills or pores)',
  },
  // Strong
  {
    id: 'craterellus-dark-cap',
    field: 'cap_color',
    match: { type: 'one_of', values: ['black', 'dark brown', 'dark grey', 'charcoal'] },
    genus: 'Craterellus',
    tier: 'strong',
    supporting: true,
    description: 'Horn of Plenty is very dark — black to dark brown',
  },
  // Moderate
  {
    id: 'craterellus-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest'] },
    genus: 'Craterellus',
    tier: 'moderate',
    supporting: true,
    description: 'Horn of Plenty grows in deciduous woodland',
  },
  {
    id: 'craterellus-soil',
    field: 'substrate',
    match: { type: 'includes', value: 'soil' },
    genus: 'Craterellus',
    tier: 'moderate',
    supporting: true,
    description: 'Horn of Plenty grows from soil among leaf litter',
  },
  {
    id: 'craterellus-season',
    field: 'season_month',
    match: { type: 'range', min: 9, max: 12 },
    genus: 'Craterellus',
    tier: 'moderate',
    supporting: true,
    description: 'Fruits September-December',
  },
  // Exclusionary
  {
    id: 'craterellus-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Craterellus',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Craterellus',
  },
  {
    id: 'craterellus-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Craterellus',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Craterellus',
  },

  // === SPARASSIS (Cauliflower Fungus) ===
  // Strong
  {
    id: 'sparassis-smooth',
    field: 'gill_type',
    match: { type: 'equals', value: 'smooth' },
    genus: 'Sparassis',
    tier: 'strong',
    supporting: true,
    description: 'Cauliflower fungus has no gills/pores — lobed, brain-like structure',
  },
  {
    id: 'sparassis-wood',
    field: 'substrate',
    match: { type: 'equals', value: 'wood' },
    genus: 'Sparassis',
    tier: 'strong',
    supporting: true,
    description: 'Cauliflower fungus grows at the base of conifer trunks',
  },
  {
    id: 'sparassis-cream',
    field: 'cap_color',
    match: { type: 'one_of', values: ['cream', 'white', 'pale yellow'] },
    genus: 'Sparassis',
    tier: 'strong',
    supporting: true,
    description: 'Cauliflower fungus is cream to pale yellow',
  },
  // Moderate
  {
    id: 'sparassis-season',
    field: 'season_month',
    match: { type: 'range', min: 8, max: 11 },
    genus: 'Sparassis',
    tier: 'moderate',
    supporting: true,
    description: 'Fruits August-November',
  },
  // Exclusionary
  {
    id: 'sparassis-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Sparassis',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Sparassis',
  },
  {
    id: 'sparassis-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Sparassis',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Sparassis',
  },

  // === CALVATIA / LYCOPERDON (Puffballs) ===
  // Strong
  {
    id: 'calvatia-smooth',
    field: 'gill_type',
    match: { type: 'equals', value: 'smooth' },
    genus: 'Calvatia',
    tier: 'strong',
    supporting: true,
    description: 'Puffballs have no gills or pores — interior is solid when young',
  },
  {
    id: 'calvatia-white',
    field: 'cap_color',
    match: { type: 'one_of', values: ['white', 'cream', 'pale'] },
    genus: 'Calvatia',
    tier: 'strong',
    supporting: true,
    description: 'Most puffballs are white when young',
  },
  // Moderate
  {
    id: 'calvatia-grassland',
    field: 'habitat',
    match: { type: 'one_of', values: ['grassland', 'meadow', 'lawn', 'parkland'] },
    genus: 'Calvatia',
    tier: 'moderate',
    supporting: true,
    description: 'Giant puffball favours grassland and meadow',
  },
  {
    id: 'calvatia-solitary',
    field: 'growth_pattern',
    match: { type: 'one_of', values: ['solitary', 'scattered'] },
    genus: 'Calvatia',
    tier: 'moderate',
    supporting: true,
    description: 'Puffballs typically grow solitary or scattered',
  },
  {
    id: 'calvatia-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Calvatia',
    tier: 'moderate',
    supporting: true,
    description: 'Puffballs fruit July-November',
  },
  // Exclusionary
  {
    id: 'calvatia-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Calvatia',
    tier: 'exclusionary',
    supporting: false,
    description: 'Gills rule out puffballs',
  },
  {
    id: 'calvatia-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Calvatia',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out puffballs',
  },

  // === LECCINUM (Rough-stemmed Boletes) ===
  // Definitive
  {
    id: 'leccinum-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Leccinum',
    tier: 'definitive',
    supporting: true,
    description: 'Leccinum has a sponge-like pore surface (bolete)',
  },
  // Strong
  {
    id: 'leccinum-stem',
    field: 'stem_present',
    match: { type: 'equals', value: true },
    genus: 'Leccinum',
    tier: 'strong',
    supporting: true,
    description: 'Leccinum has a tall stem with rough scales/scabers',
  },
  // Moderate
  {
    id: 'leccinum-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'parkland'] },
    genus: 'Leccinum',
    tier: 'moderate',
    supporting: true,
    description: 'Leccinum grows in woodland (mycorrhizal with birch, oak, etc.)',
  },
  {
    id: 'leccinum-season',
    field: 'season_month',
    match: { type: 'range', min: 7, max: 11 },
    genus: 'Leccinum',
    tier: 'moderate',
    supporting: true,
    description: 'Leccinum fruits July-November',
  },
  // Exclusionary
  {
    id: 'leccinum-exclude-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Leccinum',
    tier: 'exclusionary',
    supporting: false,
    description: 'True gills rule out Leccinum',
  },

  // === ARMILLARIA (Honey Fungus) ===
  // Strong
  {
    id: 'armillaria-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Armillaria',
    tier: 'strong',
    supporting: true,
    description: 'Honey fungus has gills',
  },
  {
    id: 'armillaria-wood',
    field: 'substrate',
    match: { type: 'equals', value: 'wood' },
    genus: 'Armillaria',
    tier: 'strong',
    supporting: true,
    description: 'Honey fungus grows on wood (parasitic/saprotrophic)',
  },
  {
    id: 'armillaria-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Armillaria',
    tier: 'strong',
    supporting: true,
    description: 'Honey fungus typically has a ring',
  },
  {
    id: 'armillaria-clustered',
    field: 'growth_pattern',
    match: { type: 'one_of', values: ['clustered', 'tufted'] },
    genus: 'Armillaria',
    tier: 'strong',
    supporting: true,
    description: 'Honey fungus grows in large clusters at base of trees/stumps',
  },
  // Moderate
  {
    id: 'armillaria-season',
    field: 'season_month',
    match: { type: 'range', min: 9, max: 12 },
    genus: 'Armillaria',
    tier: 'moderate',
    supporting: true,
    description: 'Honey fungus fruits September-December',
  },
  {
    id: 'armillaria-honey-cap',
    field: 'cap_color',
    match: { type: 'one_of', values: ['honey', 'yellow-brown', 'tawny', 'brown'] },
    genus: 'Armillaria',
    tier: 'moderate',
    supporting: true,
    description: 'Honey fungus cap is typically honey-brown',
  },
  // Exclusionary
  {
    id: 'armillaria-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Armillaria',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Armillaria',
  },
  {
    id: 'armillaria-exclude-soil',
    field: 'substrate',
    match: { type: 'equals', value: 'soil' },
    genus: 'Armillaria',
    tier: 'exclusionary',
    supporting: false,
    description: 'Growing from soil rules out Armillaria (must be on wood)',
  },

  // === CLITOCYBE (some edible, some deadly toxic) ===
  // Strong
  {
    id: 'clitocybe-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Clitocybe',
    tier: 'strong',
    supporting: true,
    description: 'Clitocybe has decurrent gills',
  },
  {
    id: 'clitocybe-funnel',
    field: 'cap_shape',
    match: { type: 'one_of', values: ['funnel', 'depressed', 'concave'] },
    genus: 'Clitocybe',
    tier: 'strong',
    supporting: true,
    description: 'Many Clitocybe species have funnel-shaped or depressed caps',
  },
  {
    id: 'clitocybe-no-ring',
    field: 'ring_present',
    match: { type: 'equals', value: false },
    genus: 'Clitocybe',
    tier: 'strong',
    supporting: true,
    description: 'Clitocybe does not have a ring',
  },
  // Moderate
  {
    id: 'clitocybe-leaf-litter',
    field: 'substrate',
    match: { type: 'one_of', values: ['leaf litter', 'soil'] },
    genus: 'Clitocybe',
    tier: 'moderate',
    supporting: true,
    description: 'Clitocybe often grows in leaf litter or on soil',
  },
  {
    id: 'clitocybe-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'forest', 'garden'] },
    genus: 'Clitocybe',
    tier: 'moderate',
    supporting: true,
    description: 'Clitocybe often found in woodland and gardens',
  },
  {
    id: 'clitocybe-season',
    field: 'season_month',
    match: { type: 'range', min: 9, max: 12 },
    genus: 'Clitocybe',
    tier: 'moderate',
    supporting: true,
    description: 'Clitocybe fruits mainly autumn to early winter',
  },
  {
    id: 'clitocybe-white-spore',
    field: 'spore_print_color',
    match: { type: 'one_of', values: ['white', 'cream', 'pale cream'] },
    genus: 'Clitocybe',
    tier: 'moderate',
    supporting: true,
    description: 'Clitocybe has a white to cream spore print',
  },
  // Exclusionary
  {
    id: 'clitocybe-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Clitocybe',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Clitocybe',
  },
  {
    id: 'clitocybe-exclude-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Clitocybe',
    tier: 'exclusionary',
    supporting: false,
    description: 'A ring rules out Clitocybe',
  },

  // === LEPISTA (Wood Blewit, Field Blewit) ===
  // Strong
  {
    id: 'lepista-gills',
    field: 'gill_type',
    match: { type: 'equals', value: 'gills' },
    genus: 'Lepista',
    tier: 'strong',
    supporting: true,
    description: 'Lepista has gills',
  },
  {
    id: 'lepista-lilac-stem',
    field: 'stem_color',
    match: { type: 'one_of', values: ['lilac', 'purple', 'violet', 'blue-lilac'] },
    genus: 'Lepista',
    tier: 'strong',
    supporting: true,
    description: 'Wood Blewit has a distinctive lilac/violet stem',
  },
  {
    id: 'lepista-no-ring',
    field: 'ring_present',
    match: { type: 'equals', value: false },
    genus: 'Lepista',
    tier: 'strong',
    supporting: true,
    description: 'Lepista does not have a ring',
  },
  // Moderate
  {
    id: 'lepista-woodland',
    field: 'habitat',
    match: { type: 'one_of', values: ['woodland', 'garden', 'hedgerow'] },
    genus: 'Lepista',
    tier: 'moderate',
    supporting: true,
    description: 'Lepista often found in woodland, gardens, and hedgerows',
  },
  {
    id: 'lepista-perfumed-smell',
    field: 'smell',
    match: { type: 'one_of', values: ['perfumed', 'floral', 'sweet'] },
    genus: 'Lepista',
    tier: 'moderate',
    supporting: true,
    description: 'Wood Blewit has a distinctive perfumed/floral smell',
  },
  {
    id: 'lepista-season',
    field: 'season_month',
    match: { type: 'range', min: 10, max: 12 },
    genus: 'Lepista',
    tier: 'moderate',
    supporting: true,
    description: 'Lepista is a late-season mushroom, October-December',
  },
  {
    id: 'lepista-pink-spore',
    field: 'spore_print_color',
    match: { type: 'one_of', values: ['pink', 'pale pink', 'pinkish'] },
    genus: 'Lepista',
    tier: 'moderate',
    supporting: true,
    description: 'Lepista has a pale pink spore print',
  },
  // Exclusionary
  {
    id: 'lepista-exclude-pores',
    field: 'gill_type',
    match: { type: 'equals', value: 'pores' },
    genus: 'Lepista',
    tier: 'exclusionary',
    supporting: false,
    description: 'Pores rule out Lepista',
  },
  {
    id: 'lepista-exclude-ring',
    field: 'ring_present',
    match: { type: 'equals', value: true },
    genus: 'Lepista',
    tier: 'exclusionary',
    supporting: false,
    description: 'A ring rules out Lepista',
  },
];
