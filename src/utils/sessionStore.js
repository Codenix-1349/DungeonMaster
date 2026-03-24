// ─── Session Persistence ─────────────────────────────────────────────────────

import { createInitialSceneState } from '../data/srd'
import { loadFromStorage, saveToStorage, makeLocalId } from './storage'

const DEFAULT_GAME_LOG = []
const DEFAULT_COMBAT = null
const DEFAULT_SCENE_STATE = null

export function normalizeGameLog(list) {
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

export function buildSessionRecord({
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

export function normalizeSessionList(list = [], adventures = []) {
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

export function persistSessionsStore(sessions, activeSessionId = null) {
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
