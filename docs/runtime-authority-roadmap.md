# Runtime Authority Roadmap

Last updated: 2026-04-13

## Role in the doc set

This is the operational execution roadmap for **Phase 3** from `master_roadmap_dungeons_and_daggers.md`.

Use:
- `master_roadmap_dungeons_and_daggers.md` for strategic ordering and phase gates
- `docs/runtime-authority-roadmap.md` for concrete runtime implementation work
- `docs/ai-next-steps.md` for the short restart point
- `docs/ai-progress.md` for history only

## Workflow rule

After each working branch:
- implement and test on the branch
- hand the branch off for user testing
- commit and push only after explicit user approval
- do not start the next working branch until the current one is either merged or explicitly parked

## Goal

Runtime modules must be engine-authoritative.

- The module defines the allowed actions, reveal paths, and state transitions.
- The engine validates, prioritizes, and applies state changes.
- The AI narrates only within the active, visible runtime state.
- Legacy/prose adventures remain supported, but their heuristic path stays clearly separated from runtime logic.

## Current Phase-3 focus

### Done
- ~~runtime interaction identity across buttons, typed input, retry, and remount~~ ✅ (3.1)
- ~~player-facing validation for spoiler-prone authored text~~ ✅ (3.2)
- ~~app-level acceptance invariants across Birkenhain and Graufurt~~ ✅ (3.3)

### Remaining
- **end-to-end authored check flow** ← current focus (3.4)
- **doc cleanup so the runtime plan has one canonical operational source** (3.5)

## Non-goals

- No UI-only workaround for duplicate or confusing choices.
- No label-based patch targeted only at one NPC or one module.
- No broader text heuristics as a substitute for stable runtime identities.

## Current runtime check contract

- In `runtime` modules, checks come from explicit module data only.
- A runtime interaction triggers a check only when the authored interaction defines `check`.
- UI may render a runtime choice as check-based only when the resolved authored runtime interaction defines `check`.
- Module authors should express the check decision explicitly via `check` or `checkPolicy: none`.
- If a runtime interaction has no `check`, it is a deterministic non-check action and resolves engine-side.
- The AI must not author runtime `[PROBE:]` or `[PROBE_HINWEIS:]` tags.
- The engine must not infer runtime checks from free text or label heuristics.
- In `legacy` / prose adventures, AI check tags and label-based inference remain allowed as fallback behavior.

Reason:
- It keeps probe authority in the same place as interaction authority.
- It makes every runtime check traceable to adventure data.
- It prevents prompt wording or typed free text from silently changing runtime rules.
- Blue probe styling therefore means "authored runtime check", never "this label sounds risky".
- Validation may warn when neither `check` nor `checkPolicy: none` is authored.

## Current runtime dialogue contract

- In `runtime` modules, the active dialogue target is derived from the resolved authored interaction, not from text heuristics.
- A runtime talk interaction may set the active NPC context.
- Free follow-up input may keep the active runtime NPC only while that NPC remains visibly present in the same section.
- Runtime narration alone must not invent or switch the active NPC.
- Legacy/prose adventures may still use name-based dialogue heuristics as fallback.

## Current runtime state ownership contract

- `gmState` is authoritative world truth.
- `playerKnowledge` holds only player-confirmed knowledge.
- `dialogueState` holds only active conversation context.
- Runtime registries stay authored definitions; they are not mutated by AI narration.
- In runtime modules, assistant narration must not promote NPC or object state into `gmState`.
- In runtime modules, assistant narration must not create NPC/object state hints that masquerade as runtime truth.

## Current player-facing runtime contract

- Runtime modules may separate internal truth from player-facing framing.
- `PRIMARY_OBJECTIVE` may stay internal, but `PLAYER_PRIMARY_OBJECTIVE` is the player-facing quest framing.
- `section.objective` may stay internal, but `section.playerObjective` is the player-facing section goal.
- `section.introText` is the authored player-facing scene framing for the active runtime section.
- UI and prompt context should prefer the player-facing runtime fields over internal runtime objective text.
- Validation may warn when a runtime module omits `PLAYER_PRIMARY_OBJECTIVE`, `section.playerObjective`, or `section.introText`.
- Interaction labels remain player-facing authored text; the engine must not rewrite them heuristically.

## Current runtime interaction identity contract

- In `runtime` modules, authored interaction identity comes from stable structure, not from label similarity.
- `interactionId` is the canonical identity for a runtime interaction.
- `actionKey` is the runtime/UI transport key derived from authored identity and must stay stable across retries, remounts, and follow-up actions.
- Interaction labels are presentation only; changing a label must not change runtime behavior.
- Runtime retry and suppression logic should prefer stored `interactionId` / `actionKey` over target- or label-based matching.
- Runtime free-text resolution may use authored `aliases`, but aliases only help select an existing authored interaction; they do not create new behavior.
- Label/semantic matching remains a fallback bridge, not a runtime truth source.

## Block A - Runtime contract and canonical model

### A1. Tighten the runtime contract
- Runtime modules own semantic affordances.
- The engine may provide gating, prioritization, retry filtering, and free-form input.
- The AI must not generate runtime choices or runtime truth.

