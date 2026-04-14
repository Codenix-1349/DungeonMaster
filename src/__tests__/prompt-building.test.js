// ─── Prompt Building Tests ──────────────────────────────────────────────────
// Tests that the system prompt includes authoritative state correctly,
// marks inferred data as non-canonical, and includes failed-interaction hints.

import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '../services/openrouter.js'
import { normalizeAdventureEntry } from '../data/srd.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const BIRKENHAIN_MODULE_TEXT = readFileSync(resolve(__dirname, '../data/adventures/birkenhain_minimal_runtime_module.txt'), 'utf-8')

// ── Helpers ──

function makeCharacter() {
  return {
    name: 'Testheld', race: 'Mensch', class: 'Kämpfer', level: 3,
    currentHP: 25, maxHP: 28, armorClass: 16,
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 13, cha: 8 },
    skillProficiencies: ['athletics', 'perception'],
    inventory: [{ name: 'Langschwert', type: 'weapon', equipped: true, properties: { damageDice: '1d8+3' } }],
    spellSlots: null,
  }
}

function makeSceneState(overrides = {}) {
  return {
    version: 3, turnCount: 5,
    gmState: { currentSectionId: 'sec-1', plotFlags: { quest_started: true }, objectStates: {}, npcStates: {}, triggeredEvents: [], sectionVisitCounts: {} },
    playerKnowledge: { knownNpcs: ['Gareth'], knownPlaces: ['Taverne'], discoveredClues: ['Ein alter Schlüssel'], knownFactions: [], knownFacts: ['Der König ist tot'] },
    dialogueState: { activeNpcId: 'Gareth', npcRelations: { Gareth: { disposition: 'neutral', suspicion: 0, lastTopic: 'Hilfe' } } },
    inferred: {
      source: 'ai_inferred',
      npcStates: { Gareth: 'nervous' },
      objectStates: { Truhe: 'open' },
      dialogueHints: { Gareth: { dispositionTrend: 1, suspicionTrend: 0 } },
    },
    currentSectionTitle: 'Taverne', currentLocation: 'Taverne',
    currentObjective: 'Den Schlüssel finden.',
    activeQuest: 'Das Abenteuer bestehen.',
    lastPlayerAction: 'Mit Gareth sprechen.',
    memorySummary: 'Held betrat Taverne, sprach mit Gareth.',
    recentActions: [], interactionHistory: [],
    openThreads: ['Schlüssel finden'], notableElements: ['taverne'],
    ...overrides,
  }
}

function loadRuntimeAdventure() {
  return normalizeAdventureEntry({
    id: 'prompt-runtime-birkenhain',
    title: 'Birkenhain Minimal',
    text: BIRKENHAIN_MODULE_TEXT,
  })
}

// ── Tests ──

describe('Prompt — authoritative state in prompt', () => {
  it('includes player knowledge (clues, known places)', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    expect(prompt).toContain('Ein alter Schlüssel')
    expect(prompt).toContain('Taverne')
  })

  it('includes authoritative plot flags', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    expect(prompt).toContain('quest_started')
  })

  it('includes active dialogue context', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    expect(prompt).toContain('Gareth')
    expect(prompt).toContain('Gesprächspartner')
  })

  it('includes authoritative known facts when present', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    expect(prompt).toContain('Der König ist tot')
  })
})

describe('Prompt â€” runtime authoritative resolution mode', () => {
  it('describes app-resolved escalation outcomes without reopening authority to the model', () => {
    const prompt = buildSystemPrompt(
      makeCharacter(),
      loadRuntimeAdventure(),
      [{ role: 'user', content: 'Ich beleidige Mara.' }],
      null,
      makeSceneState({
        currentSectionTitle: 'Alte Brauerei',
        currentLocation: 'Birkenhain',
        dialogueState: {
          activeNpcId: 'mara',
          npcRelations: {
            mara: {
              disposition: 'wary',
              suspicion: 3,
              threat: 1,
              engagementState: 'warned',
              lastTopic: 'Ich beleidige Mara.',
            },
          },
        },
      }),
      'runtime_authoritative_resolution',
      {
        kind: 'escalation',
        intent: 'insult',
        outcome: 'warning',
        npcName: 'Mara Birken',
        consequence: 'Mara reagiert sofort gereizt und warnt dich scharf vor weiteren Beschimpfungen.',
      }
    )

    expect(prompt).toContain('Runtime-Freitextmodus: App-aufgeloest')
    expect(prompt).toContain('Mara Birken')
    expect(prompt).toContain('bereits autoritativ')
    expect(prompt).toContain('weiteren Beschimpfungen')
    expect(prompt).toContain('Status: warned')
  })
})

describe('Prompt — inferred data marked as non-canonical', () => {
  it('labels inferred section as not canonical', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    // The inferred section must be clearly marked as non-authoritative
    expect(prompt).toContain('nicht kanonisch')
  })

  it('includes inferred NPC observations in soft-hint section', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    // Gareth (nervous) should appear in the inferred section
    expect(prompt).toContain('Gareth')
    expect(prompt).toContain('nervous')
  })
})

describe('Prompt — failed interaction hint', () => {
  it('includes recent failed interactions as soft hint', () => {
    const sceneState = makeSceneState({
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 3,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, sceneState)

    expect(prompt).toContain('fehlgeschlagen')
    expect(prompt).toContain('Truhe untersuchen')
  })

  it('does NOT include old failed interactions (>5 turns ago)', () => {
    const sceneState = makeSceneState({
      turnCount: 10,
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-1', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 2,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, sceneState)

    expect(prompt).not.toContain('Truhe untersuchen')
  })

  it('does NOT include failed interactions from other sections', () => {
    const sceneState = makeSceneState({
      interactionHistory: [{
        id: 'int-1', sectionId: 'sec-OTHER', targetId: 'Truhe',
        skill: 'investigation', outcome: 'failure', turn: 3,
        label: 'Truhe untersuchen', kind: 'object',
        contextSnapshot: { clueCount: 0, npcCount: 1, itemCount: 0 },
      }],
    })

    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, sceneState)

    // Different section → should not appear
    expect(prompt).not.toContain('Truhe untersuchen')
  })
})

describe('Prompt — no legacy fallback leaks', () => {
  it('returns a non-empty prompt even without adventure or sceneState', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, null)

    expect(prompt.length).toBeGreaterThan(100)
    // Must not contain undefined or null strings
    expect(prompt).not.toContain('undefined')
    expect(prompt).not.toContain('null')
  })

  it('does not leak raw object representations', () => {
    const prompt = buildSystemPrompt(makeCharacter(), null, [], null, makeSceneState())

    expect(prompt).not.toContain('[object Object]')
  })
})

describe('Prompt â€” runtime flavor-only mode', () => {
  it('adds strict flavor-only instructions for unmatched runtime free text', () => {
    const prompt = buildSystemPrompt(
      makeCharacter(),
      loadRuntimeAdventure(),
      [{ role: 'user', content: 'Ich huepfe kurz in die Luft.' }],
      null,
      makeSceneState({
        currentSectionTitle: 'Alte Brauerei',
        currentLocation: 'Birkenhain',
      }),
      'runtime_flavor_only'
    )

    expect(prompt).toContain('Runtime-Freitextmodus: Flavor-only')
    expect(prompt).toContain('KEINE kanonischen Fakten')
    expect(prompt).toContain('keine echte Wirkung')
  })
})
