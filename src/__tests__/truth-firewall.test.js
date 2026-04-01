// ─── Truth Firewall Tests ───────────────────────────────────────────────────
// Ensures AI/assistant text never directly mutates authoritative state.
// Only `inferred` may receive AI-derived data; gmState, playerKnowledge,
// and dialogueState must remain engine-controlled.

import { describe, it, expect } from 'vitest'
import { deriveSceneState, createInitialSceneState } from '../data/srd.js'

// ── Helpers ──

const SECTION = {
  id: 'sec-1',
  title: 'Taverne',
  index: 0,
  summary: 'Eine Taverne.',
  location: 'Taverne',
  objective: 'Die Taverne erkunden.',
  npcs: ['Gareth', 'Mira'],
  interactiveObjects: ['Truhe', 'Tür'],
  exits: [],
  keywords: ['taverne'],
  searchText: 'taverne gareth mira truhe tür',
  visibleFeatures: ['Ein langer Tresen'],
  setsOnEntry: [],
  chunkIndexes: [0],
}

const CHUNK = {
  index: 0,
  text: 'Eine Taverne mit Gareth und Mira.',
  lower: 'eine taverne mit gareth und mira.',
  keywords: ['taverne', 'gareth', 'mira'],
}

function makeAdventure() {
  return {
    id: 'adv-test',
    title: 'Testabenteuer',
    text: 'SECTION_ID: sec-1\nTITLE: Taverne\nEine Taverne.',
    structure: {
      version: 3,
      format: 'structured',
      module: { startSectionId: 'sec-1', primaryObjective: 'Testen' },
      sections: [SECTION],
      chunks: [CHUNK],
    },
  }
}

function makePrev() {
  return createInitialSceneState(makeAdventure())
}

function msg(role, content) {
  return { id: Date.now() + Math.random(), role, content, type: 'narrative', timestamp: new Date().toISOString() }
}

function derive(prev, messages) {
  return deriveSceneState({ adventure: makeAdventure(), previousSceneState: prev, messages })
}

// ── Tests ──

describe('Truth Firewall — gmState: terminal NPC/object states promoted (Phase 3)', () => {
  it('gmState.npcStates promotes terminal states (dead) from AI narration', () => {
    const prev = makePrev()
    prev.playerKnowledge.knownNpcs = ['Gareth']

    const next = derive(prev, [
      msg('user', 'Ich greife Gareth an.'),
      msg('assistant', 'Gareth fällt leblos zu Boden. Er stirbt.'),
    ])

    // Phase 3: terminal states (dead, fled) are promoted to gmState
    expect(next.gmState.npcStates.Gareth).toBe('dead')
    // Once in gmState, NOT duplicated in inferred
    expect(next.inferred.npcStates.Gareth).toBeUndefined()
  })

  it('gmState.objectStates promotes terminal states (destroyed) from AI narration', () => {
    const prev = makePrev()

    const next = derive(prev, [
      msg('user', 'Ich zerschlage die Truhe.'),
      msg('assistant', 'Die Truhe wird zertrümmert und zerfällt in Splitter.'),
    ])

    // Phase 3: terminal object states promoted to gmState
    expect(next.gmState.objectStates.Truhe).toBe('destroyed')
    // NOT duplicated in inferred
    expect(next.inferred.objectStates.Truhe).toBeUndefined()
  })

  it('gmState.npcStates carries forward + promotes new terminal states', () => {
    const prev = makePrev()
    prev.gmState.npcStates = { Gareth: 'dead' }
    prev.playerKnowledge.knownNpcs = ['Gareth', 'Mira']

    const next = derive(prev, [
      msg('user', 'Was ist mit Mira?'),
      msg('assistant', 'Mira flüchtet aus der Taverne.'),
    ])

    // Engine-set state carries forward
    expect(next.gmState.npcStates.Gareth).toBe('dead')
    // Phase 3: 'fled' is terminal → promoted to gmState
    expect(next.gmState.npcStates.Mira).toBe('fled')
    // NOT duplicated in inferred
    expect(next.inferred.npcStates.Mira).toBeUndefined()
  })

  it('promoted NPC state (dead) persists across scene transitions', () => {
    const prev = makePrev()
    prev.gmState.npcStates = { Gareth: 'dead' }
    prev.playerKnowledge.knownNpcs = ['Gareth']

    // Simulate a turn with no new NPC changes
    const next = derive(prev, [
      msg('user', 'Ich gehe weiter.'),
      msg('assistant', 'Du verlässt die Taverne.'),
    ])

    // Dead NPC state must persist (engine truth survives transitions)
    expect(next.gmState.npcStates.Gareth).toBe('dead')
  })

  it('non-terminal NPC states (e.g. descriptive) do NOT get promoted', () => {
    const prev = makePrev()
    prev.playerKnowledge.knownNpcs = ['Gareth']

    // AI describes Gareth laughing — not a terminal state
    const next = derive(prev, [
      msg('user', 'Was macht Gareth?'),
      msg('assistant', 'Gareth lacht laut und poliert ein Glas.'),
    ])

    // No terminal state → gmState stays empty
    expect(next.gmState.npcStates.Gareth).toBeUndefined()
  })
})

