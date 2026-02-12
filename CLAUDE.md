# Project: Adaptive Mushroom Identification & Training System

## Development Approach

### TDD (Test-Driven Development) — Mandatory
- **Write tests FIRST**, then implement to make them pass
- Red → Green → Refactor cycle for every piece of functionality
- Tests are the specification — if behaviour isn't tested, it doesn't exist
- Run tests frequently: `npm test` (vitest in watch mode) or `npx vitest run` for a single pass

### No Mocks — Prefer Real Implementations
- Use real implementations over mocks wherever possible
- For IndexedDB: use `fake-indexeddb` in tests (real IndexedDB API, in-memory)
- For the rule engine, knowledge base, and stores: test with real data, not stubs
- Only mock at true system boundaries (network requests, device APIs like camera/geolocation)
- If you find yourself reaching for a mock, ask: can I test this with real objects instead?

### Testing Stack
- **Vitest** — test runner, native Vite integration
- **@testing-library/react** — component tests (when we get to UI)
- **fake-indexeddb** — in-memory IndexedDB for Dexie tests
- Tests live next to source files: `foo.ts` → `foo.test.ts`

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- Dexie.js (IndexedDB)
- Zustand (state management)
- ts-fsrs (spaced repetition)
- vite-plugin-pwa (service worker / offline)
- react-router-dom (routing)

## Architecture
- **Dual-mode identification**:
  - **Online** (primary): LLM conversational chat at `/chat` — species-level identification grounded by 268-species dataset injected in system prompt
  - **Offline** (fallback): Deterministic rule engine at `/identify` — genus-level identification via structured observation form
- **Safety**: Enforced via system prompt constraints and data annotations, validated by comprehensive safety test suite (10 scenarios + multi-turn Woolly Milkcap test)
- **Knowledge base**: 268-species enriched JSON dataset (`wildfooduk_mushrooms_enriched.json`) + genus profiles + heuristics, all stored in IndexedDB
- **LLM provider**: z.ai GLM models (GLM-4.7-Flash text, GLM-4.6V-Flash vision)
- Core types in `src/types/`, database in `src/db/`, rule engine in `src/engine/`, LLM in `src/llm/`

## Key Principles
- Safety enforced via system prompt constraints and species data annotations
- Every observation field is optional — system works with whatever the user provides
- Safety warnings are attached to identifications, never block them
- Confidence is weighted and non-additive, not a simple sum (rule engine)
- LLM conversation history stored in IndexedDB, photos only sent in latest turn
