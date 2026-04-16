import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  createInitialSceneState,
  deriveSceneState,
  normalizeAdventureEntry,
} from '../data/srd'
import { createCombatState } from '../data/combatState.js'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import {
  normalizeGameLog,
  buildSessionRecord,
  normalizeSessionList,
  persistSessionsStore,
} from '../utils/sessionStore'
import { useAuth } from './AuthContext'
import {
  fetchSessions,
  createSession as apiCreateSession,
  updateSession as apiUpdateSession,
  appendGameLog as apiAppendGameLog,
  deleteSessionApi,
  activateSession as apiActivateSession,
  unloadSession as apiUnloadSession,
  fetchAdventures,
  createAdventure as apiCreateAdventure,
  deleteAdventureApi,
} from '../services/api'
import { getUserCreatedAdventures, mergeBuiltinAdventures } from '../data/builtinAdventures'

const GameSessionContext = createContext(null)

const DEFAULT_ADVENTURE = null
const DEFAULT_GAME_LOG = []
const DEFAULT_COMBAT = null
const DEFAULT_SCENE_STATE = null
const DEFAULT_SESSIONS = []

function getInitialAdventure() {
  return normalizeAdventureEntry(loadFromStorage('dm_adventure', DEFAULT_ADVENTURE))
}

function getInitialSceneState(adventure) {
  const stored = loadFromStorage('dm_sceneState', DEFAULT_SCENE_STATE)
  if (stored && adventure) return stored
  return adventure ? createInitialSceneState(adventure) : null
}

export function deriveSyncedSceneState({
  previousSceneState = null,
  adventure = null,
  messages = [],
  combat = null,
  fallbackUserText = '',
  fallbackUserActionKey = null,
} = {}) {
  const activeAdventure = normalizeAdventureEntry(adventure)
  if (!activeAdventure) return null

  return deriveSceneState({
    adventure: activeAdventure,
    previousSceneState,
    messages,
    combat,
    fallbackUserText,
    fallbackUserActionKey,
  })
}

