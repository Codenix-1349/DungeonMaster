import { describe, expect, it } from 'vitest'
import { createInitialSceneState, deriveSceneState, normalizeAdventureEntry } from '../data/srd.js'

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BIRKENHAIN_TEXT = readFileSync(resolve(__dirname, '../data/adventures/birkenhain_minimal_runtime_module.txt'), 'utf-8')

function loadBirkenhain() {
  return normalizeAdventureEntry({ id: 'birkenhain-state-ownership', title: 'Birkenhain', text: BIRKENHAIN_TEXT })
}

function loadInlineRuntimeModule() {
  return normalizeAdventureEntry({
    id: 'runtime-state-ownership-inline',
    title: 'Ownership Inline',
    text: `
MODULE_ID: ownership_inline
MODULE_VERSION: 0.1
SYSTEM: DND5E
START_SECTION_ID: hall
PRIMARY_OBJECTIVE: Interne Wahrheit.
PLAYER_PRIMARY_OBJECTIVE: Oeffne die Halle.

NPC_REGISTRY:
  guard:
    name: Waechter
    firstSeen: hall
    currentlyVisible: true
    relationship: neutral
    suspicion: none
    knownFacts: []
    secretsUnlocked: []
    lastTopic: null
    promisesMade: []

OBJECT_REGISTRY:
  chest:
    type: chest
    portable: false

SECTIONS:
  - id: hall
    location: Halle
    objective: Interne Hallenwahrheit.
    playerObjective: Sprich mit dem Waechter.
    introText: Eine leere Halle mit einer schweren Truhe.
    visibleNpcs: [guard]
    visibleFeatures:
      - schwere Truhe
      - stiller Waechter
    interactions:
      - id: inspect_chest
        label: Die Truhe untersuchen
        kind: inspect
        target: Truhe
        checkPolicy: none
        availability:
          visible: true
        results:
          success:
            setFlags: [CHEST_INSPECTED]
`,
  })
}

function msg(role, content) {
  return {
    id: `${role}-${Math.random()}`,
    role,
    content,
    type: 'narrative',
    timestamp: new Date().toISOString(),
  }
}

describe('runtime state ownership', () => {
  it('seeds runtime gmState npc visibility from authored registry baselines', () => {
    const adventure = loadBirkenhain()
    const state = createInitialSceneState(adventure)

    expect(state.gmState.npcStates.mara).toEqual({
      currentlyVisible: true,
      sectionId: 'inn_common_room',
    })
    expect(state.gmState.npcStates.tomas).toBeUndefined()
    expect(state.playerKnowledge.knownNpcs).toEqual(['Mara Birken'])
  })

  it('does not promote runtime npc death from assistant narration into gmState or inferred hints', () => {
    const adventure = loadBirkenhain()
    const previous = createInitialSceneState(adventure)

    const next = deriveSceneState({
      adventure,
      previousSceneState: previous,
      messages: [
        msg('user', 'Ich beobachte Mara.'),
        msg('assistant', 'Mara Birken stirbt ploetzlich und faellt zu Boden.'),
      ],
    })

    expect(next.gmState.npcStates.mara).toEqual({
      currentlyVisible: true,
      sectionId: 'inn_common_room',
    })
    expect(next.inferred.npcStates).toEqual({})
  })

  it('does not promote runtime object state from assistant narration into gmState or inferred hints', () => {
    const adventure = loadInlineRuntimeModule()
    const previous = createInitialSceneState(adventure)

    const next = deriveSceneState({
      adventure,
      previousSceneState: previous,
      messages: [
        msg('user', 'Ich starre die Truhe an.'),
        msg('assistant', 'Die Truhe ist geoeffnet und spaeter zerstoert.'),
      ],
    })

    expect(next.gmState.objectStates).toEqual({})
    expect(next.inferred.objectStates).toEqual({})
  })
})
