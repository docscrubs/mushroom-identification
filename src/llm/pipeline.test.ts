import { vi, type Mock } from 'vitest';
import type { LLMResponse } from '@/types/llm';
import type { PipelineStage, Stage1Output } from '@/types/pipeline';

// Mock at the network boundary
vi.mock('./api-client', () => ({
  callLLM: vi.fn(),
  callLLMStream: vi.fn(),
}));

import { callLLM, callLLMStream } from './api-client';
import { runIdentificationPipeline, parseStage1Output } from './pipeline';
import { speciesDataset } from '@/data/species-dataset';

const mockCallLLM = callLLM as Mock;
const mockCallLLMStream = callLLMStream as Mock;

function makeLLMResponse(content: string, usage?: Partial<LLMResponse['usage']>): LLMResponse {
  return {
    id: 'resp-1',
    choices: [{ message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: {
      prompt_tokens: usage?.prompt_tokens ?? 500,
      completion_tokens: usage?.completion_tokens ?? 200,
      total_tokens: usage?.total_tokens ?? 700,
    },
  };
}

const validStage1Json: Stage1Output = {
  candidates: [
    {
      name: 'Field Mushroom',
      scientific_name: 'Agaricus campestris',
      confidence: 'high',
      key_reasons: 'White cap, pink gills, grassland habitat',
    },
    {
      name: 'Death Cap',
      scientific_name: 'Amanita phalloides',
      confidence: 'low',
      key_reasons: 'Safety inclusion — white-gilled mushroom',
    },
    {
      name: 'Yellow Stainer',
      scientific_name: 'Agaricus xanthodermus',
      confidence: 'medium',
      key_reasons: 'Common Agaricus lookalike',
    },
  ],
  reasoning: 'White cap in grassland strongly suggests Agaricus campestris',
  needs_more_info: true,
  follow_up_question: 'Can you dig around the stem base and check for a volva?',
};

describe('parseStage1Output', () => {
  it('parses valid Stage 1 JSON', () => {
    const result = parseStage1Output(JSON.stringify(validStage1Json));
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0]!.name).toBe('Field Mushroom');
    expect(result.reasoning).toContain('Agaricus campestris');
  });

  it('extracts species names via regex when JSON is malformed', () => {
    const malformedText = `
      I think this could be a Field Mushroom (Agaricus campestris) or possibly
      a Death Cap (Amanita phalloides). It might also be a Yellow Stainer.
    `;
    const result = parseStage1Output(malformedText);
    expect(result.candidates.length).toBeGreaterThan(0);
    const names = result.candidates.map((c) => c.name);
    // Should extract at least the scientific names found via regex
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('sets needs_more_info to true on fallback parse', () => {
    const result = parseStage1Output('some random text about mushrooms');
    expect(result.needs_more_info).toBe(true);
  });

  it('handles JSON with extra text before/after it', () => {
    const wrappedJson = `Here is my analysis:\n${JSON.stringify(validStage1Json)}\nEnd.`;
    const result = parseStage1Output(wrappedJson);
    expect(result.candidates).toHaveLength(3);
  });
});

describe('runIdentificationPipeline', () => {
  beforeEach(() => {
    mockCallLLM.mockReset();
    mockCallLLMStream.mockReset();
  });

  it('calls Stage 1 without species data in the system prompt', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
        onChunk('## Verification\nDone');
        return makeLLMResponse('## Verification\nDone');
      },
    );

    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'White mushroom in a field' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    // Stage 1 call (callLLM, not streaming)
    expect(mockCallLLM).toHaveBeenCalledTimes(1);
    const stage1Request = mockCallLLM.mock.calls[0]![0];
    const systemPrompt = stage1Request.messages[0].content;
    // Should NOT contain species dataset
    expect(systemPrompt).not.toContain('Agaricus campestris');
    expect(systemPrompt).not.toContain('Lactarius torminosus');
    // Should contain Stage 1 candidate generation instructions
    expect(systemPrompt).toContain('candidate');
  });

  it('uses response_format json_object for Stage 1', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
        onChunk('Done');
        return makeLLMResponse('Done');
      },
    );

    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Brown cap mushroom' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    const stage1Request = mockCallLLM.mock.calls[0]![0];
    expect(stage1Request.response_format).toEqual({ type: 'json_object' });
  });

  it('calls Stage 2 with focused species data (not full dataset)', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
        onChunk('Verification response');
        return makeLLMResponse('Verification response');
      },
    );

    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'White cap, pink gills' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    // Stage 2 uses callLLMStream
    expect(mockCallLLMStream).toHaveBeenCalledTimes(1);
    const stage2Request = mockCallLLMStream.mock.calls[0]![0];
    const systemPrompt = stage2Request.messages[0].content;
    // Should contain the candidates' species data
    expect(systemPrompt).toContain('Agaricus campestris');
    // Should NOT contain unrelated species
    expect(systemPrompt).not.toContain('Lactarius torminosus');
  });

  it('emits callbacks in correct order: candidates → lookup → verification', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
        onChunk('Done');
        return makeLLMResponse('Done');
      },
    );

    const stages: PipelineStage[] = [];
    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
      callbacks: {
        onStageChange: (stage) => stages.push(stage),
      },
    });

    expect(stages).toEqual(['candidates', 'lookup', 'verification']);
  });

  it('passes onChunk to Stage 2 streaming', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, onChunk: (c: string) => void) => {
        onChunk('chunk1');
        onChunk('chunk2');
        return makeLLMResponse('chunk1chunk2');
      },
    );

    const chunks: string[] = [];
    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
      callbacks: {
        onChunk: (c) => chunks.push(c),
      },
    });

    expect(chunks).toEqual(['chunk1', 'chunk2']);
  });

  it('returns combined usage from both stages', async () => {
    mockCallLLM.mockResolvedValue(
      makeLLMResponse(JSON.stringify(validStage1Json), {
        prompt_tokens: 1000,
        completion_tokens: 300,
        total_tokens: 1300,
      }),
    );
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Done', {
          prompt_tokens: 2000,
          completion_tokens: 500,
          total_tokens: 2500,
        });
      },
    );

    const result = await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    expect(result.usage.prompt_tokens).toBe(3000);
    expect(result.usage.completion_tokens).toBe(800);
    expect(result.usage.total_tokens).toBe(3800);
  });

  it('uses vision model for Stage 1 when photos are present', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Done');
      },
    );

    await runIdentificationPipeline({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
          ],
        },
      ],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    const stage1Request = mockCallLLM.mock.calls[0]![0];
    expect(stage1Request.model).toBe('glm-4.6v-flash');
  });

  it('uses text model for Stage 1 when no photos', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Done');
      },
    );

    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Brown cap mushroom in woodland' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    const stage1Request = mockCallLLM.mock.calls[0]![0];
    expect(stage1Request.model).toBe('glm-4.7-flash');
  });

  it('always uses text model for Stage 2', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Done');
      },
    );

    await runIdentificationPipeline({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is this?' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
          ],
        },
      ],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    const stage2Request = mockCallLLMStream.mock.calls[0]![0];
    expect(stage2Request.model).toBe('glm-4.7-flash');
  });

  it('returns stage1 output and verified species in result', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Verification complete');
      },
    );

    const result = await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    expect(result.stage1.candidates).toHaveLength(3);
    expect(result.verifiedSpecies.length).toBeGreaterThan(0);
    // Should include the direct candidates plus confusion/safety species
    expect(result.verifiedSpecies).toContain('Agaricus campestris');
    expect(result.verifiedSpecies).toContain('Amanita phalloides');
  });

  it('handles Stage 1 JSON parse failure gracefully via regex fallback', async () => {
    const malformedResponse = 'I think this is a Field Mushroom (Agaricus campestris) or a Death Cap (Amanita phalloides).';
    mockCallLLM.mockResolvedValue(makeLLMResponse(malformedResponse));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Verification after fallback');
      },
    );

    const result = await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    // Should still produce a result via regex fallback
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.verifiedSpecies.length).toBeGreaterThan(0);
  });

  it('uses Stage 1 temperature 0.3 and Stage 2 temperature 0.2', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Done');
      },
    );

    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    expect(mockCallLLM.mock.calls[0]![0].temperature).toBe(0.3);
    expect(mockCallLLMStream.mock.calls[0]![0].temperature).toBe(0.2);
  });

  it('uses max_tokens 1024 for Stage 1 and 2048 for Stage 2', async () => {
    mockCallLLM.mockResolvedValue(makeLLMResponse(JSON.stringify(validStage1Json)));
    mockCallLLMStream.mockImplementation(
      async (_req: unknown, _key: unknown, _onChunk: unknown) => {
        return makeLLMResponse('Done');
      },
    );

    await runIdentificationPipeline({
      messages: [{ role: 'user', content: 'Test' }],
      apiKey: 'test-key',
      settings: { model: 'glm-4.7-flash', vision_model: 'glm-4.6v-flash', max_tokens: 2048, endpoint: 'https://api.z.ai/api/paas/v4/chat/completions' },
      dataset: speciesDataset,
    });

    expect(mockCallLLM.mock.calls[0]![0].max_tokens).toBe(1024);
    expect(mockCallLLMStream.mock.calls[0]![0].max_tokens).toBe(2048);
  });
});
