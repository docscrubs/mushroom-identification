# Migration Review: Rule-Based Expert System → LLM-Driven Identification

## Executive Summary

The existing app has a well-engineered genus-level rule engine with **1,677 feature rules**, **22 procedural heuristics**, and **20 genus profiles** covering UK foraging genera. It also has a 268-species JSON dataset from Wild Food UK sitting unused in `project-docs/`. The rule engine operates at genus level only, requires structured form input, and cannot reach species-level identification. The LLM is currently relegated to feature extraction — it fills in form fields that feed the rule engine, rather than doing identification itself.

The architecture comparison document makes a convincing case: the LLM should be the identification engine, and the rules should become reference data and guidance for the LLM. This review audits every component of the existing system, classifies what to keep/convert/discard, and produces a migration plan.

**Bottom line**: The app contains approximately 40,000 words of excellent mycological knowledge spread across rules, heuristics, edibility data, genus profiles, and identification narratives. Almost none of this should be thrown away — but almost all of it needs to change form. The rule engine framework (scorer, feature matching, disambiguation) should be removed. The knowledge it encodes should be converted to LLM context and JSON data enrichments.

---

## 1. Rule Audit

### 1.1 Feature Rules (`src/engine/feature-rules.ts` — 1,677 rules)

#### Category A: Structured Field Rules (~97 rules across 20 genera)

These rules match structured observation fields (gill_type, flesh_texture, cap_shape, ring_present, volva_present, etc.) against genus-level expectations with evidence tiers (definitive/strong/moderate/weak/exclusionary).

| Rule Group | Count | Classification | Rationale |
|---|---|---|---|
| **Exclusionary rules** (e.g., pores rule out Russula, ring rules out Clitocybe) | ~30 | **Convert to reference data** | The information is correct and useful ("Russula never has a volva") but should be stated as species/genus facts in the dataset, not executed as programmatic gates. The LLM already knows these taxonomic constraints from its training corpus. Having them in the data provides grounding. |
| **Definitive rules** (e.g., brittle flesh → Russula/Lactarius, pores → Boletus, teeth → Hydnum) | ~8 | **Convert to system prompt guidance** | These are the most powerful genus-level heuristics. They should be in the system prompt as identification strategy: "If the user reports brittle flesh, prioritise Russula and Lactarius. If pores, prioritise Boletaceae." The LLM already knows this, but explicit guidance ensures consistency. |
| **Strong feature rules** (e.g., volva → Amanita, ring + brown gills → Agaricus, ridges → Cantharellus) | ~40 | **Convert to reference data + system prompt guidance** | The genus-feature associations are correct. Some are better as data enrichments (volva description in Amanita JSON entries), some as prompt guidance (always check for volva when Amanita is a candidate). |
| **Moderate/Weak rules** (habitat, season, colour, smell, growth pattern) | ~19 | **Convert to reference data** | Season ranges, habitat preferences, and colour descriptions should be fields in the JSON species entries. The rule engine's season_month ranges, habitat matches, and colour matches are all information that belongs in the species data, not in a scoring algorithm. |

#### Category B: Description Notes Rules (~80 rules)

These match free-text keywords in `description_notes` against genus expectations (e.g., "milk" → Lactarius strong, "brittle gills" → Russula strong, "snakeskin" → Macrolepiota moderate).

| Rule Group | Count | Classification | Rationale |
|---|---|---|---|
| **Diagnostic keyword rules** (milk, latex, brittle gills, snakeskin, ball and socket, deliquesce, bootlace, etc.) | ~50 | **Convert to system prompt guidance** | These are exactly the kind of natural-language-to-genus mappings that the LLM handles natively. The LLM already knows "milk when cut = Lactarius" — but including these as prompt guidance ensures the diagnostic vocabulary is comprehensive. Format them as: "When the user mentions [keyword/phrase], this is diagnostically significant for [genus] because [reason]." |
| **Synonym/phrase expansion rules** (widely spaced = distant, central depression = depressed, spaced apart = distant) | ~15 | **Discard** | The LLM handles synonym resolution natively. These rules exist because the rule engine can't fuzzy-match — the LLM can. |
| **Contra-evidence rules** (flexible gills → contra Russula, yellow stain → contra edible Agaricus) | ~15 | **Convert to system prompt guidance** | The contra-evidence is valuable identification strategy. Include in prompt: "If the user reports flexible/pliant gills, this rules against Russula (Russula gills are always brittle). If yellow staining at stem base, this indicates toxic A. xanthodermus." |

#### Category C: Scoring Engine (`src/engine/scorer.ts`)

| Component | Classification | Rationale |
|---|---|---|
| Tier weights (definitive=0.80, strong=0.35, etc.) | **Discard** | The numeric scoring model is a crude approximation of what the LLM does naturally with soft matching. |
| Diminishing returns factor | **Discard** | The LLM implicitly handles evidence accumulation with appropriate saturation. |
| Exclusionary elimination | **Convert to system prompt guidance** | "If the user confirms pores, immediately eliminate all gilled genera from consideration" — but as guidance, not as hard logic. |
| Score-to-confidence mapping | **Discard** | Confidence in the new system comes from the LLM's assessment of evidence strength, not from a numeric formula. |

#### Category D: Support Systems

| Component | Classification | Rationale |
|---|---|---|
| **Feature inference** (`feature-inference.ts`) | **Discard** | Inferring substrate from growth pattern ("tiered → wood") is something the LLM does naturally from context. |
| **Description preprocessing** (`description-preprocessing.ts`) — negation handling | **Convert to system prompt guidance** | The negation patterns ("not rolled", "no ring", "without volva") are useful prompt guidance: "Pay attention to negations in the user's description — 'no ring' is as informative as 'has a ring'." |
| **Disambiguation** (`disambiguation.ts`) — question selection | **Discard as mechanism; convert strategy to prompt** | The information-gain question selection logic should become prompt guidance: "When multiple genera remain plausible, ask the question that most efficiently discriminates between them. Prioritise safety-relevant questions." The LLM does this adaptively in conversation. |
| **Ambiguity detection** (`ambiguity-detection.ts`) | **Discard** | The LLM surfaces ambiguities naturally in conversation. |
| **Evidence summary** (`evidence-summary.ts`) | **Discard** | The LLM generates better natural-language explanations of evidence than templated summaries. |
| **Result assembler** (`result-assembler.ts`) | **Discard as mechanism** | The orchestration flow is no longer needed. The LLM handles the full identification flow conversationally. |

