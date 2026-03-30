import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../context/SoundContext'
import { sendMessage, parseLootTags, parseCurrencyTags, parseLostItemTags, parseCheckTags, stripCheckTags, formatProbeHinweisTags, parseHPTags, parseXPTags } from '../services/openrouter'
import CombatTracker from '../components/CombatTracker'
import SkillCheckPanel from '../components/SkillCheckPanel'
import { PROJECT_NAME, SRD_QUICK_RULES, SKILLS, ATTR_LABELS } from '../data/srd'

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100]
// Dynamic choices are parsed from AI response - no static quick actions needed
const QUICK_ACTIONS = []

// Resolve a skill/ability key to its German display label
function getCheckLabel(skillOrAbility) {
  const skillDef = SKILLS.find(s => s.key === skillOrAbility)
  if (skillDef) return skillDef.label
  return ATTR_LABELS[skillOrAbility] || skillOrAbility
}

// Parse [PROBE_HINWEIS:skill|SG:N] from a choice label
const PROBE_HINWEIS_RE = /\s*\[PROBE_HINWEIS:(\w+)\|SG:(\d+)(?:\|(VORTEIL|NACHTEIL))?\]/i

function parseProbeHinweis(label) {
  const m = label.match(PROBE_HINWEIS_RE)
  if (!m) return { label, check: null }
  return {
    label: label.replace(PROBE_HINWEIS_RE, '').trim(),
    check: {
      skillOrAbility: m[1].toLowerCase(),
      dc: parseInt(m[2]),
      advantage: m[3]?.toUpperCase() === 'VORTEIL' ? 'advantage'
               : m[3]?.toUpperCase() === 'NACHTEIL' ? 'disadvantage'
               : null,
    },
  }
}

// ── Code-side skill check detection (fallback when AI omits [PROBE_HINWEIS:]) ──
// Maps action keywords in choice text to skill + default DC
const SKILL_KEYWORD_MAP = [
  { pattern: /\b(untersuch|durchsuch|inspizier|prüf.*sorgfältig|absuch.*hinweis|absuch.*spur|absuch.*fall|nach.*fallen.*such|nach.*hinweis|nach.*spur|forsch|analys)/i, skill: 'investigation', dc: 12 },
  { pattern: /\b(beobacht|lausch|horch|aufmerksam|spitz.*ohren|umhör|scharf.*aug|wahrnehm)/i, skill: 'perception', dc: 12 },
  { pattern: /\b(schleich|versteck|unbemerkt|heimlich|leise.*beweg|ungesehen|anschleich|unauffällig)/i, skill: 'stealth', dc: 13 },
  { pattern: /\b(überzeug|beruhig|überred|besänftig|appellier|bitt.*eindringlich)/i, skill: 'persuasion', dc: 13 },
  { pattern: /\b(täusch|belüg|vormach|ablenkungsmanöver|bluffen|vorgeb|verheimlich)/i, skill: 'deception', dc: 13 },
  { pattern: /\b(einschüchter|bedrohe|drohe|Angst.*einjag)/i, skill: 'intimidation', dc: 13 },
  { pattern: /\b(kletter|hinaufkletter|hinunterklett|schwimm|spring.*über|hochzieh|erklettern|erklimm)/i, skill: 'athletics', dc: 13 },
  { pattern: /\b(balancier|ausweich|akrobat|herunterspring|abroll)/i, skill: 'acrobatics', dc: 12 },
  { pattern: /\b(schloss.*knack|schloss.*öffn|dietrich|aufbrech.*schloss|Taschendieb)/i, skill: 'sleightOfHand', dc: 14 },
  { pattern: /\b(magisch.*erkenn|arkane.*zeichen|Magie.*ident|magische.*Aura|verzaubert|entziffere.*Runen)/i, skill: 'arcana', dc: 13 },
  { pattern: /\b(spur.*les|spur.*folg|orientier|navigier|wildnis|überleb|fährt.*les)/i, skill: 'survival', dc: 12 },
  { pattern: /\b(absicht.*erkenn|durchschau|lüge.*erkenn|aufrichtig|motiv|hintergedank)/i, skill: 'insight', dc: 13 },
  { pattern: /\b(geschichtl|historisch|erinner.*an.*Wissen|alt.*Legende|bekannt.*Geschichte)/i, skill: 'history', dc: 12 },
  { pattern: /\b(heilig|gebet|götter|religiös|segnung|untote.*erkenn)/i, skill: 'religion', dc: 12 },
  { pattern: /\b(pflanz|tier.*erkenn|gift.*erkenn|natürlich|natur.*wissen)/i, skill: 'nature', dc: 12 },
  { pattern: /\b(verbind.*Wunde|stabilisier|erste.*Hilfe|heilen(?!.*zauber))/i, skill: 'medicine', dc: 12 },
]

