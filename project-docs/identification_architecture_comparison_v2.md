# Mushroom Identification Architecture: Rule-Based Expert Systems vs LLM with Reference Data

## Context

This document compares two approaches to automated mushroom identification, informed by practical experience building and testing both:

1. **Rule-based expert system** with an LLM API and identification rules, including photo analysis
2. **LLM-driven identification** using a JSON species dataset as reference material and conversational interaction

The rule-based approach performed poorly in testing. The LLM-driven approach, tested in a live conversational identification of a Woolly Milkcap (*Lactarius torminosus*), successfully narrowed 268 species to a single high-confidence identification through two conversational turns.

The core finding is that the LLM itself is the identification system. The JSON data provides grounding and prevents hallucination, but it is the LLM's ability to interpret natural language, reason about partial information, draw on its training corpus of mycological literature, and adapt its questioning in real time that makes the system work. This has significant implications for architecture.

---

## Why the Rule-Based Approach Fails

### The Rigidity Problem

Expert systems for mushroom identification are built as decision trees. Each node asks a precise question and branches on the answer: "Does the mushroom have gills, pores, spines, or a smooth underside?" The user must select exactly one option. The system then proceeds to the next gate.

This creates several failure modes:

**Users don't speak in taxonomic terms.** A forager looking at a milkcap doesn't think "decurrent gills with crowded spacing." They think "lines underneath that run down the stem a bit." A rule system either forces the user to learn its vocabulary (poor UX and error-prone) or needs extensive synonym mapping for every possible natural-language description of every feature (brittle, impractical to maintain).

**Features aren't always binary.** "Is the cap funnel-shaped?" might be "sort of, it's more like a shallow depression in the middle" — which is actually a key distinction between some species. A rule system that accepts Yes treats a shallow depression the same as a deep funnel. A rule system that adds intermediate options ("convex / flat / slightly depressed / deeply depressed / funnel-shaped") overwhelms the user with choices they may not feel confident distinguishing.

**Wrong answers at early gates are catastrophic.** If a user misidentifies gill attachment at step 3 of a 12-step tree, the system diverges into entirely the wrong branch and may return a confident but completely wrong identification. There's no mechanism for recovery or self-correction. The system doesn't know it's wrong because it trusts every gate answer absolutely.

**The system can't handle missing information.** "I don't know" isn't a valid branch in most decision trees. If the user can't determine whether the stem is hollow or solid (which may require cutting it open — something they may not have done or may not want to do with an unknown specimen), the system either forces a guess or stalls entirely.

These failure modes aren't edge cases — they are the normal experience of a non-expert user trying to identify a mushroom. Brittleness isn't a bug in rule-based systems; it's inherent to the approach.

### The Photo Problem

Adding photo analysis via an LLM was expected to improve identification but didn't deliver. The reasons are instructive:

**Genus-level identification often requires physical interaction, not visual inspection.** The most diagnostic features for many genera are non-visual:

- **Milkcaps (Lactarius)**: Defined by producing latex when flesh is damaged. You cannot see this in a photograph — you have to cut or break the mushroom and observe whether it bleeds. The colour of the latex (white, orange, clear) and whether it changes colour over time are critical for species-level ID. None of this is visible in any photograph.
- **Brittlegills (Russula)**: Defined by brittle, snapping flesh (due to sphaerocysts — spherical rather than fibrous cells). You identify this by snapping the stem and observing a clean break. A photo of an intact mushroom tells you nothing about this.
- **Waxcaps (Hygrocybe)**: The waxy texture of the gills is a defining feature. You assess this by feel, rubbing the gills between your fingers. Invisible in photos.
- **Knight caps (Tricholoma)**: Often distinguished by smell (mealy, cucumber, coal gas). Entirely absent from any image.

This is not a marginal limitation. These genera collectively account for a large proportion of the species a UK forager is likely to encounter. A system that cannot identify milkcaps, brittlegills, or waxcaps from photos alone has a fundamental gap in its coverage.

**LLMs are poor at fine-grained visual discrimination between similar species.** An LLM can broadly categorise a mushroom photograph — "this appears to be an agaric with a pale cap and pink gills" — but it cannot reliably distinguish between, say, *Agaricus campestris* (edible Field Mushroom) and *Agaricus xanthodermus* (toxic Yellow Stainer) from a photo alone. The key differentiator is that the Yellow Stainer stains chrome yellow when the base of the stem is cut — a feature that requires physical interaction and is invisible in a standard photograph. An LLM will either guess based on superficial features (unreliable) or hedge with excessive caveats (unhelpful).

