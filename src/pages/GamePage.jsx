import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../context/SoundContext'
import { sendMessage } from '../services/openrouter'
import CombatTracker from '../components/CombatTracker'
import { PROJECT_NAME, SRD_QUICK_RULES } from '../data/srd'

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100]
// Dynamic choices are parsed from AI response - no static quick actions needed
const QUICK_ACTIONS = []

// Parse numbered choices from AI response text (deduplicated)
// Handles both line-separated and inline numbering (e.g. "1. Foo  2. Bar")
function parseChoices(text = '') {
  const clean = String(text).replace(/\*\*/g, '')
  // Split on numbered pattern boundaries: "1. ", "2) " etc. — keeps the number as part of the match
  const segments = clean.split(/(?=(?:^|\n|\s{2,})\d[.):])/g)
  const choices = []
  const seen = new Set()
  let hasOther = false
  for (const seg of segments) {
    const m = seg.trim().match(/^([1-9])[.):]\s*(.+)/)
    if (!m) continue
    const label = m[2].trim().split('\n')[0].trim()
    const key = label.toLowerCase()
    const isOther = /etwas anderes|selbst beschreiben/i.test(label)
    if (isOther && hasOther) continue
    if (isOther) hasOther = true
    if (label && label.length < 200 && !seen.has(key)) {
      seen.add(key)
      choices.push(label)
    }
  }
  return choices
}

