import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'
import CharacterSheet from '../components/CharacterSheet'
import InventoryPanel from '../components/InventoryPanel'
import {
  ATTR_LABELS,
  CASTER_PROGRESSION,
  CLASS_ARMOR_OPTIONS,
  CLASS_CONFIG,
  CLASS_SKILL_OPTIONS,
  CLASSES,
  PROJECT_NAME,
  RACE_CONFIG,
  RACES,
  SKILLS,
  SPELL_LIST,
  SRD_VERSION_LABEL,
  applyRacialBonuses,
  createCharacterTemplate,
  getAbilityModifier,
  getCantripsKnownCount,
  getClassSpells,
  getDefaultArmorBonus,
  getMaxSpellLevel,
  getProficiencyBonus,
  getSpellSlots,
  getSpellsKnownCount,
  migrateStarterInventory,
  normalizeCharacter,
  roll4d6DropLowest,
} from '../data/srd'

function buildCharacterFromForm(form) {
  const level = Math.max(1, Number(form.level) || 1)
  const baseAttrs = form.baseAttributes || form.attributes || {}

  // Auto-generate spells string from known cantrips and spells
  const cantripNames = (form.knownCantrips || [])
    .map(key => SPELL_LIST.find(s => s.key === key)?.name).filter(Boolean)
  const spellNames = (form.knownSpells || [])
    .map(key => SPELL_LIST.find(s => s.key === key)?.name).filter(Boolean)
  const autoSpells = [...cantripNames, ...spellNames].join(', ')

  // Let normalizeCharacter handle ALL stat calculations (HP, AC, attack, etc.)
  // to avoid double-calculation with potentially different intermediate values.
  const normalized = normalizeCharacter({
    ...form,
    level,
    baseAttributes: baseAttrs,
    maxHP: 0, // force recalculation
    spells: autoSpells || form.spells || '',
    knownCantrips: form.knownCantrips || [],
    knownSpells: form.knownSpells || [],
    spellSlots: getSpellSlots(form.class, level),
  })

  return {
    ...normalized,
    currentHP: normalized.maxHP,
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
    upsertCharacter,
    selectCharacter,
    deleteCharacter,
    addItem,
    removeItem,
    equipItem,
    unequipItem,
    updateCurrency,
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

  const setAttrDice = (key) => {
    const base = form.baseAttributes || form.attributes
    updateForm({ baseAttributes: { ...base, [key]: roll4d6DropLowest() } })
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
      inventory: migrateStarterInventory(cls),
      spells: CLASS_CONFIG[cls]?.spells || '',
      skillProficiencies: [],
      knownCantrips: [],
      knownSpells: [],
      armorBonus: getDefaultArmorBonus(cls),
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

  const removeFormItem = (idx) => {
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

  const currentProficiency = form.proficiencyBonus || getProficiencyBonus(form.level)
  const currentInitiative = form.initiativeBonus ?? 0
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
            <CharacterSheet hideInventory />

            <div className="panel-gold p-4 mt-4">
              <p className="section-subtitle mb-3">Inventar des aktiven Helden</p>
              <InventoryPanel
                mode="editable"
                character={character}
                onEquip={equipItem}
                onUnequip={unequipItem}
                onRemove={removeItem}
                onAdd={addItem}
                onUpdateCurrency={updateCurrency}
              />
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

  const hasSpellStep = !!CASTER_PROGRESSION[form.class]
  const EQUIP_STEP = hasSpellStep ? 5 : 4
  const FINAL_STEP = hasSpellStep ? 6 : 5
  // Always show 7 steps so the stepper layout stays stable when switching classes.
  // Non-casters skip the "Zauber" step but the circles/lines don't shift.
  const stepLabels = ['Intro', 'Basis', 'Attribute', 'Fertigkeiten', 'Zauber', 'Ausrüstung', 'Fertig']
  const displayStep = (!hasSpellStep && step >= 4) ? step + 1 : step

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title text-3xl mb-2">Charakter erschaffen</h1>
        <p className="font-body text-stone-500 italic">{SRD_VERSION_LABEL}</p>
        <div className="flex items-center gap-1 mt-4">
          {stepLabels.map((label, i) => {
            const isSkipped = !hasSpellStep && i === 4
            const active = i <= displayStep && !isSkipped
            const lineDone = i < displayStep
            return (
              <React.Fragment key={i}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading transition-colors ${
                  isSkipped ? 'bg-stone-800/40 text-stone-700' : active ? 'bg-gold-600 text-black' : 'bg-stone-800 text-stone-600'
                }`}>
                  {isSkipped ? '–' : i + 1}
                </div>
                {i < stepLabels.length - 1 && <div className={`flex-1 h-px transition-colors ${lineDone ? 'bg-gold-600' : 'bg-stone-800'}`} />}
              </React.Fragment>
            )
          })}
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
              {editingId && (
                <p className="font-body text-xs text-stone-600 italic mb-2">Rasse kann bei einem bestehenden Helden nicht geändert werden.</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RACES.map(race => (
                  <button
                    key={race}
                    onClick={() => !editingId && updateForm({ race })}
                    disabled={!!editingId}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.race === race ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    } ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {race}
                    <span className="block text-[10px] text-stone-500 font-body mt-0.5">{RACE_CONFIG[race]?.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="section-subtitle block mb-2">Klasse</label>
              {editingId && (
                <p className="font-body text-xs text-stone-600 italic mb-2">Klasse kann bei einem bestehenden Helden nicht geändert werden.</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CLASSES.map(cls => (
                  <button
                    key={cls}
                    onClick={() => !editingId && updateClass(cls)}
                    disabled={!!editingId}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.class === cls ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    } ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <h2 className="font-heading text-xl text-gold-400">Attribute</h2>
            <div className="flex gap-2">
              <button onClick={() => {
                const keys = Object.keys(ATTR_LABELS)
                const std = [15, 14, 13, 12, 10, 8]
                const base = {}
                keys.forEach((k, i) => { base[k] = std[i] })
                updateForm({ baseAttributes: base })
              }} className="btn-ghost text-xs px-3 py-2">Standard Array</button>
              <button onClick={rollAllAttrs} className="btn-primary text-xs px-4 py-2">🎲 Alle würfeln</button>
            </div>
          </div>
          <p className="font-body text-xs text-stone-500 italic mb-4">4d6 (niedrigsten Würfel streichen) oder Standard Array (15, 14, 13, 12, 10, 8)</p>
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
                    <span className="font-display text-2xl text-gold-400 w-10 text-center">{finalVal}</span>
                    <button onClick={() => setAttrDice(key)} className="w-8 h-8 rounded border border-stone-700 text-sm text-stone-500 hover:border-gold-700 hover:text-gold-400">🎲</button>
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

      {step === 4 && hasSpellStep && (() => {
        const cantripCount = getCantripsKnownCount(form.class, 1)
        const spellCount = getSpellsKnownCount(form.class, 1)
        const maxLevel = getMaxSpellLevel(form.class, 1)
        const selectedCantrips = form.knownCantrips || []
        const selectedSpells = form.knownSpells || []

        if (cantripCount === 0 && spellCount === 0) {
          return (
            <div className="panel-gold p-6 text-center">
              <h2 className="font-heading text-xl text-gold-400 mb-4">Zauber</h2>
              <p className="font-body text-stone-400 italic mb-6">
                Als {form.class} erhältst du Zauber ab Stufe 2.
              </p>
              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="btn-ghost">← Zurück</button>
                <button onClick={() => setStep(EQUIP_STEP)} className="btn-primary">Weiter →</button>
              </div>
            </div>
          )
        }

        const toggleCantrip = (key) => {
          const current = form.knownCantrips || []
          if (current.includes(key)) {
            updateForm({ knownCantrips: current.filter(k => k !== key) })
          } else if (current.length < cantripCount) {
            updateForm({ knownCantrips: [...current, key] })
          }
        }

        const toggleSpell = (key) => {
          const current = form.knownSpells || []
          if (current.includes(key)) {
            updateForm({ knownSpells: current.filter(k => k !== key) })
          } else if (current.length < spellCount) {
            updateForm({ knownSpells: [...current, key] })
          }
        }

        const canProceed = selectedCantrips.length === cantripCount && selectedSpells.length === spellCount

        return (
          <div className="panel-gold p-6">
            <h2 className="font-heading text-xl text-gold-400 mb-2">Zauber</h2>

            {cantripCount > 0 && (
              <>
                <p className="font-body text-sm text-stone-400 italic mb-3">
                  Wähle {cantripCount} Cantrips ({selectedCantrips.length}/{cantripCount})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {getClassSpells(form.class, 0).map(spell => {
                    const isSelected = selectedCantrips.includes(spell.key)
                    return (
                      <button
                        key={spell.key}
                        onClick={() => toggleCantrip(spell.key)}
                        disabled={!isSelected && selectedCantrips.length >= cantripCount}
                        className={`p-2 rounded border text-left text-sm font-body transition-all ${
                          isSelected
                            ? 'border-gold-500 bg-gold-600/15 text-gold-300'
                            : selectedCantrips.length >= cantripCount
                              ? 'border-stone-800 text-stone-600 opacity-50'
                              : 'border-stone-700 text-stone-400 hover:border-stone-500'
                        }`}
                      >
                        <span className="font-heading">{spell.name}</span>
                        <span className="block text-xs text-stone-500 mt-0.5">{spell.description}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {spellCount > 0 && maxLevel >= 1 && (
              <>
                <p className="font-body text-sm text-stone-400 italic mb-3">
                  Wähle {spellCount} Zaubersprüche Stufe 1 ({selectedSpells.length}/{spellCount})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {getClassSpells(form.class, 1).map(spell => {
                    const isSelected = selectedSpells.includes(spell.key)
                    return (
                      <button
                        key={spell.key}
                        onClick={() => toggleSpell(spell.key)}
                        disabled={!isSelected && selectedSpells.length >= spellCount}
                        className={`p-2 rounded border text-left text-sm font-body transition-all ${
                          isSelected
                            ? 'border-gold-500 bg-gold-600/15 text-gold-300'
                            : selectedSpells.length >= spellCount
                              ? 'border-stone-800 text-stone-600 opacity-50'
                              : 'border-stone-700 text-stone-400 hover:border-stone-500'
                        }`}
                      >
                        <span className="font-heading">{spell.name}</span>
                        <span className="block text-xs text-stone-500 mt-0.5">{spell.description}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <div className="panel p-3 grid grid-cols-3 gap-3 text-center mb-4">
              {[1, 2, 3].map(lvl => {
                const slots = getSpellSlots(form.class, 1)
                return (
                  <div key={lvl}>
                    <p className="section-subtitle">Stufe {lvl}</p>
                    <p className="font-display text-xl text-gold-400">{slots[lvl] || '—'}</p>
                    <p className="font-body text-xs text-stone-500">Plätze</p>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="btn-ghost">← Zurück</button>
              <button onClick={() => setStep(EQUIP_STEP)} disabled={!canProceed} className="btn-primary">Weiter →</button>
            </div>
          </div>
        )
      })()}

      {step === EQUIP_STEP && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-6">Ausrüstung & Details</h2>
          <div className="space-y-4">
            <div>
              <label className="section-subtitle block mb-2">Rüstung</label>
              <div className="flex flex-wrap gap-2">
                {(CLASS_ARMOR_OPTIONS[form.class] || [{ label: 'Keine', bonus: 0 }]).map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => updateForm({ armorBonus: opt.bonus })}
                    className={`py-2 px-3 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.armorBonus === opt.bonus
                        ? 'border-gold-500 text-gold-300 bg-gold-600/15'
                        : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    {opt.label}
                    <span className="block text-[10px] text-stone-500 font-body mt-0.5">+{opt.bonus} AC</span>
                  </button>
                ))}
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
                  <span key={i} onClick={() => removeFormItem(i)} className="badge-gold cursor-pointer hover:bg-red-900/30 transition-colors">{typeof item === 'object' ? item.name : item} ✕</span>
                ))}
              </div>
            </div>

          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(hasSpellStep ? 4 : 3)} className="btn-ghost">← Zurück</button>
            <button onClick={() => setStep(FINAL_STEP)} className="btn-primary">Weiter →</button>
          </div>
        </div>
      )}

      {step === FINAL_STEP && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-4">Bereit für das Abenteuer</h2>
          <div className="panel p-4 mb-6 space-y-2">
            <p><span className="section-subtitle">Name:</span> <span className="font-body text-parchment">{form.name}</span></p>
            <p><span className="section-subtitle">Rasse/Klasse:</span> <span className="font-body text-parchment">{form.race} {form.class}</span></p>
            <p><span className="section-subtitle">HP / AC:</span> <span className="font-body text-parchment">{form.maxHP} HP · AC {form.armorClass}</span></p>
            <p><span className="section-subtitle">Fertigkeiten:</span> <span className="font-body text-parchment">{(form.skillProficiencies || []).map(k => SKILLS.find(s => s.key === k)?.label).filter(Boolean).join(', ') || '—'}</span></p>
            <p><span className="section-subtitle">Zauber:</span> <span className="font-body text-parchment">{
              [...(form.knownCantrips || []), ...(form.knownSpells || [])]
                .map(key => SPELL_LIST.find(s => s.key === key)?.name)
                .filter(Boolean).join(', ') || '—'
            }</span></p>
            <p><span className="section-subtitle">Inventar:</span> <span className="font-body text-parchment">{form.inventory.map(i => typeof i === 'object' ? i.name : i).join(', ') || '—'}</span></p>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(EQUIP_STEP)} className="btn-ghost">← Zurück</button>
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
