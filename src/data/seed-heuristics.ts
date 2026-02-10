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
  },
];
