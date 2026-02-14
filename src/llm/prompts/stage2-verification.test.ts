import {
  buildStage2Prompt,
  buildStage2UserMessage,
} from './stage2-verification';
import { speciesDataset } from '@/data/species-dataset';
import { lookupCandidateSpecies } from '@/data/species-lookup';
import { estimateTokens } from '@/data/species-pruning';

describe('buildStage2Prompt', () => {
  const fieldMushroomSpecies = lookupCandidateSpecies(
    ['Field Mushroom'],
    speciesDataset,
  );

  const deathCapSpecies = lookupCandidateSpecies(
    ['Death Cap'],
    speciesDataset,
  );

  const mixedSpecies = lookupCandidateSpecies(
    ['Field Mushroom', 'Death Cap'],
    speciesDataset,
  );

  it('returns a non-empty string', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('contains focused species data for the given candidates', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toContain('Agaricus campestris');
    expect(prompt).toContain('Field Mushroom');
  });

  it('does NOT contain the full 268-species dataset', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    // Species not in the candidate set should not appear
    expect(prompt).not.toContain('Boletus edulis');
    expect(prompt).not.toContain('Lactarius torminosus');
  });

  it('includes feature-by-feature comparison instructions', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toMatch(/feature/i);
    expect(prompt).toMatch(/compare|comparison/i);
  });

  it('specifies the four verdict categories', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toContain('MATCH');
    expect(prompt).toContain('CONTRADICTION');
    expect(prompt).toContain('PARTIAL MATCH');
    expect(prompt).toContain('MISSING');
  });

  it('instructs that a single contradiction on core feature eliminates a candidate', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toMatch(/contradiction/i);
    expect(prompt).toMatch(/eliminat/i);
  });

  it('instructs markdown table output format', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toMatch(/table/i);
    expect(prompt).toContain('Feature');
    expect(prompt).toContain('Verdict');
  });

  it('includes safety rules', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toMatch(/safety/i);
    expect(prompt).toMatch(/deadly|dangerous/i);
  });

  it('includes physical test instructions', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toMatch(/physical test|spore print|volva/i);
  });

  it('includes the required response sections', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toContain('Initial Candidates');
    expect(prompt).toContain('Verification');
    expect(prompt).toContain('Assessment');
    expect(prompt).toContain('What Would Help');
    expect(prompt).toContain('Safety Notes');
  });

  it('scales with species count — more species = longer prompt', () => {
    const smallPrompt = buildStage2Prompt(deathCapSpecies);
    const largePrompt = buildStage2Prompt(mixedSpecies);
    expect(largePrompt.length).toBeGreaterThan(smallPrompt.length);
  });

  it('stays well under the full dataset token count', () => {
    const prompt = buildStage2Prompt(mixedSpecies);
    const tokens = estimateTokens(prompt);
    // Should be a fraction of the 130K+ full-dataset prompt
    expect(tokens).toBeLessThan(20_000);
  });

  it('includes species diagnostic_features when present', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toContain('diagnostic_features');
  });

  it('includes species safety_checks when present', () => {
    const prompt = buildStage2Prompt(fieldMushroomSpecies);
    expect(prompt).toContain('safety_checks');
  });
});

describe('buildStage2UserMessage', () => {
  const stage1Output = {
    candidates: [
      {
        name: 'Field Mushroom',
        scientific_name: 'Agaricus campestris',
        confidence: 'high' as const,
        key_reasons: 'White cap, pink gills, grassland habitat',
      },
      {
        name: 'Death Cap',
        scientific_name: 'Amanita phalloides',
        confidence: 'low' as const,
        key_reasons: 'Safety inclusion — white-gilled mushroom in grassland',
      },
    ],
    reasoning: 'Description matches Agaricus well, including Death Cap for safety',
    needs_more_info: true,
    follow_up_question: 'Can you dig around the stem base and check for a volva?',
  };

  const originalMessage = 'I found a white mushroom with pink gills in a field';

  it('returns a non-empty string', () => {
    const msg = buildStage2UserMessage(stage1Output, originalMessage);
    expect(msg.length).toBeGreaterThan(0);
  });

  it('includes the original user description', () => {
    const msg = buildStage2UserMessage(stage1Output, originalMessage);
    expect(msg).toContain('white mushroom with pink gills');
  });

  it('includes Stage 1 candidate names', () => {
    const msg = buildStage2UserMessage(stage1Output, originalMessage);
    expect(msg).toContain('Field Mushroom');
    expect(msg).toContain('Death Cap');
  });

  it('includes Stage 1 confidence levels', () => {
    const msg = buildStage2UserMessage(stage1Output, originalMessage);
    expect(msg).toContain('high');
    expect(msg).toContain('low');
  });

  it('includes Stage 1 reasoning', () => {
    const msg = buildStage2UserMessage(stage1Output, originalMessage);
    expect(msg).toContain(stage1Output.reasoning);
  });

  it('includes Stage 1 key_reasons for each candidate', () => {
    const msg = buildStage2UserMessage(stage1Output, originalMessage);
    expect(msg).toContain('White cap, pink gills, grassland habitat');
    expect(msg).toContain('Safety inclusion');
  });
});
