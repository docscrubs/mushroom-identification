import type { GenusProfile } from '@/types';

/**
 * Core genus profiles shipped with the app.
 * These are loaded into IndexedDB on first launch.
 * Covers the 20 priority UK foraging genera.
 */
export const seedGenera: GenusProfile[] = [
  // === SAFETY CRITICAL ===
  {
    genus: 'Amanita',
    common_names: ['Amanita', 'Death Cap family'],
    reference_image: '/images/mushrooms/amanita_phalloides.jpg',
    confidence_markers: {
      high: [
        'Volva (cup/bag) at the base of the stem',
        'Ring (skirt) on the stem',
        'White, free gills',
        'White spore print',
      ],
      moderate: [
        'Cap often with patches of universal veil remnants',
        'Grows with trees (mycorrhizal)',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest', 'parkland with trees'],
      substrate: 'soil near trees',
      associations: ['oak', 'beech', 'birch', 'pine'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Agaricus',
        distinction: 'Agaricus has pink-to-brown gills (not white), no volva, often in grassland',
        danger_level: 'critical',
      },
      {
        genus: 'Macrolepiota',
        distinction: 'Macrolepiota has no volva, snakeskin stem pattern, larger cap',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'rubescens', common_name: 'The Blusher', notes: 'Edible when cooked, flesh turns pink when damaged. NOT for beginners.', image_url: '/images/mushrooms/amanita_rubescens.jpg' },
      ],
      toxic_or_inedible: [
        { species: 'phalloides', common_name: 'Death Cap', notes: 'LETHALLY TOXIC. Greenish-yellow cap, white gills, prominent volva. Responsible for most mushroom deaths worldwide.', image_url: '/images/mushrooms/amanita_phalloides.jpg' },
        { species: 'virosa', common_name: 'Destroying Angel', notes: 'LETHALLY TOXIC. Pure white throughout, prominent volva and ring.', image_url: '/images/mushrooms/amanita_virosa.jpg' },
        { species: 'pantherina', common_name: 'Panther Cap', notes: 'Seriously toxic. Brown cap with pure white veil patches.', image_url: '/images/mushrooms/amanita_pantherina.jpg' },
        { species: 'muscaria', common_name: 'Fly Agaric', notes: 'Toxic. The iconic red cap with white spots.', image_url: '/images/mushrooms/amanita_muscaria.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'amanita_recognition_warning', description: 'Recognising Amanita features: volva, ring, white gills' },
      { heuristic_id: 'death_cap_habitat_alert', description: 'Death Cap habitat and ecological context' },
    ],
    notes: 'Amanita is the most dangerous genus in the UK. Beginners must learn to recognise the volva and ring combination. NEVER eat any Amanita unless you are absolutely certain of the species.',
  },
  {
    genus: 'Agaricus',
    common_names: ['Field Mushroom family', 'Mushrooms'],
    reference_image: '/images/mushrooms/agaricus_campestris.jpg',
    confidence_markers: {
      high: [
        'Ring on the stem',
        'Gills that are pink (young) to chocolate brown (mature)',
        'Dark brown/chocolate spore print',
        'No volva at the base',
      ],
      moderate: [
        'Often in grassland or gardens',
        'Mushroomy or anise smell',
      ],
    },
    ecological_context: {
      habitat: ['grassland', 'meadow', 'lawn', 'garden', 'parkland'],
      substrate: 'soil',
      associations: ['grass'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [
      {
        genus: 'Amanita',
        distinction: 'Amanita has white gills (never pink/brown), a volva, and grows with trees',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'campestris', common_name: 'Field Mushroom', notes: 'The classic wild mushroom. Pink gills when young, brown when mature.', image_url: '/images/mushrooms/agaricus_campestris.jpg' },
        { species: 'arvensis', common_name: 'Horse Mushroom', notes: 'Large, smells of anise, yellows slightly when bruised.', image_url: '/images/mushrooms/agaricus_arvensis.jpg' },
      ],
      toxic_or_inedible: [
        { species: 'xanthodermus', common_name: 'Yellow-staining Mushroom', notes: 'Causes GI upset. Stains bright chrome yellow at base of stem. Smells of ink/phenol.', image_url: '/images/mushrooms/agaricus_xanthodermus.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'agaricus_vs_amanita_discrimination', description: 'Critical discrimination between Agaricus and Amanita' },
      { heuristic_id: 'agaricus_yellow_stain_test', description: 'Test for Yellow-staining Mushroom (A. xanthodermus)' },
    ],
    notes: 'Agaricus is the genus of the common shop mushroom. Critical to distinguish from Amanita. Always check: no volva, gills never pure white, dark spore print.',
  },

  // === BEGINNER-FRIENDLY ===
  {
    genus: 'Russula',
    common_names: ['Brittlegills'],
    reference_image: '/images/mushrooms/russula_cyanoxantha.jpg',
    confidence_markers: {
      high: [
        'Brittle flesh that snaps cleanly (like chalk)',
        'No ring or volva',
        'Attached gills, often brittle',
        'Cap often brightly colored (red, green, yellow, purple, white)',
      ],
      moderate: [
        'White to cream spore print (most species)',
        'Mycorrhizal with trees',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest edges', 'parkland with trees'],
      substrate: 'soil near trees (never on wood)',
      associations: ['oak', 'birch', 'beech', 'pine', 'spruce'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [
      {
        genus: 'Lactarius',
        distinction: 'Lactarius exudes milk when flesh is cut or gills damaged; Russula does not',
        danger_level: 'low',
      },
      {
        genus: 'Amanita',
        distinction: 'Amanita has volva at base, often has ring, flesh is NOT brittle but fibrous',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'cyanoxantha', common_name: 'Charcoal Burner', notes: 'One of the best - mild taste, flexible gills (unusual for Russula)', image_url: '/images/mushrooms/russula_cyanoxantha.jpg' },
        { species: 'virescens', common_name: 'Greencracked Brittlegill', notes: 'Choice edible, distinctive cracked cap surface', image_url: '/images/mushrooms/russula_virescens.jpg' },
        { species: 'vesca', common_name: 'Bare-toothed Brittlegill', notes: "Good edible, gills don't reach cap edge", image_url: '/images/mushrooms/russula_vesca.jpg' },
      ],
      toxic_or_inedible: [
        { species: 'emetica', common_name: 'The Sickener', notes: 'Bright red cap, pure white gills, very peppery - causes vomiting', image_url: '/images/mushrooms/russula_emetica.jpg' },
        { species: 'foetens', common_name: 'Stinking Brittlegill', notes: 'Smells of bitter almonds/marzipan, acrid taste', image_url: '/images/mushrooms/russula_foetens.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'russula_taste_test', description: 'The taste test for Russula edibility' },
    ],
    notes: 'Russula is an excellent genus for beginners: easy to recognize at genus level (brittle flesh test), no deadly toxic species in UK, simple taste test separates edible from inedible, very common.',
  },
  {
    genus: 'Boletus',
    common_names: ['Boletes', 'Penny Bun family'],
    reference_image: '/images/mushrooms/boletus_edulis.jpg',
    confidence_markers: {
      high: [
        'Sponge-like pore surface under cap (not gills)',
        'Central stem',
        'Fleshy, substantial cap',
      ],
      moderate: [
        'Woodland habitat (mycorrhizal)',
        'Stem often with network pattern (reticulation)',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest', 'parkland'],
      substrate: 'soil near trees',
      associations: ['oak', 'beech', 'birch', 'pine', 'spruce'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Leccinum',
        distinction: 'Leccinum has rough scabers on the stem rather than reticulation',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'edulis', common_name: 'Penny Bun / Cep / Porcini', notes: 'The king of edible mushrooms. White reticulated stem, firm white flesh.', image_url: '/images/mushrooms/boletus_edulis.jpg' },
      ],
      toxic_or_inedible: [
        { species: 'satanas', common_name: "Satan's Bolete", notes: 'Toxic. Red pores, red stem base, pale cap. Rare in UK.', image_url: '/images/mushrooms/boletus_satanas.jpg' },
        { species: 'luridiformis', common_name: 'Scarletina Bolete', notes: 'Edible when cooked but blues dramatically when cut. Confusing for beginners.', image_url: '/images/mushrooms/boletus_luridiformis.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'bolete_blue_staining_caution', description: 'Caution with blue-staining boletes' },
      { heuristic_id: 'bolete_red_pore_test', description: 'Red pore danger test for boletes' },
    ],
    notes: 'Boletes are generally beginner-friendly because of the distinctive pore surface. Very few are seriously toxic. The main rule: avoid any bolete with red pores.',
  },
  {
    genus: 'Cantharellus',
    common_names: ['Chanterelle'],
    reference_image: '/images/mushrooms/cantharellus_cibarius.jpg',
    confidence_markers: {
      high: [
        'Forked ridges (false gills), not true blade-like gills',
        'Egg-yellow to golden colour throughout',
        'Funnel or trumpet shape when mature',
        'Distinctive apricot/fruity smell',
      ],
      moderate: [
        'Grows with trees (mycorrhizal)',
        'White flesh when cut',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest'],
      substrate: 'soil among moss and leaf litter',
      associations: ['oak', 'beech', 'birch', 'pine', 'spruce'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Hygrophoropsis',
        distinction: 'False chanterelle has true thin gills (not ridges), orange flesh, no apricot smell',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'cibarius', common_name: 'Chanterelle', notes: 'Choice edible. Egg-yellow, apricot smell, forked ridges.', image_url: '/images/mushrooms/cantharellus_cibarius.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'chanterelle_vs_false_chanterelle', description: 'Distinguish true Chanterelle from False Chanterelle' },
    ],
    notes: 'Chanterelle is a choice edible with few dangerous lookalikes. Key identification: forked ridges (not true gills), apricot smell, egg-yellow colour.',
  },
  {
    genus: 'Lactarius',
    common_names: ['Milkcaps'],
    reference_image: '/images/mushrooms/lactarius_deliciosus.jpg',
    confidence_markers: {
      high: [
        'Exudes milk (latex) when flesh is cut or gills damaged',
        'Brittle flesh (like Russula)',
        'No ring or volva',
      ],
      moderate: [
        'Mycorrhizal with trees',
        'Decurrent gills',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest', 'parkland'],
      substrate: 'soil near trees',
      associations: ['birch', 'pine', 'spruce', 'oak', 'beech'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Russula',
        distinction: 'Russula does not exude milk when cut',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'deliciosus', common_name: 'Saffron Milkcap', notes: 'Choice edible. Orange milk that turns green. Under pines.', image_url: '/images/mushrooms/lactarius_deliciosus.jpg' },
      ],
      toxic_or_inedible: [
        { species: 'torminosus', common_name: 'Woolly Milkcap', notes: 'Causes GI upset raw. Pink, very woolly cap margin, white milk.', image_url: '/images/mushrooms/lactarius_torminosus.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'lactarius_milk_color', description: 'Milk colour test for Lactarius identification' },
    ],
    notes: 'Lactarius is distinguished from Russula by the presence of milk. Milk colour is the key identification feature: orange/carrot = good, white/acrid = avoid.',
  },
  {
    genus: 'Pleurotus',
    common_names: ['Oyster Mushrooms'],
    reference_image: '/images/mushrooms/pleurotus_ostreatus.jpg',
    confidence_markers: {
      high: [
        'Growing on wood (dead or living trees)',
        'Overlapping shelf-like clusters',
        'Decurrent gills running down a very short or absent stem',
        'White spore print',
      ],
      moderate: [
        'Oyster/shell-shaped cap',
        'Pleasant mushroomy/anise smell',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest', 'parkland'],
      substrate: 'dead or living wood',
      associations: ['beech', 'oak', 'elm', 'birch', 'various broadleaves'],
      season: { UK: ['September', 'October', 'November', 'December', 'January'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Crepidotus',
        distinction: 'Crepidotus is much smaller, has brown spore print, not typically edible',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'ostreatus', common_name: 'Oyster Mushroom', notes: 'Good edible. Grey to blue-grey cap, white gills, on wood.', image_url: '/images/mushrooms/pleurotus_ostreatus.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'grassland_vs_woodland_context', description: 'Habitat context for identification' },
    ],
    notes: 'Oyster mushrooms are beginner-friendly: distinctive growth on wood in shelf-like clusters, very few dangerous lookalikes.',
  },
  {
    genus: 'Macrolepiota',
    common_names: ['Parasol Mushroom'],
    reference_image: '/images/mushrooms/macrolepiota_procera.jpg',
    confidence_markers: {
      high: [
        'Very large cap (15-30cm when mature)',
        'Large, movable double ring on stem',
        'Snakeskin pattern on stem',
        'No volva',
      ],
      moderate: [
        'White, free gills',
        'Often in grassland or woodland edges',
      ],
    },
    ecological_context: {
      habitat: ['grassland', 'meadow', 'woodland edges', 'parkland'],
      substrate: 'soil',
      associations: ['grass', 'mixed woodland edges'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Amanita',
        distinction: 'Amanita has a volva, does NOT have snakeskin stem pattern',
        danger_level: 'critical',
      },
      {
        genus: 'Lepiota',
        distinction: 'Small Lepiota species (<10cm cap) are DEADLY. Only pick large specimens with confirmed snakeskin stem',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'procera', common_name: 'Parasol Mushroom', notes: 'Choice edible. Very large, snakeskin stem, movable ring.', image_url: '/images/mushrooms/macrolepiota_procera.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'macrolepiota_vs_lepiota_vs_amanita', description: 'Parasol vs small Lepiota vs Amanita discrimination' },
      { heuristic_id: 'avoid_small_lepiota', description: 'Avoid all small (<10cm) lepiota-like mushrooms' },
    ],
    notes: 'Parasol is a choice edible but CRITICAL to distinguish from deadly small Lepiota species and Amanita. Only pick large specimens (>10cm cap) with confirmed snakeskin stem and NO volva.',
  },
  {
    genus: 'Coprinopsis',
    common_names: ['Ink Caps'],
    reference_image: '/images/mushrooms/coprinopsis_comatus.jpg',
    confidence_markers: {
      high: [
        'Gills that deliquesce (dissolve into inky black liquid)',
        'Often cylindrical or conical cap',
        'Crowded, thin gills',
      ],
      moderate: [
        'Often in disturbed ground, gardens, lawns',
        'Dark spore print',
      ],
    },
    ecological_context: {
      habitat: ['grassland', 'garden', 'lawn', 'woodland', 'disturbed ground'],
      substrate: 'soil, buried wood, dung',
      associations: ['grass', 'buried wood'],
      season: { UK: ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [],
    key_species_uk: {
      edible: [
        { species: 'comatus', common_name: 'Shaggy Ink Cap', notes: 'Good edible when young (before ink starts). Shaggy white cap. Note: this is Coprinus comatus, now in a separate genus.', image_url: '/images/mushrooms/coprinopsis_comatus.jpg' },
      ],
      toxic_or_inedible: [
        { species: 'atramentaria', common_name: 'Common Ink Cap', notes: 'TOXIC WITH ALCOHOL. Contains coprine. Avoid alcohol for 3 days before and after consumption.', image_url: '/images/mushrooms/coprinopsis_atramentaria.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'coprinopsis_alcohol_warning', description: 'Ink cap + alcohol interaction warning' },
      { heuristic_id: 'coprinopsis_freshness_check', description: 'Freshness check for edible ink caps' },
    ],
    notes: 'Ink caps are distinctive due to deliquescence. Critical safety warning: Common Ink Cap causes severe illness with alcohol. Shaggy Ink Cap is technically safe but must be eaten very fresh.',
  },
  {
    genus: 'Hydnum',
    common_names: ['Hedgehog Fungus'],
    reference_image: '/images/mushrooms/hydnum_repandum.jpg',
    confidence_markers: {
      high: [
        'Teeth/spines hanging down under the cap (not gills or pores)',
        'Cream to pale orange cap',
        'No ring or volva',
      ],
      moderate: [
        'Woodland habitat',
        'White spore print',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest'],
      substrate: 'soil',
      associations: ['beech', 'oak', 'birch', 'pine'],
      season: { UK: ['August', 'September', 'October', 'November', 'December'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [],
    key_species_uk: {
      edible: [
        { species: 'repandum', common_name: 'Hedgehog Fungus', notes: 'Choice edible. Very safe - the teeth are virtually unique among UK mushrooms.', image_url: '/images/mushrooms/hydnum_repandum.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'mycorrhizal_tree_association', description: 'Tree association guide for mycorrhizal species' },
    ],
    notes: 'Hydnum is one of the safest genera for beginners: the teeth under the cap are unique and have no dangerous lookalikes in the UK.',
  },

  // === GOOD EDIBLES ===
  {
    genus: 'Laetiporus',
    common_names: ['Chicken of the Woods'],
    reference_image: '/images/mushrooms/laetiporus_sulphureus.jpg',
    confidence_markers: {
      high: [
        'Large bracket fungus growing on living/dead trees',
        'Bright orange top surface with yellow edges',
        'Pore surface underneath (not gills)',
        'Soft, succulent flesh when young',
      ],
      moderate: [
        'Grows in overlapping tiers/shelves',
        'No stem',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'parkland', 'gardens with mature trees'],
      substrate: 'living or dead hardwood (especially oak)',
      associations: ['oak', 'sweet chestnut', 'cherry', 'willow', 'yew'],
      season: { UK: ['May', 'June', 'July', 'August', 'September', 'October'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [],
    key_species_uk: {
      edible: [
        { species: 'sulphureus', common_name: 'Chicken of the Woods', notes: 'Good edible when young (soft). Avoid specimens on yew (may absorb toxins).', image_url: '/images/mushrooms/laetiporus_sulphureus.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'laetiporus_host_tree_check', description: 'Host tree safety check (avoid yew/eucalyptus)' },
    ],
    notes: 'Distinctive and popular edible. Avoid specimens growing on yew or eucalyptus. Only eat when young and soft. Can cause GI upset in some individuals — try a small amount first.',
  },
  {
    genus: 'Fistulina',
    common_names: ['Beefsteak Fungus'],
    reference_image: '/images/mushrooms/fistulina_hepatica.jpg',
    confidence_markers: {
      high: [
        'Tongue-shaped bracket on oak or sweet chestnut',
        'Dark red colour resembling raw meat',
        'Exudes red juice when cut',
        'Individual pore tubes (separable, not fused)',
      ],
      moderate: [
        'Grows on oak or sweet chestnut trunks',
        'Rough, sticky upper surface',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'parkland'],
      substrate: 'living or dead oak/sweet chestnut',
      associations: ['oak', 'sweet chestnut'],
      season: { UK: ['August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'occasional',
    lookalike_genera: [],
    key_species_uk: {
      edible: [
        { species: 'hepatica', common_name: 'Beefsteak Fungus', notes: 'Edible. Best sliced thin as it can be sour/acidic. Looks remarkably like raw meat.', image_url: '/images/mushrooms/fistulina_hepatica.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'mycorrhizal_tree_association', description: 'Found specifically on oak and sweet chestnut' },
    ],
    notes: 'Beefsteak fungus is unmistakable: it looks like a tongue of raw beef growing from a tree. Safe, no dangerous lookalikes.',
  },
  {
    genus: 'Marasmius',
    common_names: ['Fairy Ring Champignon'],
    reference_image: '/images/mushrooms/marasmius_oreades.jpg',
    confidence_markers: {
      high: [
        'Small, tough/wiry mushroom that revives when wet',
        'Growing in rings or arcs in grass',
        'Widely-spaced, free gills',
        'Tough, wiry stem',
      ],
      moderate: [
        'Buff/tan cap, often darker in centre',
        'White spore print',
      ],
    },
    ecological_context: {
      habitat: ['grassland', 'lawn', 'meadow', 'parkland'],
      substrate: 'soil in grass',
      associations: ['grass'],
      season: { UK: ['June', 'July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [
      {
        genus: 'Clitocybe',
        distinction: 'Clitocybe rivulosa (Fool\'s Funnel) also grows in rings on lawns and is DEADLY. Check: Marasmius has free gills and tough stem; Clitocybe has decurrent gills and fragile stem.',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'oreades', common_name: 'Fairy Ring Champignon', notes: 'Good edible. Dries well. Growing in rings in lawns is very characteristic.', image_url: '/images/mushrooms/marasmius_oreades.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'marasmius_vs_clitocybe_rivulosa', description: 'Critical discrimination: Fairy Ring Champignon vs Fool\'s Funnel' },
    ],
    notes: 'Fairy ring champignon is a good edible but CRITICAL lookalike hazard: Clitocybe rivulosa (deadly) also grows in rings on lawns. Must confirm tough stem and free gills.',
  },
  {
    genus: 'Craterellus',
    common_names: ['Horn of Plenty', 'Black Trumpet'],
    reference_image: '/images/mushrooms/craterellus_cornucopioides.jpg',
    confidence_markers: {
      high: [
        'Trumpet/funnel shape, hollow down to base',
        'Very dark — black to dark brown/grey',
        'Smooth to slightly wrinkled outer surface (no gills or pores)',
      ],
      moderate: [
        'Grows in troops in deciduous woodland',
        'Often among beech leaf litter',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest'],
      substrate: 'soil among leaf litter',
      associations: ['beech', 'oak', 'hazel'],
      season: { UK: ['September', 'October', 'November', 'December'] },
    },
    uk_occurrence: 'occasional',
    lookalike_genera: [],
    key_species_uk: {
      edible: [
        { species: 'cornucopioides', common_name: 'Horn of Plenty', notes: 'Choice edible. Dries beautifully. Hard to spot due to dark colour among leaf litter.', image_url: '/images/mushrooms/craterellus_cornucopioides.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'mycorrhizal_tree_association', description: 'Found among beech and oak leaf litter' },
      { heuristic_id: 'uk_seasonal_fruiting_guide', description: 'Peak season September-December' },
    ],
    notes: 'Horn of Plenty is a choice edible with no dangerous lookalikes. The dark colour and smooth fertile surface are distinctive. Often hard to spot in leaf litter.',
  },
  {
    genus: 'Sparassis',
    common_names: ['Cauliflower Fungus'],
    reference_image: '/images/mushrooms/sparassis_crispa.jpg',
    confidence_markers: {
      high: [
        'Large cauliflower/brain-like mass of lobed, wavy fronds',
        'Growing at the base of conifer trees',
        'Cream to pale yellow colour',
        'No gills, pores, or conventional cap',
      ],
      moderate: [
        'Can be very large (up to 40cm across)',
        'Pleasant mushroomy smell',
      ],
    },
    ecological_context: {
      habitat: ['conifer woodland', 'pine plantation'],
      substrate: 'at base of conifer trunks/stumps',
      associations: ['pine', 'spruce', 'other conifers'],
      season: { UK: ['August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'occasional',
    lookalike_genera: [],
    key_species_uk: {
      edible: [
        { species: 'crispa', common_name: 'Cauliflower Fungus', notes: 'Good edible. Unmistakable shape. Needs thorough washing as debris collects in the folds.', image_url: '/images/mushrooms/sparassis_crispa.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'mycorrhizal_tree_association', description: 'Found at base of conifer trunks (pine, spruce)' },
    ],
    notes: 'Cauliflower fungus is unmistakable — no other UK fungus looks like a pale cauliflower growing at the base of a tree. Very safe for beginners.',
  },
  {
    genus: 'Calvatia',
    common_names: ['Giant Puffball', 'Puffballs'],
    reference_image: '/images/mushrooms/calvatia_gigantea.jpg',
    confidence_markers: {
      high: [
        'Large round/ball-shaped fruitbody',
        'White when young, browning with age',
        'No gills, pores, or visible cap — solid white flesh inside when young',
        'No stem (or very rudimentary)',
      ],
      moderate: [
        'Often in grassland',
        'Smooth white skin when young',
      ],
    },
    ecological_context: {
      habitat: ['grassland', 'meadow', 'parkland', 'garden', 'woodland edges'],
      substrate: 'soil',
      associations: ['grass', 'nettles'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'occasional',
    lookalike_genera: [
      {
        genus: 'Amanita',
        distinction: 'Young Amanita "eggs" can resemble small puffballs — ALWAYS slice puffballs in half to confirm solid white flesh with no internal structure (gills, cap outline)',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'gigantea', common_name: 'Giant Puffball', notes: 'Edible when young (pure white inside). Slice in half to verify no internal gill/cap structure — rules out Amanita egg.', image_url: '/images/mushrooms/calvatia_gigantea.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'puffball_slice_safety_check', description: 'Mandatory slice check to rule out Amanita egg' },
      { heuristic_id: 'puffball_interior_check', description: 'Interior colour check for edibility' },
      { heuristic_id: 'puffball_vs_amanita_egg', description: 'Discrimination between puffball and Amanita egg' },
    ],
    notes: 'Giant puffball is edible when young but CRITICAL safety check: always slice in half. If there is any internal structure (silhouette of a cap or gills), it may be an Amanita egg (deadly).',
  },
  {
    genus: 'Leccinum',
    common_names: ['Rough-stemmed Boletes'],
    reference_image: '/images/mushrooms/leccinum_scabrum.jpg',
    confidence_markers: {
      high: [
        'Sponge-like pore surface (bolete)',
        'Stem covered in rough scales/scabers',
        'Often with birch or other specific trees',
      ],
      moderate: [
        'Cap often orange-brown (with birch) or darker (with other trees)',
        'Flesh may discolour when cut',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'forest', 'parkland', 'heathland'],
      substrate: 'soil near trees',
      associations: ['birch', 'oak', 'aspen', 'poplar'],
      season: { UK: ['July', 'August', 'September', 'October', 'November'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Boletus',
        distinction: 'Boletus has reticulated (net-patterned) stem; Leccinum has rough scabers/scales',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'scabrum', common_name: 'Brown Birch Bolete', notes: 'Good edible. Grey-brown cap, always under birch. Flesh soft and watery.', image_url: '/images/mushrooms/leccinum_scabrum.jpg' },
        { species: 'versipelle', common_name: 'Orange Birch Bolete', notes: 'Good edible. Orange cap, under birch. Flesh turns dark when cooked.', image_url: '/images/mushrooms/leccinum_versipelle.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'mycorrhizal_tree_association', description: 'Tree association guide (Leccinum with birch, oak, etc.)' },
    ],
    notes: 'Leccinum boletes are generally safe edibles. The rough scabers on the stem distinguish them from Boletus. Always cook thoroughly.',
  },

  // === INTERMEDIATE ===
  {
    genus: 'Armillaria',
    common_names: ['Honey Fungus'],
    reference_image: '/images/mushrooms/armillaria_mellea.jpg',
    confidence_markers: {
      high: [
        'Growing in large clusters at base of trees or on stumps',
        'Ring on stem',
        'Honey-brown cap with darker centre',
        'White spore print',
      ],
      moderate: [
        'On wood (parasitic or saprotrophic)',
        'Dark rhizomorphs (bootlaces) on wood surface',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'garden', 'parkland'],
      substrate: 'at base of trees, on stumps, on buried roots',
      associations: ['various broadleaves and conifers'],
      season: { UK: ['September', 'October', 'November', 'December'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [
      {
        genus: 'Galerina',
        distinction: 'Galerina marginata (Funeral Bell) is DEADLY. Also on wood with ring. KEY: Armillaria has white spore print; Galerina has rusty brown.',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'mellea', common_name: 'Honey Fungus', notes: 'Edible when thoroughly cooked. Must not be eaten raw. Can cause GI upset in some people.', image_url: '/images/mushrooms/armillaria_mellea.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'armillaria_vs_galerina', description: 'Critical discrimination: Honey Fungus vs Funeral Bell (Galerina)' },
      { heuristic_id: 'galerina_marginata_warning', description: 'Funeral Bell avoidance warning' },
    ],
    notes: 'Honey fungus is edible but has a DEADLY lookalike in Galerina marginata. Spore print is critical: Armillaria = white, Galerina = rusty brown. Not recommended for beginners.',
  },
  {
    genus: 'Clitocybe',
    common_names: ['Funnels'],
    reference_image: '/images/mushrooms/clitocybe_rivulosa.jpg',
    confidence_markers: {
      high: [
        'Funnel-shaped or depressed cap',
        'Decurrent gills (running down the stem)',
        'No ring',
        'White to cream spore print',
      ],
      moderate: [
        'Often in leaf litter or on soil',
        'Some species in rings on lawns',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'garden', 'lawn'],
      substrate: 'leaf litter, soil',
      associations: ['various woodland trees', 'grass'],
      season: { UK: ['September', 'October', 'November', 'December'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Lepista',
        distinction: 'Lepista has lilac stem/gills and pink spore print',
        danger_level: 'low',
      },
      {
        genus: 'Marasmius',
        distinction: 'Marasmius has free gills, tough wiry stem (not decurrent)',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [],
      toxic_or_inedible: [
        { species: 'rivulosa', common_name: "Fool's Funnel", notes: 'DEADLY. Contains high levels of muscarine. Small, white, grows in rings on lawns.', image_url: '/images/mushrooms/clitocybe_rivulosa.jpg' },
        { species: 'dealbata', common_name: 'Ivory Funnel', notes: 'DEADLY. Similar to C. rivulosa. Small, white, in grassland.', image_url: '/images/mushrooms/clitocybe_dealbata.jpg' },
      ],
    },
    foraging_heuristics: [
      { heuristic_id: 'clitocybe_rivulosa_warning', description: 'Fool\'s Funnel / Ivory Funnel avoidance warning' },
    ],
    notes: 'Clitocybe is a dangerous genus for beginners. Several species are deadly. NOT recommended for eating unless very experienced. C. rivulosa is one of the UK\'s most dangerous mushrooms.',
  },
  {
    genus: 'Lepista',
    common_names: ['Blewits'],
    reference_image: '/images/mushrooms/lepista_nuda.jpg',
    confidence_markers: {
      high: [
        'Distinctive lilac/violet colour on stem and/or gills',
        'No ring',
        'Pale pink spore print',
        'Pleasant perfumed/floral smell',
      ],
      moderate: [
        'Often late season (October-December)',
        'In woodland leaf litter, gardens, hedgerows',
      ],
    },
    ecological_context: {
      habitat: ['woodland', 'garden', 'hedgerow'],
      substrate: 'leaf litter, compost, soil',
      associations: ['various broadleaves'],
      season: { UK: ['October', 'November', 'December'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [
      {
        genus: 'Clitocybe',
        distinction: 'Some Clitocybe can appear lilac-tinged but have white/cream spore print (not pink) and lack the strong perfumed smell',
        danger_level: 'high',
      },
      {
        genus: 'Cortinarius',
        distinction: 'Cortinarius (webcaps, some deadly) can have violet colours but has rusty brown spore print and cobwebby cortina',
        danger_level: 'critical',
      },
    ],
    key_species_uk: {
      edible: [
        { species: 'nuda', common_name: 'Wood Blewit', notes: 'Good edible when cooked. Distinctive all-over lilac when fresh. Must be cooked thoroughly.', image_url: '/images/mushrooms/lepista_nuda.jpg' },
        { species: 'saeva', common_name: 'Field Blewit', notes: 'Good edible. Lilac stem but buff/tan cap. In grassland. Late season.', image_url: '/images/mushrooms/lepista_saeva.jpg' },
      ],
      toxic_or_inedible: [],
    },
    foraging_heuristics: [
      { heuristic_id: 'lepista_vs_cortinarius', description: 'Critical discrimination: Blewit vs Webcap (Cortinarius)' },
      { heuristic_id: 'cortinarius_avoidance', description: 'Webcap avoidance — deadly kidney toxin' },
    ],
    notes: 'Blewits are good edibles but require care to distinguish from Cortinarius (some deadly) and Clitocybe. Key: lilac stem, pink spore print, perfumed smell. Must be cooked.',
  },
];
