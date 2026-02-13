import type { LLMResponse } from '@/types/llm';
import { SAFETY_SCENARIOS } from '@/test-fixtures/safety/scenarios';

// Import all 10 safety fixtures
import fixture01 from '@/test-fixtures/safety/01-death-cap.json';
import fixture02 from '@/test-fixtures/safety/02-destroying-angel.json';
import fixture03 from '@/test-fixtures/safety/03-agaricus-amanita-confusion.json';
import fixture04 from '@/test-fixtures/safety/04-puffball-safety.json';
import fixture05 from '@/test-fixtures/safety/05-small-lepiota.json';
import fixture06 from '@/test-fixtures/safety/06-cortinarius.json';
import fixture07 from '@/test-fixtures/safety/07-galerina-vs-honey-fungus.json';
import fixture08 from '@/test-fixtures/safety/08-clitocybe-lawn.json';
import fixture09 from '@/test-fixtures/safety/09-coprinopsis-alcohol.json';
import fixture10 from '@/test-fixtures/safety/10-lactarius-milk-test.json';
import fixture11 from '@/test-fixtures/safety/11-olive-green-cap-contradiction.json';

const fixtures: Record<string, LLMResponse> = {
  '01-death-cap': fixture01 as unknown as LLMResponse,
  '02-destroying-angel': fixture02 as unknown as LLMResponse,
  '03-agaricus-amanita-confusion': fixture03 as unknown as LLMResponse,
  '04-puffball-safety': fixture04 as unknown as LLMResponse,
  '05-small-lepiota': fixture05 as unknown as LLMResponse,
  '06-cortinarius': fixture06 as unknown as LLMResponse,
  '07-galerina-vs-honey-fungus': fixture07 as unknown as LLMResponse,
  '08-clitocybe-lawn': fixture08 as unknown as LLMResponse,
  '09-coprinopsis-alcohol': fixture09 as unknown as LLMResponse,
  '10-lactarius-milk-test': fixture10 as unknown as LLMResponse,
  '11-olive-green-cap-contradiction': fixture11 as unknown as LLMResponse,
};

function getResponseContent(fixture: LLMResponse): string {
  return fixture.choices[0]?.message?.content ?? '';
}

describe('safety validation', () => {
  for (const scenario of SAFETY_SCENARIOS) {
    describe(scenario.name, () => {
      const fixture = fixtures[scenario.id];
      if (!fixture) {
        it.skip(`fixture not found for ${scenario.id}`, () => {});
        return;
      }

      const content = getResponseContent(fixture);

      it('has non-empty response content', () => {
        expect(content.length).toBeGreaterThan(0);
      });

      for (const pattern of scenario.mustContain) {
        it(`response contains pattern: ${pattern.source}`, () => {
          expect(content).toMatch(pattern);
        });
      }

      if (scenario.mustNotContain) {
        for (const pattern of scenario.mustNotContain) {
          it(`response does NOT contain pattern: ${pattern.source}`, () => {
            expect(content).not.toMatch(pattern);
          });
        }
      }
    });
  }
});
