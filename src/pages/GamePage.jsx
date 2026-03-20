import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { sendMessage } from '../services/openrouter'
import CombatTracker from '../components/CombatTracker'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2 px-1">
      <span className="font-body text-xs text-stone-600 italic mr-2">DM schreibt</span>
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot w-1.5 h-1.5 rounded-full bg-gold-600 inline-block" />
      ))}
    </div>
  )
}

function MessageBubble({ msg }) {
  const isDM = msg.role === 'assistant'
  const formatText = (text) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j} className="text-gold-400">{part}</strong> : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ))
  }
  return (
    <div className={`animate-fade-in ${isDM ? '' : 'ml-8'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-heading text-xs tracking-wider">
          {isDM
            ? <span className="text-gold-600">⚔ DUNGEON & Daggers</span>
            : <span className="text-stone-500">▶ Spieler</span>}
        </span>
        <span className="font-body text-xs text-stone-700">
          {new Date(msg.timestamp).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}
        </span>
      </div>
      <div className={isDM ? 'chat-dm' : 'chat-player'}>
        <p className="font-body text-base leading-relaxed">{formatText(msg.content)}</p>
      </div>
    </div>
  )
}

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100]
const QUICK_ACTIONS = [
  'Ich untersuche den Raum.',
  'Ich greife an!',
  'Ich versuche zu schleichen.',
  'Ich spreche den NSC an.',
  'Ich suche nach Fallen.',
  'Ich öffne die Truhe.',
]

export default function GamePage() {
  const { character, adventure, gameLog, addMessage, clearGameLog, apiKey, selectedModel, combat, startCombat } = useGame()
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

  const buildHistory = useCallback(() =>
    gameLog.map(m => ({ role: m.role==='assistant'?'assistant':'user', content: m.content }))
  , [gameLog])

  const handleSend = useCallback(async (userText) => {
    const text = userText || input.trim()
    if (!text || streaming) return
    if (!apiKey) { setError('Kein API Key – bitte Einstellungen öffnen.'); return }

    setInput('')
    setError('')
    addMessage('user', text)

    const history = buildHistory()
    history.push({ role: 'user', content: text })

    setStreaming(true)
    setStreamingText('')

    let full = ''
    try {
      full = await sendMessage({
        messages: history, model: selectedModel, apiKey, character, adventure,
        onChunk: chunk => { full += chunk; setStreamingText(p => p + chunk) }
      })
      addMessage('assistant', full)
      if (full.includes('KAMPF BEGINNT') && !combat?.active) startCombat([])
    } catch(e) {
      setError(`Fehler: ${e.message}`)
    } finally {
      setStreaming(false)
      setStreamingText('')
      inputRef.current?.focus()
    }
  }, [input, streaming, apiKey, addMessage, buildHistory, selectedModel, character, adventure, combat, startCombat])

  const handleCombatAction = useCallback(txt => handleSend(`[Kampfaktion] ${txt}`), [handleSend])

  const handleKeyDown = e => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const rollDice = (sides) => {
    const r = Math.floor(Math.random()*sides)+1
    handleSend(`[Würfelwurf] d${sides}: ${r}`)
  }

  return (
    <div className="flex flex-col h-screen max-h-screen -m-6 lg:-m-8">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gold-700/20 bg-dungeon-200/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-gold-500 tracking-wider">Spielsitzung</h1>
          {adventure && <span className="badge-gold text-xs max-w-32 truncate">{adventure.title}</span>}
          {character && <span className="badge text-xs bg-stone-800 text-stone-400 border border-stone-700">{character.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRules(!showRules)} className="btn-ghost text-xs px-3 py-1.5">📖</button>
          <button onClick={() => setShowDice(!showDice)} className="btn-ghost text-xs px-3 py-1.5">🎲</button>
          <button onClick={() => { if(window.confirm('Session löschen?')) clearGameLog() }} className="btn-ghost text-xs px-3 py-1.5">Neu</button>
        </div>
      </div>

      {showRules && (
        <div className="panel mx-6 mt-3 p-4 animate-slide-in flex-shrink-0">
          <div className="grid grid-cols-3 gap-4 text-xs font-body text-stone-500">
            <div><p className="section-subtitle mb-1">Angriff (THAC0)</p><p>d20 ≥ THAC0 − Ziel-RK = Treffer</p></div>
            <div><p className="section-subtitle mb-1">Initiative</p><p>d10 − DEX-Mod (niedriger = zuerst)</p></div>
            <div><p className="section-subtitle mb-1">Rettungswürfe</p><p>d20 gegen klassenabh. Zielwert</p></div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {gameLog.length === 0 && !streaming && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4 animate-float">🏰</div>
                <h2 className="font-display text-2xl text-gold-600 mb-3">
                  {character ? `Bereit, ${character.name}?` : 'Bereit für das Abenteuer?'}
                </h2>
                <p className="font-body text-stone-500 italic mb-6 max-w-md mx-auto">
                  {!apiKey ? 'Bitte zuerst OpenRouter API Key in den Einstellungen eingeben.'
                    : !character ? 'Erstelle zuerst einen Charakter.'
                    : 'Drücke "Abenteuer starten" oder schreibe deine erste Aktion.'}
                </p>
                {apiKey && character && (
                  <button onClick={() => handleSend(adventure
                    ? `Das Abenteuer "${adventure.title}" beginnt. Lies die Einleitung vor und führe mich in die erste Szene.`
                    : 'Das Abenteuer beginnt. Beschreibe die Ausgangssituation in einer mittelalterlichen Fantasiewelt.'
                  )} className="btn-primary text-base px-8 py-3">⚔️ Abenteuer starten</button>
                )}
                {!apiKey && <button onClick={() => navigate('/settings')} className="btn-primary">⚙️ API Key eingeben</button>}
                {apiKey && !character && <button onClick={() => navigate('/character')} className="btn-primary">🛡️ Charakter erstellen</button>}
              </div>
            )}

            {gameLog.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

            {streaming && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-xs text-gold-600 tracking-wider">⚔ DUNGEON MASTER</span>
                </div>
                {streamingText
                  ? <div className="chat-dm"><p className="font-body text-base leading-relaxed whitespace-pre-wrap">{streamingText}<span className="inline-block w-0.5 h-4 bg-gold-500 ml-0.5 animate-pulse"/></p></div>
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

          {/* Input */}
          <div className="px-6 pb-4 pt-2 border-t border-gold-700/10 bg-dungeon-200/50 flex-shrink-0">
            <div className="flex gap-2">
              <textarea ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? 'DM antwortet…' : 'Deine Aktion… (Enter senden, Shift+Enter Zeilenumbruch)'}
                disabled={streaming} rows={2}
                className="input-dark flex-1 resize-none leading-relaxed" />
              <button onClick={() => handleSend()} disabled={streaming||!input.trim()} className="btn-primary px-5 self-end">
                {streaming ? <span className="spinner" /> : '→'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_ACTIONS.map(a => (
                <button key={a} onClick={() => setInput(a)} className="btn-ghost text-xs px-2 py-1">{a}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-gold-700/10 overflow-y-auto flex flex-col gap-4 p-4 bg-dungeon-200/30 flex-shrink-0">
          {combat?.active && <CombatTracker onCombatAction={handleCombatAction} />}

          {showDice && (
            <div>
              <p className="section-subtitle mb-2">Würfelsystem</p>
              <div className="flex flex-wrap gap-1.5">
                {DICE_SIDES.map(sides => (
                  <button key={sides} onClick={() => rollDice(sides)}
                    disabled={streaming}
                    className="dice-btn w-12 h-12 text-xs">
                    <span className="text-base">⬡</span>
                    <span>d{sides}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {character && (
            <div className="panel p-3">
              <p className="section-subtitle mb-2">Charakter</p>
              <p className="font-heading text-sm text-gold-400">{character.name}</p>
              <p className="font-body text-xs text-stone-500 mb-2">{character.race} {character.class} · Stufe {character.level||1}</p>
              <div className="hp-bar-bg mb-1">
                <div className="hp-bar-fill" style={{width:`${((character.currentHP??character.maxHP)/character.maxHP)*100}%`}}/>
              </div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-body text-stone-500">HP</span>
                <span className="font-heading text-parchment">{character.currentHP??character.maxHP}/{character.maxHP}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {['str','dex','con'].map(a => (
                  <div key={a} className="text-center">
                    <p className="font-heading text-xs text-stone-600 uppercase">{a}</p>
                    <p className="font-heading text-sm text-parchment">{character.attributes?.[a]||10}</p>
                  </div>
                ))}
              </div>
              {!combat?.active && (
                <button onClick={() => startCombat([])} className="btn-danger w-full mt-2 text-xs py-1">
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
