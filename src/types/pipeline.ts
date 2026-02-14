/**
 * Types for the two-stage identification pipeline.
 */

/** A single candidate from Stage 1 (candidate generation). */
export interface Stage1Candidate {
  name: string;
  scientific_name: string;
  confidence: 'high' | 'medium' | 'low';
  key_reasons: string;
}

/** The full JSON output from Stage 1. */
export interface Stage1Output {
  candidates: Stage1Candidate[];
  reasoning: string;
  needs_more_info: boolean;
  follow_up_question?: string;
}

/** Pipeline processing stages, emitted via callbacks. */
export type PipelineStage =
  | 'candidates'
  | 'lookup'
  | 'verification';

/** Callbacks for pipeline progress reporting. */
export interface PipelineCallbacks {
  /** Called when the pipeline transitions to a new stage. */
  onStageChange?: (stage: PipelineStage, detail?: string) => void;
  /** Called with each streaming chunk from Stage 2 verification. */
  onChunk?: (content: string) => void;
}

/** The result of a complete pipeline run. */
export interface PipelineResult {
  /** The combined response text (Stage 1 summary + Stage 2 verification). */
  response: string;
  /** The parsed Stage 1 output (candidates, reasoning, etc.). */
  stage1: Stage1Output;
  /** Scientific names of species looked up for Stage 2. */
  verifiedSpecies: string[];
  /** Combined token usage across both stages. */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
