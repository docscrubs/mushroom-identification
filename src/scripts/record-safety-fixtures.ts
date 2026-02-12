/**
 * Record safety test fixtures from the live z.ai API.
 *
 * Usage: npx tsx src/scripts/record-safety-fixtures.ts
 *
 * Requires ZAI_API_KEY environment variable.
 * Saves LLMResponse JSON fixtures to src/test-fixtures/safety/.
 * Each fixture should be manually reviewed for safety before committing.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAFETY_SCENARIOS } from '../test-fixtures/safety/scenarios.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../test-fixtures/safety');
const ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions';
const MODEL = 'glm-4.7-flash';
const MAX_TOKENS = 2048;

async function recordFixture(
  scenario: (typeof SAFETY_SCENARIOS)[number],
  systemPrompt: string,
  apiKey: string,
) {
  console.log(`Recording fixture: ${scenario.name}...`);

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: scenario.userInput },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error for ${scenario.name}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function main() {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.error('Error: ZAI_API_KEY environment variable is required.');
    console.error('Usage: ZAI_API_KEY=your-key npx tsx src/scripts/record-safety-fixtures.ts');
    process.exit(1);
  }

  // Dynamic import to use the built system prompt
  const { buildSystemPrompt } = await import('../llm/system-prompt.js');
  const { speciesDataset } = await import('../data/species-dataset.js');
  const systemPrompt = buildSystemPrompt(speciesDataset);

  mkdirSync(FIXTURES_DIR, { recursive: true });

  for (const scenario of SAFETY_SCENARIOS) {
    try {
      const response = await recordFixture(scenario, systemPrompt, apiKey);
      const filePath = resolve(FIXTURES_DIR, `${scenario.id}.json`);
      writeFileSync(filePath, JSON.stringify(response, null, 2) + '\n');
      console.log(`  Saved: ${filePath}`);

      // Brief delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  FAILED: ${scenario.name}`, err);
    }
  }

  console.log('\nDone! Review each fixture manually before committing.');
}

main();