### 1.2 Heuristics (`src/data/seed-heuristics.ts` — 22 heuristics)

These are the **most valuable knowledge in the entire codebase**. They contain step-by-step procedural guidance for physical tests, safety discrimination, and ecological context. Every one should be preserved.

| Heuristic | Category | Classification | Rationale |
|---|---|---|---|
| `russula_taste_test` | Edibility | **Convert to reference data + system prompt** | The procedure, outcomes, and exceptions are excellent. Add taste test procedure to Russula entries in JSON. Include in system prompt as a test the LLM should suggest. |
| `bolete_blue_staining_caution` | Safety | **Convert to reference data + system prompt** | Blue staining assessment for boletes. Add to Boletus JSON entries. System prompt should instruct: "For boletes, ask about blue staining AND pore colour — blue staining alone is not dangerous." |
| `lactarius_milk_color` | Edibility | **Convert to reference data + system prompt** | Milk colour test for Lactarius. Add to all Lactarius JSON entries. System prompt: "For any milkcap, always ask about milk colour — orange = edible, white = caution, colour-changing = avoid." |
| `avoid_lbms` | Safety | **Convert to system prompt** | Critical safety rule. System prompt: "If the description matches a small brown gilled mushroom and the user is not an expert, advise leaving it alone." |
| `amanita_recognition_warning` | Safety | **Convert to system prompt** | Critical. Full volva-ring-white gills triad in prompt. |
| `puffball_slice_safety_check` | Safety | **Convert to reference data + system prompt** | Mandatory slice test. Add to all Calvatia/Lycoperdon JSON entries. System prompt must include this as a required safety step. |
| `avoid_small_lepiota` | Safety | **Convert to system prompt** | Size gate (<10cm = danger). System prompt: "Never confirm a lepiota-type mushroom as Parasol unless cap is >15cm with snakeskin stem and no volva." |
| `clitocybe_rivulosa_warning` | Safety | **Convert to system prompt** | Deadly lawn mushroom. System prompt must flag this for any small white funnel in grassland. |
| `galerina_marginata_warning` | Safety | **Convert to system prompt** | Deadly wood mushroom. System prompt: "Any brown gilled mushroom on wood with a ring must be differentiated from Galerina — spore print is essential." |
| `cortinarius_avoidance` | Safety | **Convert to system prompt** | Critical genus avoidance. System prompt: "Never recommend eating any Cortinarius. Delayed-onset kidney failure from C. rubellus." |
| `coprinopsis_alcohol_warning` | Safety | **Convert to system prompt** | Coprine-alcohol interaction. System prompt: always warn about alcohol with ink caps. |
| `agaricus_vs_amanita_discrimination` | Discrimination | **Convert to system prompt** | Most critical lookalike pair. Full discrimination procedure in prompt. |
| `macrolepiota_vs_lepiota_vs_amanita` | Discrimination | **Convert to system prompt** | Three-way discrimination. Size threshold + snakeskin + no volva in prompt. |
| `chanterelle_vs_false_chanterelle` | Discrimination | **Convert to reference data + system prompt** | Ridges vs gills + flesh colour + apricot smell. Add to Cantharellus and Hygrophoropsis JSON entries. |
| `marasmius_vs_clitocybe_rivulosa` | Discrimination | **Convert to system prompt** | Critical lawn discrimination. Tough stem + free gills vs soft stem + decurrent gills. |
| `armillaria_vs_galerina` | Discrimination | **Convert to system prompt** | Spore print discrimination. System prompt: "Honey Fungus is never safe to confirm without a white spore print." |
| `lepista_vs_cortinarius` | Discrimination | **Convert to system prompt** | Spore print + cortina + smell discrimination. |
| `puffball_vs_amanita_egg` | Discrimination | **Convert to system prompt + reference data** | Mandatory slice test. |
| `agaricus_yellow_stain_test` | Edibility | **Convert to reference data + system prompt** | Yellow stainer test. Add to Agaricus JSON entries. |
| `puffball_interior_check` | Edibility | **Convert to reference data** | Interior colour check. Add to Calvatia/Lycoperdon entries. |
| `coprinopsis_freshness_check` | Edibility | **Convert to reference data** | Freshness assessment. Add to Coprinopsis entries. |
| `laetiporus_host_tree_check` | Edibility | **Convert to reference data + system prompt** | Host tree safety. Add to Laetiporus JSON entries. System prompt: "Always ask what tree Chicken of the Woods is growing on — yew is dangerous." |
| `bolete_red_pore_test` | Edibility | **Convert to reference data + system prompt** | Red pore + blue staining danger combo. Add to bolete JSON entries. |
| `death_cap_habitat_alert` | Ecological | **Convert to system prompt** | Oak + autumn = Death Cap territory. |
| `grassland_vs_woodland_context` | Ecological | **Convert to system prompt** | Habitat-based genus expectations. |
| `mycorrhizal_tree_association` | Ecological | **Convert to system prompt** | Tree-genus partnerships. |
| `uk_seasonal_fruiting_guide` | Ecological | **Convert to system prompt** | Seasonal fruiting expectations. |

### 1.3 Edibility Data (`src/engine/edibility.ts` — 20 genera)

| Classification | Rationale |
|---|---|
| **Convert to reference data** | Every genus's default_safety, requires_cooking, beginner_safe, warnings, and foraging_advice should become fields in the JSON dataset. For species that span edibility levels within a genus (e.g., Agaricus has edible A. campestris and toxic A. xanthodermus), the species-level edibility in the JSON should override the genus default. |

