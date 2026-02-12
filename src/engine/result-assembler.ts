import type {
  Observation,
  IdentificationResult,
  ActivatedHeuristic,
  Candidate,
  Heuristic,
  SafetyAssessment,
  SafetyWarning,
  LookalikeWarning,
  EdibilityInfo,
  SuggestedAction,
  Evidence,
  FollowUpQuestion,
} from '@/types';
import { type FeatureRule } from './feature-rules';
import { scoreAllCandidates, scoreToConfidence, type CandidateScore } from './scorer';
import { selectQuestions } from './disambiguation';
import { summarizeObservation, summarizeAllObservations } from './evidence-summary';
import { inferFeatures } from './feature-inference';
import { detectAmbiguities } from './ambiguity-detection';
import { preprocessDescriptionNotes } from './description-preprocessing';
import { findApplicableHeuristics, generateHeuristicActions } from './heuristic-questions';

/** Genera known to contain deadly or seriously toxic species */
const DANGEROUS_GENERA: Record<string, { toxicity: string; message: string }> = {
  Amanita: {
    toxicity: 'deadly',
    message:
      'Amanita includes Death Cap and Destroying Angel — the most lethal mushrooms in the UK. NEVER eat without absolute certainty of identification.',
  },
  Clitocybe: {
    toxicity: 'deadly',
    message:
      'Clitocybe includes C. rivulosa and C. dealbata which contain muscarine and can be fatal. Small white Clitocybe species are particularly dangerous.',
  },
  Coprinopsis: {
    toxicity: 'toxic',
    message:
      'Coprinopsis atramentaria (Common Ink Cap) causes severe illness when consumed with alcohol. Avoid alcohol for 3 days before and after eating any ink cap.',
  },
};

/** Known dangerous lookalike pairs */
const LOOKALIKE_PAIRS: Array<{
  genus_a: string;
  genus_b: string;
  danger_genus: string;
  danger_species?: string;
  features: string[];
}> = [
  {
    genus_a: 'Agaricus',
    genus_b: 'Amanita',
    danger_genus: 'Amanita',
    features: [
      'Check for volva at base (Amanita has one, Agaricus does not)',
      'Check gill colour (Amanita: white; Agaricus: pink to brown)',
      'Check habitat (Amanita: often near trees; Agaricus: often grassland)',
    ],
  },
  {
    genus_a: 'Macrolepiota',
    genus_b: 'Amanita',
    danger_genus: 'Amanita',
    danger_species: 'Small Lepiota species (deadly) can be confused with young Parasols',
    features: [
      'Check for volva at base (Amanita/Lepiota has one, Macrolepiota does not)',
      'Confirm large size (>10cm cap) — small "parasols" may be deadly Lepiota',
      'Check stem pattern (Macrolepiota has snakeskin pattern; Amanita does not)',
    ],
  },
  {
    genus_a: 'Lepista',
    genus_b: 'Clitocybe',
    danger_genus: 'Clitocybe',
    features: [
      'Clitocybe rivulosa/dealbata (Fool\'s Funnel) is deadly and can resemble Lepista',
      'Check stem colour (Lepista: lilac/violet; Clitocybe: pale/whitish)',
      'Check spore print (Lepista: pink; Clitocybe: white/cream)',
      'Check smell (Lepista: perfumed; dangerous Clitocybe: faint/mealy)',
    ],
  },
  {
    genus_a: 'Cantharellus',
    genus_b: 'Hygrophoropsis',
    danger_genus: 'Hygrophoropsis',
    danger_species: 'False Chanterelle (Hygrophoropsis aurantiaca)',
    features: [
      'True chanterelle has forked ridges/veins, NOT thin true gills',
      'True chanterelle smells of apricots; false chanterelle has no distinctive smell',
      'True chanterelle flesh is white; false chanterelle flesh is orange throughout',
    ],
  },
  {
    genus_a: 'Armillaria',
    genus_b: 'Galerina',
    danger_genus: 'Galerina',
    danger_species: 'Funeral Bell (Galerina marginata) — deadly',
    features: [
      'Both grow on wood in clusters with rings — very similar at a glance',
      'Armillaria: white spore print; Galerina: rusty brown spore print',
      'Armillaria grows in very large clusters; Galerina in smaller groups',
      'When in doubt, take a spore print — this is critical for safety',
    ],
  },
];

/**
 * Assemble a complete identification result from an observation.
 * This is the main entry point of the rule engine.
 */
