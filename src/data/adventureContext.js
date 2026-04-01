import { normalizeAdventureEntry, truncateText, tokenizeText } from './adventureParser'
import { findSectionById, selectRelevantChunks, deriveSceneState, SCENE_STATE_VERSION } from './sceneState'

// ─── Structured adventure: compact AI context builder ────────────────────────

function buildStructuredAdventureContext(structure, sceneState) {
  const section = findSectionById(structure, sceneState?.gmState?.currentSectionId) || structure.sections[0]
  if (!section) return { text: 'Kein Abenteuerabschnitt verfügbar.', selectedIndexes: [], sectionTitle: '' }

  const lines = []
  lines.push(`## Aktuelle Szene: ${section.title}`)
  if (section.type) lines.push(`TYP: ${section.type}`)
  if (section.objective) lines.push(`ZIEL: ${section.objective}`)

  // Visible elements — ONLY these may be described to the player
  if (section.visibleFeatures?.length) lines.push(`SICHTBAR (nur diese Dinge existieren hier): ${section.visibleFeatures.join(' | ')}`)

  // NPC visibility: split into known (player has encountered) and hidden
  const knownNpcs = sceneState?.playerKnowledge?.knownNpcs || []
  const sectionNpcs = section.npcs || []
  const visibleNpcs = sectionNpcs.filter(npc => knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
  const hiddenNpcs = sectionNpcs.filter(npc => !knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
  if (visibleNpcs.length) lines.push(`ANWESENDE NPCS (nur diese sind hier, keine anderen erfinden): ${visibleNpcs.join(' | ')}`)

  if (section.enemies?.length) lines.push(`GEGNER: ${section.enemies.join(' | ')}`)
  if (section.exits?.length) {
    lines.push(`AUSGÄNGE: ${section.exits.map(e => e.label).join(' | ')}`)
  }
  if (section.interactiveObjects?.length) lines.push(`OBJEKTE: ${section.interactiveObjects.join(' | ')}`)
  if (section.openThreads?.length) lines.push(`FÄDEN: ${section.openThreads.join(' | ')}`)
  if (section.suggestedActions?.length) lines.push(`VORGESCHLAGENE AKTIONEN: ${section.suggestedActions.join(' | ')}`)

  // Internal GM instructions — the AI must follow these but NEVER reveal them directly
  const internal = []
  if (hiddenNpcs.length) internal.push(`NOCH NICHT SICHTBARE NPCS (erst natürlich einführen wenn Spieler sie entdeckt/anspricht/auf sie trifft): ${hiddenNpcs.join(' | ')}`)
  if (section.transitionRules?.length) internal.push(`ÜBERGANGSREGELN: ${section.transitionRules.join(' | ')}`)
  if (section.clues?.length) internal.push(`ENTDECKBARE HINWEISE (NUR enthüllen wenn Spieler aktiv sucht/fragt — NIEMALS vorweg verraten): ${section.clues.join(' | ')}`)
  if (internal.length) {
    lines.push(`\n## Interne Spielleiter-Anweisungen (NICHT dem Spieler mitteilen)`)
    lines.push(...internal)
  }

  // Scene text as prose for atmosphere
  if (section.sceneText) lines.push(`\n${section.sceneText}`)

  // Neighboring exits — title only, no objectives (avoids spoilers)
  const exitSections = section.exits
    ?.map(e => structure.sections.find(s => s.id === e.targetId))
    .filter(Boolean) || []
  if (exitSections.length) {
    lines.push(`\nNÄCHSTE SZENEN: ${exitSections.map(s => s.title).join(' | ')}`)
  }

  return {
    text: lines.join('\n'),
    selectedIndexes: section.chunkIndexes || [section.index],
    sectionTitle: section.title,
    module: structure.module || null,
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
  }
}
