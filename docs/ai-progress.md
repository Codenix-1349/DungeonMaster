# Progress

## Role of this file

This file is a historical progress log.
Do not use it as the primary planning source.

Use the docs in this order instead:
1. `master_roadmap_dungeons_and_daggers.md`
2. `docs/runtime-authority-roadmap.md`
3. `docs/ai-next-steps.md`
4. `docs/ai-progress.md`

## 2026-04-15 - Phase 4.2 Slice 5: Authored Escalation Consequences

### Done - runtime escalation can now resolve to authored guards, flight, and scene fallback paths

- Runtime escalation policies can now declare authored consequence objects per intent instead of only relying on the built-in warning/withdrawal/combat ladder.
- Authored escalation consequences now support engine-owned flags, target NPC engagement-state changes, forced active-NPC handoff, and optional scene transitions.
- The runtime escalation layer now recognizes and preserves additional authoritative engagement states such as `calling_guards`, `fled`, and `expelled`.
- Talk choices for escalated NPCs stay suppressed when they are calling guards, have fled, or were otherwise authoritatively removed from normal dialogue flow.
- Graufurt now includes:
  - a guard-call consequence on Leno that hands authority over to Elsa
  - a flight consequence on Mira that forces a scene fallback back to the collapsed gallery
- Added regression coverage for:
  - authored guard-call escalation
  - authored flee escalation with section transition
  - talk-choice suppression after non-combat escalation outcomes
- Full test suite green (`211/211`) and build green after the slice.

## 2026-04-14 - Phase 4.2 Slice 4: Authored Intent Slots

### Done - runtime free text now resolves through authored slot data, not only visible wording

- Runtime choice resolution now evaluates authored `intent` metadata with explicit `target`, `tool`, and `topic` slots before falling back to weaker label/alias heuristics.
- Slot-aware clarification now also triggers when the player only names an authored tool or topic without enough context to execute a canonical action.
- Static runtime interactions, rebuilt visible choices, and dynamically revealed runtime interactions now all carry the same normalized intent-slot data through parser, state, and choice layers.
- Birkenhain and Graufurt now include authored slot examples for tool- and topic-driven runtime resolution.
- Added regression coverage for:
  - same-label runtime choices split by authored topic slots
  - clarification when only an authored tool slot is referenced
  - preservation of slot metadata on dynamically revealed runtime interactions
- Full test suite green (`209/209`) and build green after the slice.

## 2026-04-13 - Phase 4.2 Slice 3: Engine-Owned Runtime Escalation Ladder

### Done - escalating runtime free text now resolves through app-owned consequences

- Runtime escalation input no longer hard-blocks by default; `beleidigen`, `drohen`, and `angreifen` now resolve against visible runtime NPCs engine-side when the target is clear.
- Runtime NPC dialogue state now carries authoritative escalation fields such as `threat`, `warningsIssued`, and `engagementState` alongside seeded registry defaults for disposition and suspicion.
- Authored `npcUpdates.relationshipDelta` now lands in runtime `dialogueState`, so relationship shifts and escalation share the same authoritative state layer.
- Talk interactions targeting a withdrawn or hostile runtime NPC are hidden by the choice/context layer instead of reappearing unchanged after escalation.
- Prompt building now distinguishes app-resolved runtime outcomes from free narration so AI only narrates the already-decided warning, withdrawal, or combat start.
- Graufurt now includes an authored escalation combat hook on Elsa (`canStartCombat`, `combatPreset`, `escalationPolicy`) to prove the combat-start path without free AI combat canon.
- Added regression coverage for:
  - authoritative warning escalation against Mara
  - authored combat start on Elsa
  - clarification in multi-NPC escalation without an explicit target
  - talk-choice suppression after NPC withdrawal
  - prompt/proxy transport of authoritative runtime resolution metadata
- Full test suite green (`197/197`) and build green after the slice.

## 2026-04-13 - Phase 4.2 Slice 2: Runtime Free-Text Intent Layer Expanded

### Done - runtime free text now has more value than repeating visible button text

- Runtime choice matching now recognizes stronger parameterized/entity-heavy input instead of only near-label repetition.
- Examples like `benutze die Fackel am Brunnen` can resolve to the authored runtime interaction with the best entity overlap.
- Unmatched runtime text is now split app-side into:
  - flavor-only narration requests
  - clarification for structured but non-eindeutige input
  - blocked escalation for insults, threats, and attacks until engine-owned consequence paths exist
- Flavor-only runtime requests are marked explicitly in the prompt path so AI narration stays non-canonical and cannot smuggle in reveals, state changes, loot, or hidden checks.
- Proxy and direct transports both pass the runtime request mode through the same prompt-building contract.
- Added regression coverage for:
  - parameterized runtime intent matching
  - flavor-only vs. clarify vs. blocked escalation classification
  - proxy/direct prompt propagation of runtime flavor-only mode
- Full test suite green (`190/190`) and build green after the slice.

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

## 2026-04-13 - Tooling: Local Ollama Provider Added For Branch Testing

### Done - the app can now bypass OpenRouter limits for local testing

- Added provider selection in settings: `OpenRouter` or `Ollama lokal`.
- Ollama local uses the browser directly against `http://localhost:11434` via the OpenAI-compatible chat endpoint.
- Settings can discover local Ollama models via `/api/tags`.
- OpenRouter proxy flow remains intact and separate.
- Added regression coverage for:
  - direct Ollama chat transport
  - Ollama model discovery
  - Ollama connection test
- Full test suite green (`185/185`) and build green after the provider addition.

## 2026-04-13 - Phase 4.2 Slice 1: Shared Runtime Choice Execute Path

### Done - button clicks and resolved typed choices now execute through the same app-side path

- Extracted resolved choice submission into a pure helper in `gamePageRuntime.js`.
- Runtime button clicks and matched free text now share the same authored handling for:
  - pending authored checks
  - no-check runtime interactions
  - stable `recentActionKey` propagation into narration follow-ups
- Added regression coverage for:
  - pending-check submission payload from a resolved authored choice
  - immediate no-check runtime interaction execution from a resolved authored choice
- Full test suite green (`182/182`) and build green after the slice.


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


