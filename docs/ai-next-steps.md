# Next Steps

Last updated: 2026-04-13

## Canonical reading order

Use the docs in this order:
1. `master_roadmap_dungeons_and_daggers.md` for strategic priority and phase gates
2. `docs/runtime-authority-roadmap.md` for the operational Phase-3 plan
3. `docs/ai-next-steps.md` for the short restart point
4. `docs/ai-progress.md` for historical context only

## Current execution target

Phase 3 is complete.
The active gate is now Phase 4: backend/prompt authority.

- [done] runtime interaction identity across buttons, typed input, retries, and remounts (3.1)
- [done] player-facing validation for spoiler-prone authored text (3.2)
- [done] acceptance invariants across Birkenhain and Graufurt (3.3)
- [done] end-to-end authored check flow (3.4)
- [done] doc cleanup so one operational runtime source stays canonical (3.5)
- [done] proxy-backed prompt building moved to backend assembly (4.1 slice 1)

## Current next step

**Phase 4 - backend authority, next slice: server-side state loading / memory ownership.**

Phase 4.1 slice 1 is now done:
- proxy-backed chat sends raw history + `promptContext`
- `/api/chat/send` builds the final `system` prompt on the server
- proxy requests ignore client-supplied `system` messages when server prompt assembly is active
- direct frontend OpenRouter calls still keep the local fallback path

Current follow-up goal:
- reduce trust in client-passed state on the proxy path
- move more prompt/state authority from browser payloads into server-loaded session data
- start the backend-owned memory/session compaction path

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
6. Read `master_roadmap_dungeons_and_daggers.md` first, then `docs/ai-next-steps.md`; use `docs/runtime-authority-roadmap.md` as the completed Phase-3 reference if needed
