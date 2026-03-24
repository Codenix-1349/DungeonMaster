// ─── Character Roster Persistence ────────────────────────────────────────────

import { normalizeCharacter } from '../data/srd'
import { loadFromStorage, saveToStorage, makeLocalId, sanitizeIdPart } from './storage'

const DEFAULT_CHARACTERS = []

export function deriveLegacyCharacterId(character) {
  const seed = [character?.name, character?.class, character?.race]
    .map(sanitizeIdPart)
    .filter(Boolean)
    .join('-')

  return seed ? `char-${seed}` : makeLocalId('char')
}

export function ensureCharacterRecord(character, fallbackId = null) {
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

export function normalizeCharacterRoster(list = []) {
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

export function getInitialCharacterStore() {
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

export function persistCharacterStore(characters, activeCharacterId) {
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
