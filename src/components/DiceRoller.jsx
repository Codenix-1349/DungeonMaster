import React, { useState, useCallback } from 'react'

const DICE = [
  { sides: 4, symbol: '⬡' },
  { sides: 6, symbol: '⬡' },
  { sides: 8, symbol: '⬡' },
  { sides: 10, symbol: '⬡' },
  { sides: 12, symbol: '⬡' },
  { sides: 20, symbol: '⬡' },
  { sides: 100, symbol: '⬡' },
]

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

export default function DiceRoller({ onRoll, compact = false }) {
  const [lastRoll, setLastRoll] = useState(null)
  const [rolling, setRolling] = useState(null)
  const [modifier, setModifier] = useState(0)

  const handleRoll = useCallback(async (sides) => {
    setRolling(sides)

    // Small delay for animation feel
    await new Promise(r => setTimeout(r, 350))

    const result = rollDie(sides)
    const total = result + modifier
    const rollData = { sides, result, modifier, total }

    setLastRoll(rollData)
    setRolling(null)

    if (onRoll) onRoll(rollData)
  }, [modifier, onRoll])

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {DICE.map(({ sides }) => (
          <button
            key={sides}
            onClick={() => handleRoll(sides)}
            disabled={rolling !== null}
            className={`dice-btn ${rolling === sides ? 'border-gold-400 text-gold-300' : ''}`}
            title={`d${sides} würfeln`}
          >
            <span className="text-lg leading-none">⬡</span>
            <span>d{sides}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm text-gold-500 tracking-wider">Würfelsystem</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-body">Mod:</span>
          <input
            type="number"
            value={modifier}
            onChange={e => setModifier(Number(e.target.value))}
            className="w-14 text-center input-dark py-1 text-sm"
            min="-20" max="20"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {DICE.map(({ sides }) => (
          <button
            key={sides}
            onClick={() => handleRoll(sides)}
            disabled={rolling !== null}
            className={`dice-btn ${rolling === sides ? 'border-gold-400 text-gold-300' : ''}`}
          >
            {rolling === sides ? (
              <span className="text-lg animate-spin inline-block">⬡</span>
            ) : (
              <span className="text-lg leading-none">⬡</span>
            )}
            <span>d{sides}</span>
          </button>
        ))}
      </div>

      {lastRoll && (
        <div className="panel-gold px-4 py-2 flex items-center gap-3 animate-fade-in">
          <span className="font-display text-3xl text-gold-400"
            style={{ textShadow: '0 0 15px rgba(212,160,23,0.6)' }}>
            {lastRoll.total}
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-sm text-parchment">
              d{lastRoll.sides} Ergebnis: {lastRoll.result}
              {lastRoll.modifier !== 0 && (
                <span className="text-stone-400">
                  {' '}({lastRoll.modifier >= 0 ? '+' : ''}{lastRoll.modifier})
                </span>
              )}
            </span>
            <span className="font-body text-xs text-stone-500 italic">
              {lastRoll.total === lastRoll.sides && lastRoll.modifier === 0 ? '⚡ Kritischer Erfolg!' :
               lastRoll.result === 1 && lastRoll.modifier === 0 ? '💀 Patzer!' : 'Wurf'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
