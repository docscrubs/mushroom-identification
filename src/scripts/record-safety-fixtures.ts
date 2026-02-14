/**
 * Record safety test fixtures via the two-stage identification pipeline.
 *
 * Usage: npx tsx src/scripts/record-safety-fixtures.ts
 *
 * Requires ZAI_API_KEY environment variable.
 * Runs the full two-stage pipeline (Stage 1 → species lookup → Stage 2) and
 * saves the Stage 2 LLMResponse JSON fixture to src/test-fixtures/safety/.
 * Each fixture should be manually reviewed for safety before committing.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAFETY_SCENARIOS } from '../test-fixtures/safety/scenarios.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../test-fixtures/safety');
const ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions';
const TEXT_MODEL = 'glm-4.7-flash';

interface APIResponse {
  id: string;
  choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

async function callAPI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options?: { response_format?: { type: string }; temperature?: number; max_tokens?: number },
): Promise<APIResponse> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      max_tokens: options?.max_tokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      ...(options?.response_format ? { response_format: options.response_format } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<APIResponse>;
}

async function recordFixture(
  scenario: (typeof SAFETY_SCENARIOS)[number],
  stage1Prompt: string,
  stage2PromptBuilder: (species: import('../types/species.js').DatasetSpecies[]) => string,
  stage2UserBuilder: (stage1: import('../types/pipeline.js').Stage1Output, userText: string) => string,
  lookupFn: (names: string[], dataset: import('../types/species.js').DatasetSpecies[]) => import('../types/species.js').DatasetSpecies[],
  parseStage1: (raw: string) => import('../types/pipeline.js').Stage1Output,
  dataset: import('../types/species.js').DatasetSpecies[],
  apiKey: string,
) {
  console.log(`\nRecording: ${scenario.name}`);

  // --- Stage 1: Candidate Generation ---
  console.log('  Stage 1: Generating candidates...');
  const stage1Response = await callAPI(
    [
      { role: 'system', content: stage1Prompt },
      { role: 'user', content: scenario.userInput },
    ],
    apiKey,
    { response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 1024 },
  );

  const stage1Raw = stage1Response.choices[0]?.message?.content ?? '';
  console.log(`  Stage 1 output: ${stage1Raw.slice(0, 120)}...`);

  const stage1Output = parseStage1(stage1Raw);
  console.log(`  Candidates: ${stage1Output.candidates.map((c) => c.name).join(', ')}`);

  // --- Species Lookup ---
  console.log('  Looking up species...');
  const candidateNames = stage1Output.candidates.map((c) => c.name);
  const scientificNames = stage1Output.candidates.map((c) => c.scientific_name);
  const allNames = [...candidateNames, ...scientificNames];
  const lookedUpSpecies = lookupFn(allNames, dataset);
  console.log(`  Looked up ${lookedUpSpecies.length} species entries`);

  // --- Stage 2: Verification ---
  console.log('  Stage 2: Verifying...');
  const stage2SystemPrompt = stage2PromptBuilder(lookedUpSpecies);
  const stage2UserMessage = stage2UserBuilder(stage1Output, scenario.userInput);

  const stage2Response = await callAPI(
    [
      { role: 'system', content: stage2SystemPrompt },
      { role: 'user', content: stage2UserMessage },
    ],
    apiKey,
    { temperature: 0.2, max_tokens: 2048 },
  );

  const stage2Content = stage2Response.choices[0]?.message?.content ?? '';
  console.log(`  Stage 2 (first 120 chars): ${stage2Content.slice(0, 120)}...`);

  // Return the Stage 2 response as the fixture (this is what the user sees)
  return stage2Response;
}

async function main() {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.error('Error: ZAI_API_KEY environment variable is required.');
    console.error('Usage: ZAI_API_KEY=your-key npx tsx src/scripts/record-safety-fixtures.ts');
    process.exit(1);
  }

  // Dynamic imports
  const { buildStage1Prompt } = await import('../llm/prompts/stage1-candidates.js');
  const { buildStage2Prompt, buildStage2UserMessage } = await import('../llm/prompts/stage2-verification.js');
  const { lookupCandidateSpecies } = await import('../data/species-lookup.js');
  const { parseStage1Output } = await import('../llm/pipeline.js');
  const { speciesDataset } = await import('../data/species-dataset.js');

  const stage1Prompt = buildStage1Prompt();

  mkdirSync(FIXTURES_DIR, { recursive: true });

  for (const scenario of SAFETY_SCENARIOS) {
    try {
      const response = await recordFixture(
        scenario,
        stage1Prompt,
        buildStage2Prompt,
        buildStage2UserMessage,
        lookupCandidateSpecies,
        parseStage1Output,
        speciesDataset,
        apiKey,
      );
      const filePath = resolve(FIXTURES_DIR, `${scenario.id}.json`);
      writeFileSync(filePath, JSON.stringify(response, null, 2) + '\n');
      console.log(`  Saved: ${filePath}`);

      // Brief delay to avoid rate limiting (2 API calls per scenario)
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  FAILED: ${scenario.name}`, err);
    }
  }

  console.log('\nDone! Review each fixture manually before committing.');
  console.log('Note: Woolly Milkcap multi-turn fixtures must be recorded separately.');
}

main();
