import React from 'react'

// Ensure numbered list items each start on a new line (AI sometimes writes them inline)
export function normalizeNumberedList(text = '') {
  return text.replace(/([.!?])\s+(\d[.):])/g, '$1\n$2')
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

export default function MessageBubble({ msg }) {
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

export function TypingIndicator() {
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