export function assembleResult(
  observation: Observation,
  genera: string[],
  rules: FeatureRule[],
  heuristics?: Heuristic[],
): IdentificationResult {
  // Step 0: Infer implicit features from context
  const { observation: enrichedObs } = inferFeatures(observation);

  // Step 0b: Preprocess description_notes for negations and genus exclusions
  const preprocessing = preprocessDescriptionNotes(enrichedObs, rules);
  const allRules = preprocessing.contraRules.length > 0
    ? [...rules, ...preprocessing.contraRules]
    : rules;

  // Step 1: Score all candidates
  const scored = scoreAllCandidates(enrichedObs, genera, allRules);

  // Step 2: Build candidates list
  const candidates = scored.map((s) => toCandidateResult(s, enrichedObs));

  // Step 3: Build reasoning chain
  const reasoning = buildReasoningChain(enrichedObs, scored);

  // Step 4: Safety assessment
  const safety = buildSafetyAssessment(scored);

  // Step 5: Edibility (gated by confidence)
  const topCandidate = scored.find((s) => !s.eliminated);
  const edibility = topCandidate ? buildEdibility(topCandidate) : undefined;

  // Step 6: Disambiguation → interactive follow-up questions
  const questions = selectQuestions(scored, enrichedObs, rules);
  const activeCandidateGenera = scored
    .filter((s) => !s.eliminated && s.score > 0)
    .map((s) => s.genus);
  const followUpQuestions = buildFollowUpQuestions(questions, enrichedObs, activeCandidateGenera);

  // Step 6b: Heuristic-driven targeted actions (procedural, not answerable)
  let triggeredHeuristics: ActivatedHeuristic[] = [];
  let heuristicActions: SuggestedAction[] = [];
  if (heuristics && heuristics.length > 0) {
    const triggered = findApplicableHeuristics(scored, heuristics);
    heuristicActions = generateHeuristicActions(triggered);
    triggeredHeuristics = triggered.map((t) => ({
      heuristic_id: t.heuristic_id,
      name: t.name,
      genus: t.genus,
      category: t.category,
      steps: t.steps,
      safety_notes: t.safety_notes,
    }));
  }

  // Suggested actions: heuristic actions only (disambiguation is now follow_up_questions)
  const actions: SuggestedAction[] = [...heuristicActions];
  if (actions.length === 0 && followUpQuestions.length === 0) {
    const active = scored.filter((s) => !s.eliminated && s.score > 0);
    if (active.length === 0) {
      actions.push({
        action: 'Provide some basic observations (gill type, flesh texture, habitat)',
        reason: 'No candidates could be identified with current information',
        priority: 'recommended',
        safety_relevant: false,
      });
    }
  }

  // Step 7: Detect ambiguities
  const ambiguities = detectAmbiguities(enrichedObs, activeCandidateGenera);

  return {
    candidates,
    reasoning_chain: reasoning,
    safety,
    edibility,
    suggested_actions: actions,
    follow_up_questions: followUpQuestions,
    ambiguities,
    triggered_heuristics: triggeredHeuristics,
  };
}

function toCandidateResult(scored: CandidateScore, observation: Observation): Candidate {
  const makeEvidence = (e: { rule_id: string; field: string; tier: string; supporting: boolean; description: string }) =>
    toEvidence(e, observation);

  return {
    genus: scored.genus,
    common_name: scored.genus, // TODO: look up from KB
    confidence: scoreToConfidence(scored.score),
    score: scored.score,
    matching_evidence: scored.matching.map(makeEvidence),
    contradicting_evidence: scored.contradicting.map(makeEvidence),
    missing_evidence: scored.missing.map(makeEvidence),
  };
}

function toEvidence(
  e: {
    rule_id: string;
    field: string;
    tier: string;
    supporting: boolean;
    description: string;
  },
  observation: Observation,
): Evidence {
  const observedValue = observation[e.field as keyof Observation];
  const summary =
    observedValue !== null && observedValue !== undefined
      ? summarizeObservation(e.field, observedValue)
      : e.field.replace(/_/g, ' ');

  return {
    feature: e.field,
    observed_value: observedValue != null ? String(observedValue) : '',
    expected_value: '',
    tier: e.tier as Evidence['tier'],
    supports: e.supporting,
    summary,
  };
}

function buildReasoningChain(
  observation: Observation,
  scored: CandidateScore[],
): string[] {
  const chain: string[] = [];

  // Summarize what was observed
  const summaries = summarizeAllObservations(observation);
  if (summaries.length === 0) {
    chain.push('No features observed yet.');
  } else {
    chain.push(`Observed: ${summaries.join(', ')}.`);
  }

  // Report eliminations
  const eliminated = scored.filter((s) => s.eliminated);
  if (eliminated.length > 0) {
    const names = eliminated.map((s) => s.genus).join(', ');
    chain.push(`Eliminated: ${names}.`);
  }

  // Report top candidates
  const active = scored.filter((s) => !s.eliminated && s.score > 0);
  if (active.length > 0) {
    const top = active[0]!;
    const confidence = scoreToConfidence(top.score);
    chain.push(
      `Top candidate: ${top.genus} (${confidence} confidence, score ${top.score.toFixed(2)}).`,
    );

    if (active.length > 1) {
      const others = active
        .slice(1, 4)
        .map((s) => `${s.genus} (${s.score.toFixed(2)})`)
        .join(', ');
      chain.push(`Other candidates: ${others}.`);
    }
  } else {
    chain.push('No strong candidates based on current observations.');
  }

  return chain;
}