function inferCheckFromLabel(label) {
  const lower = label.toLowerCase()
  // Skip trivial actions that don't need checks
  if (/\b(geh|verlasse|zurück|weiter.*geh|etwas anderes|beschreibe selbst|warte|raste|ruh)/i.test(lower)) return null
  for (const { pattern, skill, dc } of SKILL_KEYWORD_MAP) {
    if (pattern.test(lower)) return { skillOrAbility: skill, dc, advantage: null }
  }
  return null
}

// Parse numbered choices from AI response text (deduplicated)
// Handles both line-separated and inline numbering (e.g. "1. Foo  2. Bar")
// Extracts [PROBE_HINWEIS:] tags from choices that require skill checks
// Falls back to code-side keyword detection if AI omits tags
function parseChoices(text = '') {
  const clean = String(text).replace(/\*\*/g, '')
  // Split on numbered items: newline, 2+ spaces, or sentence-ending punctuation before a digit
  const segments = clean.split(/(?=(?:^|\n|\s{2,}|[.!?]\s)\d[.):])/g)
  const choices = []
  const seen = new Set()
  let hasOther = false
  for (const seg of segments) {
    const m = seg.trim().match(/^([1-9])[.):]\s*(.+)/)
    if (!m) continue
    const rawLabel = m[2].trim().split('\n')[0].trim()
    const { label, check } = parseProbeHinweis(rawLabel)
    // If AI didn't provide a check tag, try to infer one from the action text
    const effectiveCheck = check || inferCheckFromLabel(label)
    const key = label.toLowerCase()
    const isOther = /etwas anderes|selbst beschreiben/i.test(label)
    if (isOther && hasOther) continue
    if (isOther) hasOther = true
    if (label && label.length < 200 && !seen.has(key)) {
      seen.add(key)
      choices.push({ label, check: effectiveCheck })
    }
  }
  return choices
}

// Parse enemy tags from AI text — supports both formats:
//   [GEGNER:Name|HP:X|AC:Y|ATK:+Z|DMG:WdX+N|XP:N]
//   [Name|HP:X|AC:Y|ATK:+Z|DMG:WdX+N|XP:N]
function parseEnemyTags(text = '') {
  const enemies = []
  const regex = /\[(?:GEGNER:)?([^|\]]+)\|HP:(\d+)\|AC:(\d+)\|ATK:\+?([-\d]+)\|DMG:([^|\]]+)\|XP:(\d+)\]/gi
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

