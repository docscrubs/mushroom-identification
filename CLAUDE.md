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
- **Hybrid expert system**: deterministic rule engine + LLM (LLM never makes safety decisions)
- **Offline-first**: full identification works without network
- **Knowledge base**: YAML source files → JSON at build time → IndexedDB at runtime
- Core types in `src/types/`, database in `src/db/`, rule engine in `src/engine/`

## Key Principles
- LLM NEVER makes safety decisions — all safety logic is deterministic
- Every observation field is optional — system works with whatever the user provides
- Safety warnings are attached to identifications, never block them
- Confidence is weighted and non-additive, not a simple sum
