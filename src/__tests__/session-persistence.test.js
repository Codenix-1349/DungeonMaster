// ─── Session Persistence Tests ──────────────────────────────────────────────
// Tests that sceneState sub-objects survive a save/load round-trip through
// buildSessionRecord and normalizeSessionList.

import { describe, it, expect } from 'vitest'
import { buildSessionRecord, normalizeSessionList } from '../utils/sessionStore.js'

// ── Helpers ──

function makeFullSceneState() {
  return {
    version: 3, turnCount: 8,
    gmState: {
      currentSectionId: 'sec-2',
      plotFlags: { quest_started: true, key_found: true },
      objectStates: { Truhe: 'open' },
      npcStates: { Gareth: 'dead' },
      triggeredEvents: ['T3: → Wald', 'T6: → Höhle'],
      sectionVisitCounts: { 'sec-1': 2, 'sec-2': 1 },
    },
    playerKnowledge: {
      knownNpcs: ['Gareth', 'Mira'],
      knownPlaces: ['Taverne', 'Wald'],
      discoveredClues: ['Ein alter Schlüssel', 'Blutspuren am Boden'],
      knownFactions: ['Die Schwarze Hand'],
      knownFacts: ['Der König ist tot'],
    },
    dialogueState: {
      activeNpcId: 'Mira',
      npcRelations: {
        Gareth: { disposition: 'neutral', suspicion: 0, lastTopic: '' },
        Mira: { disposition: 'friendly', suspicion: 2, lastTopic: 'Der Schlüssel' },
      },
    },
    memorySummary: 'Held betrat Taverne, fand Schlüssel, ging in den Wald.',
    inferred: {
      source: 'ai_inferred',
      npcStates: { Mira: 'nervous' },
      objectStates: { Tür: 'open' },
      dialogueHints: { Mira: { dispositionTrend: 1, suspicionTrend: -1 } },
    },
    interactionHistory: [
      {
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      },
      {
        id: 'int-2', sectionId: 'sec-2', targetId: null,
        skill: 'perception', outcome: 'success', turn: 6,
        label: 'Umgebung prüfen', kind: 'explore',
        contextSnapshot: { clueCount: 1, npcCount: 2, itemCount: 1 },
      },
    ],
    currentSectionTitle: 'Höhle',
    currentLocation: 'Dunkle Höhle',
    currentObjective: 'Den Schatz finden.',
    recentActions: ['Fackel entzünden'],
  }
}

// ── Tests ──

describe('Session persistence — round-trip via buildSessionRecord', () => {
  it('preserves sceneState through buildSessionRecord', () => {
    const sceneState = makeFullSceneState()
    const session = buildSessionRecord({
      characterId: 'char-1',
      adventureId: 'adv-1',
      sceneState,
    })

    expect(session.sceneState).toEqual(sceneState)
  })

  it('preserves all gmState fields', () => {
    const sceneState = makeFullSceneState()
    const session = buildSessionRecord({ sceneState })
    const gm = session.sceneState.gmState

    expect(gm.currentSectionId).toBe('sec-2')
    expect(gm.plotFlags).toEqual({ quest_started: true, key_found: true })
    expect(gm.objectStates).toEqual({ Truhe: 'open' })
    expect(gm.npcStates).toEqual({ Gareth: 'dead' })
    expect(gm.triggeredEvents).toHaveLength(2)
    expect(gm.sectionVisitCounts['sec-1']).toBe(2)
  })

  it('preserves playerKnowledge fields', () => {
    const session = buildSessionRecord({ sceneState: makeFullSceneState() })
    const pk = session.sceneState.playerKnowledge

    expect(pk.knownNpcs).toEqual(['Gareth', 'Mira'])
    expect(pk.discoveredClues).toHaveLength(2)
    expect(pk.knownFactions).toEqual(['Die Schwarze Hand'])
    expect(pk.knownFacts).toEqual(['Der König ist tot'])
  })

  it('preserves dialogueState fields', () => {
    const session = buildSessionRecord({ sceneState: makeFullSceneState() })
    const dlg = session.sceneState.dialogueState

    expect(dlg.activeNpcId).toBe('Mira')
    expect(dlg.npcRelations.Mira.disposition).toBe('friendly')
    expect(dlg.npcRelations.Mira.suspicion).toBe(2)
  })

  it('preserves memorySummary', () => {
    const session = buildSessionRecord({ sceneState: makeFullSceneState() })
    expect(session.sceneState.memorySummary).toContain('Taverne')
  })

  it('preserves interactionHistory', () => {
    const session = buildSessionRecord({ sceneState: makeFullSceneState() })
    const history = session.sceneState.interactionHistory

    expect(history).toHaveLength(2)
    expect(history[0].targetId).toBe('Truhe')
    expect(history[0].outcome).toBe('failure')
    expect(history[1].skill).toBe('perception')
    expect(history[1].contextSnapshot.clueCount).toBe(1)
  })

  it('preserves inferred hints', () => {
    const session = buildSessionRecord({ sceneState: makeFullSceneState() })
    const inf = session.sceneState.inferred

    expect(inf.npcStates.Mira).toBe('nervous')
    expect(inf.objectStates.Tür).toBe('open')
    expect(inf.dialogueHints.Mira.dispositionTrend).toBe(1)
  })
})

describe('Session persistence — normalizeSessionList round-trip', () => {
  it('preserves sceneState through normalizeSessionList', () => {
    const sceneState = makeFullSceneState()
    const sessions = [buildSessionRecord({ sceneState, adventureId: null })]

    const normalized = normalizeSessionList(sessions, [])

    expect(normalized).toHaveLength(1)
    expect(normalized[0].sceneState.gmState).toEqual(sceneState.gmState)
    expect(normalized[0].sceneState.playerKnowledge).toEqual(sceneState.playerKnowledge)
    expect(normalized[0].sceneState.dialogueState).toEqual(sceneState.dialogueState)
    expect(normalized[0].sceneState.interactionHistory).toEqual(sceneState.interactionHistory)
    expect(normalized[0].sceneState.inferred).toEqual(sceneState.inferred)
  })

  it('does not lose fields when no adventure is matched', () => {
    const sceneState = makeFullSceneState()
    const sessions = [buildSessionRecord({ sceneState, adventureId: 'adv-missing' })]

    const normalized = normalizeSessionList(sessions, [])

    // adventureId not found → stays null, but sceneState must not be replaced
    expect(normalized[0].sceneState).toEqual(sceneState)
  })
})