Current vision models cannot reliably distinguish fine morphological features such as adnate vs decurrent gill attachment from photographs. These are subtle geometric relationships that vary with viewing angle, specimen maturity, and how the mushroom is held. A model might correctly identify "gills" but not their attachment type, spacing, or whether they fork near the stem. The level of visual discrimination required for species-level identification is beyond what current models achieve on real-world field photographs.

**Photographic conditions vary wildly.** The same species photographed in shade vs sunlight, wet vs dry, young vs mature, from above vs from the side, can look radically different. Colour shifts under tree canopy are substantial. Flash photography washes out subtle colour differences. LLMs trained on curated reference photographs struggle with the messy, poorly-lit, partially-obscured images that foragers actually take in the field.

**Photos create false confidence.** A system that returns "85% match: Field Mushroom" based on a photograph may be correct, but the user has no way to assess whether the 15% uncertainty includes a dangerous lookalike. The visual similarity between some edible and lethal species (e.g., young Agaricus vs young Amanita) means that photo-based confidence scores can be actively dangerous.

### The LLM-as-Rule-Executor Problem

Wrapping an LLM around a rule-based system (feeding it the rules and asking it to apply them) combines the worst of both approaches. The LLM adds latency and cost but is constrained by the rules' rigidity. It can't use its broader knowledge because the rules define the decision space. It may also hallucinate rule applications — confidently branching down a path that the rules don't actually support, or interpolating between rules in ways the system designer didn't intend.

The LLM is most effective when it reasons freely against reference data, not when it executes someone else's logic.

---

## Why LLM-Driven Identification Works

### The LLM Is the System

The most important lesson from the test is that the LLM's own knowledge did most of the work. The JSON dataset provided a useful scaffold — a bounded set of species to match against, with consistent descriptions — but the LLM brought substantial mycological knowledge from its training corpus independently of the dataset.

This matters because it means:

- The LLM could interpret "faint fluff round the edge" as matching "woolly," "tomentose," "downy," and "hairy" — not because the JSON told it these were synonyms, but because it knows mycological terminology from its training data.
- The LLM knew that milk production defines the Lactarius genus before the scoring script confirmed it.
- The LLM knew that Lactarius species are mycorrhizal with specific tree partners, which informed the birch habitat confirmation.
- The LLM could assess which follow-up questions would be most discriminating between the top two candidates, because it understood the diagnostic significance of gill colour in the *torminosus*/*pubescens* complex.

Any major LLM (Claude, GPT-4, Gemini) would perform comparably on UK species identification at this level, because the relevant mycological literature — field guides, forum discussions, iNaturalist observations, Wikipedia taxonomy articles, academic papers — is part of the standard internet training corpus. No specialised mycology fine-tuning is required.

The JSON dataset's role is to ground the LLM's reasoning in a specific, bounded species list and to prevent hallucination (inventing species or features). It also provides the possible_confusion field, which is critical for safety. But the identification reasoning itself happens in the LLM.

### The Translation Layer

The LLM translates between the user's natural language and the technical descriptions in the dataset. The user said "faint fluff round the edge of the cap." The JSON data described this feature variously as "woolly inturned edges," "hairy," "tomentose," and "downy." The LLM mapped between these representations without requiring the user to know or use any of these terms. It did the same for "kind of funnel shaped" → matching against "funnel," "depressed," and "concave" in cap descriptions.

This translation is exactly what LLMs are good at — semantic similarity across different wordings of the same concept. It's also exactly what rule systems are bad at, because rules require precise input matching.

### Soft Matching, Not Hard Gating

The approach used in the test assigned weights to matching features and summed them, rather than requiring every feature to match. This meant:

- A species that matched on 6 of 8 described features still scored highly
- Uncertain features ("I think white flesh") could contribute partial weight without being treated as definitive
- Missing features (user didn't mention smell) simply didn't contribute to the score rather than blocking the identification

This is fundamentally different from a decision tree, where a single wrong or missing answer at any gate can derail the entire process. And crucially, the LLM was doing the soft matching — it didn't need structured fields with enumerated colour values to match "orange pink" against "pale salmon/orange with darker scaled concentric rings." It understood the semantic overlap directly from the free text.

### Free Text Works Better Than Structured Fields (When an LLM Is Reading It)

This is a counterintuitive but important finding. The initial instinct was to recommend restructuring the JSON into more granular fields: `cap_colour: "salmon-orange"`, `cap_shape: "funnel"`, `associated_trees: ["birch"]`, and so on. But in practice, the LLM successfully parsed free-text cap descriptions, extracted colour and shape information, and matched them against the user's colloquial description without needing structured fields.

More structured data would help in limited scenarios: pre-filtering by season or size range before the LLM processes anything, or for genuinely binary features like latex presence where a structured field prevents the LLM from scanning paragraphs. But for the descriptive features that drive most identifications — colour, shape, texture, habitat — the LLM is better at fuzzy-matching free text than any structured field system would be. Over-structuring the data adds maintenance burden without improving identification accuracy when an LLM is the consumer of that data.

The one area where structured data clearly adds value is the possible_confusion field. This is safety-critical information that should always be surfaced when a candidate appears in the shortlist, and having it as a dedicated field ensures it's never missed.

### Conversational Follow-Up as Adaptive Questioning

The LLM can generate targeted follow-up questions based on the current shortlist, rather than following a fixed question sequence.

In the test, after the first description narrowed the field to two species (*L. torminosus* and *L. pubescens*), the key differentiating features between those two specific species became the relevant questions. The user volunteered gill colour, which happened to be the most useful discriminator. But if they hadn't, the LLM could have asked specifically: "How saturated is the orange-pink? Is it a definite salmon-orange or more of a washed-out pinkish-white?" — a question that only makes sense in the context of these two specific candidates.

A rule system asks the same questions regardless of context. A conversational LLM asks the questions that matter for the specific identification in progress. This ad hoc, adaptive questioning — where each question is informed by all previous answers — is fundamentally impossible to replicate with rules.

### Physical Interaction Prompts

This is perhaps the most underappreciated advantage: the LLM can prompt the user to perform physical tests in real time.

Many genera can only be confirmed through interaction — cutting, breaking, smelling, tasting (with appropriate caution). A static photo-upload system has no mechanism for this. A conversational system can say:

- "Can you break the stem cleanly? Does it snap with a clean break, or does it tear with fibrous strands?"
- "If you cut the flesh, does it produce any liquid? What colour is it?"
- "Does the cut surface change colour over the next 30 seconds?"
- "Can you smell anything when you break it open? Aniseed, meal/flour, radish, nothing?"

These prompts transform the identification from a passive "here's a photo, tell me what it is" into an active guided examination. The LLM knows which tests are diagnostically valuable for the current shortlist and can request them in order of informativeness.

This directly addresses the milkcap problem: you can't identify a Lactarius from a photo because the defining feature (latex production) requires physical interaction. But a conversational system can ask "does it bleed when you cut it?" and use the answer — including the colour and behaviour of the latex — as a primary identification feature.

---

## The Realistic Role of Images

Photos should be supported because users expect to share them, and they occasionally provide useful context. But the system should be designed around conversational text interaction, with photos as supplementary evidence.

### What Photos Can Contribute

- **Habitat context**: visible tree bark, leaf litter, substrate (wood vs soil) can confirm ecological associations
- **Gross morphology**: broad category (agaric, bracket, puffball, coral), approximate proportions, obvious distinctive features (e.g., shaggy scales on Shaggy Ink Cap, bright red of Fly Agaric)
- **Approximate colour**: useful when lighting is reasonable, though never definitive
- **Contradiction flagging**: "Your description says funnel-shaped but the photo shows a convex cap — is the photo of a younger specimen?"

### What Photos Cannot Contribute

- **Gill attachment type** (adnate, decurrent, free): too subtle and angle-dependent for current vision models
- **Gill spacing** (crowded vs distant): not reliably distinguishable
- **Stem texture** at the fine detail needed for species-level ID
- **Accurate colour** under variable forest canopy lighting
- **Any non-visual feature**: latex, brittleness, smell, taste, bruising reactions, spore print colour

### Recommendation

Support photo upload. Let the LLM use it as one piece of partial evidence alongside the verbal description. But never let a photo drive the identification, and be transparent with the user about this limitation. The conversational interaction — including prompts for physical tests — is where the real identification happens.

---

## Proposed Architecture

### Core Principle

The LLM is the identification engine. Everything else — the dataset, the interface, the photo handling — exists to support the LLM's reasoning, not to replace it.

### Data Layer

A JSON dataset of species descriptions, similar to the current 268-entry file. The data should be:

- **Comprehensive in coverage**: as many species as feasible for the target geography (UK in this case)
- **Rich in free-text descriptions**: cap, gills/pores, stem, flesh, habitat, possible confusion, taste/smell — written in the kind of natural language that the LLM can match against user descriptions
- **Consistent in structure**: the same fields present for each species, even if some are null, so the LLM knows where to look
- **Safety-explicit**: the possible_confusion field should always be populated for any species with dangerous lookalikes

The data does not need to be heavily structured into enumerated fields. Free text works well because the LLM is doing the matching. The exceptions are: season (start/end months for pre-filtering), edibility classification (edible/inedible/poisonous as a clear label), and any genuinely binary features like latex presence.

Additional data that would add value: physical test instructions per genus (what to check and what the results mean), and a short list of the most discriminating features for each species (to help the LLM generate efficient follow-up questions).

### Implementation Options

**Option A: Claude Skill (simplest, for personal/small-scale use)**

A Claude skill file defining the identification workflow, with the JSON dataset as reference. The skill would instruct the LLM on how to approach identification: accept descriptions, match against the dataset, ask follow-up questions, prompt physical tests, surface safety information. This is essentially codifying what happened in the test conversation as a repeatable process. No backend infrastructure, no API costs beyond the existing Claude subscription. Suitable for personal use or demonstration.

**Option B: Web app with LLM API (for wider deployment)**

A web application with a chat interface. The architecture would be:

- **Frontend**: React or React Native. Chat interface accepting text and optional photo upload. Displays the LLM's responses including candidate lists, follow-up questions, safety warnings, and confidence levels.
- **Backend**: Lightweight server managing conversation state and LLM API calls. Stores the JSON dataset and injects relevant species data into the LLM context.
- **LLM integration**: System prompt containing identification instructions and the species dataset (or a relevant subset retrieved based on the user's initial description). The LLM handles all identification reasoning, follow-up questioning, and safety communication.
- **Retrieval (optional optimisation)**: For datasets larger than ~300 species, a retrieval step could select the most relevant 20-30 species to inject into context based on the user's initial description, rather than sending the full dataset. This reduces token cost. The retrieval can be simple (keyword or embedding similarity) — it doesn't need to be accurate, just needs to not miss the correct species. The LLM then does the real identification against the shortlisted entries.

The backend's role is conversation management and context assembly — not identification logic. The identification logic lives entirely in the LLM.

**Option C: Hybrid — Claude Skill with web search fallback**

A Claude skill as in Option A, but with the ability to web search for additional species information when the dataset doesn't cover a specimen. This was demonstrated in the test when a web search confirmed gill colour differences between *L. torminosus* and *L. pubescens*. The LLM can recognise when the dataset is insufficient and supplement it with external sources.

### Photo Handling

If photos are supported, they should be passed to the LLM as part of the conversation alongside the text description. The system prompt should instruct the LLM to:

- Use the photo for habitat context and gross morphology only
- Not attempt species-level identification from the photo alone
- Note any contradictions between the photo and the verbal description
- Explicitly tell the user when a physical test would be more diagnostic than anything visible in the photo

---

## Summary of Key Differences

| Aspect | Rule-Based Expert System | LLM with Reference Data |
|---|---|---|
| Input format | Forced-choice answers to fixed questions | Free-form natural language, any order |
| Handling ambiguity | Fails or forces a guess | Weights partial matches, asks for clarification |
| Missing information | Blocks progress | Widens shortlist, continues |
| Question sequence | Fixed, predetermined | Adaptive, based on current candidates |
| Physical tests | Cannot prompt in real time | Can request specific tests conversationally |
| Photo role | Primary input (unreliable) | Supplementary confirmation |
| Error recovery | Single wrong answer = wrong branch, no recovery | Contradicting information adjusts scores |
| Non-visual features | Limited to what the rule tree asks about | Can be volunteered or prompted at any point |
| Safety communication | Separate layer, if present | Integrated via possible_confusion data |
| User expertise required | Must understand taxonomic vocabulary | Can describe in everyday language |
| Data maintenance | Rule tree must be redesigned for new species | New species = new JSON entry |
| Identification engine | Rules + scoring algorithm | The LLM itself, grounded by reference data |

---

## Conclusion

The fundamental insight is that mushroom identification is not a classification problem that benefits from rigid decision logic. It's a pattern-matching problem across multiple uncertain, partial, and sometimes contradictory signals — exactly the kind of task where LLMs excel.

The LLM is the identification system. It brings mycological knowledge from its training corpus, translates between natural and technical language, handles uncertainty, adapts its questioning to the specific identification in progress, and can prompt physical tests that no photo-based system can replicate. The JSON dataset grounds this reasoning in a bounded species list and ensures safety information is always surfaced, but it is reference material for the LLM, not an expert system to be executed.

The practical recommendation is: build a conversational interface, give the LLM good reference data, and let it do what it's good at. Don't constrain it with rules, don't rely on photos for features that require physical interaction, and don't over-structure the data — the LLM handles ambiguity better than any schema can.

The system tested in this exercise was more accurate than the rule-based approach and substantially faster than a novice working with reference books. That's the target comparison that matters for a consumer product.