// Parse [GEGNER:Name|HP:X|AC:Y|ATK:+Z|DMG:WdX+N|XP:N] tags from AI text
function parseEnemyTags(text = '') {
  const enemies = []
  const regex = /\[GEGNER:([^|\]]+)\|HP:(\d+)\|AC:(\d+)\|ATK:\+?([-\d]+)\|DMG:([^|\]]+)\|XP:(\d+)\]/g
  let m
  while ((m = regex.exec(text)) !== null) {
    const maxHP = parseInt(m[2]) || 10
    enemies.push({
      id: `enemy-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name: m[1].trim(),
      maxHP,
      currentHP: maxHP,
      ac: parseInt(m[3]) || 12,
      attackBonus: parseInt(m[4]) || 3,
      damageDice: m[5].trim(),
      xp: parseInt(m[6]) || 25,
      initiativeBonus: 0,
    })
  }
  return enemies
}

// Parse [XP:N] reward tag
function parseXPReward(text = '') {
  const m = text.match(/\[XP:(\d+)\]/)
  return m ? parseInt(m[1]) : 0
}

function TypingIndicator() {
  return (
    <div className="chat-dm max-w-none">
      <div className="flex items-center gap-1 py-1">
        <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce [animation-delay:0.15s]" />
        <span className="w-2 h-2 bg-gold-500 rounded-full animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  )
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`animate-fade-in ${isUser ? 'text-right' : ''}`}>
      <div className="flex items-center gap-2 mb-1 justify-between">
        <span className={`font-heading text-xs tracking-wider ${isUser ? 'text-stone-500 ml-auto' : 'text-gold-600'}`}>
          {isUser ? '🧑‍🎲 DU' : '🗡️ DUNGEONS & DAGGERS'}
        </span>
      </div>
      <div className={isUser ? 'chat-player ml-auto' : 'chat-dm'}>
        <p className="font-body text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  )
}

function SelectionTile({ title, subtitle, active, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`panel p-4 text-left transition-all duration-200 ${active ? 'border-gold-600/50 bg-gold-600/10' : 'hover:border-gold-700/30'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-heading text-sm text-parchment truncate">{title}</p>
          {subtitle && <p className="font-body text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        {active && <span className="badge-green">● Gewählt</span>}
      </div>
      {children}
    </button>
  )
}

function SessionCard({ session, character, adventure, isActive, onContinue, onDelete }) {
  const lastEntry = session.gameLog?.[session.gameLog.length - 1]

  return (
    <div className={`panel p-4 ${isActive ? 'border-gold-600/40' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-heading text-parchment text-base truncate">
            {adventure?.title || session.adventureTitle || 'Freies Solo-Abenteuer'}
          </p>
          <p className="font-body text-xs text-stone-500 mt-0.5">
            {character ? `${character.name} · ${character.race} ${character.class}` : 'Held nicht mehr vorhanden'}
          </p>
        </div>
        {isActive && <span className="badge-green">● Aktiv</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-body text-stone-500 mb-3">
        <div>
          <p className="section-subtitle mb-1">Stand</p>
          <p>{session.gameLog?.length || 0} Nachrichten</p>
        </div>
        <div>
          <p className="section-subtitle mb-1">Zuletzt</p>
          <p>{new Date(session.updatedAt).toLocaleString('de-DE')}</p>
        </div>
      </div>

      {lastEntry ? (
        <p className="font-body text-sm text-stone-400 italic line-clamp-2 mb-4">
          „{lastEntry.content.substring(0, 120)}{lastEntry.content.length > 120 ? '…' : ''}“
        </p>
      ) : (
        <p className="font-body text-sm text-stone-600 italic mb-4">Session angelegt, aber noch nicht gestartet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={onContinue} className="btn-primary text-xs px-4 py-2">Fortsetzen →</button>
        <button onClick={onDelete} className="btn-danger text-xs px-4 py-2">Löschen</button>
      </div>
    </div>
  )
}

export default function GamePage() {
  const {
    character,
    characters,
    adventure,
    adventures,
    gameLog,
    addMessage,
    combat,
    startCombat,
    awardXP,
    apiKey,
    hasServerKey,
    selectedModel,
    sceneState,
    syncSceneState,
    resetSceneState,
    sessions,
    activeSession,
    createSession,
    loadSession,
    deleteSession,
  } = useGame()
  const { isLoggedIn } = useAuth()
  const { playMusic, playSfx } = useSound()

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')

  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState('')
  const [showDice, setShowDice] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const [dynamicChoices, setDynamicChoices] = useState([])
  const [levelUpNotif, setLevelUpNotif] = useState(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState(character?.id || '')
  const [selectedAdventureId, setSelectedAdventureId] = useState(adventure?.id || '')
  const logEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameLog, streamingText])

  useEffect(() => {
    if (mode !== 'continue') {
      setSelectedCharacterId(character?.id || '')
      setSelectedAdventureId(adventure?.id || '')
    }
  }, [character?.id, adventure?.id, mode])

  const selectedCharacter = useMemo(
    () => characters.find(entry => entry.id === selectedCharacterId) || null,
    [characters, selectedCharacterId]
  )

  const selectedAdventure = useMemo(
    () => adventures.find(entry => entry.id === selectedAdventureId) || null,
    [adventures, selectedAdventureId]
  )

  const enrichedSessions = useMemo(() => {
    return sessions.map(session => ({
      ...session,
      character: characters.find(entry => entry.id === session.characterId) || null,
      adventure: adventures.find(entry => entry.id === session.adventureId) || null,
    }))
  }, [adventures, characters, sessions])

  const buildHistory = useCallback((sourceMessages = gameLog) => {
    const trimmedHistory = sourceMessages.slice(-12)
    return trimmedHistory.map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }))
  }, [gameLog])

  const handleSend = useCallback(async (userText, options = {}) => {
    const text = userText || input.trim()
    if (!text || streaming) return
    if (!apiKey) {
      setError('Kein API Key – bitte Einstellungen öffnen.')
      return
    }

    const activeCharacter = options.characterOverride ?? character
    const activeAdventure = options.adventureOverride ?? adventure
    const activeSceneState = options.sceneStateOverride ?? sceneState
    const history = Array.isArray(options.historyOverride)
      ? options.historyOverride
      : buildHistory()

    setInput('')
    setError('')
    setDynamicChoices([])
    const userMsg = addMessage('user', text)

    const outboundMessages = [...history, { role: 'user', content: text }]

    setStreaming(true)
    setStreamingText('')

    let full = ''
    try {
      full = await sendMessage({
        messages: outboundMessages,
        model: selectedModel,
        apiKey,
        character: activeCharacter,
        adventure: activeAdventure,
        combat,
        sceneState: activeSceneState,
        useProxy: isLoggedIn && hasServerKey,
        onChunk: chunk => {
          full += chunk
          setStreamingText(prev => prev + chunk)
        },
      })

      const assistantMsg = addMessage('assistant', full)

      // Parse dynamic choices from AI response
      const choices = parseChoices(full)
      setDynamicChoices(choices)

      // Parse enemies if combat starts
      if (full.includes('KAMPF BEGINNT') && !combat?.active) {
        const parsedEnemies = parseEnemyTags(full)
        startCombat(parsedEnemies)
      }

      // Parse XP rewards when combat ends
      if (full.includes('KAMPF VORBEI')) {
        const xpReward = parseXPReward(full)
        if (xpReward > 0 && awardXP) {
          const result = awardXP(xpReward)
          if (result?.didLevelUp) {
            setLevelUpNotif({ oldLevel: result.oldLevel, newLevel: result.newLevel })
            setTimeout(() => setLevelUpNotif(null), 5000)
          }
        }
      }

      const fullTranscript = [
        ...(Array.isArray(options.rawHistoryOverride) ? options.rawHistoryOverride : gameLog.slice(-14)),
        userMsg,
        assistantMsg,
      ]

      syncSceneState({
        messages: fullTranscript,
        adventureOverride: activeAdventure,
        combatOverride: combat,
        fallbackUserText: text,
      })


    } catch (e) {
      setError(`Fehler: ${e.message}`)
    } finally {
      setStreaming(false)
      setStreamingText('')
      inputRef.current?.focus()
    }
  }, [
    input,
    streaming,
    apiKey,
    character,
    adventure,
    sceneState,
    buildHistory,
    addMessage,
    selectedModel,
    combat,
    syncSceneState,
    startCombat,
    awardXP,
    gameLog,
  ])

  const handleCombatAction = useCallback(text => handleSend(`[Kampfrunde] ${text}`), [handleSend])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1
    handleSend(`[Würfelwurf] d${sides}: ${result}`)
  }

  const startAdventurePrompt = useCallback((activeAdventure) => {
    if (activeAdventure) {
      return `Das Abenteuer „${activeAdventure.title}“ beginnt jetzt. Führe mich direkt in die erste Szene, erkläre nichts außerhalb der Welt, respektiere unmittelbare Entscheidungsmomente und halte dich an die SRD-Grundregeln.`
    }

    return 'Das Abenteuer beginnt. Führe mich direkt in eine spannende erste Szene eines klassischen Fantasy-Abenteuers nach dem D&D-SRD. Stoppe an klaren Entscheidungspunkten.'
  }, [])

  const handleStartNewSession = useCallback(() => {
    if (!apiKey) {
      setError('Bitte zuerst einen OpenRouter API Key hinterlegen.')
      return
    }

    if (!selectedCharacter) {
      setError('Bitte zuerst einen Helden auswählen oder erstellen.')
      return
    }

    const session = createSession({
      characterId: selectedCharacter.id,
      adventureId: selectedAdventure?.id || null,
    })

    setError('')
    navigate('/game', { replace: true })

    handleSend(startAdventurePrompt(selectedAdventure), {
      characterOverride: selectedCharacter,
      adventureOverride: selectedAdventure,
      sceneStateOverride: session?.sceneState || resetSceneState(selectedAdventure),
      historyOverride: [],
      rawHistoryOverride: [],
    })
  }, [apiKey, selectedAdventure, selectedCharacter, createSession, navigate, handleSend, startAdventurePrompt, resetSceneState])

  const handleContinueSession = useCallback((sessionId) => {
    const session = loadSession(sessionId)
    if (!session) {
      setError('Session konnte nicht geladen werden.')
      return
    }

    setError('')
    navigate('/game', { replace: true })
  }, [loadSession, navigate])

  const handleDeleteSession = useCallback((session) => {
    const adventureTitle = session.adventure?.title || session.adventureTitle || 'Freies Solo-Abenteuer'
    const heroName = session.character?.name || 'unbekannter Held'
    if (!window.confirm(`Session „${adventureTitle}“ mit ${heroName} wirklich löschen?`)) return
    deleteSession(session.id)
  }, [deleteSession])

  const currentCharacterHpPercent = character
    ? Math.max(0, Math.min(((character.currentHP ?? character.maxHP) / character.maxHP) * 100, 100))
    : 0

  const showNewSessionSetup = mode === 'new' || (!activeSession && gameLog.length === 0 && mode !== 'continue')
  const showContinueSelection = mode === 'continue'
  const showTranscript = !showNewSessionSetup && !showContinueSelection

  // Derive ambient music track from scene context + recent AI messages
  const sceneTrack = useMemo(() => {
    // Collect all context: sceneState fields + last few AI messages
    const parts = []
    if (sceneState) {
      parts.push(sceneState.currentLocation || '')
      parts.push(sceneState.currentSectionTitle || '')
      parts.push(sceneState.summary || '')
      parts.push(sceneState.lastOutcome || '')
    }
    // Recent AI messages are the most reliable source for current scene
    const recentAI = gameLog
      .filter(m => m.role === 'assistant')
      .slice(-3)
      .map(m => m.content || '')
    parts.push(...recentAI)

    const text = parts.join(' ').toLowerCase()

    // Tavern/inn: social indoor scenes with food, drink, fireplace
    if (/tavern|kneipe|wirtshaus|gasth(aus|of|haus)|schenke|schankraum|kessel|krug|bierstube|trinkstube|herberge|feuer.*kamin|kamin.*feuer|wirt\b|bardame|theke|ausschank/.test(text)) return 'tavern'
    // Forest/outdoor: nature, wilderness, travel
    if (/wald|forest|lichtung|wiese|pfad|draußen|outdoor|hain|fluss|see|bach|ufer|berg|hügel|tal|steppe|moor|sumpf|küste|strand|garten|feld|weide|straße|landstraße|reise|wanderung|camp|lager(?!raum)/.test(text)) return 'forest'
    // Default: dungeon/indoor (caves, ruins, temples, dungeons, buildings)
    return 'dungeon'
  }, [sceneState, gameLog])

  // Music: landing on pre-game, battle during combat, scene-aware ambient otherwise
  useEffect(() => {
    if (!showTranscript) {
      playMusic('landing')
      return
    }
    if (combat?.active) {
      playMusic('battle')
    } else {
      playMusic(sceneTrack)
    }
  }, [combat?.active, showTranscript, sceneTrack, playMusic])

  return (
    <div className="flex flex-col h-screen max-h-screen -m-6 lg:-m-8">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gold-700/20 bg-dungeon-200/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-heading text-gold-500 tracking-wider">Spielsitzung</h1>
          {adventure && <span className="badge-gold text-xs max-w-40 truncate">{adventure.title}</span>}
          {character && <span className="badge text-xs bg-stone-800 text-stone-400 border border-stone-700">{character.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRules(!showRules)} className="btn-ghost text-xs px-3 py-1.5">📖</button>
          <button onClick={() => setShowDice(!showDice)} className="btn-ghost text-xs px-3 py-1.5">🎲</button>
          <button onClick={() => navigate('/game?mode=new')} className="btn-ghost text-xs px-3 py-1.5">Neu</button>
          <button onClick={() => navigate('/game?mode=continue')} className="btn-ghost text-xs px-3 py-1.5">Fortfahren</button>
        </div>
      </div>

      {showRules && (
        <div className="panel mx-6 mt-3 p-4 animate-slide-in flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-body text-stone-500">
            {SRD_QUICK_RULES.map(rule => (
              <div key={rule.title}>
                <p className="section-subtitle mb-1">{rule.title}</p>
                <p>{rule.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {showNewSessionSetup && !streaming && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 animate-float">🏰</div>
                  <h2 className="font-display text-2xl text-gold-600 mb-3">Neues Abenteuer starten</h2>
                  <p className="font-body text-stone-500 italic max-w-2xl mx-auto">
                    Wähle dein Abenteuer und genau einen Helden. Du kannst auch erst einen neuen Helden erstellen und danach diese frische Session starten.
                  </p>
                </div>

                <div className="panel-gold p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div>
                      <p className="section-subtitle mb-1">Neue Session</p>
                      <p className="font-body text-sm text-stone-400">
                        Für jede neue Kombination wird eine eigene Session angelegt. Der gewählte Held bleibt danach an diese Session gebunden.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!apiKey && <button onClick={() => navigate('/settings')} className="btn-primary">⚙️ API Key eingeben</button>}
                      <button onClick={() => navigate('/character')} className="btn-ghost">🛡️ Helden auswählen oder neu erstellen</button>
                      <button onClick={() => navigate('/adventure')} className="btn-ghost">📜 Abenteuer verwalten</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-heading text-sm text-gold-500 tracking-wide">Held auswählen</p>
                        <span className="font-body text-xs text-stone-600">{characters.length === 1 ? '1 Held' : `${characters.length} Helden`}</span>
                      </div>

                      {characters.length === 0 ? (
                        <div className="panel p-5 text-center">
                          <p className="font-body text-stone-500 italic">Noch kein Held vorhanden.</p>
                          <button onClick={() => navigate('/character')} className="btn-primary mt-4">Held erstellen</button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {characters.map(entry => (
                            <SelectionTile
                              key={entry.id}
                              title={entry.name}
                              subtitle={`${entry.race} ${entry.class} · Stufe ${entry.level || 1}`}
                              active={selectedCharacterId === entry.id}
                              onClick={() => setSelectedCharacterId(entry.id)}
                            >
                              <div className="hp-bar-bg mb-1.5">
                                <div
                                  className="hp-bar-fill"
                                  style={{ width: `${Math.max(0, Math.min(((entry.currentHP ?? entry.maxHP) / entry.maxHP) * 100, 100))}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs font-body text-stone-500">
                                <span>HP {entry.currentHP ?? entry.maxHP}/{entry.maxHP}</span>
                                <span>AC {entry.armorClass}</span>
                              </div>
                            </SelectionTile>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-heading text-sm text-gold-500 tracking-wide">Abenteuer auswählen</p>
                        <span className="font-body text-xs text-stone-600">{adventures.length === 1 ? '1 Modul' : `${adventures.length} Module`}</span>
                      </div>

                      <div className="space-y-3">
                        <SelectionTile
                          title="Freies Solo-Abenteuer"
                          subtitle="Kein Modul · Die KI eröffnet eine generische Fantasy-Startszene"
                          active={!selectedAdventureId}
                          onClick={() => setSelectedAdventureId('')}
                        >
                          <p className="font-body text-xs text-stone-500">Praktisch für spontane Tests ohne importiertes Abenteuer.</p>
                        </SelectionTile>

                        {adventures.map(entry => (
                          <SelectionTile
                            key={entry.id}
                            title={entry.title}
                            subtitle={`${entry.pages} · ${(entry.charCount || 0).toLocaleString()} Zeichen`}
                            active={selectedAdventureId === entry.id}
                            onClick={() => setSelectedAdventureId(entry.id)}
                          >
                            <p className="font-body text-xs text-stone-500 line-clamp-2">
                              {entry.text ? `${entry.text.slice(0, 180).replace(/\s+/g, ' ')}${entry.text.length > 180 ? '…' : ''}` : 'Kein Vorschautext verfügbar.'}
                            </p>
                          </SelectionTile>
                        ))}

                        {adventures.length === 0 && (
                          <div className="panel p-5 text-center">
                            <p className="font-body text-stone-500 italic">Noch kein Modul geladen.</p>
                            <button onClick={() => navigate('/adventure')} className="btn-primary mt-4">Modul hochladen</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="panel p-4 mt-5">
                    <p className="section-subtitle mb-2">Ausgewählte Kombination</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <p className="font-heading text-parchment">Held</p>
                        <p className="font-body text-stone-400">
                          {selectedCharacter ? `${selectedCharacter.name} · ${selectedCharacter.race} ${selectedCharacter.class}` : 'Noch kein Held ausgewählt'}
                        </p>
                      </div>
                      <div>
                        <p className="font-heading text-parchment">Abenteuer</p>
                        <p className="font-body text-stone-400">
                          {selectedAdventure ? selectedAdventure.title : 'Freies Solo-Abenteuer ohne Modul'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleStartNewSession}
                      disabled={!apiKey || !selectedCharacter}
                      className="btn-primary text-base px-8 py-3"
                    >
                      ⚔️ Neues Abenteuer starten
                    </button>
                    {apiKey && !selectedCharacter && (
                      <p className="font-body text-xs text-stone-600 italic mt-3">Du brauchst mindestens einen gespeicherten Helden für den gezielten Start.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {showContinueSelection && !streaming && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4 animate-float">📜</div>
                  <h2 className="font-display text-2xl text-gold-600 mb-3">Abenteuer fortfahren</h2>
                  <p className="font-body text-stone-500 italic max-w-2xl mx-auto">
                    Wähle eine bestehende Session aus. Der zugehörige Held bleibt dabei fest an dieses Abenteuer gebunden und wird nicht gewechselt.
                  </p>
                </div>

                {enrichedSessions.length === 0 ? (
                  <div className="panel-gold p-8 text-center">
                    <p className="font-body text-stone-400 italic mb-4">Noch keine aktiven Abenteuer vorhanden.</p>
                    <button onClick={() => navigate('/game?mode=new')} className="btn-primary">Neues Abenteuer anlegen</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {enrichedSessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        character={session.character}
                        adventure={session.adventure}
                        isActive={activeSession?.id === session.id}
                        onContinue={() => handleContinueSession(session.id)}
                        onDelete={() => handleDeleteSession(session)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {showTranscript && gameLog.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

            {showTranscript && streaming && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-xs text-gold-600 tracking-wider">🗡️ DUNGEONS & DAGGERS</span>
                </div>
                {streamingText
                  ? <div className="chat-dm"><p className="font-body text-base leading-relaxed whitespace-pre-wrap">{streamingText}<span className="inline-block w-0.5 h-4 bg-gold-500 ml-0.5 animate-pulse" /></p></div>
                  : <TypingIndicator />}
              </div>
            )}

            {error && (
              <div className="bg-blood-500/10 border border-blood-500/50 rounded p-3 text-red-400 font-body text-sm">
                {error}
              </div>
            )}

            {levelUpNotif && (
              <div className="bg-gold-600/20 border border-gold-500/60 rounded p-4 text-center animate-fade-in">
                <p className="font-display text-2xl text-gold-400 mb-1">⬆️ STUFE AUFGESTIEGEN!</p>
                <p className="font-heading text-gold-300">Stufe {levelUpNotif.oldLevel} → Stufe {levelUpNotif.newLevel}</p>
                <p className="font-body text-sm text-stone-400 mt-1">HP, Übungsbonus und Kampfwerte wurden aktualisiert.</p>
              </div>
            )}
            <div ref={logEndRef} />
          </div>

          <div className="px-6 pb-4 pt-2 border-t border-gold-700/10 bg-dungeon-200/50 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? 'Spielleiter antwortet…' : 'Deine Aktion… (Enter senden, Shift+Enter Zeilenumbruch)'}
                disabled={streaming || !showTranscript || gameLog.length === 0}
                rows={2}
                className="input-dark flex-1 resize-none leading-relaxed"
              />
              <button onClick={() => handleSend()} disabled={streaming || !input.trim() || !showTranscript || gameLog.length === 0} className="btn-primary px-5 self-end">
                {streaming ? <span className="spinner" /> : '→'}
              </button>
            </div>
            {dynamicChoices.length > 0 && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {dynamicChoices.map((choice, i) => {
                  const isOther = /etwas anderes|selbst beschreiben/i.test(choice)
                  return (
                    <button
                      key={choice}
                      onClick={() => isOther ? inputRef.current?.focus() : handleSend(choice)}
                      disabled={!showTranscript || gameLog.length === 0 || streaming}
                      className={`text-xs px-3 py-1.5 rounded border transition-all duration-150 font-body whitespace-nowrap flex-shrink-0 ${
                        isOther
                          ? 'border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-500'
                          : 'border-gold-700/40 text-gold-400 hover:border-gold-500 hover:bg-gold-600/10'
                      }`}
                    >
                      {isOther ? '✏️ ' : `${i + 1}. `}{choice}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="w-80 border-l border-gold-700/10 overflow-y-auto flex flex-col gap-4 p-4 bg-dungeon-200/30 flex-shrink-0">
          {showTranscript && combat?.active && <CombatTracker onCombatAction={handleCombatAction} />}

          {showTranscript && showDice && (
            <div>
              <p className="section-subtitle mb-2">Würfelsystem</p>
              <div className="flex flex-wrap gap-1.5">
                {DICE_SIDES.map(sides => (
                  <button key={sides} onClick={() => rollDice(sides)} disabled={streaming || gameLog.length === 0} className="dice-btn w-12 h-12 text-xs">
                    <span className="text-base">⬡</span>
                    <span>d{sides}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showTranscript && sceneState && (
            <div className="panel p-3">
              <p className="section-subtitle mb-2">Szenenstatus</p>
              <p className="font-heading text-sm text-gold-400">{sceneState.currentSectionTitle}</p>
              {sceneState.currentLocation && (
                <p className="font-body text-xs text-stone-600 mt-1">Ort: {sceneState.currentLocation}</p>
              )}
              <p className="font-body text-xs text-stone-500 italic mt-1">{sceneState.summary}</p>
              {sceneState.currentObjective && (
                <div className="mt-3">
                  <p className="section-subtitle mb-1">Aktuelles Ziel</p>
                  <p className="font-body text-xs text-stone-400">{sceneState.currentObjective}</p>
                </div>
              )}
              {sceneState.activeQuest && (
                <div className="mt-3">
                  <p className="section-subtitle mb-1">Aktiver Faden</p>
                  <p className="font-body text-xs text-stone-400">{sceneState.activeQuest}</p>
                </div>
              )}
              {sceneState.lastPlayerAction && (
                <div className="mt-3">
                  <p className="section-subtitle mb-1">Letzte Aktion</p>
                  <p className="font-body text-xs text-stone-400">{sceneState.lastPlayerAction}</p>
                </div>
              )}
            </div>
          )}

          {character && (
            <div className="panel p-3">
              <p className="section-subtitle mb-2">Gebundener Held</p>
              <p className="font-heading text-sm text-gold-400">{character.name}</p>
              <p className="font-body text-xs text-stone-500 mb-1">{character.race} {character.class} · Stufe {character.level || 1}</p>
              {character.xp !== undefined && (
                <p className="font-body text-xs text-stone-600 mb-1">XP: {character.xp || 0}</p>
              )}
              <div className="hp-bar-bg mb-1">
                <div className="hp-bar-fill" style={{ width: `${currentCharacterHpPercent}%` }} />
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-body text-stone-500">HP</span>
                <span className="font-heading text-parchment">{character.currentHP ?? character.maxHP}/{character.maxHP}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {['str', 'dex', 'wis'].map(attribute => (
                  <div key={attribute} className="text-center">
                    <p className="font-heading text-xs text-stone-600 uppercase">{attribute}</p>
                    <p className="font-heading text-sm text-parchment">{character.attributes?.[attribute] || 10}</p>
                  </div>
                ))}
              </div>
              <div className="font-body text-xs text-stone-500 space-y-1">
                <p>AC {character.armorClass}</p>
                <p>Angriff {character.attackBonus >= 0 ? '+' : ''}{character.attackBonus}</p>
                <p>Prof +{character.proficiencyBonus || 2}</p>
              </div>
              {showTranscript && !combat?.active && gameLog.length > 0 && (
                <button onClick={() => startCombat([])} className="btn-danger w-full mt-3 text-xs py-1">
                  ⚔️ Kampf beginnen
                </button>
              )}
            </div>
          )}

          <div className="panel p-3">
            <p className="section-subtitle mb-2">Session</p>
            <div className="space-y-1 font-body text-xs text-stone-500">
              <p>Aktive Sessions: <span className="text-stone-400">{sessions.length}</span></p>
              <p>Nachrichten: <span className="text-stone-400">{gameLog.length}</span></p>
              <p>Modell: <span className="text-stone-400">{selectedModel.split('/').pop()}</span></p>
              <p>Heldenbibliothek: <span className="text-stone-400">{characters.length}</span></p>
              <p>Module: <span className="text-stone-400">{adventures.length}</span></p>
              {adventure && <p>Modul: <span className="text-stone-400">{adventure.title}</span></p>}
              <p>System: <span className="text-stone-400">{PROJECT_NAME}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
