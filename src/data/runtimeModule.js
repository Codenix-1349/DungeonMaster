function hasEntries(value) {
  return Boolean(value && typeof value === 'object' && Object.keys(value).length > 0)
}

export function isRuntimeStructure(structure) {
  if (structure?.format !== 'structured') return false
  if (structure?.module?.runtimeMode === 'engine') return true
  return (
    hasEntries(structure?.module?.npcRegistry) ||
    hasEntries(structure?.module?.clueRegistry) ||
    hasEntries(structure?.module?.objectRegistry)
  )
}

export function normalizeRuntimeNpcState(rawState) {
  if (!rawState) return {}
  return typeof rawState === 'string'
    ? { state: rawState }
    : rawState
}

export function resolveRuntimeNpcId(structure, npcIdOrName = '') {
  const registry = structure?.module?.npcRegistry || {}
  const raw = String(npcIdOrName || '').trim()
  if (!raw) return null
  if (registry[raw]) return raw

  const normalized = raw.toLowerCase()
  const match = Object.entries(registry).find(([npcId, def]) => (
    npcId.toLowerCase() === normalized ||
    String(def?.name || '').toLowerCase() === normalized
  ))

  return match?.[0] || null
}

export function getRuntimeNpcDisplayName(structure, npcIdOrName = '') {
  const registry = structure?.module?.npcRegistry || {}
  const raw = String(npcIdOrName || '').trim()
  if (!raw) return ''
  if (registry[raw]?.name) return registry[raw].name

  const resolvedId = resolveRuntimeNpcId(structure, raw)
  return resolvedId ? (registry[resolvedId]?.name || resolvedId) : raw
}

export function getRuntimeNpcPresence(rawState) {
  const state = normalizeRuntimeNpcState(rawState)
  return state.state || state.status || null
}

export function buildInitialRuntimeNpcStates(structure) {
  if (!isRuntimeStructure(structure)) return {}

  const registry = structure?.module?.npcRegistry || {}
  const states = {}

  for (const [npcId, definition] of Object.entries(registry)) {
    if (definition?.currentlyVisible !== true) continue
    states[npcId] = {
      currentlyVisible: true,
      sectionId: definition?.firstSeen || null,
    }
  }

  return states
}

export function getVisibleRuntimeNpcs(structure, section, sceneState) {
  if (!isRuntimeStructure(structure) || !section) return []

  const registry = structure.module?.npcRegistry || {}
  const currentSectionId = section.id || sceneState?.gmState?.currentSectionId || null
  const visibleIds = new Set(section.visibleNpcs || [])
  const npcStates = sceneState?.gmState?.npcStates || {}

  for (const [npcId, rawState] of Object.entries(npcStates)) {
    const state = normalizeRuntimeNpcState(rawState)
    if (state.currentlyVisible !== true) continue
    if (state.sectionId && currentSectionId && state.sectionId !== currentSectionId) continue
    visibleIds.add(npcId)
  }

  return [...visibleIds]
    .map(npcId => {
      const state = normalizeRuntimeNpcState(npcStates[npcId])
      return {
        id: npcId,
        name: registry[npcId]?.name || npcId,
        state,
        presence: getRuntimeNpcPresence(state),
      }
    })
    .filter(entry => entry.state.currentlyVisible !== false)
    .filter(entry => !['dead', 'fled'].includes(entry.presence))
}

function passesFlagGates(entry, plotFlags = {}) {
  if (entry?.requiresFlags?.length && !entry.requiresFlags.every(flag => plotFlags[flag])) return false
  if (entry?.blocksIfFlags?.length && entry.blocksIfFlags.some(flag => plotFlags[flag])) return false
  return true
}

function isNpcTalkInteractionBlocked(interaction, sceneState) {
  if (interaction?.kind !== 'talk' || !interaction?.target) return false

  const relation = sceneState?.dialogueState?.npcRelations?.[interaction.target]
  const engagementState = String(relation?.engagementState || 'open').toLowerCase()
  return engagementState === 'withdrawn' || engagementState === 'hostile'
}

export function isSectionExitAllowed(exit, sceneState) {
  if (!exit?.label) return false
  const plotFlags = sceneState?.gmState?.plotFlags || {}
  return passesFlagGates(exit, plotFlags)
}

export function getAllowedSectionExits(section, sceneState) {
  if (!section) return []
  return (section.exits || []).filter(exit => isSectionExitAllowed(exit, sceneState))
}

function isInteractionAllowed(interaction, sceneState, requireVisibleAvailability = false) {
  if (!interaction?.id || !interaction.label) return false

  const plotFlags = sceneState?.gmState?.plotFlags || {}
  const runtimeObjects = sceneState?.gmState?.runtimeObjects || {}
  const availability = interaction.availability || {}
  const hasAvailability = Object.keys(availability).length > 0
  const isExplicitlyVisible = availability.visible === true || !hasAvailability

  if (!passesFlagGates(interaction, plotFlags)) return false
  if (isNpcTalkInteractionBlocked(interaction, sceneState)) return false

  if (availability.runtimeObjectVisible) {
    if (!runtimeObjects[availability.runtimeObjectVisible]?.visible) return false
  } else if (requireVisibleAvailability && !isExplicitlyVisible) {
    return false
  }

  return true
}

export function getAllowedRuntimeInteractions(section, sceneState) {
  if (!section) return []

  const currentSectionId = sceneState?.gmState?.currentSectionId
  const runtimeInteractions = sceneState?.gmState?.runtimeInteractions || {}
  const staticInteractionIds = new Set(
    (section.interactions || []).map(interaction => interaction?.id).filter(Boolean)
  )
  const allowed = []

  for (const interaction of section.interactions || []) {
    if (!isInteractionAllowed(interaction, sceneState, true)) continue
    allowed.push({ ...interaction, source: 'section' })
  }

  for (const [interactionId, interaction] of Object.entries(runtimeInteractions)) {
    if (!interaction?.visible) continue
    if (staticInteractionIds.has(interactionId)) continue
    if (interaction.sectionId && currentSectionId && interaction.sectionId !== currentSectionId) continue
    if (!isInteractionAllowed({ id: interactionId, ...interaction }, sceneState)) continue
    allowed.push({ id: interactionId, ...interaction, source: 'runtime' })
  }

  return allowed
}