function buildInitialSessionState(characterStore) {
  const adventures = (() => {
    const stored = loadFromStorage('dm_adventures', [])
    const normalized = Array.isArray(stored) ? stored.map(normalizeAdventureEntry).filter(Boolean) : []
    return mergeBuiltinAdventures(normalized)
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

  return { adventure, gameLog, combat, sceneState, adventures, sessions, activeSessionId }
}

export function GameSessionProvider({ children, initialCharacterStore }) {
  const { isLoggedIn } = useAuth()

  const bootstrapRef = useRef(null)
  if (!bootstrapRef.current) {
    bootstrapRef.current = buildInitialSessionState(initialCharacterStore)
  }
  const bootstrap = bootstrapRef.current

  const [adventure, setAdventureState] = useState(bootstrap.adventure)
  const [gameLog, setGameLogState] = useState(bootstrap.gameLog)
  const [combat, setCombatState] = useState(bootstrap.combat)
  const [sceneState, setSceneStateState] = useState(bootstrap.sceneState)
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
  const gameLogSyncedLengthRef = useRef(gameLog.length)

  useEffect(() => { sessionsRef.current = sessions }, [sessions])
  useEffect(() => { activeSessionIdRef.current = activeSessionId }, [activeSessionId])
  useEffect(() => { adventureRef.current = adventure }, [adventure])
  useEffect(() => { gameLogRef.current = gameLog }, [gameLog])
  useEffect(() => { combatRef.current = combat }, [combat])
  useEffect(() => { sceneStateRef.current = sceneState }, [sceneState])
  useEffect(() => { adventuresRef.current = adventures }, [adventures])

  // Load sessions + adventures from backend on mount when logged in
  useEffect(() => {
    if (!isLoggedIn) return
    Promise.all([fetchSessions(), fetchAdventures()])
      .then(([sessData, advData]) => {
        const fetchedAdventures = advData.adventures?.length
          ? advData.adventures.map(normalizeAdventureEntry).filter(Boolean)
          : []
        const advList = mergeBuiltinAdventures(fetchedAdventures)
        adventuresRef.current = advList
        setAdventuresState(advList)
        saveToStorage('dm_adventures', advList)
        if (sessData.sessions?.length) {
          const sessList = normalizeSessionList(sessData.sessions, adventuresRef.current)
          const activeId = sessData.activeSessionId || null
          sessionsRef.current = sessList
          activeSessionIdRef.current = activeId
          setSessionsState(sessList)
          setActiveSessionIdState(activeId)
          persistSessionsStore(sessList, activeId)

          // Restore live state from active session
          const active = sessList.find(s => s.id === activeId)
          if (active) {
            const adv = adventuresRef.current.find(a => a.id === active.adventureId) || null
            const restoredLog = normalizeGameLog(active.gameLog)
            setAdventureState(adv)
            setGameLogState(restoredLog)
            gameLogRef.current = restoredLog
            gameLogSyncedLengthRef.current = restoredLog.length
            setCombatState(active.combat || null)
            setSceneStateState(active.sceneState || (adv ? createInitialSceneState(adv) : null))
          }
        }
      })
      .catch(() => {})
  }, [isLoggedIn])

  const persistSessions = useCallback((nextSessions, nextActiveSessionId = null) => {
    const persisted = persistSessionsStore(nextSessions, nextActiveSessionId)
    sessionsRef.current = persisted.sessions
    activeSessionIdRef.current = persisted.activeSessionId
    setSessionsState(persisted.sessions)
    setActiveSessionIdState(persisted.activeSessionId)
    return persisted
  }, [])

  // Debounced backend patch — batches sceneState/combat writes
  const debouncedPatchRef = useRef({ timer: null, sessionId: null, pending: {} })

  const flushDebouncedPatch = useCallback(() => {
    const ctx = debouncedPatchRef.current
    if (ctx.timer) { clearTimeout(ctx.timer); ctx.timer = null }
    if (!ctx.sessionId || !Object.keys(ctx.pending).length) return
    const { sessionId, pending } = ctx
    ctx.pending = {}
    ctx.sessionId = null
    apiUpdateSession(sessionId, pending).catch(() => {})
  }, [])

  const scheduleDebouncedPatch = useCallback((sessionId, patch) => {
    const ctx = debouncedPatchRef.current
    // If session changed, flush previous
    if (ctx.sessionId && ctx.sessionId !== sessionId) flushDebouncedPatch()
    ctx.sessionId = sessionId
    Object.assign(ctx.pending, patch)
    if (ctx.timer) clearTimeout(ctx.timer)
    ctx.timer = setTimeout(flushDebouncedPatch, 800)
  }, [flushDebouncedPatch])

  // Flush pending writes on unmount
  useEffect(() => () => flushDebouncedPatch(), [flushDebouncedPatch])

  const patchSession = useCallback((sessionId, patch, { debounceBackend = false } = {}) => {
    if (!sessionId) return null

    const updates = typeof patch === 'function' ? patch(sessionsRef.current.find(e => e.id === sessionId)) : patch
    const nextSessions = sessionsRef.current.map(entry => {
      if (entry.id !== sessionId) return entry
      return buildSessionRecord({
        ...entry,
        ...updates,
        id: entry.id,
        createdAt: entry.createdAt,
        updatedAt: new Date().toISOString(),
      })
    })

    persistSessions(nextSessions, sessionId)

    // Sync to backend
    if (isLoggedIn && updates) {
      if (debounceBackend) {
        scheduleDebouncedPatch(sessionId, updates)
      } else {
        apiUpdateSession(sessionId, updates).catch(() => {})
      }
    }

    return nextSessions.find(entry => entry.id === sessionId) || null
  }, [persistSessions, isLoggedIn, scheduleDebouncedPatch])

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
    const prevLength = gameLogSyncedLengthRef.current
    gameLogRef.current = normalized
    setGameLogState(normalized)
    saveToStorage('dm_gameLog', normalized)

    if (sessionIdOverride && isLoggedIn) {
      const isAppend = normalized.length > prevLength
      if (isAppend) {
        const newEntries = normalized.slice(prevLength)
        gameLogSyncedLengthRef.current = normalized.length
        apiAppendGameLog(sessionIdOverride, newEntries).catch(() => {})
      } else {
        // Reset or trim — fall back to full patch (e.g. clearGameLog)
        gameLogSyncedLengthRef.current = normalized.length
        patchSession(sessionIdOverride, { gameLog: normalized })
      }
    } else if (sessionIdOverride) {
      // Not logged in — local-only session record update
      patchSession(sessionIdOverride, { gameLog: normalized })
    }

    return normalized
  }, [patchSession, isLoggedIn])

  const applyLiveCombat = useCallback((nextCombat, sessionIdOverride = activeSessionIdRef.current) => {
    const normalized = nextCombat ? createCombatState(nextCombat) : null
    combatRef.current = normalized
    setCombatState(normalized)
    saveToStorage('dm_combat', normalized)

    if (sessionIdOverride) {
      patchSession(sessionIdOverride, { combat: normalized }, { debounceBackend: true })
    }

    return normalized
  }, [patchSession])

  const applyLiveSceneState = useCallback((nextSceneState, sessionIdOverride = activeSessionIdRef.current) => {
    const normalized = nextSceneState || null
    sceneStateRef.current = normalized
    setSceneStateState(normalized)
    saveToStorage('dm_sceneState', normalized)

    if (sessionIdOverride) {
      patchSession(sessionIdOverride, { sceneState: normalized }, { debounceBackend: true })
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

  const syncSceneState = useCallback(({
    messages,
    adventureOverride = null,
    combatOverride = null,
    previousSceneStateOverride = undefined,
    fallbackUserText = '',
    fallbackUserActionKey = null,
  }) => {
    const activeAdventure = normalizeAdventureEntry(adventureOverride || adventureRef.current)
    if (!activeAdventure) {
      setSceneState(null)
      return null
    }

    const nextSceneState = deriveSyncedSceneState({
      previousSceneState: previousSceneStateOverride ?? sceneStateRef.current,
      adventure: activeAdventure,
      messages,
      combat: combatOverride ?? combatRef.current,
      fallbackUserText,
      fallbackUserActionKey,
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

  const setAdventures = useCallback((val) => {
    const prevAdventures = adventuresRef.current
    const nextValue = typeof val === 'function' ? val(prevAdventures) : val
    const normalizedCustom = Array.isArray(nextValue)
      ? nextValue.map(normalizeAdventureEntry).filter(Boolean)
      : []
    const normalized = mergeBuiltinAdventures(normalizedCustom)

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

    // Sync to backend: create new, delete removed
    if (isLoggedIn) {
      const prevCustom = getUserCreatedAdventures(prevAdventures)
      const nextCustom = getUserCreatedAdventures(normalized)
      const prevIds = new Set(prevCustom.map(a => a.id))
      const nextIds = new Set(nextCustom.map(a => a.id))
      for (const adv of nextCustom) {
        if (!prevIds.has(adv.id)) apiCreateAdventure(adv).catch(() => {})
      }
      for (const adv of prevCustom) {
        if (!nextIds.has(adv.id)) deleteAdventureApi(adv.id).catch(() => {})
      }
    }
  }, [applyLiveAdventureState, applyLiveSceneState, persistSessions, isLoggedIn])

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

  const startCombat = useCallback((combatConfig = null) => {
    const normalizedCombatConfig = combatConfig && typeof combatConfig === 'object' && !Array.isArray(combatConfig)
      ? combatConfig
      : null
    const nextCombat = Array.isArray(combatConfig)
      ? createCombatState({ enemies: combatConfig })
      : createCombatState(normalizedCombatConfig || {})

    setCombat(nextCombat)
  }, [setCombat])

  const endCombat = useCallback(() => {
    setCombat(null)
  }, [setCombat])

  // Session CRUD — character binding is handled by the facade (useGame)
  const createSessionRaw = useCallback(({ characterId = null, adventureId = null } = {}) => {
    const resolvedAdventure = adventuresRef.current.find(entry => entry.id === adventureId) || null
    const initialSceneState = resolvedAdventure ? createInitialSceneState(resolvedAdventure) : null

    const session = buildSessionRecord({
      characterId,
      adventureId: resolvedAdventure?.id || null,
      adventureTitle: resolvedAdventure?.title || null,
      gameLog: [],
      combat: null,
      sceneState: initialSceneState,
    })

    persistSessions([session, ...sessionsRef.current], session.id)

    applyLiveAdventureState(resolvedAdventure, session.id)
    applyLiveGameLog([], session.id)
    applyLiveCombat(null, session.id)
    applyLiveSceneState(initialSceneState, session.id)

    // Sync to backend
    if (isLoggedIn) {
      apiCreateSession(session).catch(() => {})
      apiActivateSession(session.id).catch(() => {})
    }

    return session
  }, [applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions, isLoggedIn])

  const loadSessionRaw = useCallback((sessionId) => {
    const session = sessionsRef.current.find(entry => entry.id === sessionId) || null
    if (!session) return null

    persistSessions(sessionsRef.current, session.id)

    const resolvedAdventure = adventuresRef.current.find(entry => entry.id === session.adventureId) || null
    applyLiveAdventureState(resolvedAdventure, session.id)
    applyLiveGameLog(session.gameLog || [], session.id)
    applyLiveCombat(session.combat || null, session.id)
    applyLiveSceneState(session.sceneState || (resolvedAdventure ? createInitialSceneState(resolvedAdventure) : null), session.id)

    if (isLoggedIn) {
      apiActivateSession(session.id).catch(() => {})
    }

    return session
  }, [applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions, isLoggedIn])

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

    if (isLoggedIn) {
      deleteSessionApi(sessionId).catch(() => {})
    }
  }, [applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions, isLoggedIn])

  const leaveSessionSelection = useCallback(() => {
    persistSessions(sessionsRef.current, activeSessionIdRef.current)
  }, [persistSessions])

  const unloadActiveSession = useCallback(({ clearAdventure = false } = {}) => {
    const currentActiveId = activeSessionIdRef.current
    const nextAdventure = clearAdventure ? null : adventureRef.current

    persistSessions(sessionsRef.current, null)
    applyLiveGameLog([], null)
    applyLiveCombat(null, null)
    applyLiveAdventureState(nextAdventure, null)
    applyLiveSceneState(nextAdventure ? createInitialSceneState(nextAdventure) : null, null)

    if (isLoggedIn && currentActiveId) {
      apiUnloadSession(currentActiveId).catch(() => {})
    }

    return true
  }, [applyLiveAdventureState, applyLiveCombat, applyLiveGameLog, applyLiveSceneState, persistSessions, isLoggedIn])

  // Expose internal refs for cross-cutting facade
  const _refs = useRef({
    sessionsRef,
    activeSessionIdRef,
    adventureRef,
    gameLogRef,
    combatRef,
    sceneStateRef,
    adventuresRef,
  })

  return (
    <GameSessionContext.Provider value={{
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
      adventures,
      setAdventures,
      sessions,
      activeSession,
      activeSessionId,
      createSessionRaw,
      loadSessionRaw,
      deleteSession,
      leaveSessionSelection,
      unloadActiveSession,
      patchSession,
      persistSessions,
      flushDebouncedPatch,
      _refs: _refs.current,
    }}>
      {children}
    </GameSessionContext.Provider>
  )
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext)
  if (!ctx) throw new Error('useGameSession must be used within GameSessionProvider')
  return ctx
}
