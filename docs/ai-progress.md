# Progress

## 2026-04-01 — Refactor: Module Split (Paket 1-3)

### Done — Structure refactor for Phase 3 readiness
All 63 tests passing, build green. No behavior changes.

#### Paket 1: `src/data/srd.js` (1859 → 105 lines, re-export facade)
New modules:
- `src/data/characterRules.js` — attributes, skills, classes, calc functions, inventory, XP, enemy presets
- `src/data/adventureParser.js` — text utilities, adventure parsing (prose + structured)
- `src/data/sceneState.js` — scene state creation/derivation, section finding, chunk selection
- `src/data/knowledgeModel.js` — clue/thread extraction, NPC/object state detection, disposition heuristics
- `src/data/adventureContext.js` — buildRelevantAdventureContext, structured context builder

#### Paket 2: `src/services/openrouter.js` (856 → 40 lines, re-export facade)
New modules:
- `src/services/promptBuilder.js` — system prompt construction
- `src/services/responseNormalization.js` — meta-leak stripping, decision boundary enforcement
- `src/services/tagParsers.js` — [PROBE:], [BEUTE:], [GEGNER:], [HP:], [XP:] tag extraction
- `src/services/openrouterTransport.js` — HTTP streaming, retry logic, error handling

#### Paket 3: `src/pages/GamePage.jsx` (1088 → ~900 lines)
Extracted components:
- `src/components/game/MessageBubble.jsx` — MessageBubble, CombatRoundBubble, SkillCheckBubble, TypingIndicator
- `src/components/game/SessionCard.jsx` — session overview card
- `parseEnemyTags` moved to `tagParsers.js`

---

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
