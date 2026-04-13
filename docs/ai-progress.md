# Progress

## Role of this file

This file is a historical progress log.
Do not use it as the primary planning source.

Use the docs in this order instead:
1. `master_roadmap_dungeons_and_daggers.md`
2. `docs/runtime-authority-roadmap.md`
3. `docs/ai-next-steps.md`
4. `docs/ai-progress.md`

## 2026-04-13 - Phase 3.4: Authored Check Flow Hardened

### Done - authored runtime checks now stay app-authoritative end-to-end

- Runtime check follow-ups no longer re-enter the visible choice resolution path.
- Authored onFail narration is carried in app metadata, not in the mechanical pending-check payload.
- Extracted the check-result runtime transition logic into a pure helper so success and failure can be tested directly.
- Added regression coverage for:
  - pending check metadata vs. authored failure narration
  - authored runtime check success mutating engine state
  - authored runtime check failure mutating engine state and retry history
- Test suite green and build green after the hardening pass.

## 2026-04-13 - Phase 4.1: Proxy Prompt Building Moved Server-Side

### Done - backend proxy now owns final prompt assembly

- Proxy-backed chat no longer sends a frontend-built `system` prompt to `/api/chat/send`.
- Frontend now sends raw `user`/`assistant` history plus `promptContext` on the proxy path.
- Backend builds the final `system` prompt itself before calling OpenRouter.
- Client-supplied `system` messages are stripped when `promptContext` is present, so proxy prompt truth comes from server assembly, not browser payload.
- Legacy proxy payloads without `promptContext` remain accepted as a compatibility fallback.
- Added regression coverage for:
  - proxy transport sending raw history plus prompt context
  - backend prompt assembly stripping spoofed client `system` messages
- Full test suite green (`178/178`) and build green after the Phase-4 slice.


## 2026-04-01 — Phase 3: Adventure Runtime Hardening (6 Deltas)

### Done — Engine-Truth over AI-Truth, 70 tests passing, build green

#### Delta 1: NPC/Object State Promotion to gmState
- Terminal states (dead, fled, destroyed, open) promoted from `inferred` to `gmState`
- Persist across scene transitions — dead NPCs stay dead
- `adventureContext.js`: shows absent NPCs with state, annotates objects with authoritative state
- `buildInferredHints` skips entries already in gmState (no duplication)

#### Delta 2: NPC Discovery Hardening
- `extractDiscoveredNpcs`: only assistant messages count (AI must introduce NPC)
- Player mentioning an NPC name alone no longer auto-discovers them

#### Delta 3: Structured Transition → Exits Only
- Structured adventures: heuristic section scoring disabled for transitions
- Only exit-based transitions allowed — no false transitions from keyword matching
- Prose adventures: unchanged (heuristic still active)

#### Delta 4: Clue Discovery Hardening
- Structured adventures: cross-reference with `section.clues[]` array
- Only AI responses scanned (player questions don't count as discovery)
- Prose adventures: keyword heuristic preserved as fallback, but assistant-only

#### Delta 5: Prompt Leakage Reduction
- Hidden NPCs: max 2 sent to AI (was: all), relabeled "MÖGLICHE BEGEGNUNG"
- Clues: only undiscovered sent, max 2, strengthened instruction
- New "Bestätigter Weltzustand" block: engine-confirmed entities explicitly listed
- `promptBuilder.js`: authoritative NPC/object states shown before inferred hints

#### Delta 6: Tests & Cleanup
- Updated Phase 2.5 truth-firewall tests to validate Phase 3 promotion behavior
- Added 7 new tests: state persistence, non-terminal exclusion, player-only NPC mention, exits-only transition, clue cross-reference, clue player-ask rejection

---

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


