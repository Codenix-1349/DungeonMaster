import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { deriveSyncedSceneState } from '../context/GameSessionContext.jsx'
import { createInitialSceneState, findInteractionDef, normalizeAdventureEntry, resolveInteractionOutcome } from '../data/srd.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BIRKENHAIN_MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/birkenhain_minimal_runtime_module.txt'), 'utf-8')

function loadBirkenhainModule() {
  return normalizeAdventureEntry({ id: 'gamesession-sync-birkenhain', title: 'Birkenhain Minimal', text: BIRKENHAIN_MODULE_TEXT })
}

describe('GameSession syncSceneState base-state handling', () => {
  it('derives from a provided runtime state override so no-check interaction state is not lost', () => {
    const adventure = loadBirkenhainModule()
    const base = createInitialSceneState(adventure)
    const previousSceneState = {
      ...base,
      gmState: {
        ...base.gmState,
        currentSectionId: 'well_chamber',
        plotFlags: {
          CROW_SEAL_FOUND: true,
        },
        runtimeObjects: {
          crow_seal: {
            id: 'crow_seal',
            sectionId: 'well_chamber',
            label: 'Kraehenfoermiges Siegelfragment nahe dem Brunnen',
            kind: 'ritual_item',
            visible: true,
            state: 'obtainable',
            source: 'inspect_well',
            priority: 90,
          },
        },
      },
    }

    const interaction = findInteractionDef(adventure.structure, 'take_crow_seal')
    const resolved = resolveInteractionOutcome(previousSceneState, interaction, adventure.structure.module, 'success')

    const next = deriveSyncedSceneState({
      previousSceneState: resolved.sceneState,
      adventure,
      messages: [
        { role: 'user', content: interaction.label },
        { role: 'assistant', content: interaction.aiNarrationHint || '' },
      ],
      fallbackUserText: interaction.label,
      fallbackUserActionKey: 'intr:take_crow_seal',
    })

    expect(next.gmState.plotFlags.CROW_SEAL_TAKEN).toBe(true)
    expect(next.gmState.runtimeObjects.crow_seal.state).toBe('taken')
    expect(next.gmState.runtimeObjects.crow_seal.visible).toBe(false)
    expect(next.gmState.runtimeObjects.crow_seal.suppressed).toBe(true)
  })
})
