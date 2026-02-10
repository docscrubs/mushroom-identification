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
1. User uploads photo + provides context (location, habitat, season)
       |
       v
2. [Feature Extraction] -- structured form or LLM-assisted feature extraction
   Output: { cap_color, gill_type, stem_features, habitat, substrate, season, ... }
       |
       v
3. [Rule Engine: Genus Classification]
   - Match features against genus profiles
   - Apply ecological context filters (season, habitat, tree associations)
   - Produce ranked genus candidates with confidence scores
       |
       v
4. [Rule Engine: Safety Screening]
   - Check ALL candidates against safety rules
   - Flag any dangerous lookalikes
   - Apply hard safety blocks (e.g., "avoid all LBMs", "white gilled + ring + volva = STOP")
       |
       v
5. [Interactive Disambiguation]
   - Generate targeted questions based on remaining candidates
   - Guide user through discriminating tests (taste, smell, bruise, spore print)
   - Each answer narrows candidates further
       |
       v
6. [Result Assembly]
   - Rule engine produces: { candidate, confidence, safety_level, reasoning_chain }
   - If online: LLM generates natural language explanation from structured result
   - If offline: templated explanation from rule data
       |
       v
7. [Competency Assessment]
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
| **LLM API** | Anthropic Claude API (primary) | Best reasoning for nuanced identification; prompt caching reduces cost 50-90% |
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

### 3.5 How the Rule Engine Executes Heuristics

The rule engine processes heuristics in priority order:

