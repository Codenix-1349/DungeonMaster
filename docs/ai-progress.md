# Progress

## 2026-04-01 — Automated Test Suite (Batch 1 + 2 + 3)

### Done — 63 tests, all passing
- Vitest setup (vite.config.js, setup.js with localStorage polyfill)
- **Truth Firewall** (7 tests): gmState/playerKnowledge/dialogueState immutable from AI text
- **Knowledge Gating** (6 tests): no auto-reveals, NPC discovery requires mention
- **Prompt Building** (11 tests): authoritative state in prompt, inferred marked, failed hints scoped
- **Choice/Retry Engine** (17 tests): parsing, dedup, fallbacks, retry filter rules
- **Combat Resolution** (13 tests): calcSkillBonus, resolveSkillCheck, advantage/disadvantage, success/failure threshold
- **Session Persistence** (9 tests): all sceneState sub-objects survive round-trip

### Files added/changed
- `package.json` — added vitest, test scripts
- `vite.config.js` — test config with setup file
- `src/__tests__/setup.js` — localStorage polyfill
- `src/__tests__/truth-firewall.test.js`
- `src/__tests__/knowledge-gating.test.js`
- `src/__tests__/prompt-building.test.js`
- `src/__tests__/choice-retry-engine.test.js`
- `src/__tests__/combat-resolution.test.js`
- `src/__tests__/session-persistence.test.js`
