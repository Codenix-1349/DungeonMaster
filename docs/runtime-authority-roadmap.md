# Runtime Authority Roadmap

Last updated: 2026-04-06

## Workflow rule

After each working branch:

- implement and test on the branch
- commit and push only after explicit user approval
- merge the branch into `main` before creating the next working branch

Do not start a new branch while the previous approved branch is still waiting to be merged into `main`.

## Goal

Runtime modules must be engine-authoritative.

- The module defines the allowed actions, reveal paths, and state transitions.
- The engine validates, prioritizes, and applies state changes.
- The AI narrates only within the active, visible runtime state.
- Legacy/prose adventures remain supported, but their heuristic path stays clearly separated from runtime logic.

## Non-goals

- No UI-only workaround for duplicate or confusing choices.
- No label-based patch targeted only at Mara or a single module.
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
- Legacy / prose adventures may still use name-based dialogue heuristics as fallback.

## Phase 1 - Runtime Contract and Canonical Model

### 1. Tighten the runtime contract
- Runtime modules own semantic affordances.
- The engine may provide gating, prioritization, retry filtering, and free-form input.
- The AI must not generate runtime choices or runtime truth.

### 2. Canonical identities everywhere
- Use stable IDs for NPCs, interactions, objects, reveals, and clues.
- Display labels stay presentation-only.
- Runtime truth must never depend on free-text matching.

### 3. Split choice generation cleanly by mode
- `runtime`: only allowed module interactions, exits, and free-form input.
- `legacy`: structured data plus AI/heuristic supplements as today.
- No engine-invented generic runtime talk buttons unless the module models them explicitly.

## Phase 2 - State Machine and Dialogue Authority

### 4. Make dialogue state authoritative
- In runtime modules, derive `activeNpcId` primarily from chosen interactions or runtime state.
- Keep text heuristics only as a legacy fallback.

### 5. Move dedup/recent/retry logic to intent keys
- Use `interactionId`, `npcId`, `targetId`, or a stable `intentKey`.
- Do not treat label similarity as the main identity mechanism.
- Consumed interactions must not reappear indirectly through parallel sources.

### 6. Unify authoritative runtime state transitions
- Successful runtime actions change state only through engine logic.
- Failed runtime actions also write authoritative state where relevant.
- Runtime truth must not be created or overridden by narration.

### 7. Extend module structure only where it improves the model
- If generic conversations are needed, model them explicitly as interactions or topics.
- Do not hide missing structure behind engine magic.

## Phase 3 - Mandatory Stabilization Block

### 8. Clean up the probe/check flow
- Probe-based choices must reliably and visibly trigger the check flow.
- Verify `pendingCheck`, `SkillCheckPanel`, and `handleCheckResult` end-to-end.
- Success/fail outcomes must authoritatively mutate runtime state.

Done criteria:
- Every probe-tagged runtime choice enters the check flow deterministically.
- Success and failure both produce expected runtime state and UI state.
- No probe-relevant runtime transition depends on AI narration.

### 9. Decouple clue truth from narration
- Runtime modules must discover clues via reveal rules and clue registry only.
- Text-heuristic clue extraction remains legacy fallback only, never runtime truth.

Done criteria:
- Runtime clue visibility is explainable from registry/reveal state alone.
- Prompt/UI only expose engine-confirmed known clues.

### 10. Tighten prompt and adventure context for runtime modules
- Only send the active section.
- Only send visible NPCs, visible runtime objects, allowed interactions, relevant known clues, and a short summary.
- Do not send upcoming scenes, hidden reveals, or unnecessary hidden NPC/clue hints.

Done criteria:
- Runtime prompts are scoped to currently visible, actionable truth.
- The AI cannot learn hidden runtime facts from the prompt context.

### 11. Secure reveal/state transitions without checks
- Valid non-check actions such as open, read, take, inspect must be able to mutate runtime state engine-side.
- Non-probe transitions must be as authoritative as probe-based ones.

Done criteria:
- Check and non-check runtime actions share the same authority model.
- Runtime reveals can be triggered without relying on the AI to "say the right thing".

## Phase 4 - Tests, Regression Shield, Acceptance

### 12. Expand the runtime test matrix
- Runtime modules ignore AI-generated choice lists.
- Runtime modules do not show duplicate semantic actions from parallel sources.
- Consumed runtime interactions stay consumed.
- Probe success/fail mutates state correctly.
- Non-check interactions mutate state correctly.
- Runtime clues come only from registry/reveal state.
- Legacy behavior remains intact.

### 13. Acceptance criteria
- Every visible runtime choice is traceable to module data plus current runtime state.
- Every runtime state change is traceable to engine logic.
- AI narration cannot create, consume, or restore runtime truth.
- Choice behavior is consistent across interruptions, retries, and scene transitions.

## Recommended execution order

1. Lock the runtime contract and canonical IDs.
2. Split runtime/legacy choice generation cleanly.
3. Move dialogue, recent-action, and dedup logic onto stable identities.
4. Unify probe and non-probe runtime state transitions.
5. Harden clue truth and runtime prompt context.
6. Add regression coverage and verify acceptance criteria.

## Current next-session starting point

Start with the runtime choice contract and identity model.

Reason:
- It resolves the Mara duplication at the architectural level.
- It prevents later rework in check flow, clue truth, and prompt scoping.
- It gives the rest of the roadmap a stable foundation.
