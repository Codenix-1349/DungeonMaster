// ─── Knowledge Gating Tests ─────────────────────────────────────────────────
// Ensures player knowledge and GM world state stay cleanly separated.
// No automatic reveals at start, no free unlocks on scene change.

import { describe, it, expect } from 'vitest'
import { deriveSceneState, createInitialSceneState } from '../data/srd.js'

// ── Shared fixture ──

function makeSection(overrides = {}) {
  return {
    id: 'sec-1', title: 'Taverne', index: 0, summary: 'Eine Taverne.',
    location: 'Taverne', objective: 'Erkunden.',
    npcs: ['Gareth', 'Mira'], interactiveObjects: ['Truhe'],
    exits: [{ label: 'Zum Wald', targetId: 'sec-2' }],
    keywords: ['taverne'], searchText: 'taverne gareth mira truhe',
    visibleFeatures: ['Ein Tresen'], setsOnEntry: [],
    chunkIndexes: [0], ...overrides,
  }
}

function makeAdventure(sections) {
  const secs = sections || [makeSection()]
  return {
    id: 'adv-test', title: 'Test',
    text: 'SECTION_ID: sec-1\nTITLE: Taverne\nText.',
    structure: {
      version: 3, format: 'structured',
      module: { startSectionId: secs[0].id, primaryObjective: 'Testen' },
      sections: secs,
      chunks: [{ index: 0, text: 'Taverne.', lower: 'taverne.', keywords: ['taverne'] }],
    },
  }
}

function msg(role, content) {
  return { id: Date.now() + Math.random(), role, content, type: 'narrative', timestamp: new Date().toISOString() }
}

// ── Tests ──

describe('Knowledge Gating — initial state', () => {
  it('no clues are revealed at adventure start', () => {
    const adventure = makeAdventure()
    const initial = createInitialSceneState(adventure)

    expect(initial.playerKnowledge.discoveredClues).toEqual([])
  })

  it('no NPCs are known at adventure start', () => {
    const adventure = makeAdventure()
    const initial = createInitialSceneState(adventure)

    expect(initial.playerKnowledge.knownNpcs).toEqual([])
  })

  it('no facts or factions are known at adventure start', () => {
    const adventure = makeAdventure()
    const initial = createInitialSceneState(adventure)

    expect(initial.playerKnowledge.knownFacts).toEqual([])
    expect(initial.playerKnowledge.knownFactions).toEqual([])
  })
})

describe('Knowledge Gating — NPC discovery requires message mention', () => {
  it('NPC becomes known only when mentioned in messages', () => {
    const adventure = makeAdventure()
    const prev = createInitialSceneState(adventure)

    // No mention of Gareth → should not be known
    const next1 = deriveSceneState({
      adventure, previousSceneState: prev,
      messages: [
        msg('user', 'Ich schaue mich um.'),
        msg('assistant', 'Du siehst einen langen Tresen und eine Truhe.'),
      ],
    })
    expect(next1.playerKnowledge.knownNpcs).not.toContain('Gareth')

    // Now Gareth is mentioned → should be discovered
    const next2 = deriveSceneState({
      adventure, previousSceneState: next1,
      messages: [
        msg('user', 'Wer ist hier?'),
        msg('assistant', 'Gareth steht hinter dem Tresen und poliert ein Glas.'),
      ],
    })
    expect(next2.playerKnowledge.knownNpcs).toContain('Gareth')
  })

  it('NPC NOT in section.npcs is not discovered even if mentioned', () => {
    const adventure = makeAdventure()
    const prev = createInitialSceneState(adventure)

    const next = deriveSceneState({
      adventure, previousSceneState: prev,
      messages: [
        msg('user', 'Erzähl mir von Thorin.'),
        msg('assistant', 'Thorin ist ein berühmter Zwerg.'),
      ],
    })

    // Thorin is not in section.npcs → should not appear
    expect(next.playerKnowledge.knownNpcs).not.toContain('Thorin')
  })
})

describe('Knowledge Gating — section transition does not auto-reveal', () => {
  it('moving to a new section does not auto-add its NPCs to knownNpcs', () => {
    const sec1 = makeSection({ id: 'sec-1', title: 'Taverne', npcs: ['Gareth'] })
    const sec2 = makeSection({
      id: 'sec-2', title: 'Wald', npcs: ['Elara'],
      keywords: ['wald'], searchText: 'wald elara',
      location: 'Wald', chunkIndexes: [0],
    })
    const adventure = makeAdventure([sec1, sec2])

    const prev = createInitialSceneState(adventure)
    prev.playerKnowledge.knownNpcs = ['Gareth']

    // Transition to Wald — mention the place but NOT Elara
    const next = deriveSceneState({
      adventure, previousSceneState: prev,
      messages: [
        msg('user', 'Ich gehe in den Wald.'),
        msg('assistant', 'Du betrittst den dunklen Wald. Bäume ragen auf.'),
      ],
    })

    // Gareth should still be known (carry-forward)
    expect(next.playerKnowledge.knownNpcs).toContain('Gareth')
    // Elara should NOT be auto-known just from entering her section
    expect(next.playerKnowledge.knownNpcs).not.toContain('Elara')
  })
})