```
1. SAFETY SCREENING (critical priority)
   - All binary safety rules fire first
   - If ANY safety rule triggers REJECT, that overrides everything
   - Output: { blocked: bool, reason: string, dangerous_lookalike: species? }

2. GENUS CLASSIFICATION (standard priority)
   - Match morphological features + ecological context against genus profiles
   - Score each candidate genus by how many confidence_markers match
   - Output: { candidates: [{ genus, confidence, matching_markers, missing_markers }] }

3. DISAMBIGUATION (interactive)
   - For top candidate genera, identify discriminating questions
   - Each question is selected to maximally separate remaining candidates
   - Output: { question: string, expected_outcomes: [{ answer, effect_on_candidates }] }

4. HEURISTIC APPLICATION (once genus is confirmed)
   - Apply genus-specific heuristics (taste test, milk color, etc.)
   - Output: { conclusion: string, confidence: string, next_steps: string[] }

5. RESULT ASSEMBLY
   - Combine all rule outputs into a structured identification result
   - Include the full reasoning chain for transparency
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
1. **Photo analysis** -- If the user uploads a photo and we want to extract features from it. Note: this requires a multimodal model (Claude's vision capability).
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
| **Prompt caching** | 50-90% on input tokens | Place system prompt + genus profiles at start of every conversation. Anthropic caches prompts >1024 tokens; cached reads cost ~10% of normal. |
| **Rule engine first** | 100% (no API call) | If the rule engine can resolve the identification entirely, skip the LLM call. Estimate: 40-60% of sessions need no LLM call. |
| **Model routing** | 80% for simple queries | Route simple follow-up questions ("what does the spore print look like?") to Claude Haiku. Reserve Sonnet/Opus for complex identifications. |
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

### 7.2 Knowledge Base Loading Strategy

1. **Ship core KB with the app** -- The 20 most common UK foraging genera + all safety rules are bundled as JSON files in the build
2. **Store in IndexedDB on first load** -- Parsed and indexed for efficient lookup
3. **Periodic updates** -- When online, check for KB updates (new species, corrected rules). Versioned with semver.
4. **User contributions overlay** -- User edits stored in separate IndexedDB tables, merged at query time

### 7.3 Data Sync (Future)

If user accounts are added:
- User model and contributions sync to cloud storage
- KB updates push from server
- CRDTs for conflict-free merge of user contributions across devices

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

- [ ] Set up Vite + React + TypeScript project with PWA plugin
- [ ] Configure Dexie.js IndexedDB schema
- [ ] Parse existing YAML schemas into TypeScript types
- [ ] Load core knowledge base (genus profiles, heuristics, safety rules) into IndexedDB
- [ ] Build basic UI shell: home screen, identification flow, settings
- [ ] Implement photo capture via native input
- [ ] Service worker for offline caching
- [ ] Basic routing (React Router)

**Deliverable**: Installable PWA that loads and displays knowledge base data.

### Phase 2: Rule Engine

**Goal**: Deterministic identification engine that applies heuristics.

- [ ] Build rule engine core: match features against genus profiles
- [ ] Implement safety screening (critical rules fire first)
- [ ] Implement genus scoring (confidence markers, ecological context)
- [ ] Build interactive disambiguation (guided question sequences)
- [ ] Implement heuristic execution (procedures, outcomes, exceptions)
- [ ] Build result assembly with reasoning chain
- [ ] Templated explanations for offline mode

**Deliverable**: Complete offline identification flow using structured form input.

### Phase 3: Knowledge Base Population

**Goal**: Comprehensive UK foraging knowledge base.

- [ ] Create genus profiles for top 20 UK foraging genera
- [ ] Create safety rules for all UK deadly/seriously toxic species
- [ ] Create discrimination heuristics for critical lookalike pairs
- [ ] Create edibility determination heuristics for each beginner-friendly genus
- [ ] Create ecological context rules (season, habitat, regional data)
- [ ] Expert review of all safety-critical content
- [ ] Add reference images (sourced or photographed)

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

**Goal**: Claude API integration for conversational identification and teaching.

- [ ] Set up Anthropic API client (with key management)
- [ ] Build prompt template system (system prompt + session context + query context)
- [ ] Implement prompt caching (static system prompt + genus profiles at top)
- [ ] Implement model routing (Haiku for simple queries, Sonnet for complex)
- [ ] Build feature extraction from natural language descriptions
- [ ] Build conversational disambiguation mode
- [ ] Build natural language explanation generator (grounded in rule engine output)
- [ ] Implement LLM response caching in IndexedDB
- [ ] Build photo analysis integration (multimodal)
- [ ] Cost monitoring and budget controls

**Deliverable**: Full online identification experience with conversational UI.

### Phase 5: Adaptive Learning

**Goal**: Competency tracking and spaced repetition training.

- [ ] Integrate `ts-fsrs` for spaced repetition scheduling
- [ ] Build competency tracking model with evidence capture
- [ ] Implement upgrade/downgrade automation
- [ ] Build training module viewer (explanations, visual comparisons, quizzes)
- [ ] Build review/flashcard mode for spaced repetition
- [ ] Implement adaptive guidance (adjust explanations based on competency)
- [ ] Build competency dashboard (user's progress view)
- [ ] Implement seasonal refresh prompts
- [ ] Build decay detection and re-engagement

**Deliverable**: Complete learning system that adapts to user's demonstrated knowledge.

### Phase 6: User Contributions

**Goal**: Allow users to annotate and extend the knowledge base.

- [ ] Build heuristic annotation UI (personal notes, regional data)
- [ ] Build exception reporting flow
- [ ] Build draft heuristic editor with schema validation
- [ ] Implement contribution storage (separate from core KB)
- [ ] Build contribution merge logic (overlay on core data at query time)
- [ ] Build export/backup of user data

**Deliverable**: Users can enrich their local knowledge base.

### Phase 7: Polish & Testing

**Goal**: Production-ready PWA.

- [ ] Comprehensive testing (rule engine, edge cases, safety rules)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (lighthouse 90+)
- [ ] Offline testing across devices
- [ ] Liability disclaimers and safety messaging
- [ ] User onboarding flow
- [ ] Error handling and recovery

---

## Appendix A: Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect identification leads to poisoning | Critical | Rule engine defaults to caution; safety rules cannot be overridden; disclaimers; competency gates |
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
