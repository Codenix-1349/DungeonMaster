// ─── Dynamic Interaction Layer Tests ────────────────────────────────────────
// Tests the engine-driven reveal system: section.reveals[] → resolveReveals →
// applyReveals → runtimeDiscoveries → choiceEngine integration.
// Truth comes from adventure data, NOT from AI narration.

import { describe, it, expect } from 'vitest'
import { resolveReveals, applyReveals, createInitialSceneState } from '../data/srd.js'
import { buildAvailableChoices, buildStructuredChoices_test } from '../engine/choiceEngine.js'

// ── Test Fixtures ──

const SECTION_WITH_REVEALS = {
  id: 'sec-tavern',
  title: 'Taverne',
  index: 0,
  summary: 'Eine Taverne mit Tresen.',
  location: 'Taverne',
  objective: 'Die Taverne erkunden.',
  npcs: [],
  interactiveObjects: ['Tresen'],
  exits: [],
  keywords: ['taverne', 'tresen'],
  searchText: 'taverne tresen',
  visibleFeatures: ['Ein langer Tresen'],
  setsOnEntry: [],
  chunkIndexes: [0],
  reveals: [
    {
      id: 'metallplatte',
      label: 'Vibrierende Metallplatte',
      trigger: 'Tresen',
      kind: 'object',
      actions: [
        { label: 'Metallplatte öffnen', check: { skill: 'athletics', dc: 12 } },
        { label: 'Metallplatte untersuchen', check: { skill: 'investigation', dc: 10 } },
      ],
    },
    {
      id: 'pergament',
      label: 'Altes Pergament',
      trigger: 'metallplatte',
      kind: 'object',
      actions: [
        { label: 'Pergament lesen' },
        { label: 'Pergament nehmen' },
      ],
    },
  ],
}

function makeSceneState(overrides = {}) {
  return {
    version: 3,
    turnCount: 3,
    gmState: {
      currentSectionId: 'sec-tavern',
      plotFlags: {},
      objectStates: {},
      npcStates: {},
      triggeredEvents: [],
      sectionVisitCounts: { 'sec-tavern': 1 },
      runtimeDiscoveries: [],
      ...(overrides.gmState || {}),
    },
    playerKnowledge: { knownNpcs: [], knownPlaces: ['Taverne'], discoveredClues: [], knownFactions: [], knownFacts: [] },
    dialogueState: { activeNpcId: null, npcRelations: {} },
    memorySummary: '',
    inferred: { source: 'ai_inferred', npcStates: {}, objectStates: {}, dialogueHints: {} },
    currentSectionTitle: 'Taverne',
    recentActions: [],
    interactionHistory: [],
    ...(overrides),
    // Re-apply gmState after spread to merge nested
    gmState: {
      currentSectionId: 'sec-tavern',
      plotFlags: {},
      objectStates: {},
      npcStates: {},
      triggeredEvents: [],
      sectionVisitCounts: { 'sec-tavern': 1 },
      runtimeDiscoveries: [],
      ...(overrides.gmState || {}),
    },
  }
}

// ── resolveReveals Tests ──

describe('resolveReveals', () => {
  it('returns matching reveals when target matches trigger', () => {
    const scene = makeSceneState()
    const matched = resolveReveals(SECTION_WITH_REVEALS, scene, 'Tresen')
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe('metallplatte')
    expect(matched[0].label).toBe('Vibrierende Metallplatte')
  })

  it('is case-insensitive on trigger match', () => {
    const scene = makeSceneState()
    const matched = resolveReveals(SECTION_WITH_REVEALS, scene, 'tresen')
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe('metallplatte')
  })

  it('does not return already discovered reveals', () => {
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-tavern', label: 'Vibrierende Metallplatte', visible: true, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const matched = resolveReveals(SECTION_WITH_REVEALS, scene, 'Tresen')
    expect(matched).toHaveLength(0)
  })

  it('resolves chained reveals via parent revealId', () => {
    // Metallplatte already discovered → interacting with it should reveal Pergament
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-tavern', label: 'Vibrierende Metallplatte', visible: true, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const matched = resolveReveals(SECTION_WITH_REVEALS, scene, 'Vibrierende Metallplatte')
    expect(matched).toHaveLength(1)
    expect(matched[0].id).toBe('pergament')
  })

  it('returns empty array when no reveals exist', () => {
    const sectionNoReveals = { ...SECTION_WITH_REVEALS, reveals: [] }
    const matched = resolveReveals(sectionNoReveals, makeSceneState(), 'Tresen')
    expect(matched).toHaveLength(0)
  })

  it('returns empty array when no target provided', () => {
    const matched = resolveReveals(SECTION_WITH_REVEALS, makeSceneState(), '')
    expect(matched).toHaveLength(0)
  })
})

// ── applyReveals Tests ──

