import type { LLMMessage, LLMResponse } from '@/types/llm';
import type { DatasetSpecies } from '@/types/species';
import type {
  Stage1Output,
  Stage1Candidate,
  PipelineCallbacks,
  PipelineResult,
} from '@/types/pipeline';
import { callLLM, callLLMStream } from './api-client';
import { buildStage1Prompt } from './prompts/stage1-candidates';
import {
  buildStage2Prompt,
  buildStage2UserMessage,
} from './prompts/stage2-verification';
import { lookupCandidateSpecies } from '@/data/species-lookup';

export interface PipelineOptions {
  /** The conversation messages (system prompt is built internally). */
  messages: LLMMessage[];
  /** API key for LLM calls. */
  apiKey: string;
  /** LLM settings (models, endpoint, max_tokens). */
  settings: {
    model: string;
    vision_model: string;
    max_tokens: number;
    endpoint: string;
  };
  /** The full species dataset. */
  dataset: DatasetSpecies[];
  /** Optional callbacks for progress and streaming. */
  callbacks?: PipelineCallbacks;
}

/**
 * Run the two-stage identification pipeline:
 * 1. Stage 1: Candidate generation (small prompt, no species data, JSON output)
 * 2. Species lookup: Match candidates → dataset entries + confusion/safety species
 * 3. Stage 2: Verification (focused species data, streaming, markdown output)
 */
export async function runIdentificationPipeline(
  options: PipelineOptions,
): Promise<PipelineResult> {
  const { messages, apiKey, settings, dataset, callbacks } = options;

  // --- Stage 1: Candidate Generation ---
  callbacks?.onStageChange?.('candidates');

  const hasPhotos = messagesContainPhotos(messages);
  const stage1Model = hasPhotos ? settings.vision_model : settings.model;
  const stage1SystemPrompt = buildStage1Prompt();

  const stage1Messages: LLMMessage[] = [
    { role: 'system', content: stage1SystemPrompt },
    ...messages,
  ];

  const stage1Response: LLMResponse = await callLLM(
    {
      model: stage1Model,
      messages: stage1Messages,
      max_tokens: 1024,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    },
    apiKey,
    settings.endpoint,
  );

  const stage1Raw = stage1Response.choices[0]?.message?.content ?? '';
  const stage1Output = parseStage1Output(stage1Raw);

  // --- Species Lookup ---
  callbacks?.onStageChange?.('lookup');

  const candidateNames = stage1Output.candidates.map((c) => c.name);
  const scientificNames = stage1Output.candidates.map((c) => c.scientific_name);
  const allNames = [...candidateNames, ...scientificNames];

  const lookedUpSpecies = lookupCandidateSpecies(allNames, dataset);
  const verifiedSpeciesNames = lookedUpSpecies.map((s) => s.scientific_name);

  // --- Stage 2: Verification ---
  callbacks?.onStageChange?.('verification');

  const stage2SystemPrompt = buildStage2Prompt(lookedUpSpecies);
  const originalUserText = extractUserText(messages);
  const stage2UserMessage = buildStage2UserMessage(stage1Output, originalUserText);

  const stage2Messages: LLMMessage[] = [
    { role: 'system', content: stage2SystemPrompt },
    { role: 'user', content: stage2UserMessage },
  ];

  const stage2Response: LLMResponse = await callLLMStream(
    {
      model: settings.model, // Always text model for Stage 2
      messages: stage2Messages,
      max_tokens: 2048,
      temperature: 0.2,
    },
    apiKey,
    callbacks?.onChunk ?? (() => {}),
    settings.endpoint,
  );

  const stage2Content = stage2Response.choices[0]?.message?.content ?? '';

  // --- Combine results ---
  const combinedUsage = {
    prompt_tokens:
      stage1Response.usage.prompt_tokens + stage2Response.usage.prompt_tokens,
    completion_tokens:
      stage1Response.usage.completion_tokens +
      stage2Response.usage.completion_tokens,
    total_tokens:
      stage1Response.usage.total_tokens + stage2Response.usage.total_tokens,
  };

  return {
    response: stage2Content,
    stage1: stage1Output,
    verifiedSpecies: verifiedSpeciesNames,
    usage: combinedUsage,
  };
}

/**
 * Parse the Stage 1 LLM output into a Stage1Output object.
 *
 * Tries JSON.parse first. If that fails, tries to extract a JSON object
 * from the text. If that also fails, falls back to regex extraction
 * of species names.
 */
export function parseStage1Output(raw: string): Stage1Output {
  // Try direct JSON parse
  try {
    const parsed = JSON.parse(raw);
    if (isValidStage1Output(parsed)) {
      return parsed;
    }
  } catch {
    // Not valid JSON — try extracting JSON from text
  }

  // Try extracting JSON object from surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*"candidates"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidStage1Output(parsed)) {
        return parsed;
      }
    } catch {
      // JSON extraction failed
    }
  }

  // Fallback: extract species names via regex
  return extractSpeciesFromText(raw);
}

function isValidStage1Output(obj: unknown): obj is Stage1Output {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.candidates)) return false;
  if (o.candidates.length === 0) return false;
  return o.candidates.every(
    (c: unknown) =>
      c &&
      typeof c === 'object' &&
      'name' in (c as Record<string, unknown>) &&
      'scientific_name' in (c as Record<string, unknown>),
  );
}

/**
 * Regex fallback: extract scientific names in the pattern "Name (Genus species)"
 * from free text when JSON parsing fails entirely.
 */
function extractSpeciesFromText(text: string): Stage1Output {
  const regex = /([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\s+\(([A-Z][a-z]+\s+[a-z]+)\)/g;
  const candidates: Stage1Candidate[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const commonName = match[1]!;
    const scientificName = match[2]!;
    if (!seen.has(scientificName)) {
      seen.add(scientificName);
      candidates.push({
        name: commonName,
        scientific_name: scientificName,
        confidence: 'medium',
        key_reasons: 'Extracted from Stage 1 text (JSON parse failed)',
      });
    }
  }

  return {
    candidates,
    reasoning: 'Stage 1 JSON output was malformed — extracted species names via text parsing.',
    needs_more_info: true,
    follow_up_question: undefined,
  };
}

/** Check if any message in the array contains image content. */
function messagesContainPhotos(messages: LLMMessage[]): boolean {
  return messages.some((msg) => {
    if (Array.isArray(msg.content)) {
      return msg.content.some((part) => part.type === 'image_url');
    }
    return false;
  });
}

/** Extract the text content from the last user message. */
function extractUserText(messages: LLMMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        return msg.content;
      }
      // Content parts — extract text
      const textParts = msg.content
        .filter((p) => p.type === 'text' && p.text)
        .map((p) => p.text!)
        .join('\n');
      return textParts;
    }
  }
  return '';
}
