/**
 * Genus-level edibility data for all 20 priority UK genera.
 * This is the "default safety" level — species-level variation exists within genera.
 */

export interface GenusEdibilityInfo {
  genus: string;
  default_safety: 'edible' | 'edible_with_caution' | 'inedible' | 'toxic' | 'deadly';
  requires_cooking: boolean;
  beginner_safe: boolean;
  warnings: string[];
  foraging_advice: string;
}

const EDIBILITY_DATA: GenusEdibilityInfo[] = [
  // === SAFETY CRITICAL ===
  {
    genus: 'Amanita',
    default_safety: 'deadly',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'Contains Death Cap and Destroying Angel — the most lethal mushrooms in the world',
      'One cap of Death Cap can kill an adult',
      'Symptoms may be delayed 6-24 hours, giving false sense of recovery',
    ],
    foraging_advice: 'NEVER eat any Amanita unless you are absolutely certain of the species AND are an experienced mycologist. Even experts exercise extreme caution.',
  },
  {
    genus: 'Agaricus',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'Yellow-staining Mushroom (A. xanthodermus) causes GI upset — check for yellow staining at base of stem',
      'CRITICAL: must distinguish from Amanita (check no volva, gills pink-to-brown not white)',
    ],
    foraging_advice: 'Good edibles exist but must confirm identity carefully. Check: no volva, pink-to-brown gills (never pure white), dark brown spore print.',
  },

  // === BEGINNER-FRIENDLY ===
  {
    genus: 'Russula',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [
      'Peppery/acrid species cause vomiting if eaten — use taste test',
    ],
    foraging_advice: 'Excellent beginner genus. Use the taste test: mild = edible, peppery = reject. No deadly species in UK.',
  },
  {
    genus: 'Boletus',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [
      'Avoid any bolete with red pores (may be toxic)',
      'Some species cause GI upset — avoid bitter-tasting boletes',
    ],
    foraging_advice: 'Generally safe genus. Avoid red-pored and bitter-tasting species. Penny Bun (B. edulis) is the prize find.',
  },
  {
    genus: 'Cantharellus',
    default_safety: 'edible',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [],
    foraging_advice: 'Choice edible, very safe. Confirm forked ridges (not true gills) and apricot smell to distinguish from false chanterelle.',
  },
  {
    genus: 'Lactarius',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'Many species with white/acrid milk are inedible or cause GI upset',
      'Only eat species with coloured (orange/carrot) milk',
    ],
    foraging_advice: 'Use the milk colour test. Saffron Milkcap (orange milk) is the best edible. Avoid all species with white or acrid milk.',
  },
  {
    genus: 'Pleurotus',
    default_safety: 'edible',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [],
    foraging_advice: 'Safe, distinctive edible. Grows on wood in shelf-like clusters. Few dangerous lookalikes.',
  },
  {
    genus: 'Macrolepiota',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'CRITICAL: small Lepiota species (<10cm cap) are DEADLY — only eat confirmed large specimens',
      'Must confirm no volva (would indicate Amanita)',
      'Confirm snakeskin stem pattern',
    ],
    foraging_advice: 'Choice edible but requires care. Only pick mature specimens with cap >10cm, confirmed snakeskin stem, and NO volva.',
  },
  {
    genus: 'Coprinopsis',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'Common Ink Cap causes SEVERE illness when consumed with alcohol',
      'Avoid ALL alcohol for 3 days before and after eating any ink cap species',
      'Must eat very fresh, before deliquescence begins',
    ],
    foraging_advice: 'Shaggy Ink Cap is edible but must be eaten immediately after picking (before it dissolves). NEVER consume with alcohol.',
  },
  {
    genus: 'Hydnum',
    default_safety: 'edible',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [],
    foraging_advice: 'One of the safest wild edibles. The teeth under the cap are unique — no dangerous lookalikes in the UK.',
  },

  // === GOOD EDIBLES ===
  {
    genus: 'Laetiporus',
    default_safety: 'edible_with_caution',
    requires_cooking: true,
    beginner_safe: true,
    warnings: [
      'Avoid specimens growing on yew or eucalyptus (may absorb toxins)',
      'Can cause GI upset in some individuals — try a small amount first',
      'Only eat when young and soft (tough old specimens are indigestible)',
    ],
    foraging_advice: 'Distinctive and popular. Only eat young, soft specimens. Avoid if growing on yew. Cook thoroughly.',
  },
  {
    genus: 'Fistulina',
    default_safety: 'edible',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [
      'Can be sour/acidic — slice thin and try a small amount',
    ],
    foraging_advice: 'Unmistakable — looks like a tongue of raw beef on a tree. Safe, no dangerous lookalikes.',
  },
  {
    genus: 'Marasmius',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'CRITICAL lookalike: Clitocybe rivulosa (Fool\'s Funnel) also grows in rings on lawns and is DEADLY',
      'Must confirm: tough wiry stem, free gills (not decurrent)',
    ],
    foraging_advice: 'Good edible but must distinguish from deadly Clitocybe rivulosa which grows in similar rings on lawns. Check tough stem and free gills.',
  },
  {
    genus: 'Craterellus',
    default_safety: 'edible',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [],
    foraging_advice: 'Choice edible. No dangerous lookalikes. Hard to find due to dark colour among leaf litter.',
  },
  {
    genus: 'Sparassis',
    default_safety: 'edible',
    requires_cooking: false,
    beginner_safe: true,
    warnings: [],
    foraging_advice: 'Unmistakable cauliflower-like shape. No dangerous lookalikes. Needs thorough washing.',
  },
  {
    genus: 'Calvatia',
    default_safety: 'edible_with_caution',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'CRITICAL: ALWAYS slice puffballs in half before eating',
      'If internal structure visible (silhouette of cap/gills), it may be a young Amanita egg (DEADLY)',
      'Only eat when flesh is pure white throughout — browning indicates spore maturation',
    ],
    foraging_advice: 'Edible when young (pure white inside). ALWAYS slice in half to check for internal structure — young Amanita eggs can resemble small puffballs.',
  },
  {
    genus: 'Leccinum',
    default_safety: 'edible',
    requires_cooking: true,
    beginner_safe: true,
    warnings: [
      'Must cook thoroughly — some species cause GI upset if undercooked',
      'Flesh turns dark/black when cooked — this is normal',
    ],
    foraging_advice: 'Safe edibles. Distinguished from Boletus by rough scabers on stem. Always cook thoroughly.',
  },

  // === INTERMEDIATE ===
  {
    genus: 'Armillaria',
    default_safety: 'edible_with_caution',
    requires_cooking: true,
    beginner_safe: false,
    warnings: [
      'DEADLY lookalike: Galerina marginata (Funeral Bell) also grows on wood with ring',
      'Must take spore print: Armillaria = white, Galerina = rusty brown',
      'Must cook thoroughly — toxic raw',
      'Can cause GI upset even when cooked in some individuals',
    ],
    foraging_advice: 'Edible when cooked but has deadly lookalike. NOT for beginners. Must confirm white spore print to rule out Galerina.',
  },
  {
    genus: 'Clitocybe',
    default_safety: 'deadly',
    requires_cooking: false,
    beginner_safe: false,
    warnings: [
      'Contains DEADLY species: C. rivulosa and C. dealbata',
      'These small white species grow in grassland and can be mistaken for edible species',
      'High muscarine content causes sweating, salivation, and can be fatal',
    ],
    foraging_advice: 'NOT recommended for eating. Several species are deadly. Even experienced foragers should exercise extreme caution.',
  },
  {
    genus: 'Lepista',
    default_safety: 'edible_with_caution',
    requires_cooking: true,
    beginner_safe: false,
    warnings: [
      'Must distinguish from Clitocybe (some deadly) and Cortinarius (some deadly)',
      'Confirm: lilac stem, pink spore print, perfumed smell',
      'Must cook thoroughly — toxic raw',
    ],
    foraging_advice: 'Good edibles when cooked but requires careful identification. Key: lilac stem, pink spore print, perfumed smell. Not for beginners.',
  },
];

const EDIBILITY_MAP = new Map(EDIBILITY_DATA.map((e) => [e.genus, e]));

/**
 * Look up genus-level edibility information.
 */
export function getGenusEdibility(genus: string): GenusEdibilityInfo | undefined {
  return EDIBILITY_MAP.get(genus);
}
