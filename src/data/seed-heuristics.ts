import type { Heuristic } from '@/types';

/**
 * Core heuristics shipped with the app.
 * Loaded into IndexedDB on first launch.
 */
export const seedHeuristics: Heuristic[] = [
  {
    heuristic_id: 'russula_taste_test',
    version: 1,
    name: 'Russula Taste Test',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      genus: 'Russula',
      confidence_required: 'high',
    },
    prerequisites: {
      competencies: { russula_genus_recognition: 'confident' },
      safety_checks: ['confirmed_not_lactarius', 'confirmed_not_amanita'],
    },
    procedure: {
      steps: [
        {
          instruction:
            'Break off a small piece of the cap flesh (NOT the gills)',
        },
        {
          instruction:
            'Touch it briefly to your tongue, or chew a tiny piece',
          safety_note: 'Do not swallow',
        },
        { instruction: 'Spit it out immediately' },
        { instruction: 'Wait 30 seconds and note the sensation' },
      ],
      estimated_time: '1-2 minutes',
    },
    outcomes: [
      {
        id: 'mild',
        condition: 'Mild, nutty, pleasant, or no strong taste',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Safe to eat. Quality varies by species.',
      },
      {
        id: 'peppery',
        condition: 'Peppery, hot, burning, or acrid',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Do not eat. Will cause gastric upset.',
      },
      {
        id: 'uncertain',
        condition: 'Uncertain - slight tingle but not clearly peppery',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'Treat as peppery and reject. Re-test with fresh specimen.',
      },
    ],
    exceptions: [
      {
        species: 'R. olivacea',
        note: 'Can taste mild but causes GI upset in some people',
        action: 'Avoid even if mild-tasting',
      },
      {
        species: 'R. cyanoxantha',
        note: 'Flexible gills (unusual for Russula) - taste test still works',
      },
    ],
    safety_notes: [
      'This test ONLY works for confirmed Russula specimens',
      'Do not swallow the test piece',
      'The peppery sensation may take 10-30 seconds to develop fully',
      'Fresh specimens give clearer results than old/waterlogged ones',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode:
        'Peppery species rejected (correct). Very low risk of missing toxicity.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), traditional foraging knowledge',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context:
      'This is a well-established foraging heuristic for Russula. The taste test is safe because no Russula species are lethally toxic - the worst outcome from a peppery species is temporary burning sensation on the tongue. Emphasize that this ONLY works for confirmed Russula specimens.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'bolete_blue_staining_caution',
    version: 1,
    name: 'Bolete Blue Staining Check',
    category: 'safety_screening',
    priority: 'standard',
    applies_to: {
      family: 'Boletaceae',
      confidence_required: 'moderate',
    },
    procedure:
      '1. Cut the mushroom in half vertically\n2. Watch the cut flesh for 30 seconds\n3. Note any color change',
    outcomes: [
      {
        condition: 'No color change, or slight browning',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'moderate',
        action: 'Continue to species identification',
      },
      {
        condition: 'Rapid blue staining',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action:
          'Check for red pores. If red pores AND blue staining, likely toxic Rubroboletus.',
      },
      {
        condition: 'Blue staining AND red pores',
        conclusion: 'REJECT',
        confidence: 'high',
        action: "Likely Satan's Bolete or similar. Do not eat.",
      },
    ],
    safety_notes: [
      'Many excellent edibles stain blue (Bay Bolete, various Leccinum)',
      'Blue staining alone is NOT a reason to reject',
      'Blue staining PLUS red pores is the danger combination',
    ],
    source: 'Phillips (2006), Kibby',
    reliability: 'proven',
  },
  {
    heuristic_id: 'lactarius_milk_color',
    version: 1,
    name: 'Lactarius Milk Color Test',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      genus: 'Lactarius',
      confidence_required: 'high',
    },
    procedure:
      '1. Break or cut the gills\n2. Observe the color of the milk that exudes\n3. Wait 5 minutes and observe any color change in the milk',
    outcomes: [
      {
        condition: 'Orange or carrot-colored milk, no color change',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action:
          'Likely Saffron Milkcap (L. deliciosus) or similar. Choice edible.',
      },
      {
        condition: 'White milk, stays white',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action:
          'Species-dependent. Many are peppery/inedible. Avoid unless specifically identified.',
      },
      {
        condition: 'White milk that turns yellow',
        conclusion: 'LIKELY_TOXIC',
        confidence: 'high',
        action: 'Avoid. Several toxic species show this reaction.',
      },
    ],
    source: 'Phillips (2006), Wright (2007)',
    reliability: 'proven',
  },
  {
    heuristic_id: 'avoid_lbms',
    version: 1,
    name: 'Avoid Little Brown Mushrooms (LBMs)',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      morphology: {
        cap_color: 'brown',
        cap_size: 'small (under 5cm)',
        gill_type: 'present',
      },
      confidence_required: 'low',
    },
    procedure:
      'If you find a small brown gilled mushroom and you\'re not an expert: Leave it alone.',
    outcomes: [
      {
        condition: 'Any small brown gilled mushroom',
        conclusion: 'AVOID',
        confidence: 'high',
        action:
          'Do not attempt identification unless expert level. Contains many deadly lookalikes.',
      },
    ],
    rationale:
      'The "LBM" group contains hundreds of species including Deadly Galerina (Galerina marginata) which contains the same toxins as Death Cap, Deadly Conocybe species, and various Inocybe (many toxic). Even experts struggle to distinguish these without microscopy. The risk/reward ratio is terrible - no LBMs are choice edibles.',
    source: 'Universal foraging wisdom',
    reliability: 'proven',
    llm_context:
      'Little Brown Mushrooms (LBMs) are a catch-all group of small, brown, gilled mushrooms that are extremely difficult to identify. The group includes deadly species like Galerina marginata and toxic Inocybe species. No LBMs are choice edibles. The correct advice is always to leave them alone.',
  },

  // ============================================================
  // SAFETY RULES — critical rules that protect against deadly species
  // ============================================================

  {
    heuristic_id: 'amanita_recognition_warning',
    version: 1,
    name: 'Amanita Recognition Warning',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      genus: 'Amanita',
      confidence_required: 'low',
    },
    procedure: {
      steps: [
        { instruction: 'Check the base of the stem by carefully digging around it — look for a cup or bag-like volva' },
        { instruction: 'Check for a ring (skirt) on the upper stem' },
        { instruction: 'Check gill colour — Amanita gills are typically white and free from the stem' },
        { instruction: 'Check for patches or warts on the cap surface (remnants of the universal veil)' },
      ],
      estimated_time: '2-3 minutes',
    },
    outcomes: [
      {
        id: 'volva_ring_present',
        condition: 'Volva at base AND ring on stem AND white free gills',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Strong Amanita match. Do NOT eat. This genus contains Death Cap and Destroying Angel — among the most lethal mushrooms in the world.',
      },
      {
        id: 'volva_only',
        condition: 'Volva present but ring absent or uncertain',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'A volva alone is a strong Amanita indicator. Do not eat. Some Amanita species lack a prominent ring.',
      },
      {
        id: 'ring_white_gills_no_volva',
        condition: 'Ring present and white gills, but no volva found',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'The volva may be underground or broken off. Dig carefully. If in doubt, do not eat.',
        next_steps: ['Dig deeper around stem base', 'Take a spore print — Amanita is white'],
      },
    ],
    safety_notes: [
      'Death Cap (A. phalloides) is responsible for over 90% of fatal mushroom poisonings worldwide',
      'Symptoms of Death Cap poisoning are delayed 6-24 hours — by then liver damage is often irreversible',
      'One cap of Death Cap can kill an adult',
      'The volva is often underground — always dig around the stem base',
      'Death Cap can appear greenish-yellow, olive, or even white (var. alba)',
    ],
    safety: {
      false_positive_risk: 'medium',
      false_negative_risk: 'low',
      failure_mode: 'May reject safe species with rings (e.g., Agaricus). This is acceptable — false positive is always better than false negative with Amanita.',
    },
    rationale: 'Amanita phalloides (Death Cap) and A. virosa (Destroying Angel) are the deadliest mushrooms in the UK. Recognition of the volva + ring + white gills combination is the single most important safety skill for any forager.',
    source: {
      primary: 'Phillips (2006), Wright (2007), Kibby, all major mycological references',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'This is the most critical safety rule in the system. Amanita contains Death Cap and Destroying Angel. The volva-ring-white gills triad is the key recognition pattern. Always emphasise that the volva may be hidden underground. Never downplay the danger.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },
  {
    heuristic_id: 'puffball_slice_safety_check',
    version: 1,
    name: 'Puffball Slice Safety Check',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      genus: 'Calvatia',
      confidence_required: 'low',
    },
    procedure: {
      steps: [
        {
          instruction: 'Slice the puffball cleanly in half from top to bottom',
          safety_note: 'This check is MANDATORY before eating any puffball',
        },
        { instruction: 'Examine the cross-section carefully' },
        { instruction: 'Look for any internal structure: silhouette of a cap, gills, or stem forming inside' },
        { instruction: 'Check the flesh colour — it should be pure white and uniform throughout' },
      ],
      estimated_time: '1 minute',
    },
    outcomes: [
      {
        id: 'pure_white_uniform',
        condition: 'Pure white flesh throughout, no internal structure visible, no discolouration',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Safe to eat. This is a genuine puffball with immature spores.',
      },
      {
        id: 'internal_structure',
        condition: 'Any internal structure visible — outline of a cap, gills, or stem forming',
        conclusion: 'AVOID',
        confidence: 'definitive',
        action: 'This is NOT a puffball. It is likely a young Amanita "egg" stage. DEADLY TOXIC. Discard immediately.',
      },
      {
        id: 'discoloured',
        condition: 'Yellow, green, brown, or purple discolouration in the flesh',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Spores are maturing. No longer edible. May cause GI upset.',
      },
    ],
    safety_notes: [
      'Young Amanita (Death Cap, Destroying Angel) in the "egg" stage can closely resemble small puffballs',
      'This check is MANDATORY — never eat a puffball without slicing it first',
      'The Amanita egg will show a developing mushroom inside when sliced',
      'This rule applies to ALL puffball-like fungi, not just Calvatia',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Very reliable test. The internal structure of an Amanita egg is visually obvious when sliced.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), universal foraging safety guidance',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'This is a critical safety check. Young Amanita eggs can look like small puffballs externally. Slicing in half reveals the developing mushroom inside an Amanita, versus uniform white flesh in a true puffball. This check must always be performed.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },
  {
    heuristic_id: 'avoid_small_lepiota',
    version: 1,
    name: 'Avoid Small Lepiota-like Mushrooms',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      genus: 'Macrolepiota',
      confidence_required: 'low',
    },
    procedure: 'If you find a lepiota-like mushroom (gills, ring, scaly cap) with a cap SMALLER than 10cm: do not eat it under any circumstances.',
    outcomes: [
      {
        id: 'small_specimen',
        condition: 'Cap diameter under 10cm with lepiota-like features (ring, scaly cap, free gills)',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Could be a deadly small Lepiota species. Several contain amatoxins (same as Death Cap). Leave it alone.',
      },
      {
        id: 'large_confirmed',
        condition: 'Cap over 15cm, snakeskin pattern on stem confirmed, movable double ring, NO volva',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Consistent with Macrolepiota procera (Parasol). Continue with species-level identification.',
      },
    ],
    safety_notes: [
      'Lepiota brunneoincarnata (Deadly Lepiota) is lethally toxic and has a cap of only 2-7cm',
      'Lepiota cristata (Stinking Dapperling) and other small species are also toxic',
      'The ONLY safe parasol-type to eat is the large Macrolepiota procera (cap >15cm)',
      'If in doubt about size, do not eat',
      'A specimen without the distinctive snakeskin stem pattern is NOT a true Parasol',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Rejects all small lepiota-type mushrooms. May reject edible Macrolepiota mastoidea (Slender Parasol) which has a smaller cap, but this is an acceptable false positive.',
    },
    rationale: 'Several small Lepiota species contain deadly amatoxins. The size threshold is a simple, reliable safety gate.',
    source: {
      primary: 'Phillips (2006), Wright (2007), Kibby',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Critical safety rule. Small Lepiota species are deadly and can be confused with the edible Parasol mushroom. The size gate (must be >15cm cap with snakeskin stem) is the key safety barrier.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },
  {
    heuristic_id: 'clitocybe_rivulosa_warning',
    version: 1,
    name: 'Fool\'s Funnel / Ivory Funnel Warning',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      genus: 'Clitocybe',
      confidence_required: 'low',
    },
    procedure: 'If you find a small (2-6cm cap), white to off-white, funnel-shaped mushroom growing in grassland, especially in rings or arcs: treat it as potentially deadly.',
    outcomes: [
      {
        id: 'small_white_grass',
        condition: 'Small white funnel-shaped mushroom in grassland with decurrent gills',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Likely Clitocybe rivulosa (Fool\'s Funnel) or C. dealbata (Ivory Funnel). These contain high levels of muscarine. POTENTIALLY FATAL.',
      },
      {
        id: 'confirmed_not_clitocybe',
        condition: 'Mushroom has free gills (not decurrent), tough wiry stem, grows in fairy rings',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'May be Marasmius oreades (Fairy Ring Champignon) but needs further confirmation. Check all features carefully.',
      },
    ],
    safety_notes: [
      'C. rivulosa and C. dealbata grow in the same lawns as the edible Fairy Ring Champignon',
      'They can grow IN the same fairy rings as Marasmius',
      'Muscarine poisoning causes profuse sweating, salivation, tears, blurred vision, and can be fatal',
      'There is no reliable taste or smell test to distinguish these',
    ],
    safety: {
      false_positive_risk: 'medium',
      false_negative_risk: 'low',
      failure_mode: 'May discourage picking Fairy Ring Champignon. This is acceptable — the deadly lookalike grows in exactly the same habitat.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), Buczacki et al',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Clitocybe rivulosa and C. dealbata are deadly lawn mushrooms. They grow alongside the edible Fairy Ring Champignon, making them particularly dangerous. The key distinguishing features are gill attachment (decurrent in Clitocybe, free in Marasmius) and stem texture (fragile in Clitocybe, tough/wiry in Marasmius).',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },
  {
    heuristic_id: 'galerina_marginata_warning',
    version: 1,
    name: 'Funeral Bell (Galerina marginata) Warning',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      morphology: {
        substrate: 'wood',
        ring_present: 'true',
        cap_color: 'brown',
      },
      confidence_required: 'low',
    },
    procedure: 'If you find a small to medium brown mushroom growing on wood with a ring on the stem: treat it as potentially deadly until proven otherwise.',
    outcomes: [
      {
        id: 'brown_wood_ring',
        condition: 'Small/medium brown gilled mushroom on wood with a ring',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Could be Galerina marginata (Funeral Bell). Contains same amatoxins as Death Cap. POTENTIALLY FATAL. Take a spore print to distinguish from Honey Fungus.',
        next_steps: ['Take spore print: Galerina = rusty brown, Armillaria = white'],
      },
    ],
    safety_notes: [
      'Galerina marginata contains amatoxins — the same deadly toxins as Death Cap',
      'It grows on wood, often in clusters, and can look very like Honey Fungus (Armillaria)',
      'KEY DIFFERENCE: Galerina has rusty brown spore print; Armillaria has white spore print',
      'Galerina clusters tend to be smaller than Armillaria clusters',
      'When in doubt, a spore print is essential',
    ],
    safety: {
      false_positive_risk: 'medium',
      false_negative_risk: 'low',
      failure_mode: 'May flag Armillaria (edible) as suspicious. A spore print resolves the ambiguity.',
    },
    source: {
      primary: 'Phillips (2006), Kibby, Buczacki et al',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Galerina marginata is a deadly lookalike for Honey Fungus. Both grow on wood and have rings. The spore print is the critical differentiator: rusty brown = Galerina (deadly), white = Armillaria (edible when cooked).',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },
  {
    heuristic_id: 'cortinarius_avoidance',
    version: 1,
    name: 'Cortinarius (Webcap) Avoidance',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      morphology: {
        gill_color: 'rusty brown',
        cap_texture: 'slimy or dry',
      },
      confidence_required: 'low',
    },
    procedure: {
      steps: [
        { instruction: 'Check for a cobweb-like cortina (veil remnant) between cap edge and stem, especially in young specimens' },
        { instruction: 'Check gill colour — Cortinarius gills are typically rusty/cinnamon brown at maturity' },
        { instruction: 'Take a spore print — Cortinarius has a rusty brown spore print' },
        { instruction: 'Check if the mushroom is growing in woodland with trees' },
      ],
      estimated_time: '3-5 minutes',
    },
    outcomes: [
      {
        id: 'cortina_present',
        condition: 'Cobweb-like cortina visible, rusty brown gills, rusty spore print',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'This is likely a Cortinarius (Webcap). Several species are DEADLY. C. rubellus and C. orellanus cause irreversible kidney failure. Do not eat any Cortinarius.',
      },
      {
        id: 'violet_cortinarius',
        condition: 'Violet/purple colouration with cobweb cortina and rusty spore print',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'This is a violet Cortinarius. Despite the resemblance to Lepista (Blewit), the cortina and rusty spore print confirm Cortinarius. Do not eat.',
      },
    ],
    safety_notes: [
      'Cortinarius rubellus (Deadly Webcap) causes kidney failure — symptoms may be delayed 3-14 DAYS',
      'By the time symptoms appear, kidney damage may be irreversible',
      'Some Cortinarius species have attractive violet colours and can be confused with Blewits',
      'KEY: Cortinarius has rusty brown spore print; Lepista (Blewit) has pink spore print',
      'There are over 500 Cortinarius species in the UK — most are poorly known',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Rejects all Cortinarius. A tiny number may be edible but none are worth the risk.',
    },
    rationale: 'Cortinarius is a massive genus with several deadly species. The delayed-onset kidney failure caused by C. rubellus/orellanus makes this genus exceptionally dangerous. No Cortinarius is worth eating.',
    source: {
      primary: 'Phillips (2006), Kibby, Buczacki et al',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Cortinarius is one of the most dangerous genera due to delayed-onset kidney failure from species like C. rubellus. The cortina (cobweb veil) and rusty brown spore print are the key identification features. Critical confusion risk with Lepista (Blewits).',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },
  {
    heuristic_id: 'coprinopsis_alcohol_warning',
    version: 1,
    name: 'Ink Cap Alcohol Interaction Warning',
    category: 'safety_rule',
    priority: 'critical',
    applies_to: {
      genus: 'Coprinopsis',
      confidence_required: 'moderate',
    },
    procedure: 'Before eating any ink cap species, confirm that you will NOT consume alcohol for at least 3 days before or after eating the mushroom.',
    outcomes: [
      {
        id: 'no_alcohol',
        condition: 'No alcohol consumed or planned within 3-day window',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'moderate',
        action: 'May proceed with edibility assessment. Only eat Shaggy Ink Cap (C. comatus) — other ink caps are not recommended.',
      },
      {
        id: 'alcohol_risk',
        condition: 'Alcohol consumed recently or planned',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Do NOT eat. Common Ink Cap (C. atramentaria) contains coprine which causes severe disulfiram-like reaction with alcohol: violent nausea, vomiting, palpitations, and collapse.',
      },
    ],
    safety_notes: [
      'Coprine inhibits aldehyde dehydrogenase — alcohol cannot be metabolised normally',
      'The reaction can occur up to 3 days after eating the mushroom',
      'Symptoms include: flushing, nausea, vomiting, palpitations, breathlessness',
      'Even Shaggy Ink Cap (C. comatus) should be treated with caution around alcohol',
      'The reaction is similar to Antabuse (disulfiram) used to treat alcoholism',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'May discourage people from eating safe ink caps when no alcohol is involved. This is acceptable given the severity of the reaction.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), medical mycological literature',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'The coprine in Common Ink Cap causes a severe disulfiram-like reaction with alcohol. The 3-day window is important — the interaction is not just with concurrent consumption.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },

  // ============================================================
  // DISCRIMINATION HEURISTICS — critical lookalike pairs
  // ============================================================

  {
    heuristic_id: 'agaricus_vs_amanita_discrimination',
    version: 1,
    name: 'Agaricus vs Amanita Discrimination',
    category: 'discrimination',
    priority: 'critical',
    applies_to: {
      genus: 'Agaricus',
      confidence_required: 'low',
    },
    procedure: {
      steps: [
        {
          instruction: 'DIG AROUND THE STEM BASE — look for a volva (cup/bag/sack)',
          safety_note: 'This is the most critical check. A volva means Amanita, not Agaricus.',
        },
        { instruction: 'Check gill colour — Agaricus gills are pink (young) to chocolate brown (mature). Amanita gills are white.' },
        { instruction: 'Take a spore print — Agaricus = dark brown/chocolate. Amanita = white.' },
        { instruction: 'Note the habitat — Agaricus favours grassland. Amanita favours woodland near trees.' },
        { instruction: 'Check for cap surface patches — Amanita often has white veil patches on the cap' },
      ],
      estimated_time: '5-10 minutes (including spore print)',
    },
    outcomes: [
      {
        id: 'agaricus_confirmed',
        condition: 'No volva, pink/brown gills, dark brown spore print, grassland habitat',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Consistent with Agaricus. Continue with yellow-staining test to rule out A. xanthodermus.',
        next_steps: ['Perform yellow-staining test at stem base'],
      },
      {
        id: 'amanita_suspected',
        condition: 'Volva present OR white gills OR white spore print',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'This is likely Amanita, NOT Agaricus. Do not eat under any circumstances.',
      },
      {
        id: 'ambiguous',
        condition: 'Cannot confirm gill colour, no spore print taken, stem base not fully excavated',
        conclusion: 'AVOID',
        confidence: 'moderate',
        action: 'Insufficient evidence to distinguish. When Amanita is a possibility, always err on side of caution. Do not eat.',
        next_steps: ['Excavate full stem base', 'Take spore print', 'Examine gill colour carefully'],
      },
    ],
    safety_notes: [
      'This is the most dangerous confusion in UK foraging — Death Cap can kill',
      'Young Agaricus can have pale gills that may appear white — but they will turn pink, then brown',
      'Death Cap gills stay WHITE throughout development',
      'The volva may be deep underground — dig carefully',
      'Death Cap can grow in grassland near isolated trees, not just deep woodland',
    ],
    safety: {
      false_positive_risk: 'medium',
      false_negative_risk: 'low',
      failure_mode: 'May reject Agaricus specimens when Amanita cannot be fully ruled out. This is the correct behaviour.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), all major UK foraging guides',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Agaricus vs Amanita is the most critical discrimination in UK foraging. The three key checks: 1) volva (Amanita has one, Agaricus does not), 2) gill colour (white = Amanita, pink/brown = Agaricus), 3) spore print (white = Amanita, dark brown = Agaricus). Habitat also helps: grassland favours Agaricus, woodland favours Amanita.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'macrolepiota_vs_lepiota_vs_amanita',
    version: 1,
    name: 'Parasol vs Small Lepiota vs Amanita Discrimination',
    category: 'discrimination',
    priority: 'critical',
    applies_to: {
      genus: 'Macrolepiota',
      confidence_required: 'low',
    },
    procedure: {
      steps: [
        {
          instruction: 'Measure the cap diameter — must be at least 15cm for a true Parasol',
          safety_note: 'Small specimens (<10cm) could be deadly Lepiota species',
        },
        { instruction: 'Check the stem for the distinctive "snakeskin" pattern (brown zigzag markings on a pale stem)' },
        { instruction: 'Check the ring — Parasol has a large, thick, movable double ring that slides up and down the stem' },
        { instruction: 'DIG AROUND THE STEM BASE — check for a volva (would indicate Amanita, not Parasol)' },
        { instruction: 'Check the stem — it should be tall, slender, and fibrous (not fleshy like Amanita)' },
      ],
      estimated_time: '3-5 minutes',
    },
    outcomes: [
      {
        id: 'true_parasol',
        condition: 'Large cap (>15cm), snakeskin stem pattern, movable double ring, NO volva',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Confirmed Macrolepiota procera (Parasol). Choice edible. Cap is best sliced and fried.',
      },
      {
        id: 'small_dangerous',
        condition: 'Cap under 10cm with ring and scaly cap',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Could be deadly Lepiota species. Do not eat any small parasol-like mushroom.',
      },
      {
        id: 'volva_present',
        condition: 'Any volva visible at stem base',
        conclusion: 'AVOID',
        confidence: 'definitive',
        action: 'A volva means this is NOT a Parasol — likely Amanita. Do not eat.',
      },
      {
        id: 'no_snakeskin',
        condition: 'Large cap but no snakeskin stem pattern',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'Without the snakeskin stem, this is not a confirmed Parasol. Could be Chlorophyllum rhacodes (Shaggy Parasol) which causes GI upset in some people, or another species. Do not eat unless further identified.',
      },
    ],
    safety_notes: [
      'Lepiota brunneoincarnata and L. subincarnata are LETHALLY TOXIC and look like small parasols',
      'Chlorophyllum molybdites (not common in UK but increasing) causes severe GI upset',
      'The snakeskin stem pattern is unique to true Macrolepiota procera',
      'Never eat a parasol-type mushroom that you picked from the button/egg stage — wait until fully open and confirmable',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Rejects small and ambiguous specimens. Correct behaviour.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), Kibby',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Three-way discrimination between Parasol (edible), small Lepiota (deadly), and Amanita (deadly). Size threshold (>15cm) plus snakeskin stem pattern plus absence of volva confirms true Parasol.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'chanterelle_vs_false_chanterelle',
    version: 1,
    name: 'Chanterelle vs False Chanterelle Discrimination',
    category: 'discrimination',
    priority: 'standard',
    applies_to: {
      genus: 'Cantharellus',
      confidence_required: 'moderate',
    },
    procedure: {
      steps: [
        { instruction: 'Examine the underside of the cap closely — look at the gill/ridge structure' },
        { instruction: 'True chanterelle has forked RIDGES (blunt, thick, run down the stem). False chanterelle has thin, blade-like TRUE GILLS.' },
        { instruction: 'Cut the mushroom in half — true chanterelle has solid white or pale yellow flesh. False chanterelle has orange flesh throughout.' },
        { instruction: 'Smell the mushroom — true chanterelle has a distinctive apricot/fruity smell. False chanterelle smells mushroomy or faintly woody.' },
      ],
      estimated_time: '2-3 minutes',
    },
    outcomes: [
      {
        id: 'true_chanterelle',
        condition: 'Forked ridges (not true gills), white/pale flesh, apricot smell',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Confirmed Cantharellus cibarius (Chanterelle). Choice edible.',
      },
      {
        id: 'false_chanterelle',
        condition: 'Thin true gills, orange flesh throughout, no apricot smell',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'This is Hygrophoropsis aurantiaca (False Chanterelle). Not dangerously toxic but can cause GI upset. Not worth eating.',
      },
      {
        id: 'uncertain',
        condition: 'Cannot clearly distinguish ridges from gills',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'If unsure, check the other features: flesh colour and smell. The apricot smell is very distinctive for true chanterelle.',
      },
    ],
    exceptions: [
      {
        species: 'C. tubaeformis',
        note: 'Winter Chanterelle (Yellowleg) is a smaller, brown-capped Cantharellus that also has ridges, not gills. Edible.',
      },
    ],
    safety_notes: [
      'This is a low-risk confusion — False Chanterelle is not dangerously toxic',
      'In areas with Jack O\'Lantern (Omphalotus olearius) — rare in UK — take more care as it is toxic',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Low risk. False Chanterelle is mildly toxic at worst. True chanterelle features are quite distinctive.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007)',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Chanterelle vs False Chanterelle is a common confusion but low-risk. Three distinguishing features: 1) ridges vs true gills, 2) white vs orange flesh, 3) apricot smell vs none. True chanterelle has ridges, white flesh, and apricot smell.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'marasmius_vs_clitocybe_rivulosa',
    version: 1,
    name: 'Fairy Ring Champignon vs Fool\'s Funnel Discrimination',
    category: 'discrimination',
    priority: 'critical',
    applies_to: {
      genus: 'Marasmius',
      confidence_required: 'moderate',
    },
    procedure: {
      steps: [
        {
          instruction: 'Check the stem — Marasmius has a TOUGH, WIRY stem that bends without snapping. Clitocybe has a softer, more fragile stem.',
          safety_note: 'This is the most reliable field test',
        },
        { instruction: 'Check gill attachment — Marasmius has FREE gills (not touching the stem). Clitocybe has DECURRENT gills (running down the stem).' },
        { instruction: 'Check the cap shape — Clitocybe tends to be more funnel-shaped or depressed in the centre. Marasmius has a more convex to flat cap with a small central bump.' },
        { instruction: 'Check colour — Clitocybe rivulosa is typically white to off-white/grey. Marasmius is tan/buff with a darker centre.' },
      ],
      estimated_time: '2-3 minutes',
    },
    outcomes: [
      {
        id: 'marasmius_confirmed',
        condition: 'Tough wiry stem that bends, free gills, buff/tan cap, not funnel-shaped',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Consistent with Marasmius oreades (Fairy Ring Champignon). Good edible.',
      },
      {
        id: 'clitocybe_suspected',
        condition: 'Soft/fragile stem, decurrent gills, white colour, funnel-shaped cap',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Likely Clitocybe rivulosa (Fool\'s Funnel) or C. dealbata. DEADLY — contains high muscarine levels. Do not eat.',
      },
      {
        id: 'mixed_features',
        condition: 'Some features match Marasmius, some match Clitocybe',
        conclusion: 'AVOID',
        confidence: 'moderate',
        action: 'When distinguishing between an edible and a deadly lookalike, any doubt means do not eat.',
      },
    ],
    safety_notes: [
      'Both species grow in EXACTLY the same habitat — fairy rings on lawns and grassland',
      'They can even fruit in the same ring at the same time',
      'Clitocybe rivulosa causes profuse sweating, salivation, blurred vision, and can be fatal',
      'The tough stem test is the most reliable single field check',
      'If collecting from a fairy ring, examine EVERY specimen individually',
    ],
    safety: {
      false_positive_risk: 'medium',
      false_negative_risk: 'low',
      failure_mode: 'May reject Marasmius when features are ambiguous. This is correct — never risk it when a deadly lookalike is possible.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), Buczacki et al',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Critical discrimination. Marasmius oreades (edible) and Clitocybe rivulosa (deadly) grow in the same fairy rings on lawns. Key tests: 1) stem toughness (wiry = Marasmius, soft = Clitocybe), 2) gill attachment (free = Marasmius, decurrent = Clitocybe), 3) colour (buff/tan = Marasmius, white = Clitocybe).',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'armillaria_vs_galerina',
    version: 1,
    name: 'Honey Fungus vs Funeral Bell Discrimination',
    category: 'discrimination',
    priority: 'critical',
    applies_to: {
      genus: 'Armillaria',
      confidence_required: 'moderate',
    },
    procedure: {
      steps: [
        {
          instruction: 'Take a SPORE PRINT — this is the essential test',
          safety_note: 'Do not eat until spore print is confirmed',
        },
        { instruction: 'Armillaria spore print = WHITE. Galerina spore print = RUSTY BROWN.' },
        { instruction: 'Check cluster size — Armillaria typically forms large, dense clusters. Galerina tends to form smaller groups.' },
        { instruction: 'Check stem thickness — Armillaria has a stout, firm stem. Galerina has a thinner, more fragile stem.' },
        { instruction: 'Check for rhizomorphs (black bootlace-like cords) on the wood surface — characteristic of Armillaria' },
      ],
      estimated_time: '4-12 hours (for spore print)',
    },
    outcomes: [
      {
        id: 'armillaria_confirmed',
        condition: 'WHITE spore print, large clusters, stout stem, rhizomorphs on wood',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Consistent with Armillaria (Honey Fungus). Edible when thoroughly cooked. Can cause GI upset in some people — try a small amount first.',
      },
      {
        id: 'galerina_suspected',
        condition: 'RUSTY BROWN spore print',
        conclusion: 'AVOID',
        confidence: 'definitive',
        action: 'This is Galerina marginata (Funeral Bell). LETHALLY TOXIC — contains amatoxins (same as Death Cap). Do not eat.',
      },
      {
        id: 'no_spore_print',
        condition: 'Spore print not taken or inconclusive',
        conclusion: 'AVOID',
        confidence: 'moderate',
        action: 'Without a confirmed white spore print, cannot safely distinguish from Galerina. Do not eat.',
      },
    ],
    safety_notes: [
      'Galerina marginata contains the same deadly amatoxins as Death Cap',
      'The spore print is THE critical test — there is no reliable field test without it',
      'Both species grow on wood and can have rings',
      'Armillaria mellea complex is edible when cooked but never eat raw',
      'Some people experience GI upset even with properly cooked Armillaria',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Requires spore print. Without it, the safe default is to reject. Correct behaviour.',
    },
    source: {
      primary: 'Phillips (2006), Kibby, Buczacki et al',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Armillaria vs Galerina is a critical discrimination for anyone collecting wood-growing mushrooms. The spore print is essential: white = Armillaria (edible), rusty brown = Galerina (deadly). Without a spore print, do not eat.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'lepista_vs_cortinarius',
    version: 1,
    name: 'Blewit vs Webcap Discrimination',
    category: 'discrimination',
    priority: 'critical',
    applies_to: {
      genus: 'Lepista',
      confidence_required: 'moderate',
    },
    procedure: {
      steps: [
        {
          instruction: 'Take a SPORE PRINT — this is the definitive test',
          safety_note: 'Confusing these two can be fatal. Cortinarius causes irreversible kidney failure.',
        },
        { instruction: 'Lepista spore print = PALE PINK. Cortinarius spore print = RUSTY BROWN.' },
        { instruction: 'Check for a cortina (cobweb-like veil) — Cortinarius has one (especially visible in young specimens), Lepista does not.' },
        { instruction: 'Smell the mushroom — Lepista (Wood Blewit) has a distinctive sweet, perfumed/floral smell. Most Cortinarius smell earthy or radish-like.' },
        { instruction: 'Check gill colour in mature specimens — Lepista gills stay lilac/pale. Cortinarius gills become rusty brown as spores mature.' },
      ],
      estimated_time: '4-12 hours (for spore print)',
    },
    outcomes: [
      {
        id: 'lepista_confirmed',
        condition: 'PALE PINK spore print, no cortina, perfumed smell, lilac stem and gills',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Confirmed Lepista (Blewit). Good edible when thoroughly cooked. Must be cooked — toxic raw.',
      },
      {
        id: 'cortinarius_suspected',
        condition: 'RUSTY BROWN spore print OR cobweb cortina visible',
        conclusion: 'AVOID',
        confidence: 'definitive',
        action: 'This is a Cortinarius (Webcap). Several species cause irreversible kidney failure with DELAYED onset (3-14 days). Do not eat.',
      },
      {
        id: 'no_spore_print',
        condition: 'Spore print not taken',
        conclusion: 'AVOID',
        confidence: 'moderate',
        action: 'Cannot safely eat violet/lilac mushrooms without a spore print confirming pink (Lepista) vs rusty brown (Cortinarius).',
      },
    ],
    safety_notes: [
      'Cortinarius rubellus (Deadly Webcap) causes irreversible kidney failure',
      'Symptoms are DELAYED by 3-14 days — by which time dialysis or transplant may be needed',
      'Several Cortinarius species have violet/lilac colours similar to Blewits',
      'The spore print is the definitive test',
      'A cortina (cobweb remnant) on the stem is diagnostic for Cortinarius',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Requires spore print for confirmation. Without it, the safe default is to reject.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), Kibby',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Lepista (Blewit) vs Cortinarius (Webcap) discrimination is critical because several Cortinarius species cause irreversible kidney failure. Both can have violet/lilac colours. Key tests: spore print (pink = Lepista, rusty = Cortinarius), cortina (present only in Cortinarius), and smell (perfumed = Lepista).',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'puffball_vs_amanita_egg',
    version: 1,
    name: 'Puffball vs Amanita Egg Discrimination',
    category: 'discrimination',
    priority: 'critical',
    applies_to: {
      genus: 'Calvatia',
      confidence_required: 'low',
    },
    procedure: {
      steps: [
        {
          instruction: 'Slice the specimen CLEANLY IN HALF from top to bottom',
          safety_note: 'This test is mandatory for all puffball-like fungi',
        },
        { instruction: 'Examine the cross-section carefully under good light' },
        { instruction: 'A TRUE PUFFBALL shows uniform, solid white flesh — like a marshmallow' },
        { instruction: 'An AMANITA EGG shows a developing mushroom inside — you can see the outline of a cap, gills, and stem forming' },
      ],
      estimated_time: '1 minute',
    },
    outcomes: [
      {
        id: 'true_puffball',
        condition: 'Uniform solid white flesh, no internal structure, texture like marshmallow or fresh mozzarella',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'high',
        action: 'Confirmed puffball. Edible when flesh is pure white throughout.',
      },
      {
        id: 'amanita_egg',
        condition: 'Internal structure visible — developing cap, gills, or stem outline',
        conclusion: 'AVOID',
        confidence: 'definitive',
        action: 'This is a developing Amanita mushroom in the "egg" stage. If it is a Death Cap or Destroying Angel, this is LETHAL. Discard immediately.',
      },
      {
        id: 'yellowing',
        condition: 'Flesh is yellowing, browning, or shows purple/green discolouration',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Spores are maturing. No longer edible even if genuine puffball. Discard.',
      },
    ],
    safety_notes: [
      'This confusion has caused fatal poisonings — always slice puffball-type fungi',
      'Giant puffballs (Calvatia gigantea) are too large to confuse, but smaller puffball species can resemble Amanita eggs',
      'Common puffball (Lycoperdon perlatum) is the size most likely to be confused',
      'Earthballs (Scleroderma) have a thick dark rind and dark interior — not edible but not typically deadly',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Very reliable visual test. The internal structure of an Amanita egg is clearly visible when sliced.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), universal foraging safety guidance',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Puffball vs Amanita egg is a critical discrimination. Slicing in half is the definitive test: uniform white flesh = puffball, visible developing mushroom = Amanita egg (potentially Death Cap). This check must always be performed on any round, ball-shaped fungus.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: false,
      allow_fork: false,
      allow_regional_override: false,
    },
  },

  // ============================================================
  // EDIBILITY DETERMINATION — tests for specific genera
  // ============================================================

  {
    heuristic_id: 'agaricus_yellow_stain_test',
    version: 1,
    name: 'Agaricus Yellow-Staining Test',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      genus: 'Agaricus',
      confidence_required: 'high',
    },
    prerequisites: {
      competencies: { agaricus_genus_recognition: 'confident' },
      safety_checks: ['confirmed_not_amanita'],
    },
    procedure: {
      steps: [
        { instruction: 'Cut or scratch the very base of the stem (the bulbous part)' },
        { instruction: 'Watch for colour change over 30-60 seconds' },
        {
          instruction: 'Also scratch the cap surface and observe',
          safety_note: 'The stem base test is more reliable than the cap test',
        },
        { instruction: 'Smell the cut flesh — Yellow Stainer has a distinctive ink/phenol/chemical smell' },
      ],
      estimated_time: '1-2 minutes',
    },
    outcomes: [
      {
        id: 'chrome_yellow',
        condition: 'Bright chrome yellow staining at stem base AND/OR ink/phenol smell',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'This is Agaricus xanthodermus (Yellow-staining Mushroom). Causes nausea, vomiting, and stomach cramps. Do not eat.',
      },
      {
        id: 'no_staining',
        condition: 'No yellow staining, or only slight browning. Pleasant mushroomy or anise smell.',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Not a Yellow Stainer. Proceed with species identification. Likely A. campestris (Field Mushroom) or A. arvensis (Horse Mushroom).',
      },
      {
        id: 'slight_yellowing',
        condition: 'Faint yellowish tinge but not bright chrome yellow. No chemical smell.',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'Some edible Agaricus (e.g., Horse Mushroom) can yellow slightly. The KEY is whether it\'s bright chrome yellow AND whether there\'s a chemical/ink smell. If in doubt, reject.',
        disambiguation: [
          {
            question: 'Is the yellow colour bright chrome/vivid, or more of a gentle buff/straw tinge?',
            if_yes: 'Bright chrome yellow — reject as Yellow Stainer',
            if_no: 'Gentle yellowing — may be edible Horse Mushroom, but still exercise caution',
          },
        ],
      },
    ],
    exceptions: [
      {
        species: 'A. arvensis',
        note: 'Horse Mushroom yellows slightly when bruised but NOT bright chrome yellow, and smells of anise (not ink)',
      },
      {
        species: 'A. augustus',
        note: 'The Prince can stain yellow on the cap but has a strong almond/anise smell (not ink)',
      },
    ],
    safety_notes: [
      'A. xanthodermus is the most commonly misidentified toxic Agaricus',
      'The ink/phenol smell is as diagnostic as the yellow staining',
      'Cooking intensifies the chemical smell — if you smell ink when cooking, stop',
      'Yellow Stainer causes unpleasant GI upset but is not life-threatening',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Very reliable test. Chrome yellow + ink smell is distinctive.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007)',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'The yellow-staining test for Agaricus distinguishes the common Yellow Stainer (A. xanthodermus) from edible species. Key: bright chrome yellow at stem base plus ink/phenol smell = Yellow Stainer. Gentle yellowing plus anise smell = likely edible Horse Mushroom.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'puffball_interior_check',
    version: 1,
    name: 'Puffball Interior Edibility Check',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      genus: 'Calvatia',
      confidence_required: 'high',
    },
    prerequisites: {
      safety_checks: ['puffball_slice_safety_check', 'confirmed_not_amanita_egg'],
    },
    procedure: {
      steps: [
        { instruction: 'Confirm the slice test has been performed and no internal structure is visible' },
        { instruction: 'Examine the flesh colour throughout the cross-section' },
        { instruction: 'Press the flesh — it should be firm and springy, not soft or mushy' },
        { instruction: 'Check for any areas of discolouration or dark patches' },
      ],
      estimated_time: '1 minute',
    },
    outcomes: [
      {
        id: 'pure_white',
        condition: 'Pure white flesh throughout, firm and springy, no discolouration',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Edible. Best sliced and fried. Giant puffball can be cut into steaks.',
      },
      {
        id: 'yellowing',
        condition: 'Flesh starting to yellow or showing slight green/olive tinge',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Spores beginning to mature. No longer good eating. May cause GI upset.',
      },
      {
        id: 'brown_or_dark',
        condition: 'Brown, olive, or dark flesh. Powdery or soft texture.',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Spores fully mature. Do not eat. Will taste bitter and may cause stomach upset.',
      },
    ],
    safety_notes: [
      'Only eat puffballs when the flesh is PURE WHITE throughout',
      'Any discolouration means spores are maturing — no longer edible',
      'Earthballs (Scleroderma) have a thick dark rind and dark interior — they are toxic, not true puffballs',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'White flesh test is very reliable. Yellow/brown flesh is clearly visible.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007)',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'After the safety slice check confirms no Amanita egg, the interior colour check determines edibility: pure white = edible, any yellowing/browning = reject. Simple and reliable.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'coprinopsis_freshness_check',
    version: 1,
    name: 'Ink Cap Freshness Check',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      genus: 'Coprinopsis',
      confidence_required: 'high',
    },
    prerequisites: {
      safety_checks: ['coprinopsis_alcohol_warning'],
    },
    procedure: {
      steps: [
        { instruction: 'Check the cap shape — Shaggy Ink Cap should be elongated, cylindrical, with shaggy white scales' },
        { instruction: 'Check the gills — they should be white or only just beginning to turn pink' },
        {
          instruction: 'Check for any black ink dripping from the cap edges',
          safety_note: 'If ink is running, the mushroom is past its best for eating',
        },
        { instruction: 'Gently squeeze the cap — it should feel firm, not soft or wet' },
      ],
      estimated_time: '1 minute',
    },
    outcomes: [
      {
        id: 'fresh_shaggy',
        condition: 'Firm, white, cylindrical cap with shaggy scales. Gills white or just turning pink. No ink.',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Fresh Shaggy Ink Cap (Coprinus comatus). Good edible. Cook and eat within a few hours — they deteriorate very fast.',
      },
      {
        id: 'starting_to_ink',
        condition: 'Gills turning black or ink beginning to form at cap edges',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Past its peak. Deliquescence has begun. No longer good eating.',
      },
      {
        id: 'not_shaggy',
        condition: 'Smooth cap without shaggy scales, grey to brown colour',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'This may be Common Ink Cap (C. atramentaria) rather than Shaggy Ink Cap. Common Ink Cap is TOXIC WITH ALCOHOL. Best avoided entirely.',
      },
    ],
    safety_notes: [
      'Only the Shaggy Ink Cap (Coprinus comatus) is recommended for eating',
      'Common Ink Cap (Coprinopsis atramentaria) is toxic with alcohol',
      'Shaggy Ink Caps deteriorate within hours of picking — cook immediately',
      'Do not store or transport for long distances',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Rejects any non-fresh or non-Shaggy specimens. Correct approach.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007)',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Shaggy Ink Cap is edible when very fresh (white gills, no ink). Must be cooked within hours. Common Ink Cap looks different (smooth grey cap) and is toxic with alcohol. Only recommend Shaggy Ink Cap.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'laetiporus_host_tree_check',
    version: 1,
    name: 'Chicken of the Woods Host Tree Safety Check',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      genus: 'Laetiporus',
      confidence_required: 'high',
    },
    procedure: {
      steps: [
        { instruction: 'Identify the host tree species that the bracket is growing on' },
        {
          instruction: 'Check specifically: is this a yew tree (Taxus) or eucalyptus?',
          safety_note: 'Specimens on yew or eucalyptus may absorb tree toxins and should never be eaten',
        },
        { instruction: 'Check the softness — press the bracket. It should be soft and succulent, not tough or woody.' },
        { instruction: 'Check the colour — should be bright orange-yellow, not faded or pale' },
      ],
      estimated_time: '2-3 minutes',
    },
    outcomes: [
      {
        id: 'safe_host',
        condition: 'Growing on oak, sweet chestnut, cherry, willow, or other common broadleaf. Soft and brightly coloured.',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Safe to eat. Best when young and soft. Slice and fry. Try a small amount first as some people experience GI upset.',
      },
      {
        id: 'yew_host',
        condition: 'Growing on yew (Taxus baccata)',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Do NOT eat. Specimens on yew may absorb taxine alkaloids from the tree. These are highly toxic.',
      },
      {
        id: 'eucalyptus_host',
        condition: 'Growing on eucalyptus',
        conclusion: 'AVOID',
        confidence: 'high',
        action: 'Do NOT eat. Specimens on eucalyptus may absorb compounds that cause GI upset.',
      },
      {
        id: 'tough_old',
        condition: 'Bracket is tough, woody, or pale/faded',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Past its peak. Tough specimens are indigestible and unpleasant.',
      },
    ],
    safety_notes: [
      'Chicken of the Woods on yew has caused hospitalisations',
      'Even on safe host trees, some people experience mild GI upset — try a small portion first',
      'Older, tougher specimens are not worth eating regardless of host tree',
      'Conifer-hosted specimens may also cause more GI issues than broadleaf-hosted ones',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Rejects specimens on dangerous host trees and old tough specimens. Correct approach.',
    },
    source: {
      primary: 'Phillips (2006), Wright (2007), case reports',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Chicken of the Woods is generally safe but specimens on yew trees can absorb toxins. Host tree identification is important. Also only eat young, soft specimens.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'bolete_red_pore_test',
    version: 1,
    name: 'Bolete Red Pore Danger Test',
    category: 'edibility_determination',
    priority: 'standard',
    applies_to: {
      family: 'Boletaceae',
      confidence_required: 'moderate',
    },
    prerequisites: {
      safety_checks: ['confirmed_bolete_family'],
    },
    procedure: {
      steps: [
        { instruction: 'Turn the mushroom over and examine the pore surface colour' },
        { instruction: 'Check if the pores are red, orange-red, or blood red' },
        { instruction: 'Cut the flesh and observe for blue staining (colour change)' },
        { instruction: 'Taste a tiny piece of cap flesh (safe for all boletes) — note if bitter' },
      ],
      estimated_time: '2-3 minutes',
    },
    outcomes: [
      {
        id: 'red_pores_blue',
        condition: 'Red pores AND rapid blue staining when cut',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Likely Rubroboletus satanas (Satan\'s Bolete) or similar toxic red-pored species. Do not eat.',
      },
      {
        id: 'yellow_white_pores',
        condition: 'Yellow, white, or cream pores. No bitter taste.',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'moderate',
        action: 'Continue with species identification. Most boletes with non-red pores are edible.',
        next_steps: ['Identify to species level', 'Check for bitter taste (Tylopilus felleus)'],
      },
      {
        id: 'bitter_taste',
        condition: 'Any pore colour but strongly bitter taste',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Likely Tylopilus felleus (Bitter Bolete) or similar. Not toxic but inedibly bitter — will ruin any dish.',
      },
      {
        id: 'blue_no_red',
        condition: 'Blue staining when cut but pores are NOT red',
        conclusion: 'PROCEED_WITH_CAUTION',
        confidence: 'moderate',
        action: 'Many excellent edible boletes stain blue (Bay Bolete, Scarletina Bolete). Blue staining alone is not a danger sign. Continue identification.',
      },
    ],
    safety_notes: [
      'Red pores + blue staining = danger combination',
      'Blue staining ALONE is not dangerous — many choice edibles stain blue',
      'Satan\'s Bolete (Rubroboletus satanas) is rare in the UK but locally found in chalky areas',
      'The taste test is safe for all boletes — none are lethally toxic',
      'Bitter Bolete (Tylopilus felleus) is often confused with Penny Bun but has pink pores and bitter taste',
    ],
    safety: {
      false_positive_risk: 'low',
      false_negative_risk: 'low',
      failure_mode: 'Red pore test is very reliable. Bitter taste test catches Tylopilus.',
    },
    source: {
      primary: 'Phillips (2006), Kibby, Buczacki et al',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Bolete safety assessment. Red pores + blue staining = toxic (Satan\'s Bolete). Blue staining alone = harmless (many edibles do this). Bitter taste = Tylopilus (inedible but not toxic). Yellow/white pores + mild taste = likely edible.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },

  // ============================================================
  // ECOLOGICAL CONTEXT — habitat, season, and association rules
  // ============================================================

  {
    heuristic_id: 'death_cap_habitat_alert',
    version: 1,
    name: 'Death Cap Habitat Alert',
    category: 'ecological_context',
    priority: 'critical',
    applies_to: {
      genus: 'Amanita',
      confidence_required: 'low',
    },
    procedure: 'When foraging near oak trees in late summer/autumn, be especially alert for Death Cap (A. phalloides). Check all white-gilled mushrooms growing near oak for a volva.',
    outcomes: [
      {
        id: 'oak_woodland_autumn',
        condition: 'Foraging near mature oak trees, July-November',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'This is prime Death Cap territory. Be extra vigilant. Check EVERY mushroom for volva before considering edibility.',
      },
      {
        id: 'park_isolated_oaks',
        condition: 'Parkland or garden with isolated oak trees',
        conclusion: 'CAUTION',
        confidence: 'moderate',
        action: 'Death Cap grows near isolated oaks in parks too — not just deep woodland. Remain vigilant.',
      },
    ],
    safety_notes: [
      'Death Cap has a strong association with oak (Quercus) in the UK',
      'It also associates with beech, hazel, and occasionally other broadleaves',
      'Death Cap can appear in urban parks, gardens, and cemeteries — anywhere there are suitable trees',
      'The range of Death Cap in the UK is expanding northward',
      'Death Cap can appear greenish-yellow, olive, pale, or even white (var. alba)',
    ],
    rationale: 'Understanding Death Cap ecology helps foragers know when to be most alert. Oak woodland in autumn is the highest-risk scenario.',
    source: {
      primary: 'Phillips (2006), O\'Reilly, FRDBI distribution data',
      reliability: 'proven',
      last_verified: '2025-01-15',
      verified_by: 'expert_review',
    },
    llm_context: 'Death Cap strongly associates with oak in the UK. Any foraging near oak trees in July-November should trigger heightened alertness. Death Cap also occurs in parks and gardens, not just woodland.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'grassland_vs_woodland_context',
    version: 1,
    name: 'Grassland vs Woodland Habitat Context',
    category: 'ecological_context',
    priority: 'standard',
    applies_to: {
      confidence_required: 'low',
    },
    procedure: 'Note whether you are in grassland (lawns, meadows, pasture) or woodland (deciduous, coniferous, mixed). This significantly narrows likely genera.',
    outcomes: [
      {
        id: 'grassland',
        condition: 'Open grassland, lawn, meadow, or pasture — no trees nearby',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Grassland genera include: Agaricus (field mushrooms), Marasmius (fairy rings), Calvatia (puffballs), Coprinopsis (ink caps), Clitocybe (DANGER — funnels). Most mycorrhizal species excluded.',
        next_steps: ['Amanita is unlikely in pure grassland (needs trees)', 'But be alert for Clitocybe rivulosa in fairy rings'],
      },
      {
        id: 'deciduous_woodland',
        condition: 'Deciduous woodland with oak, beech, birch, etc.',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Rich habitat. Expect: Russula, Lactarius, Boletus, Cantharellus, Amanita, Armillaria, Lepista, Craterellus, Hydnum, Leccinum, plus many others.',
        next_steps: ['Be alert for Amanita near oak and beech', 'Note specific tree species for mycorrhizal associations'],
      },
      {
        id: 'conifer_woodland',
        condition: 'Conifer plantation or pine/spruce woodland',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Expect: Russula, Lactarius (especially Saffron Milkcap), Boletus, Sparassis (cauliflower fungus), some Leccinum. Different species composition from deciduous woodland.',
      },
    ],
    safety_notes: [
      'Some species blur the boundary — e.g., woodland edges, parkland with scattered trees',
      'Death Cap needs tree association but can occur under isolated park trees',
      'Grassland is not inherently "safer" — it hosts Clitocybe rivulosa (deadly)',
    ],
    source: 'General mycological knowledge, Phillips (2006), O\'Reilly',
    reliability: 'proven',
    llm_context: 'Habitat is one of the most useful initial filters. Grassland and woodland host very different species assemblages. Understanding this helps narrow candidates early in the identification process.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'mycorrhizal_tree_association',
    version: 1,
    name: 'Mycorrhizal Tree Association Guide',
    category: 'ecological_context',
    priority: 'standard',
    applies_to: {
      confidence_required: 'low',
    },
    procedure: 'Identify the nearest trees. Many edible species form mycorrhizal partnerships with specific trees and will only grow near those trees.',
    outcomes: [
      {
        id: 'birch',
        condition: 'Birch trees (Betula) nearby — distinctive white bark',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Birch associates: Leccinum scabrum/versipelle (Brown/Orange Birch Bolete), Lactarius torminosus, Russula species, Amanita muscaria (Fly Agaric), Cantharellus. Fly Agaric under birch is very characteristic.',
      },
      {
        id: 'oak',
        condition: 'Oak trees (Quercus) nearby',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Oak associates: Boletus edulis (Penny Bun), Cantharellus cibarius (Chanterelle), Lactarius, Russula, Amanita (CAUTION — Death Cap). Also Fistulina hepatica (Beefsteak) on oak trunks. Richest tree for fungi.',
      },
      {
        id: 'beech',
        condition: 'Beech trees (Fagus) nearby — smooth grey bark, coppery autumn leaves',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Beech associates: Craterellus cornucopioides (Horn of Plenty), Russula, Lactarius blennius, Boletus edulis, Cantharellus. Amanita phalloides also associates with beech.',
      },
      {
        id: 'pine',
        condition: 'Pine trees (Pinus) nearby',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Pine associates: Lactarius deliciosus (Saffron Milkcap), Boletus species, Sparassis crispa (Cauliflower Fungus at base), Russula. Saffron Milkcap is almost exclusively under pines in the UK.',
      },
    ],
    safety_notes: [
      'Mycorrhizal species ONLY grow near their partner trees — this is a powerful filter',
      'Non-mycorrhizal species (saprotrophs like Pleurotus, Armillaria) grow on dead/living wood regardless of tree species',
      'Some species are generalists (Russula, Amanita) — they associate with many tree species',
    ],
    source: 'Phillips (2006), O\'Reilly, general mycological knowledge',
    reliability: 'proven',
    llm_context: 'Tree associations are powerful filters for mycorrhizal species. Birch → Leccinum/Fly Agaric. Oak → Penny Bun/Chanterelle/Death Cap. Beech → Horn of Plenty. Pine → Saffron Milkcap/Cauliflower Fungus.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
  {
    heuristic_id: 'uk_seasonal_fruiting_guide',
    version: 1,
    name: 'UK Seasonal Fruiting Guide',
    category: 'ecological_context',
    priority: 'standard',
    applies_to: {
      confidence_required: 'low',
    },
    procedure: 'Note the current month. Different species fruit at different times, and season is a useful filter for identification.',
    outcomes: [
      {
        id: 'spring',
        condition: 'March-May (spring)',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Limited fruiting. Expect: St George\'s Mushroom (Calocybe gambosa, April-May), Morels (Morchella, March-May), early Agaricus. Most major genera not yet fruiting.',
      },
      {
        id: 'early_summer',
        condition: 'June-July (early summer)',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Season building. Expect: Chanterelles begin (July), early Russula, Boletus, Marasmius (fairy rings active), Laetiporus (Chicken of the Woods from May). Amanita begins late July.',
      },
      {
        id: 'peak_season',
        condition: 'August-October (peak season)',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Peak diversity. ALL 20 priority genera may be fruiting. Maximum range of species. Also maximum danger — Death Cap and Destroying Angel fruit during this period. Be most alert.',
      },
      {
        id: 'late_season',
        condition: 'November-December (late season)',
        conclusion: 'INVESTIGATE_FURTHER',
        confidence: 'moderate',
        action: 'Thinning but good finds. Expect: Lepista (Blewits — peak November), Pleurotus (Oyster Mushrooms — peak winter), Craterellus (Horn of Plenty), Armillaria, Hydnum. Most Amanita finished.',
      },
    ],
    safety_notes: [
      'Season alone never confirms identification — but it helps narrow candidates',
      'Climate change is shifting fruiting times — some species appearing earlier/later than guides suggest',
      'A warm autumn can extend fruiting well into December',
      'Regional variation exists — southern England fruits earlier than Scotland',
    ],
    source: 'Phillips (2006), O\'Reilly, First Nature seasonal data',
    reliability: 'proven',
    llm_context: 'UK mushroom season runs mainly July-December with peak diversity August-October. Season helps narrow candidates: spring = very few species, summer = building, autumn = peak (most dangerous too), late autumn/winter = Blewits, Oyster Mushrooms, Horn of Plenty.',
    user_editable: {
      allow_notes: true,
      allow_exception_report: true,
      allow_fork: false,
      allow_regional_override: true,
    },
  },
];