describe('Truth Firewall — playerKnowledge not kanonisiert from AI', () => {
  it('knownFacts is NOT extended by AI narration', () => {
    const prev = makePrev()
    prev.playerKnowledge.knownFacts = ['Fakt A']

    const next = derive(prev, [
      msg('user', 'Was weißt du über den Wald?'),
      msg('assistant', 'Der Wald ist verflucht. Ein uralter Drache haust dort.'),
    ])

    // knownFacts must stay exactly as engine set them
    expect(next.playerKnowledge.knownFacts).toEqual(['Fakt A'])
  })

  it('knownFactions is NOT extended by AI narration', () => {
    const prev = makePrev()

    const next = derive(prev, [
      msg('user', 'Erzähle mir von den Fraktionen.'),
      msg('assistant', 'Die Schwarze Hand kontrolliert den Untergrund.'),
    ])

    expect(next.playerKnowledge.knownFactions).toEqual([])
  })
})

describe('Truth Firewall — dialogueState not hard-overwritten by heuristic', () => {
  it('npcRelations disposition is NOT auto-updated from AI sentiment', () => {
    const prev = makePrev()
    prev.playerKnowledge.knownNpcs = ['Gareth']
    prev.dialogueState = {
      activeNpcId: 'Gareth',
      npcRelations: {
        Gareth: { disposition: 'neutral', suspicion: 0, lastTopic: '' },
      },
    }

    const next = derive(prev, [
      msg('user', 'Gareth, ich brauche deine Hilfe.'),
      msg('assistant', 'Gareth lächelt freundlich und nickt zustimmend. Er vertraut dir.'),
    ])

    // Disposition must NOT be auto-shifted by AI text
    expect(next.dialogueState.npcRelations.Gareth.disposition).toBe('neutral')
    // But inferred.dialogueHints SHOULD reflect the soft trend
    expect(next.inferred.dialogueHints.Gareth.dispositionTrend).toBeGreaterThan(0)
  })

  it('npcRelations suspicion is NOT auto-updated from AI text', () => {
    const prev = makePrev()
    prev.playerKnowledge.knownNpcs = ['Gareth']
    prev.dialogueState = {
      activeNpcId: 'Gareth',
      npcRelations: {
        Gareth: { disposition: 'neutral', suspicion: 3, lastTopic: '' },
      },
    }

    const next = derive(prev, [
      msg('user', 'Ich belüge Gareth.'),
      msg('assistant', 'Gareth wird misstrauisch und durchschaut deine Lüge.'),
    ])

    // Suspicion must NOT be auto-incremented
    expect(next.dialogueState.npcRelations.Gareth.suspicion).toBe(3)
    // But inferred hint should reflect suspicion trend
    expect(next.inferred.dialogueHints.Gareth.suspicionTrend).toBeGreaterThan(0)
  })
})
