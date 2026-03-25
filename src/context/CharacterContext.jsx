import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  getAbilityModifier,
  getLevelFromXP,
  getProficiencyBonus,
  calcHitPoints,
  calcAttackBonus,
  calcSpellSaveDC,
  calcSpellAttackBonus,
  getSpellSlots,
} from '../data/srd'
import {
  ensureCharacterRecord,
  normalizeCharacterRoster,
  getInitialCharacterStore,
  persistCharacterStore,
} from '../utils/characterStore'
import { useGameSession } from './GameSessionContext'
import { useAuth } from './AuthContext'
import {
  fetchCharacters,
  createCharacter as apiCreateChar,
  updateCharacter as apiUpdateChar,
  deleteCharacterApi,
  activateCharacter as apiActivateChar,
} from '../services/api'

const CharacterContext = createContext(null)

export function CharacterProvider({ children }) {
  const { patchSession, persistSessions, _refs } = useGameSession()
  const { sessionsRef, activeSessionIdRef } = _refs
  const { isLoggedIn } = useAuth()

  const [characterStore, setCharacterStore] = useState(getInitialCharacterStore)
  const characters = characterStore.characters
  const activeCharacterId = characterStore.activeCharacterId

  // Load characters from backend on mount when logged in
  useEffect(() => {
    if (!isLoggedIn) return
    fetchCharacters()
      .then(data => {
        if (data.characters?.length) {
          const roster = normalizeCharacterRoster(data.characters)
          const activeId = data.activeCharacterId || null
          setCharacterStore({ characters: roster, activeCharacterId: activeId })
          persistCharacterStore(roster, activeId)
        }
      })
      .catch(() => {})
  }, [isLoggedIn])
  const character = useMemo(
    () => characters.find(entry => entry.id === activeCharacterId) || null,
    [characters, activeCharacterId]
  )

  const charactersRef = useRef(characters)
  const activeCharacterIdRef = useRef(activeCharacterId)

  useEffect(() => { charactersRef.current = characters }, [characters])
  useEffect(() => { activeCharacterIdRef.current = activeCharacterId }, [activeCharacterId])

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
  }, [patchSession, activeSessionIdRef])

  const setCharacters = useCallback((value) => {
    const nextValue = typeof value === 'function' ? value(charactersRef.current) : value
    const nextCharacters = normalizeCharacterRoster(nextValue)
    return applyCharacterStore(nextCharacters, activeCharacterIdRef.current)
  }, [applyCharacterStore])

  const selectCharacter = useCallback((value) => {
    const nextId = typeof value === 'string'
      ? value
      : (value?.id || null)

    const result = applyCharacterStore(charactersRef.current, nextId)
    if (isLoggedIn && nextId) {
      apiActivateChar(nextId).catch(() => {})
    }
    return result
  }, [applyCharacterStore, isLoggedIn])

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
    const result = applyCharacterStore(finalCharacters, nextActiveId)

    // Sync to backend
    if (isLoggedIn) {
      const charData = normalized
      if (didUpdate) {
        apiUpdateChar(charData.id, charData).catch(() => {})
      } else {
        apiCreateChar(charData).catch(() => {})
      }
      if (nextActiveId === charData.id) {
        apiActivateChar(charData.id).catch(() => {})
      }
    }

    return result
  }, [applyCharacterStore, isLoggedIn])

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
    if (isLoggedIn) {
      deleteCharacterApi(characterId).catch(() => {})
    }
    return applyCharacterStore(nextCharacters, nextActiveId)
  }, [applyCharacterStore, persistSessions, sessionsRef, activeSessionIdRef, isLoggedIn])

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
        currentHP: newMaxHP,
        attackBonus: newAtkBonus,
      }
      if (calcSpellSaveDC && updatedChar.spellSaveDC) {
        updatedChar.spellSaveDC = calcSpellSaveDC(current.class, current.attributes, newLevel)
      }
      if (calcSpellAttackBonus && updatedChar.spellAttackBonus !== undefined) {
        updatedChar.spellAttackBonus = calcSpellAttackBonus(current.class, current.attributes, newLevel)
      }
      updatedChar.spellSlots = getSpellSlots(current.class, newLevel)
    }

    saveCharacter(updatedChar)
    return { oldLevel, newLevel, didLevelUp, newXP }
  }, [saveCharacter])

  const getModifier = (score) => getAbilityModifier(score)

  return (
    <CharacterContext.Provider value={{
      characters,
      setCharacters,
      character,
      setCharacter,
      saveCharacter,
      upsertCharacter,
      deleteCharacter,
      selectCharacter,
      updateCharacterHP,
      awardXP,
      getModifier,
      _applyCharacterStore: applyCharacterStore,
      _charactersRef: charactersRef,
    }}>
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used within CharacterProvider')
  return ctx
}
