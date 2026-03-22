import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import CharacterSheet from '../components/CharacterSheet'
import {
  ATTR_LABELS,
  CLASS_CONFIG,
  CLASS_SKILL_OPTIONS,
  CLASSES,
  PROJECT_NAME,
  RACE_CONFIG,
  RACES,
  SKILLS,
  SRD_VERSION_LABEL,
  applyRacialBonuses,
  calcArmorClass,
  calcAttackBonus,
  calcHitPoints,
  calcInitiativeBonus,
  calcSpellAttackBonus,
  calcSpellSaveDC,
  createCharacterTemplate,
  getAbilityModifier,
  getProficiencyBonus,
  normalizeCharacter,
  roll4d6DropLowest,
} from '../data/srd'

function buildCharacterFromForm(form) {
  const level = Math.max(1, Number(form.level) || 1)
  const baseAttrs = form.baseAttributes || form.attributes || {}
  const attrs = applyRacialBonuses(baseAttrs, form.race || 'Mensch')
  const calculatedMaxHP = calcHitPoints(form.class, attrs.con, level)

  const normalized = normalizeCharacter({
    ...form,
    level,
    baseAttributes: baseAttrs,
    attributes: attrs,
    armorClass: calcArmorClass(attrs.dex, form.armorBonus, form.class, attrs),
    maxHP: calculatedMaxHP,
    currentHP: Math.min(Number(form.currentHP || 0) || calculatedMaxHP, calculatedMaxHP),
    proficiencyBonus: getProficiencyBonus(level),
    initiativeBonus: calcInitiativeBonus(attrs.dex),
    attackBonus: calcAttackBonus(form.class, attrs, level),
    spellSaveDC: calcSpellSaveDC(form.class, attrs, level),
    spellAttackBonus: calcSpellAttackBonus(form.class, attrs, level),
  })

  return {
    ...normalized,
    currentHP: Math.min(normalized.currentHP || normalized.maxHP, normalized.maxHP),
  }
}

function getDefaultForm() {
  return createCharacterTemplate()
}

