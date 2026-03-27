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
  recalcCharacterStats,
  EMPTY_CURRENCY,
} from '../data/srd'
import { lookupItem, createInventoryItem } from '../data/items'
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
      updatedChar.currentSpellSlots = { ...updatedChar.spellSlots }
    }

    saveCharacter(updatedChar)
    return { oldLevel, newLevel, didLevelUp, newXP }
  }, [saveCharacter])

  const consumeSpellSlot = useCallback((slotLevel) => {
    setCharacter(prev => {
      if (!prev) return prev
      const current = { ...(prev.currentSpellSlots || prev.spellSlots || {}) }
      const available = current[slotLevel] || 0
      if (available <= 0) return prev
      current[slotLevel] = available - 1
      return { ...prev, currentSpellSlots: current }
    })
  }, [setCharacter])

  const restoreSpellSlots = useCallback(() => {
    setCharacter(prev => {
      if (!prev) return prev
      return { ...prev, currentSpellSlots: { ...(prev.spellSlots || {}) } }
    })
  }, [setCharacter])

  // ── Inventory: use / consume an item ────────────────────────────────────────

  const useItem = useCallback((itemNameOrId) => {
    setCharacter(prev => {
      if (!prev) return prev
      const inventory = [...(prev.inventory || [])]
      const search = String(itemNameOrId).toLowerCase()

      // Find by id first, then by name
      let idx = inventory.findIndex(item =>
        typeof item === 'object' && item.id === itemNameOrId
      )
      if (idx === -1) {
        idx = inventory.findIndex(item => {
          if (typeof item === 'string') return item.toLowerCase().includes(search)
          return item.name?.toLowerCase().includes(search)
        })
      }
      if (idx === -1) return prev

      const item = inventory[idx]
      if (typeof item === 'object' && item.quantity > 1) {
        inventory[idx] = { ...item, quantity: item.quantity - 1 }
      } else {
        inventory.splice(idx, 1)
      }
      const updated = { ...prev, inventory }
      // Recalc if equipped item was consumed
      if (typeof item === 'object' && item.equipped) {
        return recalcCharacterStats(updated)
      }
      return updated
    })
  }, [setCharacter])

  // ── Inventory: add item ────────────────────────────────────────────────────

  const addItem = useCallback((itemKeyOrObject, quantity = 1) => {
    setCharacter(prev => {
      if (!prev) return prev
      const inventory = [...(prev.inventory || [])]

      let newItem
      if (typeof itemKeyOrObject === 'object' && itemKeyOrObject.id) {
        newItem = { ...itemKeyOrObject }
      } else {
        const nameOrKey = typeof itemKeyOrObject === 'string' ? itemKeyOrObject : itemKeyOrObject?.key
        const lookup = lookupItem(nameOrKey)
        if (lookup) {
          newItem = createInventoryItem(lookup.catalogEntry, { quantity: lookup.quantity * quantity })
        } else {
          newItem = createInventoryItem(nameOrKey, { quantity })
        }
      }

      // Stack if stackable and same itemKey already exists
      if (newItem.stackable && newItem.itemKey) {
        const existingIdx = inventory.findIndex(i =>
          typeof i === 'object' && i.itemKey === newItem.itemKey && !i.equipped
        )
        if (existingIdx !== -1) {
          inventory[existingIdx] = {
            ...inventory[existingIdx],
            quantity: (inventory[existingIdx].quantity || 1) + (newItem.quantity || 1),
          }
          return { ...prev, inventory }
        }
      }

      inventory.push(newItem)
      return { ...prev, inventory }
    })
  }, [setCharacter])

  // ── Inventory: remove item by id ───────────────────────────────────────────

  const removeItem = useCallback((inventoryItemId) => {
    setCharacter(prev => {
      if (!prev) return prev
      const item = prev.inventory?.find(i => typeof i === 'object' && i.id === inventoryItemId)
      if (!item) return prev
      const inventory = prev.inventory.filter(i => !(typeof i === 'object' && i.id === inventoryItemId))
      const updated = { ...prev, inventory }
      if (item.equipped) return recalcCharacterStats(updated)
      return updated
    })
  }, [setCharacter])

  // ── Inventory: equip item ──────────────────────────────────────────────────

  const equipItem = useCallback((inventoryItemId) => {
    setCharacter(prev => {
      if (!prev) return prev
      const inventory = [...(prev.inventory || [])]
      const item = inventory.find(i => typeof i === 'object' && i.id === inventoryItemId)
      if (!item) return prev

      // Determine the slot type: weapon, armor, shield
      const slotType = item.type // 'weapon', 'armor', 'shield'
      if (!['weapon', 'armor', 'shield'].includes(slotType)) return prev

      // Unequip current item in the same slot
      for (const other of inventory) {
        if (typeof other === 'object' && other.type === slotType && other.equipped && other.id !== inventoryItemId) {
          other.equipped = false
        }
      }

      // Equip the new item
      item.equipped = true

      return recalcCharacterStats({ ...prev, inventory })
    })
  }, [setCharacter])

  // ── Inventory: unequip item ────────────────────────────────────────────────

  const unequipItem = useCallback((inventoryItemId) => {
    setCharacter(prev => {
      if (!prev) return prev
      const inventory = [...(prev.inventory || [])]
      const item = inventory.find(i => typeof i === 'object' && i.id === inventoryItemId)
      if (!item || !item.equipped) return prev

      item.equipped = false
      return recalcCharacterStats({ ...prev, inventory })
    })
  }, [setCharacter])

  // ── Currency management ────────────────────────────────────────────────────

  const updateCurrency = useCallback((patch) => {
    setCharacter(prev => {
      if (!prev) return prev
      const currency = { ...(prev.currency || EMPTY_CURRENCY) }
      for (const [denom, delta] of Object.entries(patch)) {
        if (denom in currency) {
          currency[denom] = Math.max(0, (currency[denom] || 0) + delta)
        }
      }
      return { ...prev, currency }
    })
  }, [setCharacter])

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
      consumeSpellSlot,
      restoreSpellSlots,
      useItem,
      addItem,
      removeItem,
      equipItem,
      unequipItem,
      updateCurrency,
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