function buildSafetyAssessment(scored: CandidateScore[]): SafetyAssessment {
  const active = scored.filter((s) => !s.eliminated && s.score > 0);
  const warnings: SafetyWarning[] = [];
  const lookalikes: LookalikeWarning[] = [];

  // Check if any dangerous genera are candidates
  for (const candidate of active) {
    const danger = DANGEROUS_GENERA[candidate.genus];
    if (danger) {
      warnings.push({
        type: 'deadly_lookalike',
        message: danger.message,
        severity: 'critical',
      });
    }
  }

  // Check for known dangerous lookalike pairs among active candidates
  const activeGenera = new Set(active.map((c) => c.genus));
  for (const pair of LOOKALIKE_PAIRS) {
    // If either genus is active, warn about the dangerous one
    if (activeGenera.has(pair.genus_a) || activeGenera.has(pair.genus_b)) {
      lookalikes.push({
        species: pair.danger_species ?? pair.danger_genus,
        genus: pair.danger_genus,
        danger_level: 'critical',
        distinguishing_features: pair.features,
      });
    }
  }

  // Determine if confidence is sufficient for foraging advice
  const topCandidate = active[0];
  const topConfidence = topCandidate ? scoreToConfidence(topCandidate.score) : 'insufficient';
  const hasDangerousCandidate = active.some((c) => DANGEROUS_GENERA[c.genus]);
  const sufficientForForaging =
    (topConfidence === 'definitive' || topConfidence === 'high') &&
    !hasDangerousCandidate;

  return {
    toxicity: hasDangerousCandidate ? 'deadly' : 'unknown',
    warnings,
    dangerous_lookalikes: lookalikes,
    confidence_sufficient_for_foraging: sufficientForForaging,
  };
}

function buildEdibility(topCandidate: CandidateScore): EdibilityInfo {
  const confidence = scoreToConfidence(topCandidate.score);
  const highEnough = confidence === 'definitive' || confidence === 'high';

  if (!highEnough) {
    return {
      status: 'edible',
      notes: '',
      available: false,
      reason_unavailable: `Confidence is ${confidence} — need high or definitive confidence to advise on edibility. ${topCandidate.missing.length > 0 ? `Check: ${topCandidate.missing.slice(0, 3).map((m) => m.field.replace(/_/g, ' ')).join(', ')}.` : ''}`,
    };
  }

  return {
    status: 'edible',
    notes: `${topCandidate.genus} identified with ${confidence} confidence.`,
    available: true,
  };
}

/**
 * Fields that require the user to perform an active test they may not have done.
 * These are prioritised over form fields the user skipped.
 */
const ACTIVE_TEST_FIELDS = new Set([
  'spore_print_color',
  'bruising_color',
  'taste',
]);

/**
 * All fields visible in the identification form.
 * If a question targets one of these and the user left it empty,
 * it's marked as previously_available.
 */
const FORM_FIELDS = new Set([
  'gill_type', 'flesh_texture', 'cap_shape', 'ring_present', 'volva_present',
  'stem_present', 'gill_color', 'spore_print_color', 'cap_color', 'stem_color',
  'bruising_color', 'habitat', 'substrate', 'growth_pattern', 'season_month',
  'smell', 'cap_size_cm', 'cap_texture', 'gill_attachment',
]);

function buildFollowUpQuestions(
  questions: ReturnType<typeof selectQuestions>,
  observation: Observation,
  activeGenera: string[],
): FollowUpQuestion[] {
  const generaLabel = activeGenera.length <= 3
    ? activeGenera.join(' and ')
    : `${activeGenera.slice(0, 2).join(', ')} and ${activeGenera.length - 2} others`;

  return questions.slice(0, 8).map((q) => {
    const isFormField = FORM_FIELDS.has(q.feature);
    const wasLeftEmpty = isFormField
      && observation[q.feature as keyof Observation] == null;
    // Active tests (spore print, bruising) are always "new" even if in the form
    const isActiveTest = ACTIVE_TEST_FIELDS.has(q.feature);
    const previouslyAvailable = wasLeftEmpty && !isActiveTest;

    let impactNote: string;
    if (q.safety_relevant) {
      impactNote = `Safety-critical — helps rule out dangerous species among ${generaLabel}`;
    } else {
      impactNote = `Would help distinguish between ${generaLabel}`;
    }

    return {
      question: q.question,
      feature: q.feature,
      information_gain: q.information_gain,
      safety_relevant: q.safety_relevant,
      previously_available: previouslyAvailable,
      impact_note: impactNote,
    };
  });
}
