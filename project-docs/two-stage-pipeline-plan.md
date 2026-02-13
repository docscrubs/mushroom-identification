# Two-Stage Identification Pipeline

## Context

The current single-stage system injects all 268 species as JSON (~127K tokens) into a single system prompt (~130K total). Instructions are just 3K tokens — **2.4% of the prompt**. The LLM can't effectively attend to 127K tokens of data, so it falls back on training data and rationalises contradictions rather than flagging them. This caused a Death Cap to be misidentified as a Field Mushroom.

**Fix**: Separate candidate generation (small context, LLM knowledge) from candidate verification (focused context, specific dataset entries). Show the user everything at each stage.

**Additional**: Enrich the 7 species with null `diagnostic_features`/`safety_checks` (Field Mushroom, Horse Mushroom, Fool's Funnel, Panthercap, Grey Spotted Amanita, Blusher, Devil's Bolete) so Stage 2 has strong data to verify against.

---

## Architecture

```
User message + photos
       │
       ▼
┌─────────────────────────────┐
│ Stage 1: Candidate Generation│  ~3K token prompt, no species data
│ LLM uses mycological knowledge│  JSON output: 3-8 candidate species
│ Photos analysed here          │  ~500 completion tokens
└──────────────┬──────────────┘
               │
       ▼
┌─────────────────────────────┐
│ Species Lookup               │  Match candidates → dataset entries
│ Also pulls confusion species │  + safety species for related genera
│ Deterministic, no LLM       │  Typically 5-15 entries (~3-5K tokens)
└──────────────┬──────────────┘
               │
       ▼
┌─────────────────────────────┐
│ Stage 2: Verification        │  ~5K token prompt with focused data
│ Feature-by-feature comparison │  Markdown tables: match/contradict/missing
│ Streams to user as response  │  ~2K completion tokens
└──────────────┬──────────────┘
               │
       ▼
   Combined response stored as single assistant message
```

**Token usage**: ~10K per message vs current ~131K. **~13x reduction**.

---

## Implementation Phases

### Phase 1: Data Enrichment

Enrich `diagnostic_features` and `safety_checks` for 7 species with null values in the dataset JSON. These are derived mechanically from existing field descriptions (already researched and approved).

| File | Action |
|------|--------|
| `src/data/wildfooduk_mushrooms_enriched.json` | Add `diagnostic_features` + `safety_checks` for: Field Mushroom, Horse Mushroom, Fool's Funnel, Panthercap, Grey Spotted Amanita, Blusher, Devil's Bolete |
| `src/data/species-dataset.test.ts` | Add tests: enriched species have non-null `diagnostic_features` |

### Phase 2: Species Lookup Module

New module to match candidate names from Stage 1 against the 268-species dataset.

| File | Action |
|------|--------|
| `src/data/species-lookup.ts` | CREATE — `lookupCandidateSpecies()`, `findSpeciesByName()`, `extractConfusionSpeciesNames()`, `serializeForVerification()` |
| `src/data/species-lookup.test.ts` | CREATE — exact match, case-insensitive, fuzzy ("Death Cap"→"Deathcap"), scientific name, confusion species extraction, safety species auto-include, dedup, maxResults cap |

Key behaviour:
- Case-insensitive matching on `name` and `scientific_name`
- Fuzzy matching for spacing/hyphenation variants
- Auto-include confusion species from `possible_confusion` fields
- Auto-include critical danger species when candidates share genus-level similarity (any Agaricus → include A. phalloides)

### Phase 3: Stage 1 Prompt (Candidate Generation)

| File | Action |
|------|--------|
| `src/llm/prompts/stage1-candidates.ts` | CREATE — `buildStage1Prompt()` |
| `src/llm/prompts/stage1-candidates.test.ts` | CREATE — contains role def, mandates dangerous species, NO species JSON, under 4K tokens |

Stage 1 prompt instructs the LLM to:
- Output structured JSON: `{ candidates: [{ name, scientific_name, confidence, key_reasons }], reasoning, needs_more_info, follow_up_question? }`
- Always include dangerous species that could match, even at low confidence
- Use `response_format: { type: 'json_object' }` for reliable parsing
- Vision model if photos present, text model otherwise
- Temperature 0.3, max_tokens 1024

### Phase 4: Stage 2 Prompt (Verification)

| File | Action |
|------|--------|
| `src/llm/prompts/stage2-verification.ts` | CREATE — `buildStage2Prompt(species)`, `buildStage2UserMessage(stage1, originalMsg)` |
| `src/llm/prompts/stage2-verification.test.ts` | CREATE — contains focused species data, feature-by-feature instructions, safety rules, markdown table format, scales with species count |

Stage 2 prompt instructs the LLM to:
- Compare each user-described feature against dataset entry
- Classify each as: **MATCH**, **CONTRADICTION**, **PARTIAL MATCH**, or **MISSING**
- Single contradiction on core feature eliminates candidate
- Output structured markdown with feature comparison tables
- Include safety rules + physical test instructions
- Temperature 0.2, max_tokens 2048, text model only