describe('applyReveals', () => {
  it('adds new entries to runtimeDiscoveries', () => {
    const scene = makeSceneState()
    const reveals = [SECTION_WITH_REVEALS.reveals[0]]
    const updated = applyReveals(scene, reveals)

    expect(updated.gmState.runtimeDiscoveries).toHaveLength(1)
    const entry = updated.gmState.runtimeDiscoveries[0]
    expect(entry.revealId).toBe('metallplatte')
    expect(entry.label).toBe('Vibrierende Metallplatte')
    expect(entry.source).toBe('engine')
    expect(entry.visible).toBe(true)
    expect(entry.state).toBe('revealed')
    expect(entry.sectionId).toBe('sec-tavern')
  })

  it('preserves existing discoveries when adding new ones', () => {
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-tavern', label: 'Vibrierende Metallplatte', visible: true, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const reveals = [SECTION_WITH_REVEALS.reveals[1]]
    const updated = applyReveals(scene, reveals)

    expect(updated.gmState.runtimeDiscoveries).toHaveLength(2)
    expect(updated.gmState.runtimeDiscoveries[0].revealId).toBe('metallplatte')
    expect(updated.gmState.runtimeDiscoveries[1].revealId).toBe('pergament')
  })

  it('returns unchanged sceneState when no reveals matched', () => {
    const scene = makeSceneState()
    const result = applyReveals(scene, [])
    expect(result).toBe(scene)
  })
})

// ── Choice Engine Integration ──

describe('choiceEngine reads runtimeDiscoveries', () => {
  it('generates choices from revealed object actions', () => {
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-tavern', label: 'Vibrierende Metallplatte', kind: 'object', visible: true, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const choices = buildAvailableChoices({
      aiResponse: '',
      section: SECTION_WITH_REVEALS,
      sceneState: scene,
    })

    // Should include choices from the metallplatte actions
    const revealChoices = choices.filter(c => c.id.startsWith('reveal-'))
    expect(revealChoices.length).toBeGreaterThanOrEqual(1)
    // Check that reveal choices have high priority (lower number = higher priority)
    for (const rc of revealChoices) {
      expect(rc.priority).toBeLessThanOrEqual(10)
      expect(rc.source).toBe('structured')
      expect(rc.target).toBe('Vibrierende Metallplatte')
    }
  })

  it('does not generate choices for invisible discoveries', () => {
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-other', label: 'Vibrierende Metallplatte', kind: 'object', visible: false, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const choices = buildAvailableChoices({
      aiResponse: '',
      section: SECTION_WITH_REVEALS,
      sceneState: scene,
    })
    const revealChoices = choices.filter(c => c.id.startsWith('reveal-'))
    expect(revealChoices).toHaveLength(0)
  })

  it('reveal choices have higher priority than static object choices', () => {
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-tavern', label: 'Vibrierende Metallplatte', kind: 'object', visible: true, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const choices = buildAvailableChoices({
      aiResponse: '',
      section: SECTION_WITH_REVEALS,
      sceneState: scene,
    })
    const revealChoice = choices.find(c => c.id.startsWith('reveal-'))
    const staticObjChoice = choices.find(c => c.id.startsWith('obj-'))
    if (revealChoice && staticObjChoice) {
      expect(revealChoice.priority).toBeLessThan(staticObjChoice.priority)
    }
  })

  it('reveal actions carry correct check data from adventure definition', () => {
    const scene = makeSceneState({
      gmState: {
        runtimeDiscoveries: [
          { revealId: 'metallplatte', sectionId: 'sec-tavern', label: 'Vibrierende Metallplatte', kind: 'object', visible: true, state: 'revealed', source: 'engine' },
        ],
      },
    })
    const choices = buildAvailableChoices({
      aiResponse: '',
      section: SECTION_WITH_REVEALS,
      sceneState: scene,
    })
    const openChoice = choices.find(c => c.label === 'Metallplatte öffnen')
    expect(openChoice).toBeDefined()
    expect(openChoice.check).toEqual({ skillOrAbility: 'athletics', dc: 12, advantage: null })
  })
})

// ── Full Chain: Reveal → Apply → Choice ──

describe('full reveal chain', () => {
  it('successful interaction triggers reveal which produces new choices', () => {
    // Step 1: Player examines Tresen → resolveReveals finds metallplatte
    const scene = makeSceneState()
    const matched = resolveReveals(SECTION_WITH_REVEALS, scene, 'Tresen')
    expect(matched).toHaveLength(1)

    // Step 2: Engine applies the reveal
    const updated = applyReveals(scene, matched)
    expect(updated.gmState.runtimeDiscoveries).toHaveLength(1)

    // Step 3: Choice engine now offers metallplatte actions
    const choices = buildAvailableChoices({
      aiResponse: '',
      section: SECTION_WITH_REVEALS,
      sceneState: updated,
    })
    const metallplatteChoices = choices.filter(c => c.target === 'Vibrierende Metallplatte')
    expect(metallplatteChoices.length).toBeGreaterThanOrEqual(1)

    // Step 4: Interacting with metallplatte → reveals pergament (chained)
    const matched2 = resolveReveals(SECTION_WITH_REVEALS, updated, 'Vibrierende Metallplatte')
    expect(matched2).toHaveLength(1)
    expect(matched2[0].id).toBe('pergament')

    const updated2 = applyReveals(updated, matched2)
    expect(updated2.gmState.runtimeDiscoveries).toHaveLength(2)

    // Step 5: Choice engine now offers pergament actions
    const choices2 = buildAvailableChoices({
      aiResponse: '',
      section: SECTION_WITH_REVEALS,
      sceneState: updated2,
    })
    const pergamentChoices = choices2.filter(c => c.target === 'Altes Pergament')
    expect(pergamentChoices.length).toBeGreaterThanOrEqual(1)
    expect(pergamentChoices.some(c => c.label === 'Pergament lesen')).toBe(true)
  })
})