### A2. Canonical identities everywhere
- Use stable IDs for NPCs, interactions, objects, reveals, and clues.
- Display labels stay presentation-only.
- Runtime truth must never depend on free-text matching.

### A3. Split choice generation cleanly by mode
- `runtime`: only allowed module interactions, exits, and free-form input.
- `legacy`: structured data plus AI/heuristic supplements as today.
- No engine-invented generic runtime talk buttons unless the module models them explicitly.

## Block B - State machine and dialogue authority

### B1. Make dialogue state authoritative
- In runtime modules, derive `activeNpcId` primarily from chosen interactions or runtime state.
- Keep text heuristics only as a legacy fallback.

### B2. Move dedup/recent/retry logic to intent keys
- Use `interactionId`, `npcId`, `targetId`, or a stable `intentKey`.
- Do not treat label similarity as the main identity mechanism.
- Consumed interactions must not reappear indirectly through parallel sources.

### B3. Unify authoritative runtime state transitions
- Successful runtime actions change state only through engine logic.
- Failed runtime actions also write authoritative state where relevant.
- Runtime truth must not be created or overridden by narration.

### B4. Extend module structure only where it improves the model
- If generic conversations are needed, model them explicitly as interactions or topics.
- Do not hide missing structure behind engine magic.

## Block C - Mandatory stabilization

### C1. Clean up the probe/check flow
- Probe-based choices must reliably and visibly trigger the check flow.
- Verify `pendingCheck`, `SkillCheckPanel`, and `handleCheckResult` end-to-end.
- Success/fail outcomes must authoritatively mutate runtime state.

Done criteria:
- Every probe-tagged runtime choice enters the check flow deterministically.
- Success and failure both produce expected runtime state and UI state.
- No probe-relevant runtime transition depends on AI narration.

### C2. Decouple clue truth from narration
- Runtime modules must discover clues via reveal rules and clue registry only.
- Text-heuristic clue extraction remains legacy fallback only, never runtime truth.

Done criteria:
- Runtime clue visibility is explainable from registry/reveal state alone.
- Prompt/UI only expose engine-confirmed known clues.

### C3. Tighten prompt and adventure context for runtime modules
- Only send the active section.
- Only send visible NPCs, visible runtime objects, allowed interactions, relevant known clues, and a short summary.
- Do not send upcoming scenes, hidden reveals, or unnecessary hidden NPC/clue hints.

Done criteria:
- Runtime prompts are scoped to currently visible, actionable truth.
- The AI cannot learn hidden runtime facts from the prompt context.

### C4. Secure reveal/state transitions without checks
- Valid non-check actions such as open, read, take, inspect must be able to mutate runtime state engine-side.
- Non-probe transitions must be as authoritative as probe-based ones.

Done criteria:
- Check and non-check runtime actions share the same authority model.
- Runtime reveals can be triggered without relying on the AI to "say the right thing".

## Block D - Tests, regression shield, acceptance

### D1. Expand the runtime test matrix
- Runtime modules ignore AI-generated choice lists.
- Runtime modules do not show duplicate semantic actions from parallel sources.
- Consumed runtime interactions stay consumed.
- Probe success/fail mutates state correctly.
- Non-check interactions mutate state correctly.
- Runtime clues come only from registry/reveal state.
- Legacy behavior remains intact.

### D2. Acceptance criteria
- Every visible runtime choice is traceable to module data plus current runtime state.
- Every runtime state change is traceable to engine logic.
- AI narration cannot create, consume, or restore runtime truth.
- Choice behavior is consistent across interruptions, retries, and scene transitions.

### D3. Reference modules
- Use `src/data/adventures/graufurt_reference_runtime_module.txt` as the architecture-driven reference runtime module.
- Use `src/data/adventures/birkenhain_minimal_runtime_module.txt` as the compact leak/reveal/gating reference module.
- Their purpose is not broad content coverage, but focused stress on:
  - two visible NPCs in one scene
  - authored dialogue identity
  - hidden-object reveal chains
  - retry reopening after context/tool changes
  - check and non-check runtime transitions
  - backtracking and final gating
- App-level runtime invariants should be expressed first; Birkenhain and Graufurt prove that those invariants hold under authored content.
- Acceptance and regression tests should continue to grow around these reference modules before larger authored adventures become the main validation surface.

## Recommended execution order

1. Lock the runtime contract and canonical IDs.
2. Move dialogue, recent-action, and dedup logic onto stable identities.
3. Expand player-facing validation and identity-safe free-text bridging.
4. Unify probe and non-probe runtime state transitions.
5. Harden clue truth and runtime prompt context.
6. Add regression coverage and verify acceptance criteria on Birkenhain and Graufurt.
7. Keep docs aligned so the current priority is unambiguous.

## Current next-session starting point

**Phase 3.4 — End-to-end authored check flow.**

The authored check pipeline must work reliably:
- authored `interaction.check` → `pendingCheck` → `SkillCheckPanel` → Roll → Runtime-State
- blue check styling = authored runtime check, never heuristic
- success/fail outcomes must authoritatively mutate runtime state

Known bug: checks do not fire reliably. Investigate `buildConditionalRulesBlock()` in `openrouter.js`.

After 3.4, finish 3.5 (this doc cleanup pass) and Phase 3 is complete.
