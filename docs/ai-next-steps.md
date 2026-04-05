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

### Known open issue
- **Proben ([PROBE:]-Tags) fire inconsistently** — skill checks sometimes don't trigger. Likely a prompt-level issue (see memory: project_proben_broken.md).

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
