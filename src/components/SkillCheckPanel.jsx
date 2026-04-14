import React, { useState, useCallback, useRef, useEffect } from 'react'
import { SKILLS, ATTR_LABELS, ATTR_SHORT_LABELS, resolveSkillCheck } from '../data/srd'
import D20Animation from './D20Animation'
import { preloadAllD20Sheets } from './d20Preload'

export default function SkillCheckPanel({ check, character, onResult, choiceLabel }) {
  const [result, setResult] = useState(null)
  const [rolling, setRolling] = useState(false)
  const animationRunIdRef = useRef(0)

  // Preload all 20 sprite sheets while the user sees the pending state
  useEffect(() => { preloadAllD20Sheets() }, [])

  const skillDef = SKILLS.find(s => s.key === check.skillOrAbility)
  const isSkill = Boolean(skillDef)
  const label = isSkill ? skillDef.label : (ATTR_LABELS[check.skillOrAbility] || check.skillOrAbility)
  const abilityKey = isSkill ? skillDef.ability : check.skillOrAbility
  const abilityLabel = ATTR_SHORT_LABELS[abilityKey] || abilityKey.toUpperCase()

  const attrs = character?.attributes || {}
  const abilityScore = attrs[abilityKey] || 10
  const level = character?.level || 1
  const proficiencies = character?.skillProficiencies || []
  const isProficient = isSkill && proficiencies.includes(check.skillOrAbility)

  const abilityMod = Math.floor((abilityScore - 10) / 2)
  const profBonus = isProficient ? (Math.floor((level - 1) / 4) + 2) : 0
  const totalMod = abilityMod + profBonus

  const handleRoll = useCallback(() => {
    setRolling(true)

    const res = resolveSkillCheck({
      skillOrAbility: check.skillOrAbility,
      dc: check.dc,
      advantage: check.advantage,
      character,
    })

    // D20Animation handles the timing — we just set the result and let it animate
    setResult({
      ...res,
      animationRunId: ++animationRunIdRef.current,
    })
  }, [check, character])

  const handleAnimComplete = useCallback(() => {
    setRolling(false)
  }, [])

  const handleDismiss = useCallback(() => {
    if (result) onResult(result, choiceLabel)
  }, [result, onResult, choiceLabel])

  // Rolling state: show D20 animation
  if (rolling && result) {
    return (
      <div className="panel p-4 animate-slide-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-heading text-xs tracking-wider text-gold-500">PROBE: {label}</span>
        </div>
        <div className="flex justify-center py-2">
          <D20Animation
            key={`skill-roll-${result.animationRunId}`}
            result={result.d20Result}
            runId={result.animationRunId}
            size={220}
            holdTime={2000}
            onComplete={handleAnimComplete}
          />
        </div>
      </div>
    )
  }

  // Result state: show outcome with the final d20 frame
  if (result && !rolling) {
    const successStyle = result.success
      ? 'bg-emerald-600/20 border-emerald-500/60'
      : 'bg-red-900/20 border-red-700/30'
    const successText = result.success
      ? 'text-emerald-300'
      : 'text-red-400'

    return (
      <div className="panel p-4 animate-slide-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-heading text-xs tracking-wider text-gold-500">PROBE: {result.label}</span>
          {result.advantage && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${result.advantage === 'advantage' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
              {result.advantage === 'advantage' ? 'Vorteil' : 'Nachteil'}
            </span>
          )}
        </div>

        <div className="text-center py-3">
          <div className="font-display text-4xl text-gold-400 mb-1">{result.d20Result}</div>
          {result.roll2 !== null && (
            <div className="font-body text-xs text-stone-500 mb-1">
              Würfe: {result.roll1}, {result.roll2}
            </div>
          )}
          <div className="font-body text-sm text-stone-400">
            d20({result.d20Result}) {result.modifier >= 0 ? '+' : '−'} {Math.abs(result.modifier)} = <span className="text-parchment font-heading">{result.total}</span>
          </div>
        </div>

        <div className={`rounded border p-3 text-center mt-2 ${successStyle}`}>
          <p className={`font-display text-xl ${successText}`}>
            {result.success ? 'ERFOLG!' : 'FEHLSCHLAG'}
          </p>
          <p className="font-body text-xs text-stone-500 mt-1">
            Ergebnis {result.total} vs SG {result.dc}
          </p>
        </div>

        <button onClick={handleDismiss} className="mt-3 w-full py-1.5 text-xs font-heading tracking-wider text-stone-400 hover:text-parchment border border-stone-700/50 hover:border-stone-600 rounded transition-colors">
          Weiter
        </button>
      </div>
    )
  }

  // Pending state: show stats + roll button
  return (
    <div className="panel p-4 animate-slide-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-heading text-xs tracking-wider text-gold-500">PROBE AUSSTEHEND</span>
        {check.advantage && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${check.advantage === 'advantage' ? 'bg-blue-900/30 text-blue-400' : 'bg-orange-900/30 text-orange-400'}`}>
            {check.advantage === 'advantage' ? 'Vorteil' : 'Nachteil'}
          </span>
        )}
      </div>

      <div className="rounded border border-blue-700/40 bg-blue-950/20 px-3 py-2 mb-3">
        <p className="font-heading text-[11px] tracking-wide text-blue-300">1. Aktion gewählt</p>
        <p className="font-heading text-sm text-parchment mt-1">{choiceLabel || label}</p>
        <p className="font-body text-[11px] text-stone-400 mt-2">2. Jetzt würfeln, damit die Aktion ausgewertet wird.</p>
      </div>

      <p className="font-heading text-xs tracking-wider text-gold-500 mb-2">PROBE: {label}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-body text-stone-400">{ATTR_LABELS[abilityKey]} ({abilityLabel})</span>
          <span className="font-heading text-parchment">{abilityMod >= 0 ? '+' : ''}{abilityMod}</span>
        </div>
        {isProficient && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-body text-gold-600">Übungsbonus</span>
            <span className="font-heading text-gold-500">+{profBonus}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm border-t border-stone-700/50 pt-2">
          <span className="font-body text-stone-300">Gesamt-Modifikator</span>
          <span className="font-heading text-lg text-gold-400">{totalMod >= 0 ? '+' : ''}{totalMod}</span>
        </div>
      </div>

      <button onClick={handleRoll} className="btn-primary w-full py-3 text-base animate-pulse">
        Jetzt würfeln
      </button>
    </div>
  )
}
