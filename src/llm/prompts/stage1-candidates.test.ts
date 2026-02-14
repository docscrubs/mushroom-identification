import { buildStage1Prompt } from './stage1-candidates';
import { estimateTokens } from '@/data/species-pruning';

describe('buildStage1Prompt', () => {
  let prompt: string;

  beforeAll(() => {
    prompt = buildStage1Prompt();
  });

  it('returns a non-empty string', () => {
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('contains a role definition', () => {
    expect(prompt).toMatch(/mushroom identification/i);
  });

  it('mandates including dangerous species as candidates', () => {
    // The prompt must instruct the LLM to always consider dangerous lookalikes
    expect(prompt).toMatch(/dangerous/i);
    expect(prompt).toMatch(/deadly/i);
  });

  it('mentions critical danger species by name', () => {
    expect(prompt).toContain('Death Cap');
    expect(prompt).toContain('Destroying Angel');
    expect(prompt).toContain('Funeral Bell');
    expect(prompt).toContain('Deadly Webcap');
  });

  it('does NOT contain species JSON dataset', () => {
    // Stage 1 should NOT inject any species data — it uses LLM knowledge only
    // Check for dataset-specific field names that would only appear if species JSON was injected
    expect(prompt).not.toContain('"under_cap_description"');
    expect(prompt).not.toContain('"edibility_detail"');
    expect(prompt).not.toContain('"spore_print"');
    // Check that specific dataset species entries are not embedded
    expect(prompt).not.toContain('Agaricus campestris');
    expect(prompt).not.toContain('Lactarius torminosus');
    expect(prompt).not.toContain('Boletus edulis');
  });

  it('specifies the JSON output format with candidates array', () => {
    expect(prompt).toContain('candidates');
    expect(prompt).toContain('name');
    expect(prompt).toContain('scientific_name');
    expect(prompt).toContain('confidence');
    expect(prompt).toContain('key_reasons');
  });

  it('specifies reasoning and follow-up fields in output format', () => {
    expect(prompt).toContain('reasoning');
    expect(prompt).toContain('needs_more_info');
    expect(prompt).toContain('follow_up_question');
  });

  it('instructs to output valid JSON', () => {
    expect(prompt).toMatch(/json/i);
  });

  it('instructs to include 3-8 candidates', () => {
    // Should mention a range for candidate count
    expect(prompt).toMatch(/3.*8|three.*eight/i);
  });

  it('instructs to include dangerous species even at low confidence', () => {
    expect(prompt).toMatch(/low confidence/i);
  });

  it('is under 4K tokens', () => {
    const tokens = estimateTokens(prompt);
    expect(tokens).toBeLessThan(4_000);
  });

  it('is substantial enough to guide the LLM (at least 500 tokens)', () => {
    const tokens = estimateTokens(prompt);
    expect(tokens).toBeGreaterThan(500);
  });

  it('includes UK focus', () => {
    expect(prompt).toMatch(/UK/);
  });

  it('instructs about photo handling', () => {
    expect(prompt).toMatch(/photo/i);
  });
});