### 1.4 Seed Genera (`src/data/seed-genera.ts` — 20 genus profiles)

| Component | Classification | Rationale |
|---|---|---|
| `identification_narrative` | **Convert to system prompt context** | These are well-written, forager-friendly summaries of how to identify each genus. They should be included in the system prompt as genus-level guidance for the LLM. |
| `confidence_markers` (high/moderate features) | **Convert to system prompt guidance** | "For Russula, high-confidence markers are brittle flesh and no ring/volva. Moderate markers are woodland habitat and white spore print." |
| `lookalike_genera` | **Convert to reference data + system prompt** | The lookalike relationships and danger levels should be in both the JSON (possible_confusion field enrichment) and the system prompt (always surface these). |
| `key_species_uk` (edible/toxic lists) | **Convert to reference data** | Enrich relevant JSON species entries with notes from these lists. |
| `ecological_context` | **Convert to reference data** | Season, habitat, substrate, tree associations → JSON species entries. |
| `foraging_heuristics` references | **Covered by heuristic conversion above** | |

### 1.5 LLM Integration (`src/llm/`)

| Component | Classification | Rationale |
|---|---|---|
| **API client** (`api-client.ts`) | **Keep** | The fetch wrapper is reusable. Stays with z.ai OpenAI-compatible endpoint. |
| **System prompt** (`prompts.ts` — buildSystemPrompt) | **Discard and rewrite** | Current prompt instructs the LLM to extract structured fields. New prompt should instruct it to do identification. |
| **Extraction messages** (`prompts.ts` — buildExtractionMessages) | **Discard** | No longer extracting structured fields for a rule engine. |
| **Explanation messages** (`prompts.ts` — buildExplanationMessages) | **Discard** | The LLM is now the identification engine, not an explanation layer over the rule engine. |
| **Feature extraction** (`extract-features.ts`) | **Discard** | The extraction-to-structured-fields pipeline is removed. |
| **Cache** (`cache.ts`) | **Keep** | Caching is still useful for the LLM API. |
| **Cost tracker** (`cost-tracker.ts`) | **Keep** | Budget management is still needed. |
| **Calibration** (`calibration.ts`) | **Discard** | No longer comparing LLM opinion against rule engine — the LLM IS the engine. |
| **Image processing** (resize/compress) | **Keep** | Still useful for photo upload. |

### 1.6 Frontend

| Component | Classification | Rationale |
|---|---|---|
| **IdentifyPage** (structured form + results display) | **Redesign** | Replace structured form with a chat interface. The user describes, the LLM responds conversationally. Photo upload remains. |
| **Safety components** (disclaimers, onboarding) | **Keep** | Safety messaging is important regardless of architecture. |
| **Learning system** (FSRS, competency, training) | **Keep but decouple** | The spaced repetition system is independent of the identification engine. It can continue to work with the new architecture. Training cards may need to reference species (not just genera). |
| **Contribution system** | **Keep** | User annotations and personal notes are architecture-independent. |
| **Settings** | **Modify** | API key management, budget settings still needed. Provider stays as z.ai/GLM. |

### 1.7 Database

| Component | Classification | Rationale |
|---|---|---|
| **genusProfiles table** | **Replace with species dataset** | 20 genus profiles → 268+ species entries. The genus-level profiles become summaries within the species data or system prompt context. |
| **heuristics table** | **Replace with prompt context** | Heuristic knowledge moves to system prompt. Procedural test data could remain as a reference table if needed for the learning system. |
| **identificationSessions** | **Modify** | Store conversation history instead of structured observation + rule engine result. |
| **reviewCards, competencies** | **Keep** | Learning system remains. |
| **llmCache, llmSettings, llmUsage** | **Keep** | Still needed. |

---

## 2. Data Enrichment Plan

### 2.1 Species Present in Rules but Missing/Weak in JSON

The existing rules operate at genus level and reference specific species in their descriptions and heuristics. Cross-referencing against the 268-entry JSON:

| Species Referenced in Rules | In JSON? | Action |
|---|---|---|
| *Amanita phalloides* (Death Cap) | **Yes** — but check possible_confusion completeness | Enrich with full volva description, delayed symptom timeline, oak association |
| *Amanita virosa* (Destroying Angel) | Check | If missing, add. Critical deadly species. |
| *Agaricus xanthodermus* (Yellow Stainer) | **Yes** | Enrich with chrome yellow staining description, phenol/ink smell, stem base test procedure |
| *Clitocybe rivulosa* (Fool's Funnel) | Check | If missing, add. Small white funnel, decurrent gills, grassland rings. |
| *Clitocybe dealbata* (Ivory Funnel) | Check | If missing, add. Deadly lawn mushroom. |
| *Galerina marginata* (Funeral Bell) | Check | If missing, add. Amatoxin-containing wood mushroom. |
| *Cortinarius rubellus* (Deadly Webcap) | Check | If missing, add. Kidney failure, delayed onset. |
| *Cortinarius orellanus* (Fool's Webcap) | Check | If missing, add. |
| *Lepiota brunneoincarnata* (Deadly Lepiota) | Check | If missing, add. Amatoxin-containing small lepiota. |
| *Lepiota cristata* (Stinking Dapperling) | Check | If missing, add. |
| *Hygrophoropsis aurantiaca* (False Chanterelle) | Check | If missing, add as confusion species for Cantharellus. |
| *Rubroboletus satanas* (Satan's Bolete) | Check | If missing, add. Red pores + blue staining. |
| *Tylopilus felleus* (Bitter Bolete) | Check | If missing, add. Penny Bun lookalike, bitter taste. |

### 2.2 Diagnostic Features to Add to JSON Entries

The rules contain feature knowledge that should enrich existing species entries:

| Feature Type | Current State in JSON | Enrichment |
|---|---|---|
| **Physical test results** (latex colour, staining, taste, brittleness) | Partially in free text | Add structured fields: `physical_tests: { latex: { present, initial_colour, colour_change }, bruising: { colour, speed }, taste: { description, safety_note }, brittleness: boolean }` |
| **Diagnostic keywords** (woolly margin, snakeskin stem, ball-and-socket) | Buried in free text | Add `diagnostic_features: string[]` — a short list of the most discriminating features for each species |
| **Tree associations** | In habitat free text | Add `associated_trees: string[]` as a structured field |
| **Edibility notes** | Only "Edible"/"Poisonous"/"Inedible" | Add `edibility_notes: string` with genus-level warnings from edibility.ts, plus `requires_cooking: boolean` |
| **Beginner safety** | Absent | Add `beginner_safe: boolean` and `danger_level: 'safe' | 'caution' | 'dangerous' | 'deadly'` |
| **Confusion species distinguishing features** | possible_confusion is free text | Add structured `confusion_pairs: [{ species, distinguishing_features: string[], danger_level }]` |
| **Seasonal data** | season_start/end as text ("Jul", "Oct") | Convert to `season_start_month: number, season_end_month: number` for pre-filtering |

### 2.3 Safety Data Enrichments

The heuristics contain critical safety information that must be in the dataset:

| Safety Knowledge | Source | Target in JSON |
|---|---|---|
| Death Cap delayed symptoms (6-24h) | `amanita_recognition_warning` | Add to A. phalloides entry and possible_confusion of every species that could be confused with it |
| Puffball slice test (mandatory before eating any puffball) | `puffball_slice_safety_check` | Add to every Calvatia/Lycoperdon entry: `safety_checks: ["Always slice in half — young Amanita eggs can resemble puffballs"]` |
| Small Lepiota size gate (<10cm = danger) | `avoid_small_lepiota` | Add to all lepiota-type entries |
| Coprine-alcohol interaction (3-day window) | `coprinopsis_alcohol_warning` | Add to all Coprinopsis entries |
| Chicken of the Woods host tree danger (yew) | `laetiporus_host_tree_check` | Add to Laetiporus entry: `safety_checks: ["Never eat specimens growing on yew or eucalyptus"]` |
| Galerina amatoxins | `galerina_marginata_warning` | Add to Galerina entry and Armillaria possible_confusion |
| Cortinarius delayed kidney failure (3-14 days) | `cortinarius_avoidance` | Add to all Cortinarius entries |

### 2.4 Proposed Enhanced JSON Schema

The existing dataset has the following fields per entry (shown from the real data). Each entry is a species or variety with free-text descriptions and some structured metadata. The proposed enrichment adds new structured fields alongside the existing ones — it does not remove or replace the existing fields the LLM reads well as free text.

**Existing fields** (all 268 entries):
```jsonc
{
  "name": "Horse Mushroom",                          // Common name
  "scientific_name": "Agaricus arvensis",             // Binomial
  "common_names": "Horse Mushroom (EN), ...(CY)...",  // Multi-language string
  "synonyms": null,                                   // or string of former names
  "edibility": "Edible",                              // "Edible" | "Poisonous" | "Inedible"
  "about": null,                                      // Null for 72% of entries; extended description when present
  "season_start": "May",                              // Three-letter month or "All"
  "season_end": "Oct",                                // Three-letter month or "All"
  "average_mushroom_height_cm": "10-16",              // Free text — inconsistent formats
  "average_cap_width_cm": "10-16 but can be found up to 25cm",  // Free text — inconsistent formats
  "cap": "10-16 cm. White, sometimes discoloured...", // Free text morphology
  "under_cap_description": "Gills: Crowded and free...", // Free text — gills, pores, or teeth
  "stem": "10-16 cm long, 2-3 cm diameter...",        // Free text
  "skirt": "Superior. Can start fairly large...",      // Free text — ring/skirt description
  "flesh": "White, firm and bruising slightly yellow...", // Free text
  "habitat": "Pasture, meadows, lawns...",            // Free text
  "possible_confusion": "TheYellow Stainer (Agaricus xanthodermus)...", // Free text — has concatenation artefacts
  "spore_print": "Dark purple/brown. Ellipsoid.",     // Free text or null
  "taste": "Excellent, this is one of our favourites.", // Free text or null
  "smell": "The smell of aniseed...",                 // Free text or null
  "frequency": "Occasional and widespread...",        // Free text
  "other_facts": "...",                               // Free text or null
  "extra_features": null,                             // Null for ~96%; structured object when present
  "source_url": "https://www.wildfooduk.com/..."      // Source page
}
```

**Proposed new fields** (added alongside existing fields):

```jsonc
{
  // --- EXISTING FIELDS ABOVE (all kept as-is) ---

  // NEW: Parsed numeric size fields from the free-text size strings
  "cap_width_min_cm": 10,                // Parsed from average_cap_width_cm
  "cap_width_max_cm": 16,                // Parsed from average_cap_width_cm
  "height_min_cm": 10,                   // Parsed from average_mushroom_height_cm
  "height_max_cm": 16,                   // Parsed from average_mushroom_height_cm

  // NEW: Numeric season months for pre-filtering
  "season_start_month": 5,               // Parsed from season_start ("May" → 5)
  "season_end_month": 10,                // Parsed from season_end ("Oct" → 10)

  // NEW: Structured enrichments from existing rules/heuristics knowledge
  "associated_trees": ["n/a — grassland species"],   // Extracted from habitat text + rule engine knowledge
  "edibility_detail": {
    "status": "edible",                  // Normalised: "edible" | "edible_with_caution" | "inedible" | "toxic" | "deadly"
    "danger_level": "caution",           // "safe" | "caution" | "dangerous" | "deadly"
    "requires_cooking": true,            // From edibility.ts genus knowledge
    "beginner_safe": false,              // From edibility.ts genus knowledge
    "notes": "Good edible but must confirm no volva (Amanita) and no yellow staining (toxic Yellow Stainer)."
  },
  "diagnostic_features": [              // The 3-5 most discriminating features for this species
    "Large white cap bruising slightly yellow",
    "Gills starting white/pink, maturing to dark brown (never staying white)",
    "Strong aniseed smell from flesh",
    "No volva or bulbous base (distinguishes from Amanita)",
    "Dark purple-brown spore print"
  ],
  "safety_checks": [                    // Mandatory checks from heuristics — only for relevant species
    "Dig around stem base — check for volva (if present, this is Amanita, not Agaricus)",
    "Scratch stem base — if chrome yellow with ink/chemical smell, it's toxic Yellow Stainer"
  ],
  "confusion_pairs": [                  // Structured version of possible_confusion
    {
      "species": "Agaricus xanthodermus (Yellow Stainer)",
      "danger_level": "toxic",
      "distinguishing_features": [
        "Yellow Stainer turns bright chrome yellow when bruised or cut at stem base",
        "Yellow Stainer smells of Indian ink or chemicals, not aniseed",
        "Yellow Stainer is not edible — causes GI upset"
      ]
    },
    {
      "species": "Amanita species (Death Cap, Destroying Angel)",
      "danger_level": "deadly",
      "distinguishing_features": [
        "Amanita has a volval sack/cup at the base — Agaricus does not",
        "Amanita gills stay white — Agaricus gills turn pink then brown",
        "Amanita often grows near trees — Horse Mushroom prefers grassland"
      ]
    }
  ]
}
```

**Data quality fixes to enact during enrichment**:
- Parse `average_cap_width_cm` and `average_mushroom_height_cm` into numeric min/max fields. Handle inconsistent formats: `"10-16"`, `"5–20"` (em-dash), `"10-16 but can be found up to 25cm"`, `"1–4(6)"`, null
- Parse `season_start`/`season_end` month abbreviations to numeric (Jan=1, Dec=12). Handle `"All"` → `season_start_month: 1, season_end_month: 12`
- Fix `possible_confusion` concatenation artefacts (e.g., `"TheYellow Stainer"` → `"The Yellow Stainer"`)
- Normalise `edibility` from three values ("Edible"/"Poisonous"/"Inedible") to five-level `edibility_detail.status` using genus-level knowledge from `edibility.ts`

---

## 3. Architecture Recommendations

### 3.1 What to Keep

| Component | Why |
|---|---|
| **PWA shell / offline support** | Web app requirement. Service worker caching is still useful. |
| **Dexie/IndexedDB** | Store species dataset locally for offline reference. Store conversation history. |
| **Learning system** (FSRS, competency, cards) | Independent of identification engine. Valuable for training. |
| **Contribution system** | User annotations remain useful. |
| **Safety disclaimer / onboarding** | Critical for any foraging tool. |
| **API client wrapper** | Reusable for different LLM providers. |
| **Cost tracking / budget** | Still needed for API calls. |
| **Photo processing** (resize, compress, base64) | Still needed for photo upload. |

### 3.2 What to Remove

| Component | Why |
|---|---|
| **Rule engine** (scorer, feature-rules, result-assembler, disambiguation, ambiguity-detection, feature-inference, description-preprocessing, evidence-summary, explanation-templates) | The LLM replaces all of this. |
| **Structured observation form** (IdentifyPage's dropdowns and fields) | Replace with conversational text input. |
| **Heuristic execution engine** (heuristic-questions.ts) | Heuristics become prompt context, not executed code. |
| **Edibility gating logic** | The LLM handles edibility advice contextually, grounded by species data. |
| **LLM extraction pipeline** (extract-features.ts, buildExtractionMessages) | No longer extracting structured fields. |
| **LLM calibration** | No longer comparing two systems. |

### 3.3 LLM Integration Design

#### Provider & Model — Staying with z.ai GLM

The existing app uses z.ai with GLM-4.7-Flash (text) and GLM-4.6V-Flash (vision). These models stay. Here's why they work for the new conversational architecture:

**GLM-4.7-Flash** (text model — current `glm-4.7-flash`):
- 200K context window — comfortably fits the entire species dataset (~130-140K tokens) plus system prompt and conversation history
- Multi-turn conversation support with preserved thinking across turns
- **Free tier** on z.ai — no per-token cost for input or output
- Strong natural language understanding, including Chinese/multilingual training that gives good coverage of scientific terminology

**GLM-4.6V-Flash** (vision model — current `glm-4.6v-flash`):
- 128K context window — fits the species dataset with conversation history
- Accepts image + text input
- **Free tier** on z.ai — no per-token cost
- Native function calling support if needed later

**Key change from current architecture**: The current app makes stateless single-shot calls (one call per user action, no conversation history). The new conversational approach sends the full message history on each call, which GLM-4.7-Flash's 200K window handles well. The model supports multi-turn conversations natively via the standard `messages` array — this is the same OpenAI-compatible chat completions API the app already uses.

**Model routing for conversation**:
- **GLM-4.6V-Flash** for the first turn when the user includes a photo (vision model needed)
- **GLM-4.7-Flash** for all text-only turns and follow-up questions (larger context window, better reasoning)
- Both models use the same z.ai endpoint and API format — no code changes to the API client

**When to consider upgrading**: If identification accuracy is insufficient with the Flash models, the paid models offer better performance:
- GLM-4.7: $0.60/M input, $2.20/M output — stronger reasoning
- GLM-4.6V: $0.30/M input, $0.90/M output — better vision understanding
- GLM-4.6V-FlashX: $0.04/M input, $0.40/M output — good middle ground for vision

The free Flash tier should be tried first. The existing budget/cost-tracking infrastructure can handle the paid models if needed.

#### Context Injection Strategy

The 268-species JSON at ~130-140K tokens fits within GLM-4.7-Flash's 200K context window. Options:

**Option A: Full dataset injection**
- Send the entire JSON in the system prompt on every call
- Simplest architecture, no retrieval logic needed
- With free-tier pricing, there's no per-token cost to worry about
- 200K context leaves ~60K tokens for system prompt + conversation history (~15-20 conversational turns)

**Option B: Two-stage retrieval**
- First LLM call with a lightweight system prompt (genus profiles + safety rules only, ~15K tokens)
- LLM returns a shortlist of candidate genera/species
- Second call with full entries for shortlisted species (~5-15K tokens)
- Lower context usage but more complex, higher latency, two round-trips

**Option C: Seasonal/habitat pre-filter**
- Before sending to LLM, filter the dataset by season (current month) and/or habitat (if known)
- Reduces dataset to ~100-150 species for any given query
- Simple client-side filtering using structured season_start_month/season_end_month fields

**Recommendation**: Option A (full injection). The free tier removes the cost concern. The 200K window comfortably fits the data. Simplicity wins. If the dataset grows significantly beyond 268 species, or if context is too tight for long conversations with photo-heavy sessions (GLM-4.6V-Flash has 128K, not 200K), add Option C pre-filtering as a lightweight optimisation.

#### Conversation State

The existing app is stateless (single LLM calls). The new architecture needs multi-turn conversation:

- **Session-based**: Each identification is a session with history
- **Store in IndexedDB**: `identificationSessions` table already exists, extend it to store message history
- **Context window management**: Send full conversation history for each turn. The 200K window allows ~15-20 turns comfortably. For unusually long sessions, truncate early turns (keep system prompt + last N messages)
- **Session persistence**: User can return to an in-progress identification
- **Photo handling across turns**: Photos are only sent in the turn where the user uploads them. The LLM retains context from its own previous responses about photo content — no need to re-send images on every turn

### 3.4 Photo Handling

Photos should be:
- Uploaded as part of the conversation (not a separate analysis step)
- Sent to the LLM alongside the user's text description
- The system prompt should instruct the LLM on photo limitations (per architecture comparison doc)

**System prompt guidance for photos**:
- Use for habitat context and gross morphology
- Do NOT attempt species-level ID from photo alone
- Flag contradictions between photo and verbal description
- Explicitly tell the user when a physical test would be more diagnostic than the photo

### 3.5 Safety Layer Design

This is the key architectural decision. The existing app's principle is "LLM NEVER makes safety decisions." The new architecture needs to reconcile this with the LLM being the identification engine.

**Recommendation**: Safety is embedded in the data and the prompt, not in a separate deterministic layer.

1. **The `possible_confusion` field** in the JSON must always be surfaced when a species is mentioned as a candidate. The system prompt makes this non-negotiable.

2. **Safety-critical heuristics** (puffball slice test, small lepiota size gate, Amanita volva check, Galerina spore print, Cortinarius avoidance) are embedded in the system prompt as rules the LLM must follow.

3. **The LLM never confirms edibility without caveats**. The system prompt instructs: "Never state that a mushroom is safe to eat. Always include possible confusion species, always recommend physical tests where applicable, always note that field identification is never 100% certain."

4. **Physical test prompts** are the key safety mechanism. The LLM should proactively suggest physical tests (cut for latex, taste test for Russula, slice puffball, check for volva, spore print) when they would be diagnostically or safety-relevant.

5. **Dangerous genera/species get explicit warnings** in the system prompt. The LLM must flag Amanita, Cortinarius, Galerina, Clitocybe rivulosa, and small Lepiota whenever they are relevant to the identification.

This approach is different from the existing deterministic safety layer but achieves the same goals through a different mechanism. The safety knowledge is the same — it's just expressed as prompt instructions and data annotations rather than code.

---

## 4. System Prompt Draft

```
You are a knowledgeable mushroom identification guide for UK foragers. You help users identify mushrooms through conversational interaction, using a combination of your mycological knowledge and the species reference dataset provided below.

## YOUR ROLE

You are a conversational identification assistant. The user will describe a mushroom they've found — in their own words, with photos if available — and you will help them narrow down what it is through a combination of matching against the species dataset and asking targeted follow-up questions.

You are NOT a rule engine. You reason flexibly about partial, uncertain, and sometimes contradictory evidence. You adapt your questions based on the current shortlist of candidates, and you know when a physical test would be more informative than another description question.

## SPECIES REFERENCE DATASET

The following JSON contains {N} UK mushroom species entries. Use this as your primary reference for matching. Your knowledge of mycology from your training data supplements this dataset, but always ground your identification in species that exist in this dataset. Do not invent species not in the dataset.

{SPECIES_JSON}

## IDENTIFICATION APPROACH

1. **Accept any description format.** The user may use common language ("orange-pink", "kind of funnel shaped", "faint fluff round the edge"), technical terms ("decurrent gills", "tomentose margin"), or a mix. You translate between them.

2. **Match softly, not rigidly.** "Orange-pink" can match "pale salmon/orange with darker scaled concentric rings." Partial matches count — a species matching 6 of 8 features is a strong candidate even if 2 features are unconfirmed.

3. **Handle missing information gracefully.** If the user hasn't mentioned smell, that's not evidence against smell-distinctive species — it's missing information. Widen the shortlist rather than narrowing prematurely.

4. **Ask targeted follow-up questions.** Once you have a shortlist, ask the question that most efficiently discriminates between remaining candidates. Prioritise:
   - Safety-relevant questions first (Could this be Amanita? Check for volva.)
   - Physical tests the user can perform in the field
   - Questions about features the user hasn't mentioned that would narrow the shortlist
   - Easy questions before difficult ones

5. **Prompt physical tests.** Many genera require physical interaction to confirm:
   - "Can you break the stem? Does it snap cleanly (brittle) or tear with fibrous strands?"
   - "If you cut the flesh, does it produce any liquid? What colour?"
   - "Does the cut surface change colour over the next 30 seconds?"
   - "Can you smell anything when you break it open? Aniseed, meal/flour, radish?"
   - "Touch a tiny piece to your tongue (don't swallow) — is it mild or peppery?"
   Physical tests are often more diagnostic than any visual feature.

6. **Use photos as supplementary evidence.** If the user shares a photo:
   - Use it for habitat context (visible trees, substrate, growth pattern)
   - Use it for gross morphology (broad shape, approximate proportions)
   - Use it for approximate colour (accounting for lighting)
   - Do NOT rely on it for gill attachment, gill spacing, stem texture, or any fine detail
   - Do NOT attempt species-level identification from a photo alone
   - If the photo contradicts the verbal description, ask about it
   - Explicitly tell the user when a physical test would be more diagnostic than anything in the photo

## SAFETY RULES — NON-NEGOTIABLE

These rules override everything else. You must follow them in every identification.

### Always surface confusion species
When presenting any candidate species, ALWAYS mention its dangerous lookalikes from the possible_confusion field. Even if you're confident, the user needs to know what could go wrong.

### Never confirm edibility
Never state that a mushroom is "safe to eat" or "definitely edible." Always:
- Note the edibility status from the dataset
- Mention any dangerous confusion species
- Recommend physical tests where applicable
- State that field identification is never 100% certain
- Recommend expert confirmation for any species the user intends to eat

### Critical danger species — always flag
Whenever any of the following are possible candidates (even with low confidence), you MUST explicitly warn the user:

- **Amanita phalloides (Death Cap)**: Deadly. One cap can kill. Symptoms delayed 6-24 hours. Associated with oak. Check for: volva at base (may be underground), white gills, white spore print, ring on stem.
- **Amanita virosa (Destroying Angel)**: Deadly. Pure white. Same toxins as Death Cap.
- **Cortinarius rubellus/orellanus (Deadly Webcap)**: Causes irreversible kidney failure. Symptoms delayed 3-14 DAYS. Cobweb cortina, rusty brown spore print. Can resemble Blewits (Lepista).
- **Galerina marginata (Funeral Bell)**: Contains amatoxins. Grows on wood in clusters with a ring. Resembles Honey Fungus. KEY: rusty brown spore print (vs white for Armillaria).
- **Clitocybe rivulosa / C. dealbata (Fool's Funnel / Ivory Funnel)**: Muscarine poisoning, potentially fatal. Small white funnel mushrooms on grassland. Grow in same fairy rings as edible Marasmius.
- **Small Lepiota species**: Contain amatoxins. Any lepiota-type mushroom with cap <10cm should be considered dangerous.

### Mandatory physical tests
You MUST suggest these tests when the relevant genera are candidates:

- **Any puffball**: "You must slice this in half from top to bottom before eating. If you see any internal structure (forming cap, gills, or stem), it's a young Amanita, not a puffball. Discard it."
- **Any Agaricus**: "Dig around the stem base and check for a cup or bag-like structure (volva). If present, this is Amanita, not Agaricus. Also scratch the stem base — if it turns bright chrome yellow with an ink/chemical smell, it's the toxic Yellow Stainer."
- **Any Lactarius**: "Cut the gills and observe the milk colour. Orange/carrot = edible species. White = proceed with caution. Colour-changing = avoid."
- **Any Russula**: "The taste test is safe for confirmed Russula — touch a tiny piece to your tongue and spit it out. Mild = edible. Peppery/burning = reject."
- **Any Armillaria (Honey Fungus)**: "Take a spore print before eating. White = Armillaria (edible when cooked). Rusty brown = Galerina marginata (deadly)."
- **Any Lepista (Blewit)**: "Take a spore print. Pale pink = Lepista (edible when cooked). Rusty brown = Cortinarius (potentially deadly — kidney failure)."
- **Any Coprinopsis (Ink Cap)**: "Will you be consuming alcohol within the next 3 days? Common Ink Cap causes a severe reaction with alcohol."

### Identification strategy heuristics
Use these as flexible guidance (not rigid rules):

- **Brittle flesh that snaps like chalk** → Strongly suggests Russulaceae (Russula or Lactarius). If it also produces milk when cut → Lactarius.
- **Pores instead of gills** → Boletaceae. Check: red pores + blue staining = danger (Satan's Bolete). Blue staining alone is harmless.
- **Teeth/spines under the cap** → Hydnum (Hedgehog Fungus). Very safe, no dangerous lookalikes.
- **Forked ridges (not true gills)** + yellow + apricot smell → Chanterelle.
- **Growing on wood in brackets/shelves** → Consider Laetiporus (Chicken of the Woods), Fistulina (Beefsteak), Pleurotus (Oyster), Trametes (not edible).
- **Ring + volva + white gills** → AMANITA. Extreme danger.
- **Ring + no volva + pink-to-brown gills** → Agaricus. Still check for yellow staining.
- **Cobweb veil (cortina) + rusty spore print** → Cortinarius. AVOID.
- **Small brown gilled mushroom** → LBM (Little Brown Mushroom). Advise leaving it alone unless the user is an expert.

## TONE AND STYLE

- Knowledgeable but not condescending. Assume the user is intelligent but may not know mycological terminology.
- Translate technical terms when you use them: "decurrent gills (gills that run down the stem)"
- Be direct about uncertainty: "I think this is most likely X, but I can't rule out Y without checking Z"
- Be direct about danger: don't hedge or soften safety warnings
- Appropriate for field use: keep responses concise enough to read on a phone outdoors
- Encourage the user's observations: "Good spot — the concentric zoning on the cap is really useful here"

## RESPONSE FORMAT

For each identification turn, structure your response as:

1. **What you're thinking** — your current assessment of what this might be, with reasoning
2. **Key candidates** — the 2-5 most likely species, with:
   - How well they match the description
   - Their edibility status
   - Any dangerous lookalikes (from possible_confusion)
3. **What would help** — the single most useful thing the user could tell you or test they could perform to narrow it down further
4. **Safety notes** — any warnings relevant to the current candidates

When you're fairly confident in an identification, present it clearly with:
- The most likely species (common name and scientific name)
- Confidence level and what's supporting it
- What could change this assessment
- All relevant confusion species and how to distinguish them
- Any physical tests that should be performed to confirm
- Edibility status with all necessary caveats
```

---

## 5. Implementation Considerations

### 5.1 Frontend Changes

The existing `IdentifyPage` with its structured form needs to become a **chat interface**. The fundamental UX shift:

**Current**: User fills dropdowns → clicks "Identify" → sees structured results
**New**: User describes mushroom in text (optionally with photo) → LLM responds conversationally → user provides more info → LLM refines

The existing React + React Router setup can be reused. The main change is replacing the form-based IdentifyPage with a chat component. Libraries like `@chatscope/chat-ui-kit-react` or a simple custom chat UI would work.

The existing **LearnPage**, **TrainPage**, **ContributePage**, and **SettingsPage** can remain largely unchanged.

### 5.2 Token Budget & Cost

GLM-4.7-Flash and GLM-4.6V-Flash are both **free tier** on z.ai — zero per-token cost for input and output. This fundamentally changes the cost calculus:

- **Full dataset injection on every call**: No cost concern. Send the entire ~130-140K token dataset in the system prompt every turn.
- **Multi-turn conversations**: No incremental cost per turn. The full conversation history (system prompt + all previous messages) is re-sent each turn, but it's all free.
- **Photo-heavy sessions**: Vision model (GLM-4.6V-Flash) is also free. No cost penalty for including photos.

**Current budget setting** ($5/month) is effectively unlimited on the free tier. It serves as a safety net if the app is later switched to a paid model.

**If upgrading to paid models** for better accuracy:
- GLM-4.7: $0.60/M input, $2.20/M output → ~$0.08 input per full-context call, ~$0.002 output per response → typical session (4-6 turns): ~$0.35-0.50
- GLM-4.6V: $0.30/M input, $0.90/M output → cheaper for vision turns
- GLM-4.6V-FlashX: $0.04/M input, $0.40/M output → good middle ground for vision

**Cost optimisation options** (only needed if switching to paid models):
- Pre-filter the dataset by season (send only in-season species, ~40-60% reduction)
- Use two-stage retrieval (lightweight first call → full data for shortlisted species)
- Route simple follow-up turns to Flash models, complex reasoning to full models

### 5.3 Offline Behaviour

The existing app works fully offline via the rule engine. The LLM-driven approach requires network for identification. Options:

**Option A: Online-only identification, offline reference**
- Identification requires network (LLM API call)
- Species dataset available offline for manual browsing
- Learning system works offline
- This is the simplest and most honest approach

**Option B: Offline fallback to simplified rule engine**
- Keep a stripped-down version of the rule engine for offline use
- Online: full LLM-driven identification
- Offline: genus-level identification with safety warnings
- More complex but provides basic functionality offline

**Recommendation**: Option A for now. The LLM-driven approach is the core differentiator. Offline browsing of the species dataset provides reference value. The learning system works offline. Accept that identification requires network.

### 5.4 Conversation State Management

Each identification session needs:
- Session ID and timestamp
- Conversation history (messages array)
- Photo data URLs (stored in IndexedDB)
- Final identification result (if reached)
- Whether the user confirmed/corrected the identification (for future calibration)

Store in the existing `identificationSessions` Dexie table with an extended schema.

### 5.5 Testing Strategy

The existing test suite (~50+ test files) is heavily coupled to the rule engine. Most tests will need to be replaced.

**New testing approach**:
- **Prompt testing**: Create a set of known identification cases (species + description + expected identification). Run these against the LLM with the system prompt and dataset. Score accuracy.
- **Safety testing**: A dedicated test suite that verifies all safety-critical species trigger appropriate warnings. "Given a description matching Death Cap, does the response include volva check, delayed symptoms warning, and 'never eat' advice?"
- **Regression testing**: Record LLM responses for canonical test cases. Flag when responses change significantly.
- **Woolly Milkcap test**: The documented test case from `mushroom_identification_process.md` becomes the first integration test.

### 5.6 Migration Sequence

1. **Data preparation**: Enrich the JSON dataset with safety data, diagnostic features, and structured fields from the existing rules/heuristics.
2. **System prompt development**: Write and iterate on the system prompt using manual testing with GLM.
3. **Conversation support**: Extend the existing z.ai API client from single-shot calls to multi-turn conversation (messages array with history). No provider change needed — same endpoint, same API format.
4. **Chat UI**: Replace IdentifyPage form with chat interface. Keep photo upload.
5. **Conversation management**: Implement session storage, history, and state.
6. **Safety validation**: Run the full safety test suite against the new system.
7. **Learning system adaptation**: Update training cards to reference species (not just genera).
8. **Remove old engine**: Delete rule engine, scorer, feature-rules, and associated tests.

### 5.7 What Could Go Wrong

| Risk | Mitigation |
|---|---|
| LLM hallucinates a species not in the dataset | System prompt explicitly instructs: "Only identify species in the dataset." Include the species list as a bounded reference. |
| LLM gives confident identification of a dangerous species as safe | System prompt safety rules are non-negotiable. possible_confusion field forces lookalike mentions. Test suite validates safety responses. |
| LLM fails to suggest physical tests | System prompt has mandatory test list. Test suite validates test suggestions for relevant genera. |
| Cost exceeds budget | Free-tier GLM Flash models have zero per-token cost. Existing cost tracker applies as a safety net if upgrading to paid models. |
| API downtime = no identification | Accept for now. The offline reference dataset provides browsing capability. The learning system still works. |
| Context window fills up in long conversations | Implement conversation truncation — keep system prompt + last N turns. Most identifications complete in 3-6 turns. |

---

## Summary

The existing app contains excellent mycological knowledge imprisoned in rigid rule engine infrastructure. The migration path is:

1. **Extract the knowledge** from rules, heuristics, edibility data, and genus profiles
2. **Enrich the JSON species dataset** with safety data, diagnostic features, and structured fields
3. **Write a system prompt** that encodes identification strategy and safety rules
4. **Build a chat interface** that lets the LLM do what it's good at
5. **Remove the rule engine** — the LLM is the identification engine now

The safety knowledge doesn't go away — it changes form. Instead of deterministic code that gates edibility advice behind confidence thresholds, safety rules live in the system prompt as non-negotiable instructions and in the data as always-surfaced fields. The physical test prompts — the most underappreciated feature of the existing heuristics — become a core part of the conversational identification flow.

The fundamental insight from the architecture comparison document is correct: the LLM is the identification system. Everything else is reference data for the LLM. The existing app's knowledge base is excellent reference data — it just needs to stop pretending to be an expert system.