**Response format shown to user:**
```markdown
## Initial Candidates
[Stage 1 summary — what the system considered and why]

## Verification

### Death Cap (Amanita phalloides)
| Feature | You described | Dataset says | Verdict |
|---------|--------------|-------------|---------|
| Cap colour | olive green | olive green to dirty yellow | ✓ MATCH |
| Gills | white | White to cream | ✓ MATCH |
| ...
**Overall**: Strong match — all described features align
**Edibility**: DEADLY

### Field Mushroom (Agaricus campestris)
| Feature | You described | Dataset says | Verdict |
|---------|--------------|-------------|---------|
| Cap colour | olive green | White, sometimes grey/brown | ✗ CONTRADICTION |
| Gills | white | Deep pink → dark brown | ✗ CONTRADICTION |
| ...
**Overall**: ELIMINATED — cap colour and gill colour both contradict
**Elimination reason**: Olive green cap is incompatible; white gills incompatible

## Assessment
[Final identification with confidence, what would change it]

## What Would Help
[Most useful follow-up question or physical test]

## Safety Notes
[All relevant warnings]
```

### Phase 5: Pipeline Orchestrator

| File | Action |
|------|--------|
| `src/types/pipeline.ts` | CREATE — `Stage1Output`, `Stage1Candidate`, `PipelineStage`, `PipelineCallbacks`, `PipelineResult` |
| `src/types/index.ts` | MODIFY — export pipeline types |
| `src/llm/pipeline.ts` | CREATE — `runIdentificationPipeline()`, `parseStage1Output()` |
| `src/llm/pipeline.test.ts` | CREATE — Stage 1 called without species data, JSON parsing (valid + malformed), species lookup called, Stage 2 called with focused data, callbacks emitted in order, photos → vision model for Stage 1, **Death Cap scenario test**, **Field Mushroom contradiction test** |

Pipeline flow:
1. Call Stage 1 (candidate generation) — small context, fast
2. Parse JSON output → candidate list
3. Look up candidate species + confusion species from dataset
4. Call Stage 2 (verification) — focused context, streams to user
5. Combine: prepend Stage 1 summary to Stage 2 response
6. Return combined response + summed usage

**Fallbacks:**
- Stage 1 JSON parse failure → extract species names via regex from raw text
- No species matches → broaden search with genus-level matching
- Stage 2 finds no strong matches → explicitly state this, suggest alternatives

### Phase 6: Conversation Integration

| File | Action |
|------|--------|
| `src/types/conversation.ts` | MODIFY — add optional `pipeline_metadata?: { stage1_candidates?, verified_species?, stage1_raw? }` to `ConversationMessage` |
| `src/llm/conversation.ts` | MODIFY — `sendMessageStreaming` calls `runIdentificationPipeline` instead of single LLM call. New `onStageChange` callback parameter. |
| `src/llm/conversation.test.ts` | MODIFY — update to expect pipeline calls |

The `onChunk` callback receives Stage 2 streaming output only (the user-facing verification). Stage 1 is fast and its summary is prepended to the Stage 2 output.

Multi-turn: Always re-run Stage 1 (cheap at ~3.5K tokens). Stage 1 sees full conversation history including prior verification results, so candidates naturally evolve.

Caching: Cache the combined pipeline result using existing `buildCacheKey` on the message array. Same cache API, pipeline is an implementation detail.

### Phase 7: UI Updates

| File | Action |
|------|--------|
| `src/components/PipelineProgress.tsx` | CREATE — horizontal stepper showing: Candidates → Lookup → Verification |
| `src/components/PipelineProgress.test.tsx` | CREATE — renders stages correctly |
| `src/components/ChatBubble.tsx` | MODIFY — add markdown table rendering |
| `src/components/ChatBubble.test.tsx` | MODIFY — add table rendering tests |
| `src/pages/ChatPage.tsx` | MODIFY — add `pipelineStage` state, pass `onStageChange`, replace static loading stages with dynamic pipeline status |
| `src/pages/ChatPage.test.tsx` | MODIFY — update for pipeline flow |

Pipeline progress shows dynamic status:
- "Generating candidates..." → "Identified 6 possible species"
- "Looking up 8 species entries..."
- "Verifying against dataset..." → streaming response

### Phase 8: Safety Validation

- Update safety test fixtures for new two-stage response format
- Verify all 11 scenarios + Woolly Milkcap multi-turn pass
- Add Death Cap vs Field Mushroom contradiction test (olive green cap + white gills)
- All existing tests must continue to pass

---

## What Stays Unchanged

- `src/llm/api-client.ts` — already supports streaming, JSON format
- `src/llm/cache.ts` — same cache API
- `src/llm/cost-tracker.ts` — called with combined usage
- `src/data/species-dataset.ts` — still loads all 268 species
- `src/data/species-pruning.ts` — reused by species-lookup for serialization
- `src/db/` — no schema changes (pipeline_metadata stored in messages JSON)
- `src/pages/IdentifyPage.tsx` — offline fallback unchanged
- `src/engine/` — rule engine unchanged

## Verification

Each phase:
1. `npx vitest run` — all tests pass
2. `npx tsc --noEmit` — zero TS errors

Final validation:
- Two-stage pipeline runs end-to-end
- Death Cap scenario correctly identified (not confused with Field Mushroom)
- Streaming works for both stages
- Pipeline progress indicator shows stages
- Feature comparison tables render in ChatBubble
- Multi-turn conversations work with pipeline
- Safety test suite passes
- Token usage dramatically reduced (~10K vs ~131K per message)
