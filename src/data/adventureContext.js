import { normalizeAdventureEntry, truncateText, tokenizeText } from './adventureParser'
import { findSectionById, selectRelevantChunks, deriveSceneState, SCENE_STATE_VERSION } from './sceneState'
import { getAllowedSectionExits, getVisibleRuntimeNpcs, isRuntimeStructure } from './runtimeModule'
import { buildAvailableChoices } from '../engine/choiceEngine'

// ─── Structured adventure: compact AI context builder ────────────────────────

function collectVisibleRuntimeChoiceLabels(section, sceneState) {
  const choices = buildAvailableChoices({
    aiResponse: '',
    section,
    sceneState,
    isRuntimeModule: true,
  })
  const structuredChoices = choices.filter(choice => choice.source === 'structured' && choice.kind !== 'free')

  return {
    exitLabels: structuredChoices
      .filter(choice => choice.kind === 'exit')
      .map(choice => choice.label),
    interactionLabels: structuredChoices
      .filter(choice => choice.kind !== 'exit')
      .map(choice => choice.label),
  }
}

function getAllowedRuntimeInteractions(section, sceneState) {
  return collectVisibleRuntimeChoiceLabels(section, sceneState).interactionLabels
    .map(label => ({ label }))
}

function buildStructuredAdventureContext(structure, sceneState) {
  const section = findSectionById(structure, sceneState?.gmState?.currentSectionId) || structure.sections[0]
  if (!section) return { text: 'Kein Abenteuerabschnitt verfügbar.', selectedIndexes: [], sectionTitle: '' }

  const isRuntimeModule = isRuntimeStructure(structure)
  const playerFacingObjective = isRuntimeModule
    ? (section.playerObjective || section.objective || '')
    : (section.objective || '')
  const playerFacingIntro = isRuntimeModule
    ? (section.introText || section.sceneText || '')
    : (section.sceneText || '')
  const playerFacingPrimaryObjective = isRuntimeModule
    ? (structure.module?.playerPrimaryObjective || structure.module?.primaryObjective || '')
    : ''
  const allowedExits = getAllowedSectionExits(section, sceneState)
  const lines = []
  lines.push(`## Aktuelle Szene: ${section.title}`)
  if (playerFacingPrimaryObjective) lines.push(`AUFTRAG: ${playerFacingPrimaryObjective}`)
  if (section.type) lines.push(`TYP: ${section.type}`)
  if (playerFacingObjective) lines.push(`ZIEL: ${playerFacingObjective}`)

  // Visible elements — ONLY these may be described to the player
  if (section.visibleFeatures?.length) lines.push(`SICHTBAR (nur diese Dinge existieren hier): ${section.visibleFeatures.join(' | ')}`)

  // NPC visibility: split into known (player has encountered) and hidden
  // Phase 3: respect gmState — dead/fled NPCs are no longer "present"
  const knownNpcs = sceneState?.playerKnowledge?.knownNpcs || []
  const npcStates = sceneState?.gmState?.npcStates || {}
  const sectionNpcs = section.npcs || []
  const visibleNpcEntries = isRuntimeModule
    ? getVisibleRuntimeNpcs(structure, section, sceneState)
    : sectionNpcs
      .filter(npc => knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
      .filter(npc => !['dead', 'fled'].includes(npcStates[npc]))
      .map(npc => ({ name: npc, presence: npcStates[npc] || null }))
  const visibleNpcs = visibleNpcEntries.map(entry => entry.name)
  const absentNpcs = isRuntimeModule
    ? []
    : sectionNpcs
      .filter(npc => knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
      .filter(npc => ['dead', 'fled'].includes(npcStates[npc]))
  const hiddenNpcs = sectionNpcs.filter(npc => !knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
  if (visibleNpcs.length) lines.push(`ANWESENDE NPCS (nur diese sind hier, keine anderen erfinden): ${visibleNpcs.join(' | ')}`)
  if (absentNpcs.length) lines.push(`NICHT MEHR ANWESEND: ${absentNpcs.map(npc => `${npc} (${npcStates[npc]})`).join(' | ')}`)

  if (section.enemies?.length) lines.push(`GEGNER: ${section.enemies.join(' | ')}`)
  if (allowedExits.length) {
    lines.push(`AUSGÄNGE: ${allowedExits.map(e => e.label).join(' | ')}`)
  }
  if (section.interactiveObjects?.length) {
    // Phase 3: annotate objects with authoritative state from gmState
    const objectStates = sceneState?.gmState?.objectStates || {}
    const objLabels = section.interactiveObjects.map(obj => {
      const state = objectStates[obj]
      return state ? `${obj} (${state})` : obj
    })
    lines.push(`OBJEKTE: ${objLabels.join(' | ')}`)
  }
  // Runtime objects (new module format) + legacy runtime discoveries
  const rtObjects = Object.values(sceneState?.gmState?.runtimeObjects || {}).filter(o => o.visible)
  const visibleDiscoveries = (sceneState?.gmState?.runtimeDiscoveries || []).filter(d => d.visible)
  const allRuntimeObjs = [...rtObjects.map(o => ({ label: o.label, state: o.state })), ...visibleDiscoveries.map(d => ({ label: d.label, state: d.state }))]
  if (allRuntimeObjs.length) {
    lines.push(`ENTDECKTE OBJEKTE (Engine-Truth): ${allRuntimeObjs.map(o => {
      const state = o.state && o.state !== 'revealed' ? ` (${o.state})` : ''
      return `${o.label}${state}`
    }).join(' | ')}`)
  }

  if (isRuntimeModule) {
    const allowedInteractions = getAllowedRuntimeInteractions(section, sceneState)
    if (allowedInteractions.length) {
      lines.push(`ERLAUBTE INTERAKTIONEN (nur diese sind aktuell spielbar): ${allowedInteractions.map(interaction => interaction.label).join(' | ')}`)
    }
  } else {
    if (section.openThreads?.length) lines.push(`FÄDEN: ${section.openThreads.join(' | ')}`)
    if (section.suggestedActions?.length) lines.push(`VORGESCHLAGENE AKTIONEN: ${section.suggestedActions.join(' | ')}`)
  }

  // Phase 3: explicit engine-confirmed state summary — AI must respect this as ground truth
  const confirmedParts = []
  if (visibleNpcs.length) confirmedParts.push(`NPCs hier: ${visibleNpcs.join(', ')}`)
  if (absentNpcs.length) confirmedParts.push(`Weg: ${absentNpcs.map(n => `${n} (${npcStates[n]})`).join(', ')}`)
  const objectStates = sceneState?.gmState?.objectStates || {}
  const changedObjects = section.interactiveObjects?.filter(o => objectStates[o]) || []
  if (changedObjects.length) confirmedParts.push(`Objekte: ${changedObjects.map(o => `${o} (${objectStates[o]})`).join(', ')}`)
  const discoveredClues = sceneState?.playerKnowledge?.discoveredClues || []
  if (allRuntimeObjs.length) confirmedParts.push(`Entdeckte Objekte: ${allRuntimeObjs.map(o => o.label).join(', ')}`)
  if (discoveredClues.length) confirmedParts.push(`Bekannte Hinweise: ${discoveredClues.slice(0, 3).join(', ')}`)
  if (confirmedParts.length) {
    lines.push(`\n## Bestätigter Weltzustand (Engine-Truth — NICHT ignorieren)`)
    lines.push(confirmedParts.join('\n'))
  }

  if (!isRuntimeModule) {
    const internal = []

    // Hidden NPCs: limit to max 2 to reduce leakage risk (prose only)
    if (hiddenNpcs.length) {
      const limitedHidden = hiddenNpcs.slice(0, 2)
      internal.push(`MÖGLICHE BEGEGNUNG (erst einführen wenn Spieler sie trifft/entdeckt): ${limitedHidden.join(' | ')}`)
    }

    if (section.transitionRules?.length) internal.push(`ÜBERGANGSREGELN: ${section.transitionRules.join(' | ')}`)

    // Clues: only send those NOT yet discovered (prose only)
    const undiscoveredClues = (section.clues || []).filter(clue => {
      const clueWords = clue.toLowerCase().split(/\s+/).filter(w => w.length >= 4)
      return !discoveredClues.some(dc => {
        const dcLower = dc.toLowerCase()
        return clueWords.filter(w => dcLower.includes(w)).length >= Math.ceil(clueWords.length * 0.4)
      })
    })
    if (undiscoveredClues.length) {
      const limitedClues = undiscoveredClues.slice(0, 2)
      internal.push(`ENTDECKBARE HINWEISE (NUR bei aktivem Suchen/Untersuchen enthüllen, NIEMALS ungefragt): ${limitedClues.join(' | ')}`)
    }

    if (internal.length) {
      lines.push(`\n## Interne Spielleiter-Anweisungen (NICHT dem Spieler mitteilen)`)
      lines.push(...internal)
    }

    // Neighboring exits — title only (prose only, spoiler risk for runtime modules)
    const exitSections = allowedExits
      ?.map(e => structure.sections.find(s => s.id === e.targetId))
      .filter(Boolean) || []
    if (exitSections.length) {
      lines.push(`\nNÄCHSTE SZENEN: ${exitSections.map(s => s.title).join(' | ')}`)
    }
  }

  // Scene text as prose for atmosphere
  if (playerFacingIntro) lines.push(`\n${playerFacingIntro}`)

  return {
    text: lines.join('\n'),
    selectedIndexes: section.chunkIndexes || [section.index],
    sectionTitle: section.title,
    module: structure.module || null,
    runtimeModule: isRuntimeModule,
  }
}

export function buildRelevantAdventureContext({ adventure, sceneState = null, messages = [], combat = null } = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
  if (!structure?.sections?.length) {
    return {
      text: normalizedAdventure?.text ? truncateText(normalizedAdventure.text, 1800) : 'Kein Text verfügbar',
      selectedIndexes: [],
      sectionTitle: normalizedAdventure?.title || 'Abenteuer',
      runtimeModule: false,
    }
  }

  const effectiveSceneState = sceneState?.version === SCENE_STATE_VERSION
    ? sceneState
    : deriveSceneState({ adventure: normalizedAdventure, previousSceneState: sceneState, messages, combat })

  // ── Structured adventures: compact key-value format ──
  if (structure.format === 'structured') {
    return buildStructuredAdventureContext(structure, effectiveSceneState)
  }

  // ── Prose adventures: existing chunk-based logic ──
  const currentSection = findSectionById(structure, effectiveSceneState.gmState?.currentSectionId) || structure.sections[0]
  const selectedChunks = (effectiveSceneState.relevantChunkIndexes || [])
    .map(index => structure.chunks[index])
    .filter(Boolean)

  const fallbackChunks = selectedChunks.length > 0
    ? selectedChunks
    : selectRelevantChunks(structure, currentSection, tokenizeText(messages.map(message => message.content).join(' '), 4), combat?.active ? 3 : 2)

  const chunkText = fallbackChunks
    .slice(0, combat?.active ? 3 : 2)
    .map(chunk => `### Auszug ${chunk.index + 1}\n${chunk.text}`)
    .join('\n\n')

  const neighborSection = structure.sections[currentSection.index + 1] || structure.sections[currentSection.index - 1] || null
  const neighborHint = neighborSection
    ? `\n\n### Benachbarter Abschnitt\n${neighborSection.title}: ${neighborSection.summary}`
    : ''

  return {
    text: `### Aktueller Abenteuerabschnitt\n${currentSection.title}: ${currentSection.summary}\n\n${chunkText}${neighborHint}`.trim(),
    selectedIndexes: fallbackChunks.map(chunk => chunk.index),
    sectionTitle: currentSection.title,
    runtimeModule: false,
  }
}
