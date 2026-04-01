# Next Steps

## Refactor complete — ready for Phase 3

The codebase is now cleanly split for Phase 3 (Adventure Runtime):
- **Data layer**: characterRules, adventureParser, sceneState, knowledgeModel, adventureContext
- **Service layer**: promptBuilder, responseNormalization, tagParsers, openrouterTransport
- **UI layer**: game/MessageBubble, game/SessionCard extracted from GamePage

### Known open issue
- **Proben ([PROBE:]-Tags) fire inconsistently** — skill checks sometimes don't trigger. Likely a prompt-level issue (see memory: project_proben_broken.md).

## Possible future test additions (not urgent)
- **CombatTracker integration**: initiative, multi-round, enemy defeat, XP/loot
- **Adventure parsing**: structured adventure round-trip, legacy format migration
- **Tag parsing edge cases**: [GEGNER:], [BEUTE:], [HP:], [XP:] tag extraction
- **Character creation/migration**: stat calculation, inventory migration

## How to continue after an interruption
1. `cd C:\Apps\DungeonsDaggers\DungeonMaster`
2. `git checkout refactor/module-split` (or `main` if merged)
3. `npm test` — verify all 63 tests pass
4. `npm run build` — verify build succeeds
5. Read this file + `ai-progress.md` for context