function CombatRoundBubble({ content }) {
  // Parse "[Kampfrunde] action1 | action2 | ..." into styled segments
  const raw = content.replace(/^\[Kampfrunde\]\s*/i, '')
  const segments = raw.split(/\s*\|\s*/).filter(Boolean)

  const getSegmentStyle = (text) => {
    if (/KRITISCH|KRIT!/i.test(text)) return { icon: '💥', color: 'text-amber-300', bg: 'bg-amber-600/10 border-amber-600/25' }
    if (/Treffer!/i.test(text)) return { icon: '⚔️', color: 'text-gold-400', bg: 'bg-gold-600/10 border-gold-600/25' }
    if (/Verfehlt|Patzer|daneben/i.test(text)) return { icon: '💨', color: 'text-stone-500', bg: 'bg-stone-800/30 border-stone-700/25' }
    if (/faellt|besiegt/i.test(text)) return { icon: '☠️', color: 'text-gold-300', bg: 'bg-gold-600/15 border-gold-500/30' }
    if (/Gegner-Angriff/i.test(text)) return { icon: '💀', color: 'text-red-400', bg: 'bg-red-900/15 border-red-700/25' }
    if (/\[Zauber\]/i.test(text)) return { icon: '✨', color: 'text-blue-400', bg: 'bg-blue-900/15 border-blue-700/25' }
    if (/Ausweichen/i.test(text)) return { icon: '🛡️', color: 'text-blue-300', bg: 'bg-blue-900/10 border-blue-700/20' }
    if (/Gegenstand|Heiltrank/i.test(text)) return { icon: '🧪', color: 'text-emerald-400', bg: 'bg-emerald-900/15 border-emerald-700/25' }
    if (/Alle Gegner besiegt/i.test(text)) return { icon: '🏆', color: 'text-gold-400', bg: 'bg-gold-600/20 border-gold-500/40' }
    if (/Freie Aktion/i.test(text)) return { icon: '💬', color: 'text-purple-400', bg: 'bg-purple-900/10 border-purple-700/20' }
    return { icon: '📜', color: 'text-stone-400', bg: 'bg-stone-800/20 border-stone-700/20' }
  }

  // Clean up tag prefixes for display
  const cleanText = (text) => text
    .replace(/^\[Gegner-Angriff\]\s*/i, '')
    .replace(/^\[Zauber\]\s*/i, '')
    .replace(/^\[Gegenstand\]\s*/i, '')
    .replace(/^\[Ausweichen\]\s*/i, '')
    .replace(/^\[Freie Aktion\]\s*/i, '')

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-heading text-xs tracking-wider text-red-500">⚔️ KAMPFRUNDE</span>
      </div>
      <div className="space-y-1">
        {segments.map((seg, i) => {
          const style = getSegmentStyle(seg)
          return (
            <div key={i} className={`flex items-start gap-2 rounded px-2.5 py-1.5 border text-sm ${style.bg}`}>
              <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
              <span className={`font-body ${style.color}`}>{cleanText(seg)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillCheckBubble({ content }) {
  const raw = content.replace(/^\[Probe\]\s*/i, '')
  const successMatch = /→\s*(Erfolg|Fehlschlag)/i.exec(raw)
  const isSuccess = successMatch?.[1]?.toLowerCase() === 'erfolg'
  const style = isSuccess
    ? { icon: '🎯', color: 'text-emerald-300', bg: 'bg-emerald-600/10 border-emerald-600/25' }
    : { icon: '💨', color: 'text-red-400', bg: 'bg-red-900/15 border-red-700/25' }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-heading text-xs tracking-wider text-blue-400">🎲 PROBE</span>
      </div>
      <div className={`flex items-start gap-2 rounded px-3 py-2 border text-sm ${style.bg}`}>
        <span className="flex-shrink-0 mt-0.5">{style.icon}</span>
        <span className={`font-body ${style.color}`}>{raw}</span>
      </div>
    </div>
  )
}

// Ensure numbered list items each start on a new line (AI sometimes writes them inline)
function normalizeNumberedList(text = '') {
  return text.replace(/([.!?])\s+(\d[.):])/g, '$1\n$2')
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  const isCombatRound = isUser && msg.content?.startsWith('[Kampfrunde]')
  const isCheckResult = isUser && msg.content?.startsWith('[Probe]')

  if (isCombatRound) {
    return <CombatRoundBubble content={msg.content} />
  }
  if (isCheckResult) {
    return <SkillCheckBubble content={msg.content} />
  }

  const displayText = isUser ? msg.content : normalizeNumberedList(msg.content || '')

  return (
    <div className={`animate-fade-in ${isUser ? 'text-right' : ''}`}>
      <div className="flex items-center gap-2 mb-1 justify-between">
        <span className={`font-heading text-xs tracking-wider ${isUser ? 'text-stone-500 ml-auto' : 'text-gold-600'}`}>
          {isUser ? '🧑‍🎲 DU' : '🗡️ DUNGEONS & DAGGERS'}
        </span>
      </div>
      <div className={isUser ? 'chat-player ml-auto' : 'chat-dm'}>
        <p className="font-body text-base leading-relaxed whitespace-pre-wrap">{displayText}</p>
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
    updateCharacterHP,
    restoreSpellSlots,
    addItem,
    useItem,
    updateCurrency,
    apiKey,
    hasServerKey,
    apiReady,
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
  const [pendingCheck, setPendingCheck] = useState(null)
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
    return trimmedHistory.map((message, index) => {
      if (message.role !== 'assistant') {
        return { role: 'user', content: message.content }
      }
      // Strip formatted probe hints (🎲 Label, SG N) from history so the AI
      // doesn't mimic the display format instead of using [PROBE_HINWEIS:] tags
      let content = message.content.replace(/\s*\(🎲\s*[^,]+,\s*SG\s*\d+\)/g, '')
      // For older assistant messages (not the last 2), strip trailing numbered
      // choice lists to save tokens — the AI only needs the narrative, not the
      // options that were already chosen or ignored
      if (index < trimmedHistory.length - 2) {
        content = content.replace(/(?:\n\s*\*{0,2}\d+[.)]\s+.+)+\s*$/, '').trimEnd()
      }
      return { role: 'assistant', content }
    })
  }, [gameLog])

  const handleSend = useCallback(async (userText, options = {}) => {
    const text = userText || input.trim()
    if (!text || streaming) return
    if (!apiReady) {
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

      // Strip [PROBE:] tags from displayed text (hide DC from player)
      const displayText = formatProbeHinweisTags(stripCheckTags(full), getCheckLabel)
      const assistantMsg = addMessage('assistant', displayText)

      // Parse choices first — choices always take priority over direct [PROBE:] tags
      const choices = parseChoices(full)
      if (choices.length > 0 && !combat?.active) {
        setDynamicChoices(choices)
        setPendingCheck(null)
      } else {
        setDynamicChoices([])
        // Direct [PROBE:] tag only when AI gives no choices (player already chose the action)
        const checkTag = parseCheckTags(full)
        if (checkTag && !combat?.active) {
          setPendingCheck(checkTag)
        }
      }

      // Parse enemies if combat starts — trigger on KAMPF BEGINNT or enemy tags
      if (!combat?.active) {
        const parsedEnemies = parseEnemyTags(full)
        if (parsedEnemies.length > 0) {
          startCombat(parsedEnemies)
        }
      }

      // Parse XP rewards — only for non-combat (quest/exploration rewards).
      // Combat XP + loot are handled exclusively by CombatTracker engine.
      const isCombatEnd = full.includes('KAMPF VORBEI')
      if (!isCombatEnd) {
        const xpReward = parseXPTags(full)
        if (xpReward > 0 && awardXP) {
          const result = awardXP(xpReward)
          if (result?.didLevelUp) {
            setLevelUpNotif({ oldLevel: result.oldLevel, newLevel: result.newLevel })
            setTimeout(() => setLevelUpNotif(null), 5000)
          } else {
            setLevelUpNotif({ loot: `+${xpReward} XP` })
            setTimeout(() => setLevelUpNotif(null), 3000)
          }
        }
      }

      // Parse HP changes (traps, poison, falls, healing outside combat)
      const hpChanges = parseHPTags(full)
      if (hpChanges.length > 0 && character) {
        let newHP = character.currentHP ?? character.maxHP
        for (const delta of hpChanges) {
          newHP = Math.max(0, Math.min(newHP + delta, character.maxHP))
        }
        updateCharacterHP(newHP)
      }

      // Revival: AI heals player narratively → restore HP + spell slots
      if (full.includes('[WIEDERBELEBEN]') && character?.maxHP) {
        updateCharacterHP(character.maxHP)
        restoreSpellSlots()
      }

      // Parse loot tags from AI response
      const lootItems = parseLootTags(full)
      for (const itemName of lootItems) {
        addItem(itemName)
      }

      // Parse currency tags
      const currencyChanges = parseCurrencyTags(full)
      if (Object.keys(currencyChanges).length > 0) {
        updateCurrency(currencyChanges)
      }

      // Parse lost item tags
      const lostItems = parseLostItemTags(full)
      for (const itemName of lostItems) {
        useItem(itemName)
      }

      // Show loot notification
      const lootNotifs = []
      if (lootItems.length) lootNotifs.push(lootItems.join(', '))
      if (currencyChanges.gm) lootNotifs.push(`+${currencyChanges.gm} GM`)
      if (currencyChanges.sm) lootNotifs.push(`+${currencyChanges.sm} SM`)
      if (currencyChanges.km) lootNotifs.push(`+${currencyChanges.km} KM`)
      if (lootNotifs.length) {
        setLevelUpNotif({ loot: lootNotifs.join(' · ') })
        setTimeout(() => setLevelUpNotif(null), 4000)
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
    apiReady,
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

  const handleCheckResult = useCallback((result, choiceLabel) => {
    setPendingCheck(null)
    setDynamicChoices([])

    let rollStr = `d20(${result.d20Result})`
    if (result.roll2 !== null) {
      const advLabel = result.advantage === 'advantage' ? 'Vorteil' : 'Nachteil'
      rollStr = `d20(${result.roll1}, ${result.roll2}) ${advLabel} → ${result.d20Result}`
    }

    const modStr = result.modifier >= 0 ? `+ ${result.modifier}` : `- ${Math.abs(result.modifier)}`
    const successLabel = result.success ? 'Erfolg' : 'Fehlschlag'

    const probeText = `[Probe] ${result.label}: ${rollStr} ${modStr} = ${result.total} vs SG ${result.dc} → ${successLabel}`
    if (choiceLabel) {
      handleSend(`${choiceLabel} | ${probeText}`)
    } else {
      handleSend(probeText)
    }
  }, [handleSend])

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

  const handleStartNewSession = useCallback(async () => {
    if (!apiReady) {
      setError('Bitte zuerst einen OpenRouter API Key hinterlegen.')
      return
    }

    if (!selectedCharacter) {
      setError('Bitte zuerst einen Helden auswählen oder erstellen.')
      return
    }

    const session = await createSession({
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
  }, [apiReady, selectedAdventure, selectedCharacter, createSession, navigate, handleSend, startAdventurePrompt, resetSceneState])

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
                      {!apiReady && <button onClick={() => navigate('/settings')} className="btn-primary">⚙️ API Key eingeben</button>}
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
                      disabled={!apiReady || !selectedCharacter}
                      className="btn-primary text-base px-8 py-3"
                    >
                      ⚔️ Neues Abenteuer starten
                    </button>
                    {apiReady && !selectedCharacter && (
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
                  ? <div className="chat-dm"><p className="font-body text-base leading-relaxed whitespace-pre-wrap">{normalizeNumberedList(formatProbeHinweisTags(stripCheckTags(streamingText), getCheckLabel))}<span className="inline-block w-0.5 h-4 bg-gold-500 ml-0.5 animate-pulse" /></p></div>
                  : <TypingIndicator />}
              </div>
            )}

            {error && (
              <div className="bg-blood-500/10 border border-blood-500/50 rounded p-3 text-red-400 font-body text-sm">
                {error}
              </div>
            )}

            {levelUpNotif && levelUpNotif.newLevel && (
              <div className="bg-gold-600/20 border border-gold-500/60 rounded p-4 text-center animate-fade-in">
                <p className="font-display text-2xl text-gold-400 mb-1">STUFE AUFGESTIEGEN!</p>
                <p className="font-heading text-gold-300">Stufe {levelUpNotif.oldLevel} → Stufe {levelUpNotif.newLevel}</p>
                <p className="font-body text-sm text-stone-400 mt-1">HP, Übungsbonus und Kampfwerte wurden aktualisiert.</p>
              </div>
            )}
            {levelUpNotif && levelUpNotif.loot && (
              <div className="bg-emerald-600/20 border border-emerald-500/60 rounded p-3 text-center animate-fade-in">
                <p className="font-heading text-emerald-300">Beute erhalten: {levelUpNotif.loot}</p>
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
                placeholder={
                  streaming ? 'Spielleiter antwortet…'
                  : pendingCheck ? 'Probe ausstehend — würfle im Panel rechts →'
                  : combat?.active ? 'Kampf aktiv — nutze die Aktions-Buttons rechts →'
                  : 'Deine Aktion… (Enter senden, Shift+Enter Zeilenumbruch)'
                }
                disabled={streaming || !showTranscript || gameLog.length === 0 || combat?.active || !!pendingCheck}
                rows={2}
                className="input-dark flex-1 resize-none leading-relaxed"
              />
              <button onClick={() => handleSend()} disabled={streaming || !input.trim() || !showTranscript || gameLog.length === 0 || combat?.active || !!pendingCheck} className="btn-primary px-5 self-end">
                {streaming ? <span className="spinner" /> : '→'}
              </button>
            </div>
            {dynamicChoices.length > 0 && !combat?.active && (
              <div className="flex flex-col gap-1.5 mt-2 max-h-56 overflow-y-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {dynamicChoices.map((choice, i) => {
                  const isOther = /etwas anderes|selbst beschreiben/i.test(choice.label)
                  const hasProbe = Boolean(choice.check)
                  const isSelected = pendingCheck?.choiceLabel === choice.label
                  const isDisabled = (!!pendingCheck && !isSelected) || !showTranscript || gameLog.length === 0 || streaming
                  const handleClick = () => {
                    if (pendingCheck) return
                    if (isOther) {
                      inputRef.current?.focus()
                    } else if (hasProbe) {
                      setPendingCheck({ ...choice.check, choiceLabel: choice.label })
                    } else {
                      handleSend(choice.label)
                    }
                  }
                  return (
                    <button
                      key={choice.label}
                      onClick={handleClick}
                      disabled={isDisabled}
                      className={`w-full text-xs px-3 py-1.5 rounded border transition-all duration-150 font-body text-left flex items-center gap-2 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600/20 text-blue-200 ring-1 ring-blue-500/50'
                          : isOther
                          ? 'border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-500'
                          : hasProbe
                          ? 'border-blue-700/40 text-blue-300 hover:border-blue-500 hover:bg-blue-600/10'
                          : 'border-gold-700/40 text-gold-400 hover:border-gold-500 hover:bg-gold-600/10'
                      } ${isDisabled && !isSelected ? 'opacity-40' : ''}`}
                    >
                      <span className="flex-1 min-w-0">{isOther ? '✏️ ' : `${i + 1}. `}{choice.label}</span>
                      {hasProbe && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700/30 text-blue-400 text-[10px] font-heading tracking-wide whitespace-nowrap flex-shrink-0 w-44">
                          <span className="flex-shrink-0">🎲</span>
                          <span className="flex-1 text-left">{getCheckLabel(choice.check.skillOrAbility)} SG {choice.check.dc}</span>
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] text-blue-300 font-heading tracking-wide whitespace-nowrap flex-shrink-0 animate-pulse">
                          PROBE AUSSTEHEND →
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {pendingCheck && !combat?.active && dynamicChoices.length === 0 && (
              <div className="mt-2 px-3 py-2 rounded border border-blue-500/50 bg-blue-600/10 text-blue-300 text-xs font-heading tracking-wide text-center animate-pulse">
                PROBE AUSSTEHEND — Würfle im Panel rechts →
              </div>
            )}
          </div>
        </div>

        <div className="w-80 border-l border-gold-700/10 overflow-y-auto flex flex-col gap-4 p-4 bg-dungeon-200/30 flex-shrink-0">
          {showTranscript && pendingCheck && !combat?.active && (
            <SkillCheckPanel check={pendingCheck} character={character} onResult={handleCheckResult} choiceLabel={pendingCheck?.choiceLabel} />
          )}
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
