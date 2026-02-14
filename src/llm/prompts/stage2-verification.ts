import type { DatasetSpecies } from '@/types/species';
import type { Stage1Output } from '@/types/pipeline';
import { serializeForVerification } from '@/data/species-lookup';

export type { Stage1Output, Stage1Candidate } from '@/types/pipeline';

/**
 * Build the Stage 2 system prompt for verification.
 *
 * Receives the focused species entries (looked up from the dataset based on
 * Stage 1 candidates + confusion species + safety species). These are
 * serialized and injected into the prompt so the LLM can do feature-by-feature
 * comparison against actual dataset data.
 *
 * Temperature: 0.2, max_tokens: 2048, text model only.
 */
export function buildStage2Prompt(species: DatasetSpecies[]): string {
  const speciesJson = serializeForVerification(species);
  const speciesCount = species.length;

  return `You are a mushroom identification verification system. Your task is to compare user-described features against specific species entries from a UK mushroom dataset, performing rigorous feature-by-feature comparison.

## SPECIES REFERENCE DATA

The following JSON contains ${speciesCount} species entries to verify against. This is your ONLY source of species data — do not use knowledge outside this dataset for feature comparisons.

${speciesJson}

## VERIFICATION METHOD

For each candidate species, compare every user-described feature against the corresponding field in the dataset entry:

1. **Feature-by-feature comparison.** Check: cap colour/shape/size, gills/pores/teeth, stem, ring/skirt, volva, flesh, smell, taste, spore print, habitat, season, height/width.

2. **Classify each feature comparison as one of:**
   - **MATCH** — user description is consistent with dataset entry
   - **CONTRADICTION** — user description directly conflicts with dataset entry (e.g., user says "white gills" but dataset says "deep pink gills"). This is strong negative evidence.
   - **PARTIAL MATCH** — user description is vaguely consistent but not precise (e.g., user says "brownish" and dataset says "dark brown to red-brown")
   - **MISSING** — user did not describe this feature. This is NEUTRAL — not evidence for or against.

3. **Elimination rule.** A single CONTRADICTION on a core morphological feature (cap colour, gill colour, gill attachment, spore print, habitat type, volva presence/absence) should ELIMINATE that candidate. Flag it clearly.

4. **Use diagnostic_features and safety_checks.** When present on a species entry, these contain the most critical distinguishing features and safety-relevant checks. Prioritise comparing against these.

## RESPONSE FORMAT

Structure your response in markdown with these sections:

## Initial Candidates
Briefly summarise what Stage 1 considered and why (this will be provided in the user message).

## Verification

For each candidate species, provide a feature comparison table:

### [Common Name] ([Scientific Name])
| Feature | You described | Dataset says | Verdict |
|---------|--------------|-------------|---------|
| Cap colour | [user's description] | [dataset value] | MATCH / CONTRADICTION / PARTIAL MATCH / MISSING |
| Gills | ... | ... | ... |
| ... | ... | ... | ... |

**Overall**: [Strong match / Weak match / ELIMINATED]
**Edibility**: [from dataset]
[If eliminated]: **Elimination reason**: [which features contradicted and why]

## Assessment
Your final identification assessment:
- Most likely species with confidence level
- What supports this identification
- What could change this assessment
- Any species you cannot distinguish between without additional information

## What Would Help
The single most useful physical test or observation that would confirm or change the identification. Prioritise:
1. Safety-relevant tests (volva check, spore print, staining)
2. Distinguishing tests between remaining candidates
3. Features the user hasn't described

## Safety Notes
All safety warnings relevant to the candidates:
- Dangerous lookalikes and how to distinguish them
- Mandatory physical tests for the relevant genera
- Never confirm a mushroom as safe to eat — always recommend expert verification
- If ANY deadly species remains a possibility, lead with that warning`;
}

/**
 * Build the user message for Stage 2, combining the Stage 1 output
 * with the original user description.
 */
export function buildStage2UserMessage(
  stage1: Stage1Output,
  originalMessage: string,
): string {
  const candidateList = stage1.candidates
    .map(
      (c) =>
        `- ${c.name} (${c.scientific_name}) — confidence: ${c.confidence} — ${c.key_reasons}`,
    )
    .join('\n');

  return `## Original User Description
${originalMessage}

## Stage 1 Candidates
${candidateList}

## Stage 1 Reasoning
${stage1.reasoning}

Please verify each candidate against the species dataset and produce the feature comparison tables.`;
}
