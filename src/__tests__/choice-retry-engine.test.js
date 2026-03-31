// ─── Choice & Retry Engine Tests ────────────────────────────────────────────
// Tests the choice layer: parsing, dedup, fallbacks, and retry filtering.

import { describe, it, expect } from 'vitest'
import { buildAvailableChoices, parseAiChoices, inferCheckFromLabel } from '../engine/choiceEngine.js'

// ── Helpers ──

function makeSection(overrides = {}) {
  return {
    id: 'sec-1', title: 'Taverne', npcs: ['Gareth'], interactiveObjects: ['Truhe'],
    exits: [{ label: 'Zum Wald', targetId: 'sec-2' }],
    suggestedActions: [], visibleFeatures: ['Tresen'],
    keywords: ['taverne'], searchText: 'taverne', ...overrides,
  }
}

function makeSceneState(overrides = {}) {
  return {
    version: 3, turnCount: 3,
    gmState: { currentSectionId: 'sec-1', plotFlags: {}, objectStates: {}, npcStates: {}, triggeredEvents: [], sectionVisitCounts: {} },
    playerKnowledge: { knownNpcs: ['Gareth'], knownPlaces: [], discoveredClues: [], knownFactions: [], knownFacts: [] },
    dialogueState: { activeNpcId: null, npcRelations: {} },
    inferred: { source: 'ai_inferred', npcStates: {}, objectStates: {}, dialogueHints: {} },
    recentActions: [], interactionHistory: [],
    currentObjective: 'Erkunden.', ...overrides,
  }
}

// ── AI Choice Parsing ──

describe('parseAiChoices', () => {
  it('parses numbered list from AI response', () => {
    const text = `Du stehst in der Taverne.\n1. Den Tresen untersuchen\n2. Mit dem Wirt sprechen\n3. Etwas anderes (beschreibe selbst)`
    const choices = parseAiChoices(text)

    expect(choices.length).toBe(3)
    expect(choices[0].label).toBe('Den Tresen untersuchen')
    expect(choices[0].source).toBe('ai')
    expect(choices[2].kind).toBe('free')
  })

  it('returns empty array when no numbered list found', () => {
    const choices = parseAiChoices('Du schaust dich um. Es ist dunkel.')
    expect(choices).toEqual([])
  })

  it('extracts PROBE_HINWEIS tags and strips them from label', () => {
    const text = '1. Die Tür aufbrechen [PROBE_HINWEIS:athletics|SG:14]'
    const choices = parseAiChoices(text)

    expect(choices[0].label).toBe('Die Tür aufbrechen')
    expect(choices[0].check).toEqual({ skillOrAbility: 'athletics', dc: 14, advantage: null })
  })

  it('deduplicates identical labels (case-insensitive)', () => {
    const text = '1. Den Raum untersuchen\n2. Den raum untersuchen\n3. Etwas anderes'
    const choices = parseAiChoices(text)

    const labels = choices.map(c => c.label.toLowerCase())
    expect(new Set(labels).size).toBe(labels.length)
  })
})

// ── inferCheckFromLabel ──

describe('inferCheckFromLabel', () => {
  it('infers investigation for "untersuchen"', () => {
    const check = inferCheckFromLabel('Den Raum sorgfältig untersuchen')
    expect(check).not.toBeNull()
    expect(check.skillOrAbility).toBe('investigation')
  })

  it('returns null for trivial actions (gehen, warten)', () => {
    expect(inferCheckFromLabel('Weiter gehen')).toBeNull()
    expect(inferCheckFromLabel('Warte hier')).toBeNull()
    expect(inferCheckFromLabel('Verlasse den Raum')).toBeNull()
  })

  it('infers stealth for "schleichen"', () => {
    const check = inferCheckFromLabel('Ich schleiche an der Wache vorbei')
    expect(check).not.toBeNull()
    expect(check.skillOrAbility).toBe('stealth')
  })
})

// ── buildAvailableChoices — fallback behavior ──

describe('buildAvailableChoices — fallbacks', () => {
  it('produces choices even when AI returns no numbered list', () => {
    const choices = buildAvailableChoices({
      aiResponse: 'Der Raum ist dunkel und still.',
      section: makeSection(),
      sceneState: makeSceneState(),
    })

    expect(choices.length).toBeGreaterThan(0)
    // Must include free-form option
    expect(choices.some(c => c.kind === 'free')).toBe(true)
  })

  it('returns empty when combat is active', () => {
    const choices = buildAvailableChoices({
      aiResponse: '1. Angreifen\n2. Fliehen',
      section: makeSection(),
      sceneState: makeSceneState(),
      combatActive: true,
    })
    expect(choices).toEqual([])
  })
})

// ── Semantic Deduplication ──

describe('buildAvailableChoices — semantic dedup', () => {
  it('merges AI and structured choice targeting the same NPC', () => {
    const section = makeSection()
    const sceneState = makeSceneState()
    const aiText = '1. Mit Gareth sprechen\n2. Die Truhe öffnen\n3. Etwas anderes'

    const choices = buildAvailableChoices({ aiResponse: aiText, section, sceneState })

    // Should not have two "Mit Gareth sprechen" variants
    const garethChoices = choices.filter(c =>
      c.label.toLowerCase().includes('gareth')
    )
    expect(garethChoices.length).toBe(1)
  })
})

