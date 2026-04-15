# Next Steps

Last updated: 2026-04-15

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

**Phase 4 - current slice: session-memory compaction / summary authority on the proxy path.**

Phase 4.1 slice 1 is now done:
- proxy-backed chat sends raw history + `sessionId` + minimal runtime metadata
- `/api/chat/send` loads character/adventure/combat/scene state server-side and builds the final `system` prompt there
- proxy requests ignore client-supplied `system` messages when server prompt assembly is active
- the proxy path no longer trusts client-passed runtime prompt context
- direct frontend OpenRouter calls still keep the local fallback path
- local branch testing can now also use Ollama via `http://localhost:11434` without OpenRouter allowance

Current follow-up goal:
- make runtime free text valuable beyond repeating button labels
- [done] unify button clicks and resolved typed input onto the same app-side execute path
- [done] allow natural variants and parameterized intents like `use torch on well` or `ask Mara about the key`
- [done] separate two immediate runtime text outcomes clearly:
  - authoritative resolved action
  - flavor-only narration without canonical state mutation
- [done] block or clarify non-matched structured runtime text app-side instead of silently looping
- [done] route runtime escalation (`insult` / `threat` / `attack`) into engine-owned dialogue/consequence state instead of free AI canon
- [done] allow authored NPC escalation to suppress talk actions or start combat through explicit runtime metadata (`canStartCombat`, `combatPreset`, `escalationPolicy`)
- [done] mark app-resolved escalation in the prompt path so AI only narrates the already-decided consequence
- [done] move runtime intent resolution onto authored target/tool/topic slots so slot-aware free text is no longer only label/alias matching
- [done] broaden escalation outcomes beyond dialogue/combat into authored help-calls, flight, guards, and scene-specific fallback consequences
- [done] sync the active proxy session state to the backend before prompt assembly so server-side prompt loading sees current session/character data
- [done] load proxy prompt state from server-owned session/character/adventure data instead of client-passed `promptContext`
- next:
  - compact proxy-path session memory so raw history can shrink behind a server-owned summary/memory layer
  - reduce duplicated prompt information once the server-side memory representation is in place

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

### Free-text rule
- In runtime modules, free text is an intent input, not only a second way to repeat visible button text.
- Free text may resolve natural variants, synonyms, and parameterized phrasings against visible, app-authorized affordances.
- Harmless flavor actions may receive narration without canonical state mutation.
- Escalating text such as insulting, threatening, arguing, or attacking must route into engine-owned consequence systems such as warnings, guards/help-calls, flight, combat, or other authored scene fallbacks, not free AI canon.
- If target or authored consequence data is missing, the app must clarify or route to a bounded non-canonical fallback explicitly instead of sending it through as free narration.
- If the input is ambiguous or unavailable, the app should clarify or reject it explicitly instead of silently doing nothing or inventing world truth.

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
