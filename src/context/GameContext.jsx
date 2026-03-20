import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { DEFAULT_MODEL_ID, normalizeModelId } from '../services/openrouter'
import {
  createInitialSceneState,
  deriveSceneState,
  getAbilityModifier,
  normalizeAdventureEntry,
  normalizeCharacter,
} from '../data/srd'

const GameContext = createContext(null)

const DEFAULT_ADVENTURE = null
const DEFAULT_GAME_LOG = []
const DEFAULT_COMBAT = null
const DEFAULT_SCENE_STATE = null
const DEFAULT_CHARACTERS = []

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

export function GameProvider({ children }) {
  const [characterStore, setCharacterStore] = useState(getInitialCharacterStore)
  const characters = characterStore.characters
  const activeCharacterId = characterStore.activeCharacterId
  const character = useMemo(
    () => characters.find(entry => entry.id === activeCharacterId) || null,
    [characters, activeCharacterId]
  )

  const [adventure, setAdventureState] = useState(getInitialAdventure)
  const [gameLog, setGameLogState] = useState(() => loadFromStorage('dm_gameLog', DEFAULT_GAME_LOG))
  const [combat, setCombatState] = useState(() => loadFromStorage('dm_combat', DEFAULT_COMBAT))
  const [sceneState, setSceneStateState] = useState(() => getInitialSceneState(getInitialAdventure()))
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('dm_apiKey') || '')
  const [selectedModel, setSelectedModelState] = useState(getInitialModel)
  const [adventures, setAdventuresState] = useState(() => {
    const stored = loadFromStorage('dm_adventures', [])
    return Array.isArray(stored) ? stored.map(normalizeAdventureEntry) : []
  })

  const applyCharacterStore = useCallback((nextCharacters, nextActiveCharacterId = null) => {
    const persisted = persistCharacterStore(nextCharacters, nextActiveCharacterId)
    setCharacterStore({
      characters: persisted.characters,
      activeCharacterId: persisted.activeCharacterId,
    })
    return persisted.activeCharacter
  }, [])

  const setCharacters = useCallback((value) => {
    const nextValue = typeof value === 'function' ? value(characters) : value
    const nextCharacters = normalizeCharacterRoster(nextValue)
    return applyCharacterStore(nextCharacters, activeCharacterId)
  }, [activeCharacterId, applyCharacterStore, characters])

  const selectCharacter = useCallback((value) => {
    const nextId = typeof value === 'string'
      ? value
      : (value?.id || null)

    return applyCharacterStore(characters, nextId)
  }, [applyCharacterStore, characters])

  const saveCharacter = useCallback((value, options = {}) => {
    const currentCharacter = character
    const nextValue = typeof value === 'function' ? value(currentCharacter) : value

    if (!nextValue) {
      return applyCharacterStore(characters.filter(entry => entry.id !== currentCharacter?.id), null)
    }

    const explicitId = nextValue.id || options.id || null
    const normalized = ensureCharacterRecord(nextValue, explicitId)
    if (!normalized) return null

    let didUpdate = false
    const nextCharacters = characters.map(entry => {
      if (entry.id !== normalized.id) return entry
      didUpdate = true
      return normalized
    })

    const finalCharacters = didUpdate ? nextCharacters : [...characters, normalized]
    const nextActiveId = options.setActive === false ? activeCharacterId : normalized.id
    return applyCharacterStore(finalCharacters, nextActiveId)
  }, [activeCharacterId, applyCharacterStore, character, characters])

  const upsertCharacter = useCallback((value, options = {}) => {
    return saveCharacter(value, options)
  }, [saveCharacter])

  const deleteCharacter = useCallback((characterId) => {
    const nextCharacters = characters.filter(entry => entry.id !== characterId)
    const nextActiveId = activeCharacterId === characterId ? null : activeCharacterId
    return applyCharacterStore(nextCharacters, nextActiveId)
  }, [activeCharacterId, applyCharacterStore, characters])

  const setCharacter = useCallback((value) => {
    if (value === null) {
      selectCharacter(null)
      return null
    }

    if (typeof value === 'function') {
      return saveCharacter(value, { id: character?.id || null })
    }

    return saveCharacter(value)
  }, [character?.id, saveCharacter, selectCharacter])

  const setAdventure = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(adventure) : val
    const normalized = normalizeAdventureEntry(nextValue)
    setAdventureState(normalized)
    saveToStorage('dm_adventure', normalized)

    const nextSceneState = normalized ? createInitialSceneState(normalized) : null
    setSceneStateState(nextSceneState)
    saveToStorage('dm_sceneState', nextSceneState)
  }, [adventure])

  const setGameLog = useCallback((val) => {
    const v = typeof val === 'function' ? val(gameLog) : val
    setGameLogState(v)
    saveToStorage('dm_gameLog', v)
  }, [gameLog])

  const setCombat = useCallback((val) => {
    const v = typeof val === 'function' ? val(combat) : val
    setCombatState(v)
    saveToStorage('dm_combat', v)
  }, [combat])

  const setSceneState = useCallback((val) => {
    const v = typeof val === 'function' ? val(sceneState) : val
    setSceneStateState(v)
    saveToStorage('dm_sceneState', v)
  }, [sceneState])

  const syncSceneState = useCallback(({ messages, adventureOverride = null, combatOverride = null, fallbackUserText = '' }) => {
    const activeAdventure = normalizeAdventureEntry(adventureOverride || adventure)
    if (!activeAdventure) {
      setSceneState(null)
      return null
    }

    const nextSceneState = deriveSceneState({
      adventure: activeAdventure,
      previousSceneState: sceneState,
      messages,
      combat: combatOverride ?? combat,
      fallbackUserText,
    })

    setSceneState(nextSceneState)
    return nextSceneState
  }, [adventure, combat, sceneState, setSceneState])

  const resetSceneState = useCallback((adventureOverride = null) => {
    const activeAdventure = normalizeAdventureEntry(adventureOverride || adventure)
    const initialState = activeAdventure ? createInitialSceneState(activeAdventure) : null
    setSceneState(initialState)
    return initialState
  }, [adventure, setSceneState])

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
    const nextValue = typeof val === 'function' ? val(adventures) : val
    const normalized = Array.isArray(nextValue) ? nextValue.map(normalizeAdventureEntry) : []
    setAdventuresState(normalized)
    saveToStorage('dm_adventures', normalized)
  }, [adventures])

  const addMessage = useCallback((role, content, type = 'narrative') => {
    const msg = {
      id: Date.now() + Math.random(),
      role,
      content,
      type,
      timestamp: new Date().toISOString(),
    }
    setGameLog(prev => [...prev, msg])
    return msg
  }, [setGameLog])

  const clearGameLog = useCallback(() => {
    setGameLog([])
    setCombat(null)
    resetSceneState()
  }, [resetSceneState, setCombat, setGameLog])

  const updateCharacterHP = useCallback((newHP) => {
    setCharacter(prev => (
      prev
        ? { ...prev, currentHP: Math.max(0, Math.min(newHP, prev.maxHP)) }
        : prev
    ))
  }, [setCharacter])

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
      updateCharacterHP,
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
