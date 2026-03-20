import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import CharacterSheet from '../components/CharacterSheet'
import {
  ATTR_LABELS,
  CLASS_CONFIG,
  CLASSES,
  PROJECT_NAME,
  RACES,
  SRD_VERSION_LABEL,
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
  const attrs = { ...form.attributes }
  const normalized = normalizeCharacter({
    ...form,
    level,
    armorClass: calcArmorClass(attrs.dex, form.armorBonus),
    maxHP: calcHitPoints(form.class, attrs.con, level),
    currentHP: Math.min(Number(form.currentHP || 0) || calcHitPoints(form.class, attrs.con, level), calcHitPoints(form.class, attrs.con, level)),
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

export default function CharacterPage() {
  const { character, setCharacter } = useGame()
  const [step, setStep] = useState(character ? 4 : 0)
  const [editing, setEditing] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [form, setForm] = useState(() => normalizeCharacter(character) || getDefaultForm())

  const updateForm = (patch) => {
    setForm(prev => buildCharacterFromForm({ ...prev, ...patch }))
  }

  const setAttr = (key, val) => {
    const num = Math.min(18, Math.max(3, Number(val) || 10))
    updateForm({ attributes: { ...form.attributes, [key]: num } })
  }

  const rollAllAttrs = () => {
    const attrs = {}
    Object.keys(form.attributes).forEach(key => {
      attrs[key] = roll4d6DropLowest()
    })
    updateForm({ attributes: attrs })
  }

  const updateClass = (cls) => {
    updateForm({
      class: cls,
      inventory: [...(CLASS_CONFIG[cls]?.starterInventory || [])],
      spells: CLASS_CONFIG[cls]?.spells || '',
    })
  }

  const saveCharacter = () => {
    const normalized = buildCharacterFromForm(form)
    setCharacter(normalized)
    setEditing(false)
    setStep(4)
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
    setCharacter(null)
    const blank = getDefaultForm()
    setForm(blank)
    setEditing(true)
    setStep(0)
  }

  const startEdit = () => {
    const normalized = normalizeCharacter(character) || getDefaultForm()
    setForm(normalized)
    setEditing(true)
    setStep(1)
  }

  const currentProficiency = getProficiencyBonus(form.level)
  const currentInitiative = calcInitiativeBonus(form.attributes.dex)
  const primaryAbility = CLASS_CONFIG[form.class]?.primaryAbility || 'str'
  const primaryMod = getAbilityModifier(form.attributes[primaryAbility])

  if (!editing && character) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title text-3xl mb-1">Charakterbogen</h1>
            <p className="font-body text-stone-500 italic">SRD-Abenteurer für {PROJECT_NAME}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={startEdit} className="btn-ghost">Bearbeiten</button>
            <button onClick={startNewCharacter} className="btn-danger">Neu</button>
          </div>
        </div>
        <CharacterSheet />

        <div className="panel p-4 mt-4">
          <p className="section-subtitle mb-3">Inventar verwalten</p>
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

        <div className="panel p-4 mt-4 grid grid-cols-3 gap-4">
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
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title text-3xl mb-2">Charakter erschaffen</h1>
        <p className="font-body text-stone-500 italic">{SRD_VERSION_LABEL}</p>
        <div className="flex items-center gap-1 mt-4">
          {['Intro', 'Basis', 'Attribute', 'Ausrüstung', 'Fertig'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading transition-colors ${
                i <= step ? 'bg-gold-600 text-black' : 'bg-stone-800 text-stone-600'
              }`}>
                {i + 1}
              </div>
              {i < 4 && <div className={`flex-1 h-px transition-colors ${i < step ? 'bg-gold-600' : 'bg-stone-800'}`} />}
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
          <button onClick={() => setStep(1)} className="btn-primary text-base px-10 py-3">Beginnen →</button>
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
              <div className="grid grid-cols-4 gap-2">
                {RACES.map(race => (
                  <button
                    key={race}
                    onClick={() => updateForm({ race })}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.race === race ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'
                    }`}
                  >
                    {race}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="section-subtitle block mb-2">Klasse</label>
              <div className="grid grid-cols-4 gap-2">
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl text-gold-400">Attribute (4d6, niedrigsten Würfel streichen)</h2>
            <button onClick={rollAllAttrs} className="btn-primary text-xs px-4 py-2">🎲 Alle würfeln</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ATTR_LABELS).map(([key, label]) => (
              <div key={key} className="panel p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="section-subtitle text-xs">{label}</p>
                  <p className="font-body text-xs text-stone-600 italic">Mod {getAbilityModifier(form.attributes[key]) >= 0 ? '+' : ''}{getAbilityModifier(form.attributes[key])}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setAttr(key, form.attributes[key] - 1)} className="w-6 h-6 rounded border border-stone-700 text-stone-400 hover:border-stone-500">-</button>
                  <span className="font-display text-2xl text-gold-400 w-8 text-center">{form.attributes[key]}</span>
                  <button onClick={() => setAttr(key, form.attributes[key] + 1)} className="w-6 h-6 rounded border border-stone-700 text-stone-400 hover:border-stone-500">+</button>
                  <button onClick={() => setAttr(key, roll4d6DropLowest())} className="w-6 h-6 rounded border border-stone-700 text-xs ml-1 text-stone-500 hover:border-gold-700">🎲</button>
                </div>
              </div>
            ))}
          </div>
          <div className="panel p-3 mt-4 grid grid-cols-4 gap-2 text-center">
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
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
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

      {step === 3 && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-6">Ausrüstung & Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="Zauber, Cantrips, Klassenfähigkeiten …"
                />
              </div>
            )}
          </div>
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(2)} className="btn-ghost">← Zurück</button>
            <button onClick={saveCharacter} disabled={!form.name.trim()} className="btn-primary">✓ Charakter speichern</button>
          </div>
        </div>
      )}

      {step === 4 && character && (
        <div className="panel-gold p-8 text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="font-display text-2xl text-gold-400 mb-2">{character.name}</h2>
          <p className="font-body text-stone-400 italic mb-6">{character.race} {character.class} – bereit für {PROJECT_NAME}!</p>
          <CharacterSheet />
          <button onClick={() => setEditing(false)} className="btn-ghost mt-6">Zum Charakterbogen</button>
        </div>
      )}
    </div>
  )
}