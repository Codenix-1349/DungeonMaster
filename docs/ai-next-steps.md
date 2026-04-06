# Next Steps

## Active roadmap

The current runtime-module implementation roadmap is tracked in:
- `docs/runtime-authority-roadmap.md`

Resume future work from that document first. It is the canonical plan for the runtime cleanup and authority model.

## Phase 3 complete — Adventure Runtime Hardened

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

## Possible future test additions (not urgent)
- **CombatTracker integration**: initiative, multi-round, enemy defeat, XP/loot
- **Adventure parsing**: structured adventure round-trip, legacy format migration
- **Tag parsing edge cases**: [GEGNER:], [BEUTE:], [HP:], [XP:] tag extraction
- **Character creation/migration**: stat calculation, inventory migration

## How to continue after an interruption
1. `cd C:\Apps\DungeonsDaggers\DungeonMaster`
2. `git checkout feature/phase3-adventure-runtime` (or `main` if merged)
3. `npm test` — verify all 70 tests pass
4. `npm run build` — verify build succeeds
5. Read this file + `ai-progress.md` for context
