# Next Steps

## Active roadmap

The current runtime-module implementation roadmap is tracked in:
- `docs/runtime-authority-roadmap.md`

Resume future work from that document first. It is the canonical plan for the runtime cleanup and authority model.

## Phase 3 late hardening — Runtime Acceptance Shield

Key changes: engine-truth over AI-truth, structured data over heuristics.
- NPC/object states promoted to gmState (permanent, survive transitions)
- NPC discovery: assistant-only (player can't meta-game names)
- Structured transitions: exits-only (no false transitions)
- Clue discovery: cross-referenced with section clues, assistant-only
- Prompt leakage reduced (hidden NPCs/clues limited, engine-truth block added)

### Runtime check rule
- **Runtime modules:** checks are authored in the module via explicit `interaction.check` blocks.
- **UI contract:** a runtime option may render as check-based only when the resolved authored runtime interaction defines `check`.
- **Authoring contract:** runtime interactions should declare either `check` or `checkPolicy: none`.
- **No runtime check heuristics:** the app no longer infers runtime checks from free text or AI tags.
- **Legacy/prose adventures:** AI `[PROBE:]` / `[PROBE_HINWEIS:]` tags and label-based fallback inference still apply there.

### Runtime dialogue rule
- **Runtime modules:** `activeNpcId` comes from resolved authored interaction intent, not from narration keyword matching.
- **Carry-forward:** free follow-up input may keep the active runtime NPC only while that NPC stays visibly present in the same section.
- **No runtime dialogue heuristics:** narration alone must not invent or switch the active runtime dialogue target.
- **Legacy/prose adventures:** name-based dialogue heuristics remain a fallback there.

### Runtime player-facing rule
- **Runtime modules:** player-facing quest framing may be authored separately from internal runtime truth.
- **Module level:** `PLAYER_PRIMARY_OBJECTIVE` is the player-facing primary quest text.
- **Section level:** `playerObjective` is the player-facing section goal, and `introText` is the authored player-facing scene framing.
- **UI/prompt contract:** runtime UI and prompt context should prefer the player-facing fields over internal objective text.
- **Validation:** runtime modules should warn when player-facing quest or intro framing is missing.

### Runtime interaction identity rule
- **Runtime modules:** interaction behavior is identified by authored `interactionId`, not by visible wording.
- **UI/runtime transport:** `actionKey` carries that stable identity through retries, remounts, and follow-up handling.
- **Labels are presentation-only:** changing a visible label must not change runtime truth.
- **Free-text bridge:** runtime modules may author `aliases` to help free-text resolve to an existing interaction.
- **Retry contract:** runtime retry/suppression logic should prefer stored `interactionId` / `actionKey` over label or target similarity.

## Current next step — App-level acceptance invariants

- `src/data/adventures/graufurt_reference_runtime_module.txt` is now the architecture-driven reference module.
- `src/data/adventures/birkenhain_minimal_runtime_module.txt` remains the compact leak/reveal/gating reference module.
- Runtime acceptance should now be expressed as reusable app-side invariants first.
- It exists to stress:
  - two NPCs in one runtime scene
  - authored dialogue identity
  - hidden reveal chains
  - retry reopening after new tools
  - check and non-check state transitions
  - backtracking and final gating
- Birkenhain and Graufurt should prove the invariants; they should not define the model.
- Prefer extending regression and acceptance coverage around these modules before treating a larger authored adventure as the main proof surface.

## Possible future test additions (not urgent)
- **CombatTracker integration**: initiative, multi-round, enemy defeat, XP/loot
- **Adventure parsing**: structured adventure round-trip, legacy format migration
- **Tag parsing edge cases**: [GEGNER:], [BEUTE:], [HP:], [XP:] tag extraction
- **Character creation/migration**: stat calculation, inventory migration

## How to continue after an interruption
1. `cd C:\Apps\DungeonsDaggers\DungeonMaster`
2. `git checkout main` (or the current feature branch if work is still in progress)
3. `npm test -- --run` — verify the full suite passes
4. `npm run build` — verify build succeeds
5. Read this file + `docs/runtime-authority-roadmap.md` for context