// ── Retry Filter ──

describe('buildAvailableChoices — retry filter', () => {
  it('suppresses structured choice with exact target match after failure', () => {
    // Structured choices have an explicit target — strong match → suppress
    const section = makeSection({ interactiveObjects: ['Truhe'] })
    const sceneState = makeSceneState({
      turnCount: 3,
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    // No AI choices — only structured
    const choices = buildAvailableChoices({
      aiResponse: 'Du stehst in der Taverne.',
      section, sceneState,
    })

    // Structured "Truhe untersuchen" (target: 'Truhe') should be suppressed
    const truheChoice = choices.find(c => c.target === 'Truhe' && c.kind === 'object')
    expect(truheChoice).toBeUndefined()
  })

  it('deprioritizes AI choice with weak label match after failure', () => {
    // AI choices have target=null, so matching is weak → deprioritize, not suppress
    const section = makeSection({ interactiveObjects: [] }) // no structured Truhe choice
    const sceneState = makeSceneState({
      turnCount: 3,
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const choices = buildAvailableChoices({
      aiResponse: '1. Die Truhe genauer untersuchen [PROBE_HINWEIS:investigation|SG:12]\n2. Zum Wald gehen\n3. Etwas anderes',
      section, sceneState,
    })

    // AI choice is still present but deprioritized (priority +40)
    const truheChoice = choices.find(c => c.label.toLowerCase().includes('truhe'))
    expect(truheChoice).toBeDefined()
    expect(truheChoice.priority).toBeGreaterThanOrEqual(50) // base 10 + 40 deprioritize
  })

  it('allows retry with different skill on same target (new approach)', () => {
    const section = makeSection({ interactiveObjects: ['Truhe'] })
    const sceneState = makeSceneState({
      turnCount: 3,
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const choices = buildAvailableChoices({
      aiResponse: '1. Die Truhe aufbrechen [PROBE_HINWEIS:athletics|SG:14]\n2. Zum Wald gehen\n3. Etwas anderes',
      section, sceneState,
    })

    // athletics ≠ investigation → should be allowed
    const truheAthletics = choices.find(c =>
      c.label.toLowerCase().includes('truhe') && c.check?.skillOrAbility === 'athletics'
    )
    expect(truheAthletics).toBeDefined()
  })

  it('allows retry after context change (new clues)', () => {
    const section = makeSection({ interactiveObjects: ['Truhe'] })
    const sceneState = makeSceneState({
      turnCount: 4,
      playerKnowledge: { knownNpcs: ['Gareth'], knownPlaces: [], discoveredClues: ['Ein Schlüssel liegt unter dem Tresen'], knownFactions: [], knownFacts: [] },
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const choices = buildAvailableChoices({
      aiResponse: '1. Die Truhe erneut untersuchen [PROBE_HINWEIS:investigation|SG:12]\n2. Zum Wald gehen\n3. Etwas anderes',
      section, sceneState,
    })

    // clueCount was 0 at failure, now 1 → context changed → should be allowed
    const truhe = choices.find(c => c.label.toLowerCase().includes('truhe'))
    expect(truhe).toBeDefined()
  })

  it('allows retry after section transition', () => {
    const section = makeSection({ interactiveObjects: ['Truhe'] })
    const sceneState = makeSceneState({
      turnCount: 4,
      gmState: { currentSectionId: 'sec-2', plotFlags: {}, objectStates: {}, npcStates: {}, triggeredEvents: [], sectionVisitCounts: {} },
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const choices = buildAvailableChoices({
      aiResponse: '1. Die Truhe untersuchen [PROBE_HINWEIS:investigation|SG:12]\n2. Etwas anderes',
      section, sceneState,
    })

    // Different section → context changed
    const truhe = choices.find(c => c.label.toLowerCase().includes('truhe'))
    expect(truhe).toBeDefined()
  })

  it('allows retry after ≥5 turns (fallback)', () => {
    const section = makeSection({ interactiveObjects: ['Truhe'] })
    const sceneState = makeSceneState({
      turnCount: 8,
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const choices = buildAvailableChoices({
      aiResponse: '1. Die Truhe untersuchen [PROBE_HINWEIS:investigation|SG:12]\n2. Etwas anderes',
      section, sceneState,
    })

    // 8 - 2 = 6 turns → ≥5 → allowed
    const truhe = choices.find(c => c.label.toLowerCase().includes('truhe'))
    expect(truhe).toBeDefined()
  })

  it('free-form option is never suppressed by retry filter', () => {
    const sceneState = makeSceneState({
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: null,
        skill: 'perception', outcome: 'failure', turn: 2,
        label: 'Etwas anderes', kind: 'free',
        contextSnapshot: { clueCount: 0, npcCount: 0, itemCount: 0 },
      }],
    })

    const choices = buildAvailableChoices({
      aiResponse: '1. Weiter gehen\n2. Etwas anderes',
      section: makeSection(), sceneState,
    })

    expect(choices.some(c => c.kind === 'free')).toBe(true)
  })
})
