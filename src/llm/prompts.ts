import type { Observation, IdentificationResult, LLMMessage, LLMContentPart } from '@/types';
import type { GuidanceContext } from '@/learning/adaptive-guidance';
import { seedGenera } from '@/data/seed-genera';

/**
 * Build the system prompt for feature extraction calls.
 * This is the largest and most stable prompt component.
 */
export function buildSystemPrompt(): string {
  return `You are an expert mycological assistant integrated into a mushroom identification app focused on UK foraging. You assist with feature extraction from photos and text descriptions, and provide your own identification opinion for calibration purposes.

CRITICAL SAFETY RULE: You NEVER make safety decisions. All safety assessments, toxicity warnings, lookalike flags, and edibility advice are handled by the app's deterministic rule engine. Your role is:
1. Extract observable features from photos and descriptions into structured fields
2. Provide your own identification opinion (for calibration only, NEVER shown as safety advice)
3. Note anything you cannot determine or are uncertain about

OUTPUT FORMAT: Always respond with valid JSON matching this exact schema:
{
  "extracted_observations": {
    // Only include fields you can actually determine. Omit fields you cannot assess.
    "cap_color": "string — colour of the cap",
    "cap_size_cm": "number — approximate diameter in cm",
    "cap_shape": "string — one of: convex, flat, funnel, conical, round",
    "cap_texture": "string — e.g. smooth, scaly, viscid, fibrous",
    "gill_type": "string — one of: gills, pores, teeth, smooth, ridges",
    "gill_color": "string",
    "gill_attachment": "string — e.g. free, adnate, decurrent",
    "stem_present": "boolean",
    "stem_color": "string",
    "ring_present": "boolean",
    "volva_present": "boolean",
    "spore_print_color": "string — only if visible",
    "flesh_color": "string",
    "flesh_texture": "string — one of: brittle, fibrous, soft, tough",
    "bruising_color": "string — colour change when damaged",
    "smell": "string — only if user describes it",
    "habitat": "string — one of: woodland, grassland, parkland, hedgerow, garden",
    "substrate": "string — one of: soil, wood, dung, leaf litter",
    "nearby_trees": ["array of tree species if identifiable"],
    "growth_pattern": "string — one of: solitary, scattered, clustered, ring, tiered",
    "description_notes": "string — Include the user's original text VERBATIM, plus diagnostic details from photos that don't fit structured fields: gill spacing (distant, crowded), cap maturation (depressed, dipped centre, inrolled margin), colour patterns (concentric bands, zoning), stem patterns (striped, scaly, reticulated, snakeskin), growth form, field test observations (milk colour, staining, taste), and any other details."
  },
  "field_confidence": {
    "field_name": "high | medium | low"
  },
  "direct_identification": {
    "species_guess": "string or null",
    "genus_guess": "string or null",
    "confidence": "high | medium | low",
    "reasoning": "Brief explanation of your identification reasoning"
  },
  "extraction_notes": ["Array of notes about what was hard to determine, photo quality issues, etc."]
}

RULES:
- Only extract what you can actually observe or what the user explicitly describes
- Mark field_confidence as "low" for anything uncertain
- NEVER infer safety-relevant features (volva_present, ring_present) unless clearly visible — false negatives here are dangerous
- If a photo is blurry, dark, or insufficient, say so in extraction_notes
- Your direct_identification is for calibration only — be honest about uncertainty
- Use UK-standard terminology and species names

UK GENERA CONTEXT (20 priority genera for UK foraging):
${seedGenera.map((g) => `- ${g.genus} (${g.common_names.join(', ')}): ${g.identification_narrative ?? g.notes}`).join('\n\n')}`;
}

/**
 * Build messages for a feature extraction LLM call.
 */
export function buildExtractionMessages(
  photoDataUrls: string[],
  textDescription: string | null,
  existingObservation: Observation,
): LLMMessage[] {
  const messages: LLMMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
  ];

  // Build user message with photos and/or text
  const contentParts: LLMContentPart[] = [];

  // Add photos
  for (const dataUrl of photoDataUrls) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: dataUrl },
    });
  }

  // Build text instruction
  const textParts: string[] = [];

  if (textDescription) {
    textParts.push(`User description: "${textDescription}"`);
    textParts.push(
      'IMPORTANT: Include the user\'s original text VERBATIM in the description_notes field, along with any additional diagnostic details you extract from photos.',
    );
  }

  // Include existing observation fields so the LLM knows what's already filled
  const filledFields = Object.entries(existingObservation).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );
  if (filledFields.length > 0) {
    textParts.push(
      'The user has already filled these observation fields (DO NOT overwrite them):',
    );
    for (const [key, value] of filledFields) {
      textParts.push(`  ${key}: ${JSON.stringify(value)}`);
    }
  }

  if (photoDataUrls.length > 0) {
    textParts.push(
      `\nPlease examine the ${photoDataUrls.length === 1 ? 'photo' : `${photoDataUrls.length} photos`} and extract all observable mushroom features into the structured JSON format. Note which photo each observation comes from if relevant.`,
    );
  } else if (textDescription) {
    textParts.push(
      '\nPlease extract all mushroom features from the description into the structured JSON format.',
    );
  } else {
    textParts.push(
      '\nPlease provide your identification opinion based on the existing observations.',
    );
  }

  if (textParts.length > 0) {
    contentParts.push({ type: 'text', text: textParts.join('\n') });
  }

  messages.push({ role: 'user', content: contentParts });

  return messages;
}

/**
 * Build messages for a natural language explanation LLM call.
 */
export function buildExplanationMessages(
  result: IdentificationResult,
  observation: Observation,
  guidance?: GuidanceContext,
): LLMMessage[] {
  const guidanceHint = guidance?.promptHint
    ? `\n\n${guidance.promptHint}`
    : '';

  const systemPrompt = `You are explaining a mushroom identification result to a UK forager. The app's rule engine has produced the following identification. Generate a clear, helpful natural language explanation.

CRITICAL: NEVER contradict the rule engine's safety assessment. The rule engine's safety warnings and toxicity classifications are authoritative. Your job is to explain them clearly, not to second-guess them.${guidanceHint}

Respond with valid JSON:
{
  "summary": "One clear sentence summarising the identification",
  "detailed_explanation": "2-3 paragraphs explaining the evidence, what supports the identification, and what could change it",
  "safety_emphasis": "Paragraph emphasising any safety concerns, or reassurance if the identification is confident and safe",
  "suggested_questions": ["Array of 2-3 follow-up questions the user might ask"]
}`;

  const observedFields = Object.entries(observation)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join('\n');

  const userContent = `Rule engine identification result:

Candidates:
${result.candidates
  .filter((c) => c.score > 0)
  .map(
    (c) =>
      `- ${c.genus}: ${c.confidence} confidence (score ${c.score.toFixed(2)})` +
      (c.matching_evidence.length > 0
        ? `\n  Supporting: ${c.matching_evidence.map((e) => e.summary).join(', ')}`
        : ''),
  )
  .join('\n')}

Reasoning chain:
${result.reasoning_chain.join('\n')}

Safety assessment:
- Toxicity: ${result.safety.toxicity}
- Warnings: ${result.safety.warnings.map((w) => w.message).join('; ') || 'None'}
- Dangerous lookalikes: ${result.safety.dangerous_lookalikes.map((l) => `${l.genus} (${l.species})`).join(', ') || 'None'}
- Confidence sufficient for foraging: ${result.safety.confidence_sufficient_for_foraging}

User observations:
${observedFields || '  (none provided)'}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
}
