import React from 'react'

export default function SessionCard({ session, character, adventure, isActive, onContinue, onDelete }) {
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
          „{lastEntry.content.substring(0, 120)}{lastEntry.content.length > 120 ? '…' : ''}"
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
