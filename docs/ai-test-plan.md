# Test Plan

## Setup
- Framework: Vitest (v4), configured in vite.config.js
- Setup file: `src/__tests__/setup.js` (localStorage polyfill)
- Run: `npm test` or `npx vitest run`

## Batch 1 — Truth Firewall + Knowledge Gating (DONE)

### `src/__tests__/truth-firewall.test.js` — 7 tests
- gmState.npcStates not modified by AI narration (death, carried forward)
- gmState.objectStates not modified by AI narration (destruction)
- AI-derived changes land only in `inferred`
- knownFacts/knownFactions not extended by AI
- npcRelations disposition/suspicion not auto-updated by heuristic

### `src/__tests__/knowledge-gating.test.js` — 6 tests
- No clues/NPCs/facts revealed at start
- NPC discovered only when mentioned in messages + present in section.npcs
- Section transition does not auto-reveal NPCs

## Batch 2 — Prompt Building + Choice/Retry Engine (DONE)

### `src/__tests__/prompt-building.test.js` — 11 tests
- Authoritative state in prompt (clues, flags, dialogue, facts)
- Inferred section marked "nicht kanonisch"
- Failed interaction hints: included when recent+same section, excluded when old or different section
- No object leaks, no crash without adventure/sceneState

### `src/__tests__/choice-retry-engine.test.js` — 17 tests
- AI choice parsing: numbered list, empty, PROBE_HINWEIS, dedup
- inferCheckFromLabel: skill inference, trivial action exclusion
- Fallback choices when AI returns nothing; empty during combat
- Semantic dedup merges AI+structured for same NPC
- Retry filter: suppress (structured exact target), deprioritize (AI weak match), allow (different skill / context change / section transition / ≥5 turns)
- Free-form never suppressed

## Batch 3 — Combat Resolution + Session Persistence (DONE)

### `src/__tests__/combat-resolution.test.js` — 13 tests
- calcSkillBonus: modifier, proficiency, edge cases
- resolveSkillCheck: basic, ability key routing, raw ability checks, invalid input
- Advantage/disadvantage: two dice, correct pick
- Success/failure threshold at exact DC boundary

### `src/__tests__/session-persistence.test.js` — 9 tests
- buildSessionRecord preserves: gmState, playerKnowledge, dialogueState, memorySummary, interactionHistory, inferred
- normalizeSessionList round-trip preserves all sub-objects
- Missing adventure does not wipe sceneState
