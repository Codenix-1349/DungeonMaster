import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { sendMessage } from '../services/openrouter'
import CombatTracker from '../components/CombatTracker'
import { PROJECT_NAME, SRD_QUICK_RULES } from '../data/srd'

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100]
const QUICK_ACTIONS = [
  'Ich untersuche die Umgebung.',
  'Ich spreche den NSC an.',
  'Ich schleiche vorsichtig weiter.',
  'Ich suche nach Fallen oder Geheimtüren.',
  'Ich greife an!',
]

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
      <div className={isUser ? 'chat-user ml-auto' : 'chat-dm'}>
        <p className="font-body text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  )
}

export default function GamePage() {
  const {
    character,
    adventure,
    gameLog,
    addMessage,
    clearGameLog,
    combat,
    startCombat,
    apiKey,
    selectedModel,
    sceneState,
    syncSceneState,
  } = useGame()

  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState('')
  const [showDice, setShowDice] = useState(true)
  const [showRules, setShowRules] = useState(false)
  const logEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameLog, streamingText])

  const buildHistory = useCallback(() => {
    const trimmedHistory = gameLog.slice(-12)
    return trimmedHistory.map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }))
  }, [gameLog])

  const handleSend = useCallback(async (userText) => {
    const text = userText || input.trim()
    if (!text || streaming) return
    if (!apiKey) {
      setError('Kein API Key – bitte Einstellungen öffnen.')
      return
    }

    setInput('')
    setError('')
    const userMsg = addMessage('user', text)

    const history = buildHistory()
    history.push({ role: 'user', content: text })

    setStreaming(true)
    setStreamingText('')

    let full = ''
    try {
      full = await sendMessage({
        messages: history,
        model: selectedModel,
        apiKey,
        character,
        adventure,
        combat,
        sceneState,
        onChunk: chunk => {
          full += chunk
          setStreamingText(prev => prev + chunk)
        },
      })

      const assistantMsg = addMessage('assistant', full)

      const fullTranscript = [
        ...gameLog.slice(-14),
        userMsg,
        assistantMsg,
      ]

      syncSceneState({
        messages: fullTranscript,
        adventureOverride: adventure,
        combatOverride: combat,
        fallbackUserText: text,
      })

      if (full.includes('KAMPF BEGINNT') && !combat?.active) startCombat([])
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
    addMessage,
    buildHistory,
    selectedModel,
    character,
    adventure,
    combat,
    sceneState,
    syncSceneState,
    startCombat,
    gameLog,
  ])

  const handleCombatAction = useCallback(text => handleSend(`[Kampfaktion] ${text}`), [handleSend])

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const rollDice = (sides) => {
    const result = Math.floor(Math.random() * sides) + 1
    handleSend(`[Würfelwurf] d${sides}: ${result}`)
  }

  const startAdventure = () => {
    if (adventure) {
      handleSend(`Das Abenteuer „${adventure.title}“ beginnt. Führe mich direkt in die erste Szene, erkläre nichts außerhalb der Welt und halte dich an die SRD-Grundregeln.`)
      return
    }

    handleSend('Das Abenteuer beginnt. Führe mich direkt in eine spannende erste Szene eines klassischen Fantasy-Abenteuers nach dem D&D-SRD.')
  }

  return (
    <div className="flex flex-col h-screen max-h-screen -m-6 lg:-m-8">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gold-700/20 bg-dungeon-200/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-heading text-gold-500 tracking-wider">Spielsitzung</h1>
          {adventure && <span className="badge-gold text-xs max-w-32 truncate">{adventure.title}</span>}
          {character && <span className="badge text-xs bg-stone-800 text-stone-400 border border-stone-700">{character.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRules(!showRules)} className="btn-ghost text-xs px-3 py-1.5">📖</button>
          <button onClick={() => setShowDice(!showDice)} className="btn-ghost text-xs px-3 py-1.5">🎲</button>
          <button onClick={() => { if (window.confirm('Session löschen?')) clearGameLog() }} className="btn-ghost text-xs px-3 py-1.5">Neu</button>
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
            {gameLog.length === 0 && !streaming && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4 animate-float">🏰</div>
                <h2 className="font-display text-2xl text-gold-600 mb-3">
                  {character ? `Bereit, ${character.name}?` : `Bereit für ${PROJECT_NAME}?`}
                </h2>
                <p className="font-body text-stone-500 italic mb-6 max-w-md mx-auto">
                  {!apiKey
                    ? 'Bitte zuerst OpenRouter API Key in den Einstellungen eingeben.'
                    : !character
                    ? 'Erstelle zuerst einen Charakter.'
                    : 'Drücke „Abenteuer starten“ oder beschreibe deine erste Aktion.'}
                </p>
                {apiKey && character && (
                  <button onClick={startAdventure} className="btn-primary text-base px-8 py-3">⚔️ Abenteuer starten</button>
                )}
                {!apiKey && <button onClick={() => navigate('/settings')} className="btn-primary">⚙️ API Key eingeben</button>}
                {apiKey && !character && <button onClick={() => navigate('/character')} className="btn-primary">🛡️ Charakter erstellen</button>}
              </div>
            )}

            {gameLog.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

            {streaming && (
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
                disabled={streaming}
                rows={2}
                className="input-dark flex-1 resize-none leading-relaxed"
              />
              <button onClick={() => handleSend()} disabled={streaming || !input.trim()} className="btn-primary px-5 self-end">
                {streaming ? <span className="spinner" /> : '→'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_ACTIONS.map(action => (
                <button key={action} onClick={() => setInput(action)} className="btn-ghost text-xs px-2 py-1">{action}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-80 border-l border-gold-700/10 overflow-y-auto flex flex-col gap-4 p-4 bg-dungeon-200/30 flex-shrink-0">
          {combat?.active && <CombatTracker onCombatAction={handleCombatAction} />}

          {showDice && (
            <div>
              <p className="section-subtitle mb-2">Würfelsystem</p>
              <div className="flex flex-wrap gap-1.5">
                {DICE_SIDES.map(sides => (
                  <button key={sides} onClick={() => rollDice(sides)} disabled={streaming} className="dice-btn w-12 h-12 text-xs">
                    <span className="text-base">⬡</span>
                    <span>d{sides}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sceneState && (
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
              {sceneState.discoveredClues?.length > 0 && (
                <div className="mt-3">
                  <p className="section-subtitle mb-1">Hinweise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sceneState.discoveredClues.map(item => (
                      <span key={item} className="badge-gold text-[11px]">{item}</span>
                    ))}
                  </div>
                </div>
              )}
              {sceneState.openThreads?.length > 0 && (
                <div className="mt-3">
                  <p className="section-subtitle mb-1">Offene Fäden</p>
                  <ul className="space-y-1">
                    {sceneState.openThreads.map(item => (
                      <li key={item} className="font-body text-xs text-stone-400">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {sceneState.notableElements?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sceneState.notableElements.map(item => (
                    <span key={item} className="badge-gold text-[11px]">{item}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {character && (
            <div className="panel p-3">
              <p className="section-subtitle mb-2">Charakter</p>
              <p className="font-heading text-sm text-gold-400">{character.name}</p>
              <p className="font-body text-xs text-stone-500 mb-2">{character.race} {character.class} · Stufe {character.level || 1}</p>
              <div className="hp-bar-bg mb-1">
                <div className="hp-bar-fill" style={{ width: `${((character.currentHP ?? character.maxHP) / character.maxHP) * 100}%` }} />
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
              {!combat?.active && (
                <button onClick={() => startCombat([])} className="btn-danger w-full mt-3 text-xs py-1">
                  ⚔️ Kampf beginnen
                </button>
              )}
            </div>
          )}

          <div className="panel p-3">
            <p className="section-subtitle mb-2">Session</p>
            <div className="space-y-1 font-body text-xs text-stone-500">
              <p>{gameLog.length} Nachrichten</p>
              <p>Modell: <span className="text-stone-400">{selectedModel.split('/').pop()}</span></p>
              {adventure && <p>Modul: <span className="text-stone-400">{adventure.title}</span></p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}