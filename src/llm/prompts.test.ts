import { buildSystemPrompt, buildExtractionMessages, buildExplanationMessages } from './prompts';
import type { Observation, IdentificationResult } from '@/types';

describe('Prompt Templates', () => {
  describe('buildSystemPrompt', () => {
    it('contains the safety invariant', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('NEVER make safety decisions');
    });

    it('contains the output JSON schema', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('extracted_observations');
      expect(prompt).toContain('direct_identification');
      expect(prompt).toContain('field_confidence');
    });

    it('contains observation field definitions', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('cap_color');
      expect(prompt).toContain('gill_type');
      expect(prompt).toContain('habitat');
      expect(prompt).toContain('volva_present');
    });

    it('contains UK genera context', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('Amanita');
      expect(prompt).toContain('Russula');
      expect(prompt).toContain('Cantharellus');
    });

    it('contains description_notes in JSON schema', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('description_notes');
    });

    it('contains genus narratives with foraging rules of thumb', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('taste test');
      expect(prompt).toContain('concentric');
      expect(prompt).toContain('snakeskin');
    });
  });

  describe('buildExtractionMessages', () => {
    it('includes system prompt as first message', () => {
      const messages = buildExtractionMessages([], null, {});
      expect(messages[0]!.role).toBe('system');
      expect(typeof messages[0]!.content).toBe('string');
    });

    it('includes photos as image_url content parts', () => {
      const photoDataUrls = ['data:image/jpeg;base64,abc123'];
      const messages = buildExtractionMessages(photoDataUrls, null, {});
      const userMessage = messages[1]!;
      expect(Array.isArray(userMessage.content)).toBe(true);
      const parts = userMessage.content as Array<{ type: string; image_url?: { url: string } }>;
      const imagePart = parts.find((p) => p.type === 'image_url');
      expect(imagePart).toBeDefined();
      expect(imagePart!.image_url!.url).toBe('data:image/jpeg;base64,abc123');
    });

    it('includes text description in user message', () => {
      const messages = buildExtractionMessages([], 'brownish cap under oak', {});
      const userMessage = messages[1]!;
      const content = Array.isArray(userMessage.content)
        ? userMessage.content.find((p) => p.type === 'text')?.text ?? ''
        : userMessage.content;
      expect(content).toContain('brownish cap under oak');
    });

    it('includes existing observation fields', () => {
      const obs: Observation = { gill_type: 'gills', habitat: 'woodland' };
      const messages = buildExtractionMessages([], null, obs);
      const userMessage = messages[1]!;
      const content = Array.isArray(userMessage.content)
        ? userMessage.content.find((p) => p.type === 'text')?.text ?? ''
        : userMessage.content;
      expect(content).toContain('gill_type');
      expect(content).toContain('gills');
    });

    it('handles multiple photos', () => {
      const photos = [
        'data:image/jpeg;base64,photo1',
        'data:image/jpeg;base64,photo2',
        'data:image/jpeg;base64,photo3',
      ];
      const messages = buildExtractionMessages(photos, null, {});
      const userMessage = messages[1]!;
      const parts = userMessage.content as Array<{ type: string }>;
      const imageCount = parts.filter((p) => p.type === 'image_url').length;
      expect(imageCount).toBe(3);
    });

    it('instructs LLM to populate description_notes when text is provided', () => {
      const messages = buildExtractionMessages([], 'distant gills, dipped centre', {});
      const userMessage = messages[1]!;
      const content = Array.isArray(userMessage.content)
        ? userMessage.content.find((p) => p.type === 'text')?.text ?? ''
        : userMessage.content;
      expect(content).toContain('description_notes');
    });

    it('works with no photos and no description', () => {
      const obs: Observation = { cap_color: 'brown' };
      const messages = buildExtractionMessages([], null, obs);
      expect(messages.length).toBe(2);
    });
  });

  describe('buildExplanationMessages', () => {
    const mockResult: IdentificationResult = {
      candidates: [
        {
          genus: 'Russula',
          common_name: 'Russula',
          confidence: 'high',
          score: 0.85,
          matching_evidence: [],
          contradicting_evidence: [],
          missing_evidence: [],
        },
      ],
      reasoning_chain: ['Observed: brittle flesh.', 'Top candidate: Russula.'],
      safety: {
        toxicity: 'edible',
        warnings: [],
        dangerous_lookalikes: [],
        confidence_sufficient_for_foraging: true,
      },
      suggested_actions: [],
      follow_up_questions: [],
      ambiguities: [],
      triggered_heuristics: [],
    };

    it('includes rule engine result in the prompt', () => {
      const messages = buildExplanationMessages(mockResult, { flesh_texture: 'brittle' });
      const userContent = messages[1]!.content as string;
      expect(userContent).toContain('Russula');
      expect(userContent).toContain('high');
    });

    it('includes observation context', () => {
      const messages = buildExplanationMessages(mockResult, { flesh_texture: 'brittle' });
      const userContent = messages[1]!.content as string;
      expect(userContent).toContain('brittle');
    });

    it('system message instructs not to contradict rule engine', () => {
      const messages = buildExplanationMessages(mockResult, {});
      const systemContent = messages[0]!.content as string;
      expect(systemContent).toContain('NEVER contradict');
    });
  });
});