function CharacterLibraryCard({ entry, isActive, sessionLocked = false, onActivate, onEdit, onDelete, onStart }) {
  const hpPercent = Math.max(0, Math.min(((entry.currentHP ?? entry.maxHP) / entry.maxHP) * 100, 100))

  return (
    <div className={`panel p-4 transition-all duration-200 ${isActive ? 'border-gold-600/50' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-heading text-parchment text-base truncate">{entry.name}</p>
          <p className="font-body text-xs text-stone-500">
            {entry.race} {entry.class} · Stufe {entry.level || 1}
          </p>
        </div>
        <span className={isActive ? 'badge-green' : 'badge-gold'}>{isActive ? '● Aktiv' : 'Bereit'}</span>
      </div>

      <div className="hp-bar-bg mb-1.5">
        <div className="hp-bar-fill" style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="flex justify-between text-xs font-body text-stone-500 mb-3">
        <span>HP {entry.currentHP ?? entry.maxHP}/{entry.maxHP}</span>
        <span>AC {entry.armorClass}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onActivate}
          className="btn-ghost text-xs py-1.5"
          title={sessionLocked && !isActive ? 'Lädt die aktuelle Session aus, damit du den Helden wechseln kannst.' : undefined}
        >
          {isActive ? 'Ausgewählt' : 'Aktiv setzen'}
        </button>
        <button onClick={onEdit} className="btn-ghost text-xs py-1.5">Bearbeiten</button>
        <button onClick={onStart} className="btn-primary text-xs py-1.5">Neues Abenteuer</button>
        <button onClick={onDelete} className="btn-danger text-xs py-1.5">Löschen</button>
      </div>
    </div>
  )
}

export default function CharacterPage() {
  const navigate = useNavigate()
  const { playMusic } = useSound()

  useEffect(() => { playMusic('landing') }, [playMusic])

  const {
    character,
    characters,
    setCharacter,
    saveCharacter,
    selectCharacter,
    deleteCharacter,
    activeSession,
    unloadActiveSession,
  } = useGame()

  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newItem, setNewItem] = useState('')
  const [form, setForm] = useState(getDefaultForm)

  const updateForm = (patch) => {
    setForm(prev => buildCharacterFromForm({ ...prev, ...patch }))
  }

  const setAttr = (key, val) => {
    const num = Math.min(18, Math.max(3, Number(val) || 10))
    const base = form.baseAttributes || form.attributes
    updateForm({ baseAttributes: { ...base, [key]: num } })
  }

  const rollAllAttrs = () => {
    const attrs = {}
    Object.keys(ATTR_LABELS).forEach(key => {
      attrs[key] = roll4d6DropLowest()
    })
    updateForm({ baseAttributes: attrs })
  }

  const updateClass = (cls) => {
    updateForm({
      class: cls,
      inventory: [...(CLASS_CONFIG[cls]?.starterInventory || [])],
      spells: CLASS_CONFIG[cls]?.spells || '',
      skillProficiencies: [],
      armorBonus: CLASS_CONFIG[cls]?.unarmoredDefense ? 0 : 2,
    })
  }

  const saveCurrentCharacter = () => {
    const normalized = buildCharacterFromForm({
      ...form,
      id: editingId || form.id || null,
    })

    saveCharacter(normalized)
    setEditing(false)
    setEditingId(null)
    setStep(0)
    setNewItem('')
  }

  const addInventoryItem = () => {
    if (!newItem.trim()) return
    updateForm({ inventory: [...form.inventory, newItem.trim()] })
    setNewItem('')
  }

  const removeItem = (idx) => {
    updateForm({ inventory: form.inventory.filter((_, i) => i !== idx) })
  }

  const startNewCharacter = () => {
    setForm(buildCharacterFromForm(getDefaultForm()))
    setEditing(true)
    setEditingId(null)
    setStep(0)
    setNewItem('')
  }

  const startEdit = (target = character) => {
    const normalized = normalizeCharacter(target) || getDefaultForm()
    setForm(buildCharacterFromForm(normalized))
    setEditing(true)
    setEditingId(normalized?.id || null)
    setStep(1)
    setNewItem('')
  }

  const releaseSessionLock = () => {
    if (!activeSession) return true

    const confirmed = window.confirm(
      'Es ist noch eine Session geladen. Sie bleibt gespeichert, wird aber entladen, damit du Held und Abenteuer neu auswählen kannst. Fortfahren?'
    )

    if (!confirmed) return false

    unloadActiveSession()
    return true
  }

  const handleDeleteCharacter = (characterId, name) => {
    if (!window.confirm(`Charakter „${name}“ wirklich löschen?`)) return
    deleteCharacter(characterId)
  }

  const currentProficiency = getProficiencyBonus(form.level)
  const currentInitiative = calcInitiativeBonus(form.attributes.dex)
  const primaryAbility = CLASS_CONFIG[form.class]?.primaryAbility || 'str'
  const primaryMod = getAbilityModifier(form.attributes[primaryAbility])
  const rosterCountLabel = characters.length === 1 ? '1 Held gespeichert' : `${characters.length} Helden gespeichert`

  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => {
      if (character?.id === a.id) return -1
      if (character?.id === b.id) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [characters, character])

  if (!editing) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="section-title text-3xl mb-1">Heldenverwaltung</h1>
            <p className="font-body text-stone-500 italic">Mehrere SRD-Helden speichern, auswählen und für neue Abenteuer bereithalten.</p>
            {activeSession && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="font-body text-xs text-stone-600 italic">Eine Session ist aktuell geladen. Für einen Heldenwechsel wird sie zuerst entladen, aber nicht gelöscht.</p>
                <button onClick={releaseSessionLock} className="btn-ghost text-xs px-3 py-1">Session entladen</button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-gold">{rosterCountLabel}</span>
            <button onClick={startNewCharacter} className="btn-primary">+ Neuer Held</button>
          </div>
        </div>

        {character ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => startEdit(character)} className="btn-ghost">Aktiven Helden bearbeiten</button>
              <button onClick={() => navigate('/game?mode=new')} className="btn-primary">Mit aktivem Helden neues Abenteuer</button>
            </div>
            <CharacterSheet />

            <div className="panel p-4 mt-4">
              <p className="section-subtitle mb-3">Inventar des aktiven Helden</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addInventoryItem()}
                  placeholder="Gegenstand…"
                  className="input-dark flex-1"
                />
                <button onClick={addInventoryItem} className="btn-primary px-4">+</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(character.inventory || []).map((item, i) => (
                  <span
                    key={i}
                    className="badge-gold cursor-pointer hover:bg-red-900/30 transition-colors"
                    onClick={() => setCharacter(prev => ({ ...prev, inventory: prev.inventory.filter((_, idx) => idx !== i) }))}
                  >
                    {item} ✕
                  </span>
                ))}
              </div>
            </div>

            <div className="panel p-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="section-subtitle mb-1">Aktuelle HP</p>
                <input
                  type="number"
                  value={character.currentHP ?? character.maxHP}
                  onChange={e => setCharacter(prev => ({ ...prev, currentHP: Math.min(Number(e.target.value), prev.maxHP) }))}
                  className="input-dark"
                  min="0"
                  max={character.maxHP}
                />
              </div>
              <div>
                <p className="section-subtitle mb-1">Max HP</p>
                <input
                  type="number"
                  value={character.maxHP}
                  onChange={e => setCharacter(prev => ({ ...prev, maxHP: Number(e.target.value) }))}
                  className="input-dark"
                  min="1"
                />
              </div>
              <div>
                <p className="section-subtitle mb-1">Erfahrung (XP)</p>
                <input
                  type="number"
                  value={character.xp || 0}
                  onChange={e => setCharacter(prev => ({ ...prev, xp: Number(e.target.value) }))}
                  className="input-dark"
                  min="0"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="panel-gold p-8 text-center mb-6">
            <div className="text-5xl mb-4">🛡️</div>
            <h2 className="font-display text-2xl text-gold-400 mb-3">Noch kein aktiver Held</h2>
            <p className="font-body text-stone-400 italic mb-6">
              Erstelle einen neuen Helden oder wähle einen aus deiner Bibliothek aus.
            </p>
            <button onClick={startNewCharacter} className="btn-primary text-base px-8 py-3">Helden erschaffen</button>
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-gold-600 tracking-wide">Heldenbibliothek</h2>
            {character && <span className="font-body text-xs text-stone-600 italic">Aktiv: {character.name}</span>}
          </div>

          {sortedCharacters.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="font-body text-stone-500 italic">Noch keine Helden gespeichert.</p>
              <p className="font-body text-xs text-stone-600 mt-1">Lege deinen ersten Helden an, damit du Abenteuer gezielt starten kannst.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedCharacters.map(entry => (
                <CharacterLibraryCard
                  key={entry.id}
                  entry={entry}
                  isActive={character?.id === entry.id}
                  sessionLocked={!!activeSession}
                  onActivate={() => {
                    if (activeSession && character?.id !== entry.id && !releaseSessionLock()) return
                    selectCharacter(entry.id)
                  }}
                  onEdit={() => startEdit(entry)}
                  onDelete={() => handleDeleteCharacter(entry.id, entry.name)}
                  onStart={() => {
                    if (activeSession && !releaseSessionLock()) return
                    selectCharacter(entry.id)
                    navigate('/game?mode=new')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title text-3xl mb-2">Charakter erschaffen</h1>
        <p className="font-body text-stone-500 italic">{SRD_VERSION_LABEL}</p>
        <div className="flex items-center gap-1 mt-4">
          {['Intro', 'Basis', 'Attribute', 'Fertigkeiten', 'Ausrüstung', 'Fertig'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading transition-colors ${
                i <= step ? 'bg-gold-600 text-black' : 'bg-stone-800 text-stone-600'
              }`}>
                {i + 1}
              </div>
              {i < 5 && <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-gold-600' : 'bg-stone-800'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="panel-gold p-8 text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <h2 className="font-display text-2xl text-gold-400 mb-4">Wer betritt das Abenteuer?</h2>
          <p className="font-body text-stone-400 italic mb-8">
            Erschaffe deinen Helden auf Basis des freien D&D-SRD. Wähle Rasse und Klasse, würfle Attribute und rüste dich für {PROJECT_NAME}.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => setStep(1)} className="btn-primary text-base px-10 py-3">Beginnen →</button>
            <button onClick={() => setEditing(false)} className="btn-ghost text-base px-8 py-3">Abbrechen</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-6">Grunddaten</h2>
          <div className="space-y-5">
            <div>
              <label className="section-subtitle block mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateForm({ name: e.target.value })}
                placeholder="Lyra Sturmfeder…"
                className="input-dark"
              />
            </div>
            <div>
              <label className="section-subtitle block mb-2">Rasse</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RACES.map(race => (
                  <button
                    key={race}
                    onClick={() => updateForm({ race })}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.race === race ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    {race}
                    <span className="block text-[10px] text-stone-500 font-body mt-0.5">{RACE_CONFIG[race]?.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="section-subtitle block mb-2">Klasse</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CLASSES.map(cls => (
                  <button
                    key={cls}
                    onClick={() => updateClass(cls)}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.class === cls ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(0)} className="btn-ghost">← Zurück</button>
            <button onClick={() => setStep(2)} disabled={!form.name.trim()} className="btn-primary">Weiter →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel-gold p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="font-heading text-xl text-gold-400">Attribute (4d6, niedrigsten Würfel streichen)</h2>
            <button onClick={rollAllAttrs} className="btn-primary text-xs px-4 py-2">🎲 Alle würfeln</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(ATTR_LABELS).map(([key, label]) => {
              const baseVal = (form.baseAttributes || form.attributes)?.[key] || 10
              const finalVal = form.attributes[key] || 10
              const bonus = finalVal - baseVal
              return (
                <div key={key} className="panel p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="section-subtitle text-xs">{label}</p>
                    <p className="font-body text-xs text-stone-600 italic">
                      Mod {getAbilityModifier(finalVal) >= 0 ? '+' : ''}{getAbilityModifier(finalVal)}
                      {bonus > 0 && <span className="text-green-500 ml-1">(+{bonus} Rasse)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setAttr(key, baseVal - 1)} className="w-6 h-6 rounded border border-stone-700 text-stone-400 hover:border-stone-500">-</button>
                    <span className="font-display text-2xl text-gold-400 w-8 text-center">{finalVal}</span>
                    <button onClick={() => setAttr(key, baseVal + 1)} className="w-6 h-6 rounded border border-stone-700 text-stone-400 hover:border-stone-500">+</button>
                    <button onClick={() => setAttr(key, roll4d6DropLowest())} className="w-6 h-6 rounded border border-stone-700 text-xs ml-1 text-stone-500 hover:border-gold-700">🎲</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="panel p-3 mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div>
              <p className="section-subtitle">HP</p>
              <p className="font-display text-2xl text-gold-400">{form.maxHP}</p>
            </div>
            <div>
              <p className="section-subtitle">AC</p>
              <p className="font-display text-2xl text-gold-400">{form.armorClass}</p>
            </div>
            <div>
              <p className="section-subtitle">Angriff</p>
              <p className="font-display text-2xl text-gold-400">{form.attackBonus >= 0 ? '+' : ''}{form.attackBonus}</p>
            </div>
            <div>
              <p className="section-subtitle">Prof</p>
              <p className="font-display text-2xl text-gold-400">+{currentProficiency}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-center">
            <div className="panel p-3">
              <p className="section-subtitle mb-1">Primäres Attribut</p>
              <p className="font-heading text-gold-400">{ATTR_LABELS[primaryAbility]}</p>
              <p className="font-body text-xs text-stone-500">Mod {primaryMod >= 0 ? '+' : ''}{primaryMod}</p>
            </div>
            <div className="panel p-3">
              <p className="section-subtitle mb-1">Initiative</p>
              <p className="font-heading text-gold-400">{currentInitiative >= 0 ? '+' : ''}{currentInitiative}</p>
            </div>
            <div className="panel p-3">
              <p className="section-subtitle mb-1">Zauber-SG</p>
              <p className="font-heading text-gold-400">{form.spellSaveDC ?? '—'}</p>
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="btn-ghost">← Zurück</button>
            <button onClick={() => setStep(3)} className="btn-primary">Weiter →</button>
          </div>
        </div>
      )}

      {step === 3 && (() => {
        const skillConfig = CLASS_SKILL_OPTIONS[form.class] || { count: 2, options: [] }
        const selected = form.skillProficiencies || []
        const toggleSkill = (skillKey) => {
          const current = form.skillProficiencies || []
          if (current.includes(skillKey)) {
            updateForm({ skillProficiencies: current.filter(k => k !== skillKey) })
          } else if (current.length < skillConfig.count) {
            updateForm({ skillProficiencies: [...current, skillKey] })
          }
        }
        return (
          <div className="panel-gold p-6">
            <h2 className="font-heading text-xl text-gold-400 mb-2">Fertigkeiten</h2>
            <p className="font-body text-sm text-stone-400 italic mb-4">
              Wähle {skillConfig.count} Fertigkeiten für deinen {form.class} ({selected.length}/{skillConfig.count} gewählt)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {skillConfig.options.map(skillKey => {
                const skill = SKILLS.find(s => s.key === skillKey)
                if (!skill) return null
                const isSelected = selected.includes(skillKey)
                const abilityScore = form.attributes[skill.ability] || 10
                const mod = getAbilityModifier(abilityScore)
                const bonus = mod + (isSelected ? getProficiencyBonus(form.level) : 0)
                return (
                  <button
                    key={skillKey}
                    onClick={() => toggleSkill(skillKey)}
                    disabled={!isSelected && selected.length >= skillConfig.count}
                    className={`p-2 rounded border text-left text-sm font-body transition-all ${
                      isSelected
                        ? 'border-gold-500 bg-gold-600/15 text-gold-300'
                        : selected.length >= skillConfig.count
                          ? 'border-stone-800 text-stone-600 opacity-50'
                          : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    <span className="font-heading">{skill.label}</span>
                    <span className="text-xs text-stone-500 ml-2">({ATTR_LABELS[skill.ability]})</span>
                    <span className="float-right font-display text-gold-400">{bonus >= 0 ? '+' : ''}{bonus}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(2)} className="btn-ghost">← Zurück</button>
              <button onClick={() => setStep(4)} disabled={selected.length !== skillConfig.count} className="btn-primary">Weiter →</button>
            </div>
          </div>
        )
      })()}

      {step === 4 && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-6">Ausrüstung & Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="section-subtitle block mb-1">Stufe</label>
                <input
                  type="number"
                  value={form.level}
                  onChange={e => updateForm({ level: Math.max(1, Number(e.target.value) || 1) })}
                  className="input-dark"
                  min="1"
                  max="20"
                />
              </div>
              <div>
                <label className="section-subtitle block mb-1">Rüstungsbonus</label>
                <input
                  type="number"
                  value={form.armorBonus}
                  onChange={e => updateForm({ armorBonus: Number(e.target.value) || 0 })}
                  className="input-dark"
                />
                <p className="font-body text-xs text-stone-600 italic mt-1">AC = 10 + DEX-Mod + Rüstungsbonus</p>
              </div>
            </div>

            <div className="panel p-3 grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="section-subtitle">Rüstungsklasse</p>
                <p className="font-display text-2xl text-gold-400">{form.armorClass}</p>
              </div>
              <div>
                <p className="section-subtitle">Zauberangriff</p>
                <p className="font-display text-2xl text-gold-400">{form.spellAttackBonus !== null && form.spellAttackBonus !== undefined ? `${form.spellAttackBonus >= 0 ? '+' : ''}${form.spellAttackBonus}` : '—'}</p>
              </div>
            </div>

            <div>
              <label className="section-subtitle block mb-2">Startinventar</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addInventoryItem()}
                  placeholder="Gegenstand…"
                  className="input-dark flex-1"
                />
                <button onClick={addInventoryItem} className="btn-primary px-4">+</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.inventory.map((item, i) => (
                  <span key={i} onClick={() => removeItem(i)} className="badge-gold cursor-pointer hover:bg-red-900/30 transition-colors">{item} ✕</span>
                ))}
              </div>
            </div>

            {CLASS_CONFIG[form.class]?.spellcastingAbility && (
              <div>
                <label className="section-subtitle block mb-1">Zauber & Klassenfähigkeiten</label>
                <textarea
                  value={form.spells}
                  onChange={e => updateForm({ spells: e.target.value })}
                  className="input-dark w-full h-20 resize-none"
                  placeholder="Cantrips, bekannte Zauber, besondere Fähigkeiten…"
                />
              </div>
            )}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(3)} className="btn-ghost">← Zurück</button>
            <button onClick={() => setStep(5)} className="btn-primary">Weiter →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-4">Bereit für das Abenteuer</h2>
          <div className="panel p-4 mb-6 space-y-2">
            <p><span className="section-subtitle">Name:</span> <span className="font-body text-parchment">{form.name}</span></p>
            <p><span className="section-subtitle">Rasse/Klasse:</span> <span className="font-body text-parchment">{form.race} {form.class}</span></p>
            <p><span className="section-subtitle">HP / AC:</span> <span className="font-body text-parchment">{form.maxHP} HP · AC {form.armorClass}</span></p>
            <p><span className="section-subtitle">Fertigkeiten:</span> <span className="font-body text-parchment">{(form.skillProficiencies || []).map(k => SKILLS.find(s => s.key === k)?.label).filter(Boolean).join(', ') || '—'}</span></p>
            <p><span className="section-subtitle">Inventar:</span> <span className="font-body text-parchment">{form.inventory.join(', ') || '—'}</span></p>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="btn-ghost">← Zurück</button>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-ghost">Abbrechen</button>
              <button onClick={saveCurrentCharacter} className="btn-primary">Held speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
