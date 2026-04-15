// ─── GameContext — Thin Facade ────────────────────────────────────────────────
//
// Nests ApiConfigProvider → GameSessionProvider → CharacterProvider
// and re-exports a single useGame() hook that merges all sub-contexts.
// Cross-cutting concerns (session ↔ character binding) are wired here.

import React, { useCallback } from 'react'
import { getInitialCharacterStore } from '../utils/characterStore'
import { ApiConfigProvider, useApiConfig } from './ApiConfigContext'
import { GameSessionProvider, useGameSession } from './GameSessionContext'
import { CharacterProvider, useCharacter } from './CharacterContext'
import { useAuth } from './AuthContext'
import {
  activateSession as apiActivateSession,
  createAdventure as apiCreateAdventure,
  createCharacter as apiCreateChar,
  createSession as apiCreateSession,
  updateSession as apiUpdateSession,
} from '../services/api'

// ─── Combined Hook ───────────────────────────────────────────────────────────

function useGameCombined() {
  const apiConfig = useApiConfig()
  const session = useGameSession()
  const char = useCharacter()
  const { isLoggedIn } = useAuth()
  const syncedServerAdventureIdsRef = React.useRef(new Set())
  const syncedServerSessionIdsRef = React.useRef(new Set())

  // Cross-cutting: createSession also selects the character
  // Ensures the character exists in the DB before creating the session (prevents FK errors)
  const createSession = useCallback(async (opts = {}) => {
    const characterId = opts.characterId || char._charactersRef.current.find(c => c.id === (char.character?.id))?.id || null

    if (isLoggedIn && characterId) {
      const charData = char._charactersRef.current.find(c => c.id === characterId)
      if (charData) {
        try { await apiCreateChar(charData) } catch (_) { /* upsert — 201 on success */ }
      }
    }

    const result = session.createSessionRaw({ ...opts, characterId })
    if (characterId) {
      char._applyCharacterStore(char._charactersRef.current, characterId)
    }
    return result
  }, [session, char, isLoggedIn])

  // Cross-cutting: loadSession also selects the session's character
  const loadSession = useCallback((sessionId) => {
    const result = session.loadSessionRaw(sessionId)
    if (result?.characterId) {
      char._applyCharacterStore(char._charactersRef.current, result.characterId)
    }
    return result
  }, [session, char])

  const syncProxyAuthorityState = useCallback(async (sessionId = session.activeSessionId) => {
    if (!isLoggedIn || !sessionId) return false

    const liveSession = session._refs.sessionsRef.current.find(entry => entry.id === sessionId) || null
    if (!liveSession) return false

    const isActiveSession = session._refs.activeSessionIdRef.current === sessionId
    const liveAdventureId = isActiveSession
      ? (session._refs.adventureRef.current?.id || liveSession.adventureId || null)
      : (liveSession.adventureId || null)
    const liveAdventure = liveAdventureId
      ? (
        session._refs.adventuresRef.current.find(entry => entry.id === liveAdventureId)
        || (session._refs.adventureRef.current?.id === liveAdventureId ? session._refs.adventureRef.current : null)
      )
      : null
    const liveCharacterId = liveSession.characterId || char.character?.id || null
    const liveCharacter = liveCharacterId
      ? char._charactersRef.current.find(entry => entry.id === liveCharacterId) || null
      : null
    const sessionPatch = {
      characterId: liveCharacter?.id || liveSession.characterId || null,
      adventureId: liveAdventure?.id || liveAdventureId || null,
      gameLog: isActiveSession ? (session._refs.gameLogRef.current || []) : (liveSession.gameLog || []),
      combat: isActiveSession ? (session._refs.combatRef.current || null) : (liveSession.combat || null),
      sceneState: isActiveSession ? (session._refs.sceneStateRef.current || null) : (liveSession.sceneState || null),
    }

    if (liveCharacter) {
      await apiCreateChar(liveCharacter)
    }

    if (liveAdventure && liveAdventure.builtin !== true && !syncedServerAdventureIdsRef.current.has(liveAdventure.id)) {
      try {
        await apiCreateAdventure(liveAdventure)
      } catch (error) {
        if (error?.status !== 409) throw error
      }
      syncedServerAdventureIdsRef.current.add(liveAdventure.id)
    }

    async function ensureServerSessionExists() {
      try {
        await apiCreateSession({
          ...liveSession,
          ...sessionPatch,
          id: sessionId,
        })
      } catch (error) {
        if (error?.status !== 409) throw error
      }
      syncedServerSessionIdsRef.current.add(sessionId)
    }

    if (!syncedServerSessionIdsRef.current.has(sessionId)) {
      await ensureServerSessionExists()
    }

    try {
      await apiUpdateSession(sessionId, sessionPatch)
    } catch (error) {
      if (error?.status !== 404) throw error
      await ensureServerSessionExists()
      await apiUpdateSession(sessionId, sessionPatch)
    }

    await apiActivateSession(sessionId).catch(() => {})
    return true
  }, [char, isLoggedIn, session])

  return {
    // API config
    apiKey: apiConfig.apiKey,
    setApiKey: apiConfig.setApiKey,
    aiProvider: apiConfig.aiProvider,
    setAiProvider: apiConfig.setAiProvider,
    ollamaBaseUrl: apiConfig.ollamaBaseUrl,
    setOllamaBaseUrl: apiConfig.setOllamaBaseUrl,
    selectedModel: apiConfig.selectedModel,
    setSelectedModel: apiConfig.setSelectedModel,
    hasServerKey: apiConfig.hasServerKey,
    serverKeyHint: apiConfig.serverKeyHint,
    apiReady: apiConfig.apiReady,

    // Character
    characters: char.characters,
    setCharacters: char.setCharacters,
    character: char.character,
    setCharacter: char.setCharacter,
    saveCharacter: char.saveCharacter,
    upsertCharacter: char.upsertCharacter,
    deleteCharacter: char.deleteCharacter,
    selectCharacter: char.selectCharacter,
    updateCharacterHP: char.updateCharacterHP,
    awardXP: char.awardXP,
    consumeSpellSlot: char.consumeSpellSlot,
    restoreSpellSlots: char.restoreSpellSlots,
    useItem: char.useItem,
    addItem: char.addItem,
    removeItem: char.removeItem,
    equipItem: char.equipItem,
    unequipItem: char.unequipItem,
    updateCurrency: char.updateCurrency,
    getModifier: char.getModifier,

    // Session / game state
    adventure: session.adventure,
    setAdventure: session.setAdventure,
    gameLog: session.gameLog,
    setGameLog: session.setGameLog,
    addMessage: session.addMessage,
    clearGameLog: session.clearGameLog,
    combat: session.combat,
    setCombat: session.setCombat,
    startCombat: session.startCombat,
    endCombat: session.endCombat,
    sceneState: session.sceneState,
    setSceneState: session.setSceneState,
    syncSceneState: session.syncSceneState,
    resetSceneState: session.resetSceneState,
    adventures: session.adventures,
    setAdventures: session.setAdventures,
    sessions: session.sessions,
    activeSession: session.activeSession,
    activeSessionId: session.activeSessionId,
    createSession,
    loadSession,
    syncProxyAuthorityState,
    deleteSession: session.deleteSession,
    leaveSessionSelection: session.leaveSessionSelection,
    unloadActiveSession: session.unloadActiveSession,
  }
}

// ─── Inner wrapper that provides useGame via context ─────────────────────────

const GameFacadeContext = React.createContext(null)

function GameFacadeProvider({ children }) {
  const game = useGameCombined()
  return (
    <GameFacadeContext.Provider value={game}>
      {children}
    </GameFacadeContext.Provider>
  )
}

// ─── Public Provider & Hook ──────────────────────────────────────────────────

export function GameProvider({ children }) {
  const initialCharacterStore = React.useRef(getInitialCharacterStore()).current

  return (
    <ApiConfigProvider>
      <GameSessionProvider initialCharacterStore={initialCharacterStore}>
        <CharacterProvider>
          <GameFacadeProvider>
            {children}
          </GameFacadeProvider>
        </CharacterProvider>
      </GameSessionProvider>
    </ApiConfigProvider>
  )
}

export function useGame() {
  const ctx = React.useContext(GameFacadeContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
