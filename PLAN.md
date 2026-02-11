# Development Plan: Adaptive Mushroom Identification PWA

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Expert System: Heuristic Design & Research](#3-expert-system-heuristic-design--research)
4. [LLM Integration Strategy](#4-llm-integration-strategy)
5. [User-Editable Heuristics](#5-user-editable-heuristics)
6. [Adaptive Learning System](#6-adaptive-learning-system)
7. [Data Model & Persistence](#7-data-model--persistence)
8. [PWA Shell & Offline Architecture](#8-pwa-shell--offline-architecture)
9. [Development Phases](#9-development-phases)

---

## 1. Architecture Overview

The system is a **hybrid expert system** with three distinct runtime modes:

```
MODE 1: OFFLINE (no connectivity)
  User <-> UI <-> Deterministic Rule Engine <-> Local Knowledge Base (IndexedDB)

MODE 2: ONLINE-ASSISTED (connectivity available)
  User <-> UI <-> Deterministic Rule Engine + LLM Layer <-> Local KB + LLM API

MODE 3: LEARNING (training/review mode)
  User <-> UI <-> FSRS Scheduler + Competency Tracker <-> Local KB
```

The critical design principle: **the deterministic rule engine handles ALL safety-critical decisions**. The LLM never decides whether a mushroom is safe. Instead, the LLM:
- Generates natural language explanations grounded in rule engine output
- Handles free-form user questions the rule engine can't answer
- Provides conversational teaching in learning mode
- Assists with knowledge base expansion and review

### Data Flow for an Identification Session

```
1. User provides whatever they have (photo, description, context -- all optional)
       |
       v
2. [Feature Ingestion]
   - Accept all-optional observation fields
   - Infer implicit features from context (e.g., "park" → not deep woodland)
   - Flag ambiguities for follow-up ("soil or buried wood?")
   - Online: LLM can extract features from natural language / photos
   - Offline: structured form with guided prompts
       |
       v
3. [Candidate Generation] -- broad and inclusive
   - Score ALL genera against observed features using weighted evidence model
   - Definitive features (e.g., brittle gills) establish/eliminate candidates immediately
   - Strong/moderate/weak features adjust scores (non-additive, diminishing returns)
   - Any genus not definitively excluded remains a candidate
       |
       v
4. [Safety Annotation] -- attached to candidates, never blocks identification
   - Look up toxicity and dangerous lookalikes for every candidate
   - Flag if a dangerous lookalike is plausible given current evidence
   - Compute whether confidence is sufficient for edibility advice
       |
       v
5. [Conditional Rule Pruning]
   - Activate heuristic sets relevant to top candidates
   - Deactivate irrelevant rules (Russula confirmed → Bolete rules off)
       |
       v
6. [Interactive Disambiguation] -- all questions skippable
   - Select questions by information gain from active rules only
   - Prioritise: safety-relevant > high-gain > easy-to-answer
   - "Not sure / Can't tell" is always valid -- reduces confidence, never halts
   - Each answer updates candidate scores and may activate/deactivate rules
   - Loop until confidence is sufficient or no high-value questions remain
       |
       v
7. [Result Assembly]
   - IDENTIFICATION: candidates with confidence levels and full reasoning chain
   - SAFETY: warnings + lookalikes (always present, never gates identification)
   - EDIBILITY: advice gated by confidence ("I'd need X to advise on eating this")
   - NEXT STEPS: what to check to increase confidence
   - If online: LLM generates natural language explanation grounded in above
   - If offline: templated explanation from rule data
       |
       v
8. [Competency Assessment]
   - Track what the user demonstrated in this session
   - Update competency model
   - Schedule spaced repetition reviews if applicable
```

---

## 2. Technology Stack

### Recommended Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Vite + React + TypeScript | Simplest offline-first architecture; largest ecosystem; `vite-plugin-pwa` is mature |
| **PWA** | `vite-plugin-pwa` (Workbox) | Zero-config service worker generation, precaching, offline strategies |
| **Persistence** | IndexedDB via `Dexie.js` | Wrapper with clean async API; stores KB, user model, cached LLM responses |
| **Knowledge Base format** | YAML (source) -> JSON (runtime) | Human-editable, version-controllable, parseable in-browser via `js-yaml` |
| **Rule Engine** | Custom TypeScript engine | Our rules have domain-specific semantics (confidence markers, safety levels, prerequisites) that generic engines don't model well |
| **Spaced Repetition** | `ts-fsrs` | Modern FSRS algorithm; runs client-side; 20-30% fewer reviews than SM-2 at same retention |
| **LLM API** | z.ai (OpenAI-compatible endpoint) | User-provided key; OpenAI-compatible chat completions format; single provider for simplicity |
| **State Management** | Zustand + Dexie (persistence) | Lightweight; stores serialize cleanly to IndexedDB |
| **Camera** | Native `<input type="file" capture="environment">` | Simplest cross-platform approach; works iOS + Android |
| **Styling** | Tailwind CSS | Utility-first; fast to prototype; good mobile defaults |
| **Testing** | Vitest + Testing Library | Native Vite integration; fast |

### Why Not SvelteKit?

SvelteKit has a smaller bundle and arguably better reactivity, but the React ecosystem advantage matters here: more camera/image libraries, more IndexedDB tooling, and easier hiring/contribution. The difference in bundle size (~20-40KB) is negligible for a PWA that caches everything locally.

---

## 3. Expert System: Heuristic Design & Research

This is the core intellectual work of the project. The heuristics are the knowledge base -- they encode expert mycological judgment into executable rules.

### 3.1 What is a Heuristic in This System?

A heuristic is a **structured rule that encodes a foraging decision**. Each has:

- **Trigger conditions**: when does this rule apply? (genus, morphology, context)
- **Procedure**: what does the user do? (observe, test, compare)
- **Outcomes**: what does the result mean? (edible, reject, investigate further)
- **Safety classification**: how critical is this rule? (critical, important, informational)
- **Prerequisites**: what must the user already know? (genus recognition, specific tests)
- **Exceptions**: known edge cases where the rule fails
- **Provenance**: where did this rule come from? (source, reliability rating)

### 3.2 Taxonomy of Heuristic Types

Based on analysis of how expert foragers actually make decisions, heuristics fall into these categories:

#### Category 1: Binary Safety Rules (highest priority)
Rules that produce a clear yes/no safety decision.

Examples:
- "White gills + ring + volva = possible Amanita, DO NOT EAT"
- "Red pores + blue staining in boletes = REJECT"
- "Small brown gilled mushroom (LBM) = AVOID entirely"

Properties:
- **Never overridden by the LLM**
- Execute first in every identification flow
- False positive rate is acceptable (reject safe mushrooms sometimes) because false negatives are catastrophic

#### Category 2: Edibility Determination Tests
Procedures that determine whether a confirmed-genus specimen is edible.

Examples:
- Russula taste test (mild = edible, peppery = reject)
- Lactarius milk color test (orange = edible, white turning yellow = toxic)
- Puffball interior check (pure white = edible, any color/structure = reject)

Properties:
- Require genus-level confidence as a prerequisite
- Produce high-confidence results when applied correctly
- Include detailed procedure instructions

#### Category 3: Discrimination Heuristics
Rules that distinguish between confusable species or genera.

Examples:
- Agaricus vs Amanita: volva, gill color, spore print
- Chanterelle vs False Chanterelle: gill structure, flesh, habitat
- St George's Mushroom vs Deadly Fibrecap: season, smell, gill color

Properties:
- Often involve multiple features checked in sequence
- Model as decision trees with branching logic
- Each branch has its own confidence level

#### Category 4: Ecological Context Rules
Rules based on habitat, season, geography, and associations.

Examples:
- "Chanterelles fruit July-November, always mycorrhizal with trees"
- "Field mushrooms grow in grassland, never in woodland" (helps distinguish from Death Cap)
- "Penny Bun strongly associated with beech and oak in southern England"

Properties:
- Modify confidence scores rather than producing binary decisions
- Region-specific (UK focus, with county-level variation)
- Season-dependent

#### Category 5: Gestalt Recognition Rules
High-level pattern matching that experienced foragers use for rapid classification.

Examples:
- "Brittle flesh that snaps like chalk = Russula or Lactarius family"
- "Sponge-like pore surface instead of gills = bolete family"
- "Bracket growing on wood = polypore group"

Properties:
- Used for initial genus/family-level classification
- Lower individual confidence but fast to apply
- Multiple gestalt markers increase confidence

### 3.3 Research Methodology for Heuristic Capture

Building the knowledge base is the most important and time-consuming part of the project. Here is the systematic approach:

#### Phase 1: Literature Extraction

**Primary sources** (UK-focused, authoritative):
1. **Roger Phillips - Mushrooms and Other Fungi of Great Britain & Europe** -- The standard photographic reference. Extract morphological descriptions and key features for every UK species.
2. **John Wright - Mushrooms (River Cottage Handbook No.1)** -- Excellent for practical foraging heuristics. Wright explicitly describes the decision rules experienced foragers use.
3. **Pat O'Reilly - Fascinated by Fungi** -- Good for UK habitat associations and seasonal data.
4. **Geoffrey Kibby - British Boletes, Mushrooms & Toadstools of Britain & Europe** -- Detailed keys.
5. **Buczacki et al - Collins Fungi Guide** -- Comprehensive UK coverage.

**Online sources** (for cross-referencing):
1. **First Nature** (first-nature.com) -- Free, detailed UK species pages with photos, habitat, season, lookalikes. Well-structured for extraction.
2. **Wild Food UK** (wildfooduk.com) -- Focused on foraging, includes practical heuristics.
3. **The Fungus Conservation Trust / BMS** -- Distribution data, conservation notes.
4. **iNaturalist UK observations** -- Seasonal and geographic occurrence data.
5. **FRDBI via GBIF** -- Authoritative UK distribution records.

**Extraction method:**
- For each genus, create a genus profile YAML following the existing schema
- For each practical foraging decision, create a heuristic YAML
- Cross-reference every heuristic against at least 2 independent sources
- Mark confidence/reliability for each rule

#### Phase 2: LLM-Assisted Knowledge Extraction

Use Claude to accelerate extraction from field guides:

1. **Input**: Scan/photograph relevant pages from field guides (fair use for personal knowledge base construction)
2. **Prompt**: "Extract identification features as structured YAML following this schema: [genus-profile-schema.yaml]"
3. **Output**: Draft YAML profiles
4. **CRITICAL**: Human mycologist review of every extracted rule. LLMs hallucinate details about mushrooms -- every fact must be verified against source material.

This is the "GOFAI meets GenAI" pattern: LLM generates structured knowledge, humans verify it, deterministic engine executes it.

#### Phase 3: Expert Review and Validation

Every heuristic must be validated:

1. **Source verification**: Does the cited source actually say this?
2. **Cross-reference**: Do other sources agree?
3. **UK applicability**: Does this apply in the UK specifically? (Many guides are Continental European or North American)
4. **Safety review**: For any rule with safety implications, is the failure mode acceptable? (False positives OK, false negatives catastrophic)
5. **Exception cataloguing**: What edge cases exist? Document them in the `exceptions` field.

#### Phase 4: Field Testing

Heuristics should be tested against real-world foraging:
1. Use the system's own identification flow on real specimens
2. Compare system output against expert identification
3. Track where the system fails or gives poor guidance
4. Iterate on rules and disambiguation questions

### 3.4 Heuristic Rule Format (Expanded)

Building on the existing `heuristic-schema.yaml`, the production format adds fields for LLM integration and user editability:

```yaml
heuristic_id: russula_taste_test
version: 1
name: Russula Taste Test
category: edibility_determination
priority: standard  # critical | standard | supplementary

# When does this rule fire?
applies_to:
  genus: Russula
  confidence_required: high  # genus confidence must be >= this level

# What must the user already know?
prerequisites:
  competencies:
    - russula_genus_recognition: confident
  safety_checks:
    - confirmed_not_lactarius  # no milk exuding
    - confirmed_not_amanita    # no volva, no ring

# Step-by-step procedure
procedure:
  steps:
    - instruction: "Break off a small piece of the cap flesh (NOT the gills)"
      image_ref: images/russula_taste_test_step1.jpg
    - instruction: "Touch it briefly to your tongue, or chew a tiny piece"
      safety_note: "Do not swallow"
    - instruction: "Spit it out immediately"
    - instruction: "Wait 30 seconds and note the sensation"
  estimated_time: "1-2 minutes"

# Decision outcomes
outcomes:
  - id: mild
    condition: "Mild, nutty, pleasant, or no strong taste"
    conclusion: EDIBLE
    confidence: high
    action: "Safe to eat. Quality varies by species."
    next_steps:
      - "Optionally identify to species level for culinary preference"

  - id: peppery
    condition: "Peppery, hot, burning, or acrid"
    conclusion: REJECT
    confidence: high
    action: "Do not eat. Will cause gastric upset."

  - id: uncertain
    condition: "Uncertain - slight tingle but not clearly peppery"
    conclusion: CAUTION
    confidence: medium
    action: "Treat as peppery and reject. Re-test with fresh specimen."
    disambiguation:
      - question: "Did the sensation build over 30 seconds?"
        if_yes: "Likely peppery - reject"
        if_no: "May just be mild - but err on side of caution"

# Known exceptions
exceptions:
  - species: R. olivacea
    note: "Can taste mild but causes GI upset in some people"
    action: "Avoid even if mild-tasting"
  - species: R. cyanoxantha
    note: "Flexible gills (unusual for Russula) - taste test still works"

# Safety metadata
safety:
  false_positive_risk: low   # How likely to reject a safe mushroom
  false_negative_risk: low   # How likely to approve a dangerous one
  failure_mode: "Peppery species rejected (correct). Very low risk of missing toxicity."

# Provenance
source:
  primary: "Phillips (2006), Wright (2007), traditional foraging knowledge"
  reliability: proven
  last_verified: 2025-01-15
  verified_by: "expert_review"

# LLM context hint - tells the LLM how to explain this heuristic
llm_context: |
  This is a well-established foraging heuristic for Russula. The taste test
  is safe because no Russula species are lethally toxic - the worst outcome
  from a peppery species is temporary burning sensation on the tongue.
  Emphasize that this ONLY works for confirmed Russula specimens.

# User-editable metadata
user_editable:
  allow_notes: true          # User can add personal notes
  allow_exception_report: true  # User can flag new exceptions
  allow_fork: false          # User cannot modify core safety logic
  allow_regional_override: true # User can add regional notes
```

### 3.5 Handling Incomplete and Ambiguous Information

Users in the field often can't answer every question. They may not know tree species, may be unsure whether something is growing on soil or buried wood, or simply can't tell gill attachment type without a hand lens. The system must treat partial information as normal, not exceptional.

#### Design Principles

1. **Every observation field is optional.** The system works with whatever the user provides. More information = higher confidence, but absent information never blocks identification.
2. **"I don't know" is always a valid answer.** Every question in the disambiguation flow has an explicit "Not sure / Can't tell" option. This is not a failure -- it simply means that feature doesn't contribute to narrowing candidates.
3. **Ambiguity is flagged, not assumed.** If the user says "growing in grass", the system should surface the ambiguity: "Is it growing directly from the soil, or could there be buried wood underneath?" -- but accept "not sure" and adjust confidence accordingly.
4. **Infer where possible.** "Found in a park under oak trees" implies: soil substrate, mycorrhizal possibility, not deep woodland. The system should extract these implicit signals.
5. **Confidence reflects information density.** A specimen with 3 observed features will have lower confidence than one with 10 features, even if both point to the same species. The system communicates this: "Based on what you've told me, this is likely X, but checking [feature Y] would significantly increase confidence."

#### Observation Model

```typescript
// Every field is optional. null = not observed, not "absent"
interface Observation {
  // Morphological features
  cap_color?: string | null;        // null = user hasn't looked / can't tell
  cap_size_cm?: number | null;
  cap_shape?: string | null;
  cap_texture?: string | null;
  gill_type?: 'gills' | 'pores' | 'teeth' | 'smooth' | 'ridges' | null;
  gill_color?: string | null;
  gill_attachment?: string | null;
  stem_present?: boolean | null;
  stem_color?: string | null;
  ring_present?: boolean | null;
  volva_present?: boolean | null;
  spore_print_color?: string | null;
  flesh_color?: string | null;
  bruising_color?: string | null;
  smell?: string | null;
  taste?: string | null;           // only when safe to taste-test

  // Ecological context
  habitat?: string | null;          // woodland, grassland, etc.
  substrate?: string | null;        // soil, wood, dung, etc.
  substrate_confidence?: 'certain' | 'likely' | 'unsure';
  nearby_trees?: string[] | null;   // user may not know species
  tree_confidence?: 'certain' | 'likely' | 'unsure';
  season_month?: number;            // from device date
  region?: string | null;           // from device location or manual
  growth_pattern?: string | null;   // solitary, clustered, ring, etc.

  // Meta
  photo_available?: boolean;
  observation_conditions?: string;  // "wet day", "specimen old/damaged", etc.
}
```

### 3.6 Confidence Model: Weighted, Non-Additive Evidence

Confidence is **not** a simple sum of matching features. A single highly discriminative feature (brittle gills) can carry more weight than a dozen weak signals (cap color, season, habitat) combined.

#### Evidence Tiers

Each feature observation is classified by its **discriminative power** for a given candidate:

| Tier | Name | Weight Behaviour | Examples |
|------|------|-----------------|----------|
| **D** | **Definitive** | Near-certain on its own. Establishes or eliminates a candidate regardless of other evidence. | Brittle snapping flesh → Russula/Lactarius. Pores instead of gills → Bolete family. Milk exuding from gills → Lactarius. |
| **S** | **Strong** | High weight. A single strong feature significantly shifts confidence. Two strong features together approach definitive. | Volva at base (strong Amanita signal). Free gills + chocolate brown spore print (strong Agaricus signal). |
| **M** | **Moderate** | Meaningful but not decisive alone. Requires corroboration. | Cap color, habitat type, season, growth pattern. Each adds evidence but none is conclusive. |
| **W** | **Weak** | Slight signal. Useful for tiebreaking between close candidates, not for establishing identification. | "Looks like what I picked last year." Vague smell descriptions. Size alone. |
| **N** | **Negative/Exclusionary** | Eliminates candidates. A single exclusionary feature removes a candidate entirely. | No volva → eliminates Amanita (for species with obligate volva). Growing on wood → eliminates all strictly mycorrhizal soil species. |

#### How Evidence Combines

The confidence model is **hierarchical and conditional**, not additive:

```
Step 1: DEFINITIVE features fire first
  - If a definitive feature matches, that candidate is strongly established
  - If a definitive exclusionary feature matches, that candidate is eliminated
  - Example: brittle flesh → Russula/Lactarius (others heavily penalised)

Step 2: STRONG features refine within the established group
  - Milk exuding? → Lactarius, not Russula (definitive within the narrowed set)
  - No milk? → Russula confirmed
  - Volva present? → Even if other features suggest Russula, this overrides (exclusionary)

Step 3: MODERATE features adjust relative confidence among remaining candidates
  - Cap color, habitat, season each nudge scores
  - Multiple moderate features in agreement compound (diminishing returns)
  - A moderate feature that contradicts a strong one does NOT override it

Step 4: WEAK features break ties only
  - If two candidates are close after strong/moderate evidence, weak features decide
  - Never enough to establish or eliminate on their own
```

#### Conditional Rule Activation

Once the candidate space is narrowed, the rule engine **prunes irrelevant rule sets**:

```typescript
interface RuleActivation {
  rule_id: string;
  relevance: 'active' | 'deprioritised' | 'inactive';
  reason: string;
}

// Example: brittle gills confirmed → Russula established
// Result:
// - Russula heuristics:     ACTIVE (taste test, species discrimination)
// - Lactarius heuristics:   ACTIVE (still need to confirm no milk)
// - Amanita heuristics:     DEPRIORITISED (only if volva/ring observed)
// - Bolete heuristics:      INACTIVE (gills present, not pores)
// - LBM safety rule:        INACTIVE (size/genus don't match)

function activateRules(candidates: Candidate[]): RuleActivation[] {
  const activeGenera = candidates
    .filter(c => c.confidence > THRESHOLD_ACTIVE)
    .map(c => c.genus);
  const marginalGenera = candidates
    .filter(c => c.confidence > THRESHOLD_MARGINAL && c.confidence <= THRESHOLD_ACTIVE)
    .map(c => c.genus);

  return allRules.map(rule => {
    if (activeGenera.includes(rule.applies_to.genus)) {
      return { rule_id: rule.id, relevance: 'active', reason: `${rule.applies_to.genus} is a current candidate` };
    }
    if (marginalGenera.includes(rule.applies_to.genus)) {
      return { rule_id: rule.id, relevance: 'deprioritised', reason: `${rule.applies_to.genus} is marginal` };
    }
    return { rule_id: rule.id, relevance: 'inactive', reason: `${rule.applies_to.genus} eliminated` };
  });
}
```

This means: **if we know it's a Russula, we don't waste the user's time with Amanita questions** unless there's a specific reason to doubt the Russula identification (e.g., the user hasn't confirmed brittle flesh and the specimen has a ring).

#### Disambiguation Question Selection

Questions are selected by **information gain** -- which question most efficiently separates remaining candidates:

```typescript
interface DisambiguationQuestion {
  question: string;
  feature_tested: string;
  information_gain: number;       // how much this separates remaining candidates
  eliminates_if_yes: string[];    // candidates removed by "yes"
  eliminates_if_no: string[];     // candidates removed by "no"
  skippable: boolean;             // true -- user can always say "not sure"
  skip_cost: number;              // how much confidence we lose by skipping
  safety_relevant: boolean;       // if true, strongly encourage answering
}
```

The system prioritises questions that:
1. Have the highest information gain (separate the most candidates)
2. Are easy for the user to answer (observable without tools)
3. Are safety-relevant (e.g., "is there a volva at the base?" when Amanita is a candidate)

If a question is skipped, the system continues with reduced confidence rather than halting.

#### Confidence Score Semantics

The output confidence is not a percentage but a **named level with clear meaning**:

| Level | Meaning | Typical Evidence | System Behaviour |
|-------|---------|-----------------|------------------|
| **Definitive** | Single candidate, confirmed by definitive features + corroborating evidence | Brittle gills + no milk + taste test done | "This is [species]. Here's why." |
| **High** | Strong candidate, well-supported but one or two confirming features missing | Genus confirmed, species likely but spore print not done | "Very likely [species]. Checking [X] would confirm." |
| **Moderate** | Leading candidate but alternatives remain plausible | Several moderate features align, no definitive feature observed | "Probably [species], but could be [Y]. Key question: [Z]." |
| **Low** | Multiple candidates roughly equal, insufficient information | Few features observed, or features match several genera | "Could be [A], [B], or [C]. I'd need to know [features] to narrow it down." |
| **Insufficient** | Not enough information to meaningfully narrow candidates | Only photo + location, no morphological observations | "I can see it's a gilled mushroom. To identify it I'd need [basic observations]." |

### 3.7 Identification vs. Edibility: Separation of Concerns

The system's primary job is **identification** -- telling the user what they're looking at. Edibility is a property of the identified species, not a gate on the identification process.

#### What This Means in Practice

- **The system never refuses to identify something.** Even Death Cap gets a full identification with reasoning. Blocking identification of dangerous species would be both patronising and counterproductive -- users learn by understanding what's dangerous and why.
- **Safety warnings are attached to identifications, not used to prevent them.** Instead of "I won't help you with that white mushroom", the system says: "This matches Amanita phalloides (Death Cap). Here's why: [reasoning]. This species is lethally toxic. Do not eat under any circumstances."
- **Edibility information is layered on top of identification.** First: "What is it?" Then: "Is it safe?" These are separate outputs in the result.
- **Confidence gates affect edibility guidance, not identification.** If confidence is low, the system still identifies candidates but says: "I'm not confident enough in this identification to give edibility advice. Here's what would help me be more certain."

#### Result Structure

```typescript
interface IdentificationResult {
  // IDENTIFICATION (always provided, regardless of safety)
  candidates: Array<{
    species: string;
    genus: string;
    common_name: string;
    confidence: ConfidenceLevel;
    matching_evidence: Evidence[];     // what supports this candidate
    contradicting_evidence: Evidence[]; // what argues against it
    missing_evidence: Evidence[];       // what would confirm/deny it
  }>;
  reasoning_chain: string[];           // step-by-step logic trail

  // SAFETY ASSESSMENT (attached to identification, never blocks it)
  safety: {
    toxicity: ToxicityLevel;           // of the top candidate
    warnings: SafetyWarning[];         // specific hazards
    dangerous_lookalikes: Lookalike[]; // what else this could be that's dangerous
    confidence_sufficient_for_foraging: boolean;
  };

  // EDIBILITY (only meaningful when confidence is high enough)
  edibility?: {
    status: 'edible' | 'edible_with_caution' | 'inedible' | 'toxic' | 'deadly';
    notes: string;
    preparation_notes?: string;
    available: boolean;              // false if confidence too low to advise
    reason_unavailable?: string;     // "Confidence too low" / "Confirm X first"
  };

  // NEXT STEPS (always provided)
  suggested_actions: Array<{
    action: string;                  // "Check for volva at base"
    reason: string;                  // "Would distinguish Agaricus from Amanita"
    priority: 'critical' | 'recommended' | 'optional';
    safety_relevant: boolean;
  }>;
}
```

### 3.8 How the Rule Engine Executes (Revised Flow)

```
1. FEATURE INGESTION
   - Accept whatever the user provides (all fields optional)
   - Infer implicit features from context (park → not deep woodland)
   - Flag ambiguities for follow-up ("soil or buried wood?")
   - Output: Observation with confidence annotations per field

2. CANDIDATE GENERATION (broad, inclusive)
   - Score ALL genera against observed features using weighted evidence model
   - Definitive features establish/eliminate candidates immediately
   - Strong/moderate/weak features adjust scores
   - Include any genus that isn't definitively excluded
   - Output: ranked candidate list with per-candidate evidence breakdown

3. SAFETY ANNOTATION (attached, never blocking)
   - For every candidate, look up toxicity and dangerous lookalikes
   - If a dangerous lookalike is plausible given current evidence, flag it
   - Compute: "is confidence high enough to give edibility advice?"
   - Output: safety metadata attached to each candidate

4. CONDITIONAL RULE PRUNING
   - Based on top candidates, activate relevant heuristic sets
   - Deactivate irrelevant rule sets (Russula confirmed → Bolete rules off)
   - Output: active rule set for disambiguation

5. DISAMBIGUATION (interactive, all questions skippable)
   - Select questions by information gain from active rules only
   - Prioritise: safety-relevant questions > high-gain > easy-to-answer
   - Every question has "Not sure / Can't tell" as a valid answer
   - Each answer updates candidate scores and may activate/deactivate rules
   - Loop until: confidence is high, or no high-value questions remain

6. RESULT ASSEMBLY
   - Identification: top candidates with confidence levels and reasoning
   - Safety: warnings, lookalikes, confidence-gated edibility advice
   - Next steps: what the user could check to increase confidence
   - Learning hooks: what competencies this session could demonstrate
```

### 3.6 Heuristic Effectiveness: How to Maximize with LLM

The heuristics are most effective when combined with LLM capabilities:

| Heuristic Alone | LLM Alone | Hybrid (Best) |
|----------------|-----------|---------------|
| Can execute deterministic safety checks | Can understand free-form user descriptions | LLM extracts features from description, rules check safety |
| Rigid disambiguation questions | Flexible conversation but may miss critical checks | LLM makes questions conversational, rules ensure all critical checks happen |
| Can't handle novel situations | Can reason about edge cases but may hallucinate | Rules handle known cases; LLM handles novel cases WITH safety guardrails |
| Fast, works offline | Requires connectivity, adds latency | Rules-first for speed; LLM only when rules are insufficient |
| Consistent, auditable | Variable, hard to audit | Rules produce auditable decisions; LLM generates explanations |

---

## 4. LLM Integration Strategy

### 4.1 When to Call the LLM

The LLM is a powerful but expensive and connectivity-dependent resource. Call it only when it adds value the rule engine cannot provide:

**ALWAYS use LLM for:**
1. **Natural language feature extraction** -- User says "it's got a sort of slimy brownish cap with bits of white fluff on it" -> LLM extracts `{ cap_color: brown, cap_texture: viscid, cap_surface: patches_of_veil_remnants }`
2. **Conversational teaching** -- In learning mode, the LLM can explain concepts adaptively, answer follow-up questions, and provide encouragement
3. **Ambiguous identification explanation** -- When the rule engine says "could be A or B", the LLM explains the nuance in natural language
4. **Knowledge base expansion** -- LLM drafts new genus profiles / heuristics from literature, to be human-reviewed

**NEVER use LLM for:**
1. **Safety decisions** -- Rule engine only. The LLM's output never overrides a safety rule.
2. **Competency assessment** -- Deterministic rules based on tracked evidence.
3. **Spaced repetition scheduling** -- FSRS algorithm, not LLM judgment.

**CONDITIONALLY use LLM for:**
1. **Photo analysis** -- If the user uploads a photo and we want to extract features from it. Note: this requires a multimodal model (z.ai's vision capability).
2. **Free-form questions** -- "What mushrooms grow near birch in October?" -- The rule engine can filter the KB, but the LLM can generate a more natural response.

### 4.2 Prompt Architecture

The LLM integration uses a **structured prompt template** that grounds every response in the rule engine's output:

```
SYSTEM PROMPT (cached - static across sessions):
  - Role definition (mycological expert system interface)
  - Safety rules (NEVER contradict rule engine safety decisions)
  - Output format instructions
  - Core genus profiles for the 20 most common UK genera (enables cached context)

SESSION CONTEXT (semi-static, changes per session):
  - User's competency level (from user model)
  - Current season and region
  - What to skip (competencies already demonstrated)
  - Current safety guardrail level

IDENTIFICATION CONTEXT (dynamic, per query):
  - Rule engine output: candidates, confidence scores, safety flags
  - Relevant heuristics that apply to the candidates
  - Disambiguation questions the rule engine wants answered
  - Any user-provided context (location, habitat, photo)

USER MESSAGE:
  - The user's actual input
```

### 4.3 Cost Management

**Target**: < $0.10 per identification session average.

| Strategy | Expected Saving | Implementation |
|----------|----------------|----------------|
| **Prompt caching** | 50-90% on input tokens | Place system prompt + genus profiles at start of every call. Leverage any provider-side caching for repeated prefixes. |
| **Rule engine first** | 100% (no API call) | If the rule engine can resolve the identification entirely, skip the LLM call. Estimate: 40-60% of sessions need no LLM call. |
| **Model routing** | 80% for simple queries | Route simple follow-up questions to a smaller/cheaper model if z.ai offers one. Reserve the best model for complex identifications. |
| **Response caching** | Near 100% for repeated queries | Cache LLM responses in IndexedDB keyed by (rule_engine_output_hash + user_message_hash). Common questions get instant cached answers. |
| **Compact rule context** | 20-40% token reduction | Send only relevant genus profiles and heuristics, not the entire KB. The rule engine pre-selects which knowledge to include. |
| **Max token limits** | Variable | Set `max_tokens` to 500 for explanations, 200 for follow-up answers. Output tokens cost 3-5x input. |

### 4.4 Offline Degradation

When offline, the system still works -- it just lacks the LLM's natural language capabilities:

| Feature | Online | Offline |
|---------|--------|---------|
| Safety screening | Rule engine (identical) | Rule engine (identical) |
| Genus classification | Rule engine + LLM feature extraction | Rule engine + structured form input |
| Disambiguation | Conversational (LLM) | Step-by-step guided questions (templates) |
| Explanations | Natural language (LLM) | Templated from heuristic data |
| Photo analysis | LLM vision | Not available (structured form only) |
| Learning mode | Conversational teaching (LLM) | Quiz + flashcard mode (local) |

The degradation is graceful: safety is identical, identification still works, just less conversationally.

---

## 5. User-Editable Heuristics

### 5.1 Why Allow User Editing?

Experienced foragers have regional knowledge, personal observations, and field-tested shortcuts that aren't in any book. The system should capture this while maintaining safety.

### 5.2 What Users CAN Edit

#### Personal Notes on Existing Heuristics
- "In my area, R. cyanoxantha always grows under beech, not oak"
- "I find the smell test more reliable than the taste test for R. foetens"
- These are stored as user annotations, not modifications to the core rule

#### Regional Overrides
- Season adjustments ("Chanterelles fruit earlier in Devon than the books say")
- Habitat notes ("In the New Forest, look near old beeches specifically")
- Stored as location-tagged overlays on core data

#### New Heuristic Proposals
- Users can draft new heuristics following the schema
- These are flagged as `source: user_contributed` with `reliability: unverified`
- They appear only for the contributing user until reviewed
- Submission pipeline for community review (future feature)

#### Exception Reports
- "I found an R. olivacea that tasted mild but was definitely that species"
- Stored as evidence that feeds into exception cataloguing
- Flag for expert review if multiple users report the same exception

### 5.3 What Users CANNOT Edit

- **Core safety rules** -- "avoid white agarics" cannot be weakened or disabled
- **Toxicity classifications** -- Users cannot reclassify a species from DEADLY to EDIBLE
- **Prerequisite chains** -- Users cannot skip safety training prerequisites
- **Other users' data** -- No cross-contamination of user models

### 5.4 UI for Heuristic Editing

```
Heuristic View: Russula Taste Test
─────────────────────────────────────
[Core Rule - Read Only]
  Procedure: Break off cap flesh, taste, spit, wait 30s...
  Outcomes: Mild = Edible, Peppery = Reject

[Your Notes]                           [+ Add Note]
  "R. cyanoxantha in Hampshire always under beech" - Sept 2025

[Regional Data]                        [+ Add Observation]
  Your region: Hampshire
  Your season notes: "First Russulas appear late June here"

[Report Exception]                     [+ Report]
  Flag something that didn't match expected behavior

[Community Notes] (future)
  3 other Hampshire foragers confirm early June Russula sighting
```

### 5.5 Data Architecture for User Contributions

```yaml
# Stored in IndexedDB per-user, separate from core KB
user_contributions:
  annotations:
    - heuristic_id: russula_taste_test
      type: personal_note
      content: "In Hampshire, Charcoal Burners always under beech"
      location: { region: Hampshire, habitat: deciduous_woodland }
      date: 2025-09-15

  regional_overrides:
    - genus: Russula
      field: season.UK
      override: ["June", "July", "August", "September", "October"]
      original: ["July", "August", "September", "October"]
      evidence: "Observed fruiting in late June 2024 and 2025"

  exception_reports:
    - heuristic_id: russula_taste_test
      report: "R. olivacea specimen tasted mild, confirmed by spore print"
      specimen_details: { cap_color: olive, spore_print: ochre }
      date: 2025-10-01
      status: submitted  # submitted | acknowledged | verified | rejected

  draft_heuristics:
    - heuristic_id: user_chanterelle_smell_test
      status: draft  # draft | submitted | under_review | approved | rejected
      content:
        applies_to: { genus: Cantharellus }
        procedure: "Smell the fresh mushroom - apricots/peach"
        outcomes:
          - condition: "Fruity apricot smell"
            conclusion: "Supports Chanterelle identification"
      source: "Personal experience + Wright (2007)"
      reliability: user_contributed
```

---

## 6. Adaptive Learning System

### 6.1 FSRS Integration

Use the `ts-fsrs` library for spaced repetition scheduling. Each "card" represents a knowledge item the user should retain:

**Card types:**
- **Safety recognition**: Identify dangerous species from photos/descriptions
- **Feature recognition**: Identify morphological features (gill attachment, spore print, etc.)
- **Heuristic recall**: Remember and apply foraging heuristics
- **Discrimination pairs**: Distinguish lookalike species
- **Genus recognition**: Identify genus from gestalt features

**FSRS configuration:**
```typescript
import { fsrs, Rating } from 'ts-fsrs';

const scheduler = fsrs({
  request_retention: 0.90,  // 90% target retention
  maximum_interval: 365,     // Max 1 year between reviews
  enable_fuzz: true,         // Slight randomization to avoid clumping
});
```

### 6.2 Competency Tracking

The competency model from the project docs maps to this implementation:

```typescript
interface CompetencyRecord {
  skill_id: string;              // e.g., "genus_recognition.Russula"
  status: 'not_started' | 'aware' | 'learning' | 'confident' | 'expert';
  evidence: EvidenceEntry[];      // Timestamped proof of competency
  gaps: string[];                 // Known weaknesses
  unlocks: string[];              // What this competency enables
  last_demonstrated: Date;
  fsrs_cards: string[];           // Associated FSRS card IDs
}

interface EvidenceEntry {
  date: Date;
  type: 'correct_identification' | 'correct_rejection' | 'false_positive' |
        'false_negative' | 'training_completed' | 'assisted_identification';
  details: string;
  session_id: string;
}
```

### 6.3 Upgrade/Downgrade Automation

```typescript
// Upgrade rules execute after each identification session
function checkUpgrade(record: CompetencyRecord): boolean {
  if (record.status === 'learning') {
    const recentEvidence = record.evidence.filter(
      e => daysSince(e.date) <= 30
    );
    const correctIds = recentEvidence.filter(
      e => e.type === 'correct_identification'
    ).length;
    const correctRejections = recentEvidence.filter(
      e => e.type === 'correct_rejection'
    ).length;
    const falsePositives = recentEvidence.filter(
      e => e.type === 'false_positive'
    ).length;

    return correctIds >= 3 && correctRejections >= 1 && falsePositives === 0;
  }
  return false;
}

// Decay rules run on app open
function checkDecay(record: CompetencyRecord): void {
  if (daysSince(record.last_demonstrated) > 180) {
    if (record.status === 'confident') {
      record.status = 'learning'; // needs_refresh
      // Schedule review cards
    }
  }
}
```

---

## 7. Data Model & Persistence

### 7.1 IndexedDB Schema (via Dexie.js)

```typescript
import Dexie from 'dexie';

class MushroomDB extends Dexie {
  genusProfiles!: Table<GenusProfile>;
  heuristics!: Table<Heuristic>;
  safetyRules!: Table<SafetyRule>;
  userModel!: Table<UserModel>;
  competencies!: Table<CompetencyRecord>;
  fsrsCards!: Table<FSRSCard>;
  identificationSessions!: Table<Session>;
  userContributions!: Table<UserContribution>;
  llmCache!: Table<CachedLLMResponse>;

  constructor() {
    super('MushroomID');
    this.version(1).stores({
      genusProfiles: 'genus, *common_names, uk_occurrence',
      heuristics: 'heuristic_id, category, *applies_to.genus, priority',
      safetyRules: 'rule_id, priority',
      userModel: 'user_id',
      competencies: 'skill_id, status',
      fsrsCards: 'card_id, due_date, card_type',
      identificationSessions: 'session_id, date, *candidates',
      userContributions: 'id, type, heuristic_id, status',
      llmCache: 'cache_key, created_at',
    });
  }
}
```

### 7.2 Storage Persistence & Backup

IndexedDB is browser-local storage. Data survives page refreshes and app restarts, but is vulnerable to the user clearing browser data, storage eviction under pressure, or device loss. Since users build competency evidence and personal annotations over months/years, data loss would be significant.

#### Layer 1: Persistent Storage (always active)

Request persistent storage on first launch so the browser won't evict our data under storage pressure:

```typescript
async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage?.persist) {
    const granted = await navigator.storage.persist();
    // PWAs installed to homescreen almost always get this granted
    return granted;
  }
  return false;
}
```

PWAs added to the homescreen on both Android and iOS are almost always granted persistent storage. This protects against automatic eviction but not against the user manually clearing data.

#### Layer 2: Manual Export/Import (Phase 1+)

Give the user full control over their data with JSON export/import via the `dexie-export-import` addon:

```typescript
import { exportDB, importDB } from 'dexie-export-import';

// Export entire DB to a downloadable JSON blob
async function backupData(db: MushroomDB): Promise<Blob> {
  return await exportDB(db, {
    prettyJson: true,
    filter: (table) => table !== 'llmCache', // skip cached LLM responses
  });
}

// Import from a previously exported file
async function restoreData(file: File): Promise<void> {
  await importDB(file, { overwriteValues: true });
}
```

UI integration:
- **Settings > Backup & Restore** with "Export Data" and "Import Data" buttons
- **Periodic reminder**: After every 10 identification sessions or 30 days (whichever comes first), show a non-intrusive prompt: "Back up your data? You have X sessions and Y notes that aren't backed up."
- **Last backup timestamp** displayed in settings so the user knows how current their backup is
- Export includes: user model, competency records, FSRS card states, user contributions, identification session history. Excludes: core KB (ships with app), LLM cache (ephemeral).

This is zero-cost, works offline, gives the user full data ownership, and requires no server infrastructure.

#### Layer 3: Cloud Sync (Phase 6+ / Future)

If the project grows to support multi-device use or community features, evaluate:

- **Dexie Cloud** (first-party sync addon) -- adds multi-device sync, auth, and server-side persistence on top of the same Dexie API. Handles conflict resolution and offline-first sync automatically. Tradeoff: dependency on their hosted service (or self-host).
- **Custom sync to Supabase/Firebase** -- most flexible but most work. Need conflict resolution, versioning, offline queue.
- **CRDTs** for conflict-free merge of user contributions across devices.

Cloud sync is only needed for: user model, competency records, FSRS card states, and user contributions. The core knowledge base ships with the app and is version-controlled in git.

#### What Lives Where

| Data | Storage | Backed Up? | Synced (Future)? |
|------|---------|-----------|-------------------|
| Core KB (genus profiles, heuristics, safety rules) | Ships as JSON in build -> IndexedDB on first load | No need -- reinstall restores it | No need -- versioned in git |
| User model & competency records | IndexedDB | Yes (export/import) | Yes |
| FSRS card states | IndexedDB | Yes (export/import) | Yes |
| User contributions (notes, overrides, drafts) | IndexedDB | Yes (export/import) | Yes |
| Identification session history | IndexedDB | Yes (export/import) | Optional |
| Cached LLM responses | IndexedDB | No (ephemeral) | No |
| User-uploaded photos | IndexedDB | Optional (large) | No |

### 7.3 Knowledge Base Loading Strategy

1. **Ship core KB with the app** -- The 20 most common UK foraging genera + all safety rules are bundled as JSON files in the build
2. **Store in IndexedDB on first load** -- Parsed and indexed for efficient lookup
3. **Periodic updates** -- When online, check for KB updates (new species, corrected rules). Versioned with semver. Updates are diffed against the installed version to avoid re-downloading unchanged data.
4. **User contributions overlay** -- User edits stored in separate IndexedDB tables, merged at query time. Core KB and user data are never mixed in the same tables.

---

## 8. PWA Shell & Offline Architecture

### 8.1 Service Worker Strategy

```
PRECACHE (install time):
  - App shell (HTML, CSS, JS bundles)
  - Core knowledge base JSON files
  - UI images and icons
  - Offline fallback page

RUNTIME CACHE:
  - LLM API responses (CacheFirst for identical queries)
  - User-uploaded photos (IndexedDB, not service worker cache)
  - KB updates (StaleWhileRevalidate)

NETWORK ONLY:
  - LLM API calls (with fallback to offline mode)
  - Analytics (if any)
```

### 8.2 App Manifest

```json
{
  "name": "Mushroom ID - UK Foraging Guide",
  "short_name": "MushroomID",
  "description": "Adaptive mushroom identification and training for UK foragers",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#4a6741",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 8.3 Mobile Considerations

- **Camera access**: `<input type="file" accept="image/*" capture="environment">` for cross-platform compatibility
- **Touch targets**: Minimum 48px tap targets (field use with dirty/gloved hands)
- **High contrast mode**: For use in variable outdoor lighting
- **Minimal network dependency**: Core identification works fully offline
- **Battery awareness**: Minimize background processing; batch IndexedDB writes

---

## 9. Development Phases

### Phase 1: Foundation (Core Infrastructure)

**Goal**: Working PWA shell with local knowledge base and basic identification flow.

- [x] Set up Vite + React + TypeScript project with PWA plugin
- [x] Configure Dexie.js IndexedDB schema
- [x] Request persistent storage on first launch (`navigator.storage.persist()`)
- [x] Implement data export/import via `dexie-export-import` (Settings > Backup & Restore)
- [x] Add periodic backup reminder (every 10 sessions or 30 days)
- [x] Parse existing YAML schemas into TypeScript types
- [x] Load core knowledge base (genus profiles, heuristics, safety rules) into IndexedDB
- [x] Build basic UI shell: home screen, identification flow, settings
- [x] Implement photo capture via native input
- [x] Service worker for offline caching
- [x] Basic routing (React Router)

**Deliverable**: Installable PWA that loads and displays knowledge base data, with data backup/restore.

### Phase 2: Rule Engine

**Goal**: Deterministic identification engine with weighted non-additive confidence model.

- [x] Define evidence tier system (Definitive / Strong / Moderate / Weak / Exclusionary)
- [x] Build observation model with all-optional fields and confidence annotations
- [x] Build candidate generator: score all genera against observed features using weighted model
- [x] Implement definitive feature fast-path (brittle gills → Russula/Lactarius immediately)
- [x] Implement exclusionary logic (single feature eliminates candidate)
- [x] Implement moderate/weak evidence accumulation with diminishing returns
- [x] Build conditional rule pruning (narrow active heuristic sets as candidates narrow)
- [x] Build safety annotation layer (attached to candidates, never blocking identification)
- [x] Build disambiguation question selector ranked by information gain
- [x] Ensure every question supports "Not sure / Can't tell" without blocking progress
- [x] Build result assembly: identification + safety + edibility (gated by confidence) + next steps
- [x] Implement implicit feature inference from context (park → not deep woodland)
- [x] Build ambiguity detection and follow-up prompts ("soil or buried wood?")
- [x] Templated explanations for offline mode

**Deliverable**: Complete offline identification flow that handles partial information gracefully, uses weighted non-additive confidence, and separates identification from edibility advice.

### Phase 3: Knowledge Base Population

**Goal**: Comprehensive UK foraging knowledge base.

- [x] Create genus profiles for top 20 UK foraging genera
- [x] Create safety rules for all UK deadly/seriously toxic species
- [x] Create discrimination heuristics for critical lookalike pairs
- [x] Create edibility determination heuristics for each beginner-friendly genus
- [x] Create ecological context rules (season, habitat, regional data)
- [ ] Expert review of all safety-critical content
- [x] Add reference images (sourced or photographed)

**Priority genera** (roughly by importance to UK foragers):
1. Amanita (safety critical)
2. Agaricus (safety critical - confusion with Amanita)
3. Russula (beginner-friendly, common)
4. Boletus/Boletaceae (popular edibles, some toxic)
5. Cantharellus (choice edible, few confusions)
6. Lactarius (common, milk test)
7. Pleurotus (oyster mushrooms - easy, safe)
8. Macrolepiota (parasol - good edible, some lookalike risk)
9. Coprinus/Coprinopsis (ink caps)
10. Hydnum (hedgehog fungus - very safe)
11. Laetiporus (chicken of the woods)
12. Fistulina (beefsteak fungus)
13. Marasmius (fairy ring champignon)
14. Craterellus (horn of plenty)
15. Sparassis (cauliflower fungus)
16. Calvatia/Lycoperdon (puffballs)
17. Leccinum (various boletes)
18. Armillaria (honey fungus)
19. Clitocybe (some edible, some toxic - important to cover)
20. Lepista (wood blewit, field blewit)

### Phase 4: LLM Integration

**Goal**: LLM integration for conversational identification and teaching.

#### Design Decisions (locked in)

**1. API Target: z.ai (OpenAI-compatible)**
- Using z.ai's chat completions endpoint (OpenAI-compatible API format)
- User-provided API key, stored encrypted in IndexedDB
- No multi-provider abstraction — z.ai only for now
- Update `vite.config.ts` workbox NetworkOnly pattern from `api.anthropic.com` to z.ai endpoint

**2. Stateless Conversation Model**
- Each LLM call is self-contained — no multi-turn conversation history maintained
- Full context injected per call: rule engine output, observation data, genus profiles
- Simpler implementation, easier to cache, no state management complexity
- Can revisit if calibration shows multi-turn would significantly improve results

**3. Orchestration: Pattern C (UI orchestrates, LLM gets one smart call per turn)**
- UI is the orchestrator — it decides when to call the LLM and what to do with results
- LLM gets one "smart call" per user action with rich context
- Flow:
  - Turn 1: UI sends photo/text to LLM → LLM returns structured features + direct opinion → UI feeds features to rule engine → UI assembles and displays combined response
  - Turn 2+: User answers disambiguation questions → rule engine updates scores → LLM explains results (or offline templates if no connectivity)
- Safety invariant: LLM NEVER makes safety decisions. All toxicity warnings, lookalike flags, and edibility gates remain deterministic rule engine logic
- No tool-use/function-calling needed — single structured JSON response from LLM

**4. Dual Output: Structured Features + Direct LLM Identification (for calibration)**
- Every LLM call returns TWO outputs:
  1. **Structured observation fields** — extracted features that feed the rule engine (cap_color, gill_type, etc.)
  2. **Direct species identification** — the LLM's own opinion on what the mushroom is, with confidence and reasoning
- The direct identification is stored separately and NEVER used for safety decisions
- Comparing rule engine results vs LLM direct opinion over time gives calibration data on system accuracy
- Enables future analysis: where does the rule engine outperform the LLM, and vice versa?

**5. Form Integration: LLM Pre-fills, User Overrides**
- When the LLM extracts features from photos/descriptions, it populates the existing structured observation form
- User can see what the LLM extracted and correct any field
- User input ALWAYS takes priority over LLM extraction
- If user has already filled a field manually, LLM extraction does not overwrite it
- This gives the user transparency and control over what feeds the rule engine

**6. Feature Variation: Current Model + LLM Direct Opinion**
- Keep the current single-value observation model (e.g., `cap_color: "brown"`)
- The LLM's direct identification opinion naturally captures nuance that string matching misses (e.g., colour variation within a species, age-related changes)
- If calibration data later shows the structured extraction is a bottleneck, we can extend the observation model with confidence annotations or multi-value fields
- Pragmatic: don't over-engineer the observation model until we have data showing it matters

**7. Multi-Photo Support**
- User can upload 2-3 photos per identification (cap top, underside/gills, stem base)
- All photos sent in a single LLM call for feature extraction
- LLM instructed to extract features from all images, noting which photo each observation came from
- Improves extraction accuracy without increasing API call count

#### Tasks

- [x] Set up z.ai API client with user-provided key management (stored in IndexedDB)
- [x] Build prompt template system (system prompt + session context + query context)
- [x] Build structured JSON response schema (observation fields + direct identification)
- [x] Build feature extraction from photos (multi-photo support)
- [x] Build feature extraction from natural language descriptions
- [x] Integrate LLM pre-fill into observation form (user overrides)
- [x] Build natural language explanation generator (grounded in rule engine output)
- [x] Implement LLM response caching in IndexedDB
- [x] Build calibration data capture (rule engine vs LLM direct opinion)
- [x] Cost monitoring and budget controls

**Deliverable**: Full online identification experience with conversational UI, dual-output calibration, and graceful offline degradation.

### Phase 4b: Narrative Descriptions & Free-Text Rule Matching

**Goal**: Harness rich natural language descriptions (user text + foraging rules of thumb) for identification, both online and offline.

- [x] Add `description_notes` field to `Observation` type for free-text diagnostic notes
- [x] Add `identification_narrative` field to `GenusProfile` type
- [x] Write rich identification narratives for all 20 genera incorporating practical foraging rules of thumb (taste test, yellow staining, milk colour, snakeskin, ball and socket, etc.)
- [x] Add ~80 feature rules matching diagnostic terms in `description_notes` (e.g., "milk" → Lactarius strong, "deliquesce" → Coprinopsis strong, "yellow stain" → Agaricus exclusion)
- [x] Update LLM system prompt to use narratives as genus context
- [x] Add `description_notes` to LLM extraction schema with instruction to preserve user text verbatim
- [x] Make text description textarea always visible (works offline without API key)
- [x] Wire user text into `observation.description_notes` before rule engine runs
- [x] Bump KB_VERSION to 3 for re-seeding

**Deliverable**: User text descriptions like "distant gills, cap dipped in centre, concentric colour bands" now boost correct genera (Russula, Lactarius) even fully offline. ~80 description_notes rules cover all 20 genera. LLM prompts include narratives for richer context.

### Phase 5: Adaptive Learning

**Goal**: Competency tracking and spaced repetition training.

- [x] Integrate `ts-fsrs` for spaced repetition scheduling
- [x] Build competency tracking model with evidence capture
- [x] Implement upgrade/downgrade automation
- [x] Build card generator from genus profiles (genus, feature, safety, discrimination, heuristic cards)
- [x] Build review/flashcard mode for spaced repetition with DB persistence
- [x] Build competency dashboard (user's progress view)
- [x] Build decay detection (confident→learning after 180d, expert→confident after 365d)
- [x] Seed review cards automatically from knowledge base on app load
- [x] Fix vitest pool configuration for Node 24 compatibility (vmForks)
- [x] Implement adaptive guidance (adjust explanations based on competency)
- [x] Implement seasonal refresh prompts
- [x] Build training module viewer (explanations, visual comparisons, quizzes)

**Notes from Phase 4b**: The `identification_narrative` field on each genus is a rich source of training content — flashcard/quiz modules can pull from narratives to generate questions (e.g., "What's the key feature of Lactarius?" → "All species exude milk"). The `description_notes` field could also feed competency evidence — if a user correctly types diagnostic terms ("distant gills, depressed cap"), that demonstrates genus recognition competency.

**Deliverable**: Complete learning system that adapts to user's demonstrated knowledge.

### Phase 6: User Contributions

**Goal**: Allow users to annotate and extend the knowledge base.

- [x] Build heuristic annotation UI (personal notes, regional data)
- [x] Build exception reporting flow
- [x] Build draft heuristic editor with schema validation
- [x] Implement contribution storage (separate from core KB)
- [x] Build contribution merge logic (overlay on core data at query time)
- [x] Build export/backup of user data

**Deliverable**: Users can enrich their local knowledge base.

### Phase 7: Polish & Testing

**Goal**: Production-ready PWA.

- [x] Comprehensive testing (rule engine, edge cases, safety rules)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (lighthouse 90+)
- [ ] Offline testing across devices
- [x] Liability disclaimers and safety messaging
- [x] User onboarding flow
- [x] Error handling and recovery

---

## Appendix A: Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect identification leads to poisoning | Critical | Rule engine always flags dangerous lookalikes; edibility advice gated by confidence; safety warnings attached to every identification; disclaimers |
| LLM hallucination about mushroom safety | Critical | LLM never makes safety decisions; all safety logic is deterministic |
| Knowledge base errors | High | Cross-referencing, expert review, provenance tracking, version control |
| LLM API costs spiral | Medium | Offline-first design; aggressive caching; model routing; budget caps |
| LLM API unavailable | Medium | Full offline fallback; templated responses; local rule engine handles core flow |
| User over-relies on app | Medium | Clear disclaimers; competency gates; "when in doubt, don't eat it" messaging throughout |

## Appendix B: External Data Sources Reference

| Source | URL | Data Available | License/Access |
|--------|-----|---------------|---------------|
| FRDBI | frdbi.org.uk | UK species list, distribution records | Open via GBIF |
| GBIF Species API | api.gbif.org | Taxonomy, synonyms, occurrence data | CC-BY or CC0 |
| iNaturalist | inaturalist.org | Photos, observations, seasonal data | CC licenses (varies per photo) |
| Mushroom Observer | mushroomobserver.org | Photos, observations, expert notes | CC-BY-NC |
| First Nature | first-nature.com | UK species pages, descriptions, photos | Reference only (no bulk extraction) |
| Wild Food UK | wildfooduk.com | Foraging-focused species info | Reference only |
| BMS / Kew Checklist | britmycolsoc.org.uk | Authoritative UK taxonomy | Reference |
