import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_MODEL_ID, normalizeModelId } from '../services/openrouter'
import {
  createInitialSceneState,
  deriveSceneState,
  getAbilityModifier,
  normalizeAdventureEntry,
  normalizeCharacter,
  getLevelFromXP,
  getProficiencyBonus,
  calcHitPoints,
  calcAttackBonus,
  calcSpellSaveDC,
  calcSpellAttackBonus,
} from '../data/srd'

const GameContext = createContext(null)

const DEFAULT_ADVENTURE = null
const DEFAULT_GAME_LOG = []
const DEFAULT_COMBAT = null
const DEFAULT_SCENE_STATE = null
const DEFAULT_CHARACTERS = []
const DEFAULT_SESSIONS = []

function loadFromStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Storage error:', e)
  }
}

function makeLocalId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeIdPart(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function deriveLegacyCharacterId(character) {
  const seed = [character?.name, character?.class, character?.race]
    .map(sanitizeIdPart)
    .filter(Boolean)
    .join('-')

  return seed ? `char-${seed}` : makeLocalId('char')
}

function ensureCharacterRecord(character, fallbackId = null) {
  const normalized = normalizeCharacter(character)
  if (!normalized) return null

  const now = new Date().toISOString()

  return {
    ...normalized,
    id: normalized.id || fallbackId || deriveLegacyCharacterId(normalized),
    createdAt: normalized.createdAt || now,
    updatedAt: now,
  }
}

function normalizeCharacterRoster(list = []) {
  const seen = new Set()
  const roster = []

  for (const entry of Array.isArray(list) ? list : []) {
    const normalized = ensureCharacterRecord(entry)
    if (!normalized) continue
    if (seen.has(normalized.id)) continue
    seen.add(normalized.id)
    roster.push(normalized)
  }

  return roster
}

function getInitialCharacterStore() {
  const storedRoster = loadFromStorage('dm_characters', DEFAULT_CHARACTERS)
  const normalizedRoster = normalizeCharacterRoster(storedRoster)

  if (normalizedRoster.length > 0) {
    const storedActiveId = localStorage.getItem('dm_activeCharacterId')
    const activeCharacterId = normalizedRoster.some(entry => entry.id === storedActiveId)
      ? storedActiveId
      : normalizedRoster[0].id

    return {
      characters: normalizedRoster,
      activeCharacterId,
    }
  }

  const legacyCharacter = loadFromStorage('dm_character', null)
  const migratedCharacter = legacyCharacter ? ensureCharacterRecord(legacyCharacter) : null

  return {
    characters: migratedCharacter ? [migratedCharacter] : [],
    activeCharacterId: migratedCharacter?.id || null,
  }
}

function persistCharacterStore(characters, activeCharacterId) {
  const normalizedRoster = normalizeCharacterRoster(characters)
  const resolvedActiveCharacterId = normalizedRoster.some(entry => entry.id === activeCharacterId)
    ? activeCharacterId
    : (normalizedRoster[0]?.id || null)

  saveToStorage('dm_characters', normalizedRoster)

  if (resolvedActiveCharacterId) {
    localStorage.setItem('dm_activeCharacterId', resolvedActiveCharacterId)
  } else {
    localStorage.removeItem('dm_activeCharacterId')
  }

  const activeCharacter = normalizedRoster.find(entry => entry.id === resolvedActiveCharacterId) || null
  saveToStorage('dm_character', activeCharacter)

  return {
    characters: normalizedRoster,
    activeCharacterId: resolvedActiveCharacterId,
    activeCharacter,
  }
}

function getInitialModel() {
  const stored = localStorage.getItem('dm_model')
  const normalized = normalizeModelId(stored || DEFAULT_MODEL_ID)
  localStorage.setItem('dm_model', normalized)
  return normalized
}

function getInitialAdventure() {
  return normalizeAdventureEntry(loadFromStorage('dm_adventure', DEFAULT_ADVENTURE))
}

function getInitialSceneState(adventure) {
  const stored = loadFromStorage('dm_sceneState', DEFAULT_SCENE_STATE)
  if (stored && adventure) return stored
  return adventure ? createInitialSceneState(adventure) : null
}

function normalizeGameLog(list) {
  if (!Array.isArray(list)) return []

  return list
    .filter(entry => entry && typeof entry.content === 'string' && entry.role)
    .map(entry => ({
      id: entry.id || makeLocalId('msg'),
      role: entry.role,
      content: entry.content,
      type: entry.type || 'narrative',
      timestamp: entry.timestamp || new Date().toISOString(),
    }))
}

function buildSessionRecord({
  id = null,
  characterId = null,
  adventureId = null,
  gameLog = DEFAULT_GAME_LOG,
  combat = DEFAULT_COMBAT,
  sceneState = DEFAULT_SCENE_STATE,
  createdAt = null,
  updatedAt = null,
} = {}) {
  const now = new Date().toISOString()

  return {
    id: id || makeLocalId('session'),
    characterId: characterId || null,
    adventureId: adventureId || null,
    createdAt: createdAt || now,
    updatedAt: updatedAt || now,
    gameLog: normalizeGameLog(gameLog),
    combat: combat || null,
    sceneState: sceneState || null,
  }
}

function normalizeSessionList(list = [], adventures = []) {
  const seen = new Set()
  const normalized = []

  for (const entry of Array.isArray(list) ? list : []) {
    const record = buildSessionRecord(entry)
    if (seen.has(record.id)) continue
    seen.add(record.id)

    const adventure = adventures.find(item => item.id === record.adventureId) || null
    normalized.push({
      ...record,
      adventureId: adventure?.id || null,
      sceneState: record.sceneState || (adventure ? createInitialSceneState(adventure) : null),
    })
  }

  return normalized.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function persistSessionsStore(sessions, activeSessionId = null) {
  const normalizedSessions = normalizeSessionList(sessions)
  const resolvedActiveSessionId = normalizedSessions.some(entry => entry.id === activeSessionId)
    ? activeSessionId
    : (normalizedSessions[0]?.id || null)

  saveToStorage('dm_sessions', normalizedSessions)

  if (resolvedActiveSessionId) {
    localStorage.setItem('dm_activeSessionId', resolvedActiveSessionId)
  } else {
    localStorage.removeItem('dm_activeSessionId')
  }

  return {
    sessions: normalizedSessions,
    activeSessionId: resolvedActiveSessionId,
  }
}

function buildInitialProviderState() {
  const characterStore = getInitialCharacterStore()
  const adventures = (() => {
    const stored = loadFromStorage('dm_adventures', [])
    return Array.isArray(stored) ? stored.map(normalizeAdventureEntry).filter(Boolean) : []
  })()

  const storedSessions = normalizeSessionList(loadFromStorage('dm_sessions', DEFAULT_SESSIONS), adventures)
  let activeSessionId = localStorage.getItem('dm_activeSessionId') || null

  if (!storedSessions.some(entry => entry.id === activeSessionId)) {
    activeSessionId = null
  }

  let adventure = getInitialAdventure()
  let gameLog = normalizeGameLog(loadFromStorage('dm_gameLog', DEFAULT_GAME_LOG))
  let combat = loadFromStorage('dm_combat', DEFAULT_COMBAT)
  let sceneState = getInitialSceneState(adventure)
  let sessions = storedSessions

  const activeSession = sessions.find(entry => entry.id === activeSessionId) || null

  if (activeSession) {
    adventure = adventures.find(entry => entry.id === activeSession.adventureId) || null
    gameLog = normalizeGameLog(activeSession.gameLog)
    combat = activeSession.combat || null
    sceneState = activeSession.sceneState || (adventure ? createInitialSceneState(adventure) : null)

    if (
      activeSession.characterId &&
      characterStore.characters.some(entry => entry.id === activeSession.characterId)
    ) {
      characterStore.activeCharacterId = activeSession.characterId
    }
  } else if (gameLog.length > 0 && characterStore.activeCharacterId) {
    const migratedSession = buildSessionRecord({
      characterId: characterStore.activeCharacterId,
      adventureId: adventure?.id || null,
      gameLog,
      combat,
      sceneState,
    })

    sessions = [migratedSession]
    activeSessionId = migratedSession.id
  }

  return {
    characterStore,
    adventure,
    gameLog,
    combat,
    sceneState,
    apiKey: localStorage.getItem('dm_apiKey') || '',
    selectedModel: getInitialModel(),
    adventures,
    sessions,
    activeSessionId,
  }
}

export function GameProvider({ children }) {
  const bootstrapRef = useRef(null)
  if (!bootstrapRef.current) {
    bootstrapRef.current = buildInitialProviderState()
  }

  const bootstrap = bootstrapRef.current

  const [characterStore, setCharacterStore] = useState(bootstrap.characterStore)
  const characters = characterStore.characters
  const activeCharacterId = characterStore.activeCharacterId
  const character = useMemo(
    () => characters.find(entry => entry.id === activeCharacterId) || null,
    [characters, activeCharacterId]
  )

  const [adventure, setAdventureState] = useState(bootstrap.adventure)
  const [gameLog, setGameLogState] = useState(bootstrap.gameLog)
  const [combat, setCombatState] = useState(bootstrap.combat)
  const [sceneState, setSceneStateState] = useState(bootstrap.sceneState)
  const [apiKey, setApiKeyState] = useState(bootstrap.apiKey)
  const [selectedModel, setSelectedModelState] = useState(bootstrap.selectedModel)
  const [adventures, setAdventuresState] = useState(bootstrap.adventures)
  const [sessions, setSessionsState] = useState(bootstrap.sessions)
  const [activeSessionId, setActiveSessionIdState] = useState(bootstrap.activeSessionId)

  const activeSession = useMemo(
    () => sessions.find(entry => entry.id === activeSessionId) || null,
    [sessions, activeSessionId]
  )

  const sessionsRef = useRef(sessions)
  const activeSessionIdRef = useRef(activeSessionId)
  const adventureRef = useRef(adventure)
  const gameLogRef = useRef(gameLog)
  const combatRef = useRef(combat)
  const sceneStateRef = useRef(sceneState)
  const adventuresRef = useRef(adventures)
  const charactersRef = useRef(characters)
  const activeCharacterIdRef = useRef(activeCharacterId)

  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { activeSessionIdRef.current = activeSessionId }, [activeSessionId])
  useEffect(() => { adventureRef.current = adventure }, [adventure])
  useEffect(() => { gameLogRef.current = gameLog }, [gameLog])
  useEffect(() => { combatRef.current = combat }, [combat])
  useEffect(() => { sceneStateRef.current = sceneState }, [sceneState])
  useEffect(() => { adventuresRef.current = adventures }, [adventures])
  useEffect(() => { charactersRef.current = characters }, [characters])
  useEffect(() => { activeCharacterIdRef.current = activeCharacterId }, [activeCharacterId])

  const persistSessions = useCallback((nextSessions, nextActiveSessionId = null) => {
    const persisted = persistSessionsStore(nextSessions, nextActiveSessionId)
    sessionsRef.current = persisted.sessions
    activeSessionIdRef.current = persisted.activeSessionId
    setSessionsState(persisted.sessions)
    setActiveSessionIdState(persisted.activeSessionId)
    return persisted
  }, [])

  const patchSession = useCallback((sessionId, patch) => {
    if (!sessionId) return null

    const nextSessions = sessionsRef.current.map(entry => {
      if (entry.id !== sessionId) return entry
      const updates = typeof patch === 'function' ? patch(entry) : patch
      return buildSessionRecord({
        ...entry,
        ...updates,
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: new Date().toISOString(),
      })
    })

    persistSessions(nextSessions, sessionId)
    return nextSessions.find(entry => entry.id === sessionId) || null
  }, [persistSessions])

  const applyCharacterStore = useCallback((nextCharacters, nextActiveCharacterId = null) => {
    const persisted = persistCharacterStore(nextCharacters, nextActiveCharacterId)
    setCharacterStore({
      characters: persisted.characters,
      activeCharacterId: persisted.activeCharacterId,
    })
    activeCharacterIdRef.current = persisted.activeCharacterId
    charactersRef.current = persisted.characters

    const liveSessionId = activeSessionIdRef.current
    if (liveSessionId && persisted.activeCharacterId) {
      patchSession(liveSessionId, { characterId: persisted.activeCharacterId })
    }

    return persisted.activeCharacter
  }, [patchSession])

  const setCharacters = useCallback((value) => {
    const nextValue = typeof value === 'function' ? value(charactersRef.current) : value
    const nextCharacters = normalizeCharacterRoster(nextValue)
    return applyCharacterStore(nextCharacters, activeCharacterIdRef.current)
  }, [applyCharacterStore])

  const selectCharacter = useCallback((value) => {
    const nextId = typeof value === 'string'
      ? value
      : (value?.id || null)

    return applyCharacterStore(charactersRef.current, nextId)
  }, [applyCharacterStore])

  const saveCharacter = useCallback((value, options = {}) => {
    const currentCharacter = charactersRef.current.find(entry => entry.id === activeCharacterIdRef.current) || null
    const nextValue = typeof value === 'function' ? value(currentCharacter) : value

    if (!nextValue) {
      return applyCharacterStore(
        charactersRef.current.filter(entry => entry.id !== currentCharacter?.id),
        null
      )
    }

    const explicitId = nextValue.id || options.id || null
    const normalized = ensureCharacterRecord(nextValue, explicitId)
    if (!normalized) return null

    let didUpdate = false
    const nextCharacters = charactersRef.current.map(entry => {
      if (entry.id !== normalized.id) return entry
      didUpdate = true
      return normalized
    })

    const finalCharacters = didUpdate ? nextCharacters : [...charactersRef.current, normalized]
    const nextActiveId = options.setActive === false ? activeCharacterIdRef.current : normalized.id
    return applyCharacterStore(finalCharacters, nextActiveId)
  }, [applyCharacterStore])

  const upsertCharacter = useCallback((value, options = {}) => {
    return saveCharacter(value, options)
  }, [saveCharacter])

  const deleteCharacter = useCallback((characterId) => {
    const nextCharacters = charactersRef.current.filter(entry => entry.id !== characterId)
    const nextActiveId = activeCharacterIdRef.current === characterId ? null : activeCharacterIdRef.current

    const nextSessions = sessionsRef.current.filter(entry => entry.characterId !== characterId)
    const nextActiveSessionId = nextSessions.some(entry => entry.id === activeSessionIdRef.current)
      ? activeSessionIdRef.current
      : null

    persistSessions(nextSessions, nextActiveSessionId)
    return applyCharacterStore(nextCharacters, nextActiveId)
  }, [applyCharacterStore, persistSessions])

  const setCharacter = useCallback((value) => {
    if (value === null) {
      selectCharacter(null)
      return null
    }

    if (typeof value === 'function') {
      return saveCharacter(value, { id: activeCharacterIdRef.current || null })
    }

    return saveCharacter(value)
  }, [saveCharacter, selectCharacter])

  const applyLiveAdventureState = useCallback((nextAdventure, sessionIdOverride = activeSessionIdRef.current) => {
    const normalized = normalizeAdventureEntry(nextAdventure)
    adventureRef.current = normalized
    setAdventureState(normalized)
    saveToStorage('dm_adventure', normalized)

    if (sessionIdOverride) {
      patchSession(sessionIdOverride, { adventureId: normalized?.id || null })
    }

    return normalized
  }, [patchSession])

  const applyLiveGameLog = useCallback((nextGameLog, sessionIdOverride = activeSessionIdRef.current) => {
    const normalized = normalizeGameLog(nextGameLog)
    gameLogRef.current = normalized
    setGameLogState(normalized)
    saveToStorage('dm_gameLog', normalized)

    if (sessionIdOverride) {
      patchSession(sessionIdOverride, { gameLog: normalized })
    }

    return normalized
  }, [patchSession])

  const applyLiveCombat = useCallback((nextCombat, sessionIdOverride = activeSessionIdRef.current) => {
    const normalized = nextCombat || null
    combatRef.current = normalized
    setCombatState(normalized)
    saveToStorage('dm_combat', normalized)

    if (sessionIdOverride) {
      patchSession(sessionIdOverride, { combat: normalized })
    }

    return normalized
  }, [patchSession])

  const applyLiveSceneState = useCallback((nextSceneState, sessionIdOverride = activeSessionIdRef.current) => {
    const normalized = nextSceneState || null
    sceneStateRef.current = normalized
    setSceneStateState(normalized)
    saveToStorage('dm_sceneState', normalized)

    if (sessionIdOverride) {
      patchSession(sessionIdOverride, { sceneState: normalized })
    }

    return normalized
  }, [patchSession])

  const setAdventure = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(adventureRef.current) : val
    const normalized = applyLiveAdventureState(nextValue)

    const nextSceneState = normalized ? createInitialSceneState(normalized) : null
    applyLiveSceneState(nextSceneState)
    return normalized
  }, [applyLiveAdventureState, applyLiveSceneState])

  const setGameLog = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(gameLogRef.current) : val
    return applyLiveGameLog(nextValue)
  }, [applyLiveGameLog])

  const setCombat = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(combatRef.current) : val
    return applyLiveCombat(nextValue)
  }, [applyLiveCombat])

  const setSceneState = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(sceneStateRef.current) : val
    return applyLiveSceneState(nextValue)
  }, [applyLiveSceneState])

  const syncSceneState = useCallback(({ messages, adventureOverride = null, combatOverride = null, fallbackUserText = '' }) => {
    const activeAdventure = normalizeAdventureEntry(adventureOverride || adventureRef.current)
    if (!activeAdventure) {
      setSceneState(null)
      return null
    }

    const nextSceneState = deriveSceneState({
      adventure: activeAdventure,
      previousSceneState: sceneStateRef.current,
      messages,
      combat: combatOverride ?? combatRef.current,
      fallbackUserText,
    })

    setSceneState(nextSceneState)
    return nextSceneState
  }, [setSceneState])

  const resetSceneState = useCallback((adventureOverride = null) => {
    const activeAdventure = normalizeAdventureEntry(adventureOverride || adventureRef.current)
    const initialState = activeAdventure ? createInitialSceneState(activeAdventure) : null
    setSceneState(initialState)
    return initialState
  }, [setSceneState])

  const setApiKey = useCallback((key) => {
    setApiKeyState(key)
    localStorage.setItem('dm_apiKey', key)
  }, [])

  const setSelectedModel = useCallback((model) => {
    const normalized = normalizeModelId(model)
    setSelectedModelState(normalized)
    localStorage.setItem('dm_model', normalized)
  }, [])

  const setAdventures = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(adventuresRef.current) : val
    const normalized = Array.isArray(nextValue)
      ? nextValue.map(normalizeAdventureEntry).filter(Boolean)
      : []

    adventuresRef.current = normalized
    setAdventuresState(normalized)
    saveToStorage('dm_adventures', normalized)

    const nextSessions = normalizeSessionList(sessionsRef.current, normalized).filter(entry => {
      return entry.adventureId ? normalized.some(item => item.id === entry.adventureId) : true
    })

    persistSessions(nextSessions, activeSessionIdRef.current)

    const liveAdventureStillExists = adventureRef.current?.id
      ? normalized.some(item => item.id === adventureRef.current.id)
      : true

    if (!liveAdventureStillExists) {
      applyLiveAdventureState(null, activeSessionIdRef.current)
      applyLiveSceneState(null, activeSessionIdRef.current)
    }
  }, [applyLiveAdventureState, applyLiveSceneState, persistSessions])

  const addMessage = useCallback((role, content, type = 'narrative') => {
    const msg = {
      id: Date.now() + Math.random(),
      role,
      content,
      type,
      timestamp: new Date().toISOString(),
    }

    applyLiveGameLog([...gameLogRef.current, msg])
    return msg
  }, [applyLiveGameLog])

  const clearGameLog = useCallback(() => {
    applyLiveGameLog([])
    applyLiveCombat(null)
    const activeAdventure = adventureRef.current
    applyLiveSceneState(activeAdventure ? createInitialSceneState(activeAdventure) : null)
  }, [applyLiveCombat, applyLiveGameLog, applyLiveSceneState])

  const updateCharacterHP = useCallback((newHP) => {
    setCharacter(prev => (
      prev
        ? { ...prev, currentHP: Math.max(0, Math.min(newHP, prev.maxHP)) }
        : prev
    ))
  }, [setCharacter])

  const awardXP = useCallback((amount) => {
    if (!amount || amount <= 0) return null
    const current = charactersRef.current.find(c => c.id === activeCharacterIdRef.current)
    if (!current) return null

    const oldXP = current.xp || 0
    const newXP = oldXP + amount
    const oldLevel = current.level || 1
    const newLevel = getLevelFromXP(newXP)
    const didLevelUp = newLevel > oldLevel

    let updatedChar = { ...current, xp: newXP }

    if (didLevelUp) {
      const newProfBonus = getProficiencyBonus(newLevel)
      const newMaxHP = calcHitPoints(current.class, current.attributes?.con || 10, newLevel)
      const newAtkBonus = calcAttackBonus(current.class, current.attributes, newLevel)
      updatedChar = {
        ...updatedChar,
        level: newLevel,
        proficiencyBonus: newProfBonus,
        maxHP: newMaxHP,
        currentHP: newMaxHP, // Full heal on level up
        attackBonus: newAtkBonus,
      }
      if (calcSpellSaveDC && updatedChar.spellSaveDC) {
        updatedChar.spellSaveDC = calcSpellSaveDC(current.class, current.attributes, newLevel)
      }
      if (calcSpellAttackBonus && updatedChar.spellAttackBonus !== undefined) {
        updatedChar.spellAttackBonus = calcSpellAttackBonus(current.class, current.attributes, newLevel)
      }
    }

    saveCharacter(updatedChar)
    return { oldLevel, newLevel, didLevelUp, newXP }
  }, [saveCharacter])

  const startCombat = useCallback((enemies) => {
    setCombat({
      active: true,
      round: 1,
      enemies: enemies || [],
      playerInitiative: 0,
      phase: 'initiative',
    })
  }, [setCombat])

  const endCombat = useCallback(() => {
    setCombat(null)
  }, [setCombat])

  const createSession = useCallback(({ characterId, adventureId = null } = {}) => {
    const resolvedCharacterId = characterId || activeCharacterIdRef.current || null
    const resolvedAdventure = adventuresRef.current.find(entry => entry.id === adventureId) || null
    const initialSceneState = resolvedAdventure ? createInitialSceneState(resolvedAdventure) : null

    const session = buildSessionRecord({
      characterId: resolvedCharacterId,
      adventureId: resolvedAdventure?.id || null,
      gameLog: [],
      combat: null,
      sceneState: initialSceneState,
    })

    persistSessions([session, ...sessionsRef.current], session.id)

    if (resolvedCharacterId) {
      applyCharacterStore(charactersRef.current, resolvedCharacterId)
    }

    applyLiveAdventureState(resolvedAdventure, session.id)
    applyLiveGameLog([], session.id)
    applyLiveCombat(null, session.id)
    applyLiveSceneState(initialSceneState, session.id)

    return session
  }, [applyCharacterStore, applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions])

  const loadSession = useCallback((sessionId) => {
    const session = sessionsRef.current.find(entry => entry.id === sessionId) || null
    if (!session) return null

    persistSessions(sessionsRef.current, session.id)

    if (session.characterId) {
      applyCharacterStore(charactersRef.current, session.characterId)
    }

    const resolvedAdventure = adventuresRef.current.find(entry => entry.id === session.adventureId) || null
    applyLiveAdventureState(resolvedAdventure, session.id)
    applyLiveGameLog(session.gameLog || [], session.id)
    applyLiveCombat(session.combat || null, session.id)
    applyLiveSceneState(session.sceneState || (resolvedAdventure ? createInitialSceneState(resolvedAdventure) : null), session.id)

    return session
  }, [applyCharacterStore, applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions])

  const deleteSession = useCallback((sessionId) => {
    const nextSessions = sessionsRef.current.filter(entry => entry.id !== sessionId)
    const isDeletingActive = activeSessionIdRef.current === sessionId
    const nextActiveSessionId = isDeletingActive ? null : activeSessionIdRef.current

    persistSessions(nextSessions, nextActiveSessionId)

    if (isDeletingActive) {
      applyLiveGameLog([], null)
      applyLiveCombat(null, null)
      applyLiveSceneState(null, null)
      applyLiveAdventureState(null, null)
    }
  }, [applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions])

  const leaveSessionSelection = useCallback(() => {
    persistSessions(sessionsRef.current, activeSessionIdRef.current)
  }, [persistSessions])

  const unloadActiveSession = useCallback(({ clearAdventure = false } = {}) => {
    const nextAdventure = clearAdventure ? null : adventureRef.current

    persistSessions(sessionsRef.current, null)
    applyLiveGameLog([], null)
    applyLiveCombat(null, null)
    applyLiveAdventureState(nextAdventure, null)
    applyLiveSceneState(nextAdventure ? createInitialSceneState(nextAdventure) : null, null)

    return true
  }, [applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions])

  const getModifier = (score) => getAbilityModifier(score)

  return (
    <GameContext.Provider value={{
      characters,
      setCharacters,
      character,
      setCharacter,
      saveCharacter,
      upsertCharacter,
      deleteCharacter,
      selectCharacter,
      adventure,
      setAdventure,
      gameLog,
      setGameLog,
      addMessage,
      clearGameLog,
      combat,
      setCombat,
      startCombat,
      endCombat,
      sceneState,
      setSceneState,
      syncSceneState,
      resetSceneState,
      apiKey,
      setApiKey,
      selectedModel,
      setSelectedModel,
      adventures,
      setAdventures,
      sessions,
      activeSession,
      activeSessionId,
      createSession,
      loadSession,
      deleteSession,
      leaveSessionSelection,
      unloadActiveSession,
      updateCharacterHP,
      awardXP,
      getModifier,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
