import React, { createContext, useContext, useState, useCallback } from 'react'
import { DEFAULT_MODEL_ID, normalizeModelId } from '../services/openrouter'
import { getAbilityModifier, normalizeCharacter } from '../data/srd'

const GameContext = createContext(null)

const DEFAULT_CHARACTER = null
const DEFAULT_ADVENTURE = null
const DEFAULT_GAME_LOG = []
const DEFAULT_COMBAT = null

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

function getInitialModel() {
  const stored = localStorage.getItem('dm_model')
  const normalized = normalizeModelId(stored || DEFAULT_MODEL_ID)
  localStorage.setItem('dm_model', normalized)
  return normalized
}

function getInitialCharacter() {
  return normalizeCharacter(loadFromStorage('dm_character', DEFAULT_CHARACTER))
}

function normalizeAdventureEntry(entry) {
  if (!entry) return null
  return {
    ...entry,
    pages: entry.pages || (entry.filename?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'TXT'),
    charCount: entry.charCount || entry.text?.length || 0,
  }
}

export function GameProvider({ children }) {
  const [character, setCharacterState] = useState(getInitialCharacter)
  const [adventure, setAdventureState] = useState(() => normalizeAdventureEntry(loadFromStorage('dm_adventure', DEFAULT_ADVENTURE)))
  const [gameLog, setGameLogState] = useState(() => loadFromStorage('dm_gameLog', DEFAULT_GAME_LOG))
  const [combat, setCombatState] = useState(() => loadFromStorage('dm_combat', DEFAULT_COMBAT))
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('dm_apiKey') || '')
  const [selectedModel, setSelectedModelState] = useState(getInitialModel)
  const [adventures, setAdventuresState] = useState(() => {
    const stored = loadFromStorage('dm_adventures', [])
    return Array.isArray(stored) ? stored.map(normalizeAdventureEntry) : []
  })

  const setCharacter = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(character) : val
    const normalized = normalizeCharacter(nextValue)
    setCharacterState(normalized)
    saveToStorage('dm_character', normalized)
  }, [character])

  const setAdventure = useCallback((val) => {
    const nextValue = typeof val === 'function' ? val(adventure) : val
    const normalized = normalizeAdventureEntry(nextValue)
    setAdventureState(normalized)
    saveToStorage('dm_adventure', normalized)
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
  }, [setGameLog, setCombat])

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
      character, setCharacter,
      adventure, setAdventure,
      gameLog, setGameLog, addMessage, clearGameLog,
      combat, setCombat, startCombat, endCombat,
      apiKey, setApiKey,
      selectedModel, setSelectedModel,
      adventures, setAdventures,
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