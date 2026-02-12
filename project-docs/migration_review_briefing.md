# Briefing: Mushroom Identification App Migration Review

## Purpose of This Document

This document provides context for reviewing an existing mushroom identification web app and producing a migration plan. It should be read alongside the following attached files:

- **identification_architecture_comparison.md** — detailed analysis of why rule-based expert systems fail for mushroom ID and why LLM-driven identification with reference data works better
- **mushroom_identification_process.md** — record of a successful test identification (Woolly Milkcap) using the LLM-driven approach, including an honest appendix about what the LLM vs the data actually contributed
- **wildfooduk_mushrooms_final.json** — the 268-species JSON dataset used in the test, scraped from Wild Food UK
- **[The existing app's rule set, code, and/or system prompts — to be attached by the user]**

## Background

### What exists now

A mushroom identification web app that uses:
- A rule-based expert system (decision tree / scripted rules)
- An LLM API called with those rules
- Photo analysis as part of the identification flow

The app performs poorly. Specific failure modes observed:
- The LLM constrained by rules cannot use its broader mycological knowledge
- Photo analysis could not identify mushrooms to genus level — e.g., it could not determine that a mushroom was a milkcap (Lactarius) because genus-level identification requires physically cutting the mushroom to check for latex, which is invisible in any photograph
- The rule-based decision tree is brittle: wrong or missing answers at any gate derail the identification
- Users must answer questions in taxonomic terms they may not understand

### What was tested as an alternative

A conversational LLM (Claude) was given a JSON dataset of 268 UK mushroom species and asked to identify a mushroom from a natural-language verbal description. The process:

1. User described a mushroom in everyday language ("orange pink", "kind of funnel shaped", "faint fluff round the edge", "white milk when cut")
2. The LLM matched this description against the JSON species entries using a combination of its own mycological knowledge and the data
3. It narrowed 268 species to 2 candidates in one pass
4. A single follow-up question (gill colour) resolved the ambiguity
5. Habitat confirmation (near birch) sealed the identification
6. Final answer: Woolly Milkcap (*Lactarius torminosus*) — correct, with appropriate safety warnings

This approach was significantly more accurate than the rule-based app and faster than the user working with reference books.

### Key findings

These are documented in detail in the architecture comparison document but summarised here for quick reference:

1. **The LLM is the identification engine, not the rules.** The LLM's training corpus contains sufficient mycological knowledge for UK species-level identification. The JSON data grounds it in a bounded species list and prevents hallucination, but the reasoning happens in the LLM.

2. **Free-text species descriptions work better than structured fields when an LLM is reading them.** The LLM can fuzzy-match "orange pink" against "pale salmon/orange with darker scaled concentric rings" without needing enumerated colour fields. Over-structuring the data adds maintenance cost without improving accuracy.

3. **Photos have marginal value for the features that matter most.** Current vision models cannot reliably distinguish fine morphological features (gill attachment, spacing, stem texture). Many genera require physical tests (cutting for latex, snapping for brittleness, smelling) that are invisible in any photograph. Photos should be supplementary, not primary.

4. **Conversational follow-up and physical test prompts are the key differentiators.** The LLM can adaptively ask questions that discriminate between remaining candidates, and can prompt the user to perform physical tests in real time. This is impossible in a rule-based system.

5. **The possible_confusion field is the most safety-critical piece of data.** It should always be surfaced when candidates are presented.

## The Task

Review the existing app's rules, architecture, and LLM integration alongside the documents and dataset from the test. Produce a migration plan that covers the following:

### 1. Rule Audit

Go through the existing app's rule set and classify each rule or rule group into one of three categories:

- **Convert to reference data**: Rules that contain good species-level information (descriptions, diagnostic features, confusion species, habitat associations) should be converted into entries or enrichments for the JSON dataset. The information is valuable; the rule format is not.
- **Convert to system prompt guidance**: Rules that describe identification strategy (e.g., "check for latex first when evaluating milkcaps", "always consider Amanita lookalikes for white-capped species") should be extracted and included in the LLM's system prompt as guidance, not as rigid instructions. The LLM should treat these as heuristics it can apply flexibly.
- **Discard**: Rules that enforce rigid decision tree logic, force specific question sequences, or constrain the LLM from using its broader knowledge should be removed.

For each rule, briefly explain the classification decision.

### 2. Data Enrichment Plan

Identify where the existing rules contain species information that is absent from or weaker than the JSON dataset. Propose specific enrichments:

- Species present in the rules but missing from the JSON
- Diagnostic features mentioned in rules that could strengthen existing JSON entries
- Confusion species relationships captured in rules but not in the JSON's possible_confusion field
- Physical test instructions embedded in rules that should become part of the dataset

### 3. Architecture Recommendations

Based on the architecture comparison document, recommend specific changes to the app:

- What to keep from the current architecture (if anything)
- What the LLM integration should look like (system prompt design, context injection, conversation state management)
- How to handle photos (supplementary role, what the LLM should and shouldn't try to extract from them)
- How to handle the JSON dataset (full injection vs retrieval-based selection)
- Safety layer design (when and how to surface possible_confusion data, edibility warnings, physical test prompts)

### 4. System Prompt Draft

Produce a draft system prompt for the LLM that:

- Establishes its role as a conversational mushroom identification guide
- References the JSON dataset as its species knowledge base
- Includes any valuable strategic heuristics extracted from the existing rules
- Instructs it on when and how to ask follow-up questions
- Instructs it on when and how to prompt physical tests
- Defines the safety requirements (always surface confusion species, never confirm edibility without caveats, be explicit about uncertainty)
- Defines how to handle photos (supplementary evidence, not primary identification)
- Sets the tone: helpful, knowledgeable but not condescending, appropriate for a non-expert user in the field

### 5. Implementation Considerations

Note any practical considerations for the migration:

- Can the existing frontend be reused with a modified backend, or does the conversational model require a new UI?
- Token budget: at 268 entries the full JSON is roughly 130-140k tokens. Is this within context limits for the target LLM, or is retrieval needed?
- Conversation state: how should multi-turn identification sessions be managed?
- Cost implications of the LLM API approach vs the current architecture
- Testing strategy: how to validate the new system against known identification cases

## Constraints and Preferences

- The target deployment is a web app (not a Claude skill or desktop tool)
- The developer (Gavin) has experience with React Native, Python, and LLM API integration
- Cost efficiency matters — avoid architectures that require expensive per-query processing if simpler approaches work
- The system should work for UK species identification as a starting point, with the potential to expand geographically
- Safety is non-negotiable: the system must never present a confident identification without noting dangerous lookalikes, and must never recommend consumption

## What to Deliver

A single document containing:

1. Rule audit table (rule → classification → rationale)
2. Data enrichment recommendations (specific additions to the JSON)
3. Architecture recommendations (what changes, what stays)
4. Draft system prompt
5. Implementation notes

Be direct about what in the existing app should be discarded. The goal is not to preserve the current architecture — it's to build a better one that uses the LLM as the core identification engine, grounded by good reference data.
