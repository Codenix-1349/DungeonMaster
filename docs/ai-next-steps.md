# Next Steps

Last updated: 2026-04-13

## Canonical reading order

Use the docs in this order:
1. `master_roadmap_dungeons_and_daggers.md` for strategic priority and phase gates
2. `docs/runtime-authority-roadmap.md` for the operational Phase-3 plan
3. `docs/ai-next-steps.md` for the short restart point
4. `docs/ai-progress.md` for historical context only

## Current execution target

Phase 3 is still the active gate.
Do not start Phase 4 work before these are meaningfully closed:

- ~~runtime interaction identity across buttons, typed input, retries, and remounts~~ ✅ (3.1)
- ~~player-facing validation for spoiler-prone authored text~~ ✅ (3.2)
- ~~acceptance invariants across Birkenhain and Graufurt~~ ✅ (3.3)
- **end-to-end authored check flow** ← current focus (3.4)
- **doc cleanup so one operational runtime source stays canonical** (3.5)

## Current next step

**Phase 3.4 — Check-Flow E2E härten.**

The authored check pipeline must work reliably end-to-end:
- authored `interaction.check` → `pendingCheck` → `SkillCheckPanel` → Roll → Runtime-State
- blue check styling = authored runtime check, never heuristic
- success/fail outcomes must authoritatively mutate runtime state
- no runtime checks from free-text inference or AI tags

Known bug: checks do not fire reliably — likely caused by token optimization or structured context changes. Investigate `buildConditionalRulesBlock()` in `openrouter.js`.

## Runtime rules to preserve

### Check rule
- Runtime-module checks come only from authored `interaction.check`.
- The UI may mark a runtime option as a check only when the resolved authored interaction defines `check`.
- Runtime modules should author either `check` or `checkPolicy: none`.
- Runtime check heuristics from free text or AI tags are not allowed.
- Legacy/prose adventures may still use AI check tags and heuristic fallback behavior.

### Dialogue rule
- In runtime modules, `activeNpcId` comes from the resolved authored interaction, not from narration keyword matching.
- Free follow-up input may keep the active runtime NPC only while that NPC remains visibly present in the same section.
- Runtime narration alone must not invent or switch dialogue authority.

### Player-facing rule
- `PLAYER_PRIMARY_OBJECTIVE`, `playerObjective`, and `introText` are the player-facing authored framing.
- UI and prompt context should prefer them over internal runtime objective text.
- Validation should warn when this framing is missing or spoiler-prone.

### Identity rule
- Runtime interaction behavior is identified by authored `interactionId`, not by visible wording.
- `actionKey` must carry that stable identity through retries, remounts, and follow-up handling.
- `aliases` may help free text resolve to an existing authored interaction, but must not create new behavior.

### State ownership rule
- `gmState` is authoritative world truth only.
- `playerKnowledge` contains only player-confirmed knowledge.
- `dialogueState` contains only active conversation context.
- Runtime registries stay authored definitions, not mutable AI-owned state.
- Assistant narration must not promote NPC/object state into runtime `gmState` or inferred runtime hints.

## Resume checklist after an interruption

1. `cd C:\Apps\DungeonsDaggers\DungeonMaster`
2. `git status --short --branch`
3. Stay on the active feature branch if work is in progress, otherwise create a new one from `main`
4. `npm test -- --run`
5. `npm run build`
6. Read `master_roadmap_dungeons_and_daggers.md` and `docs/runtime-authority-roadmap.md` before changing priorities
