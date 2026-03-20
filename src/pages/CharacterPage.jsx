import React, { useState, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import CharacterSheet from '../components/CharacterSheet'

const RACES = ['Mensch', 'Elf', 'Halbelf', 'Zwerg', 'Halbling', 'Gnom', 'Halb-Ork']
const CLASSES = ['Kämpfer', 'Magier', 'Kleriker', 'Dieb', 'Waldläufer', 'Paladin', 'Druide', 'Barde']

const CLASS_THAC0 = {
  'Kämpfer': 20, 'Paladin': 20, 'Waldläufer': 20,
  'Kleriker': 20, 'Druide': 20,
  'Magier': 20, 'Barde': 20,
  'Dieb': 20
}

const CLASS_HD = {
  'Kämpfer': 10, 'Paladin': 10, 'Waldläufer': 8,
  'Kleriker': 8, 'Druide': 8,
  'Magier': 4, 'Barde': 6,
  'Dieb': 6
}

const CLASS_SPELLS = {
  'Magier': 'Magie-Missile (1), Schlaf (1), Feuerball (3)',
  'Kleriker': 'Wunden heilen (1), Licht (1), Segen (1)',
  'Druide': 'Entangle (1), Heilung leichte Wunden (1)',
  'Paladin': '',
  'Barde': '',
}

const ATTR_LABELS = {
  str: 'Stärke', dex: 'Geschicklichkeit', con: 'Konstitution',
  int: 'Intelligenz', wis: 'Weisheit', cha: 'Charisma'
}

function roll3d6() {
  return [1,2,3].reduce(s => s + Math.floor(Math.random()*6)+1, 0)
}

function calcHP(cls, conScore) {
  const hd = CLASS_HD[cls] || 8
  const conMod = conScore >= 16 ? 2 : conScore >= 13 ? 1 : conScore <= 6 ? -1 : 0
  return Math.max(1, Math.floor(Math.random()*hd)+1+conMod)
}

function calcAC(dexScore) {
  if (dexScore >= 17) return 7
  if (dexScore >= 16) return 8
  return 10
}

const DEFAULT_ATTRS = { str:10, dex:10, con:10, int:10, wis:10, cha:10 }

export default function CharacterPage() {
  const { character, setCharacter } = useGame()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', race: 'Mensch', class: 'Kämpfer',
    attributes: { ...DEFAULT_ATTRS },
    maxHP: 8, currentHP: 8, armorClass: 10, thac0: 20,
    xp: 0, level: 1,
    inventory: ['Schwert', 'Schild', 'Rucksack', 'Fackeln x5', 'Reiseproviant x3'],
    spells: '',
  })
  const [editing, setEditing] = useState(false)
  const [newItem, setNewItem] = useState('')

  const setAttr = (key, val) => {
    const num = Math.min(18, Math.max(3, Number(val)))
    setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [key]: num } }))
  }

  const rollAllAttrs = () => {
    const attrs = {}
    Object.keys(DEFAULT_ATTRS).forEach(k => { attrs[k] = roll3d6() })
    const hp = calcHP(form.class, attrs.con)
    const ac = calcAC(attrs.dex)
    setForm(prev => ({ ...prev, attributes: attrs, maxHP: hp, currentHP: hp, armorClass: ac, thac0: CLASS_THAC0[prev.class]||20 }))
  }

  const updateClass = (cls) => {
    const hp = calcHP(cls, form.attributes.con)
    setForm(prev => ({
      ...prev, class: cls, maxHP: hp, currentHP: hp,
      thac0: CLASS_THAC0[cls]||20,
      spells: CLASS_SPELLS[cls] !== undefined ? CLASS_SPELLS[cls] : prev.spells
    }))
  }

  const saveCharacter = () => {
    setCharacter({ ...form })
    setEditing(false)
    setStep(4)
  }

  const addInventoryItem = () => {
    if (!newItem.trim()) return
    setForm(prev => ({ ...prev, inventory: [...prev.inventory, newItem.trim()] }))
    setNewItem('')
  }

  const removeItem = (idx) => {
    setForm(prev => ({ ...prev, inventory: prev.inventory.filter((_,i) => i!==idx) }))
  }

  const startEdit = () => {
    if (character) setForm({ ...character })
    setEditing(true)
    setStep(1)
  }

  // View: existing character
  if (!editing && character) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title text-3xl mb-1">Charakterbogen</h1>
            <p className="font-body text-stone-500 italic">Dein Held</p>
          </div>
          <div className="flex gap-2">
            <button onClick={startEdit} className="btn-ghost">Bearbeiten</button>
            <button onClick={() => { setCharacter(null); setEditing(true); setStep(0) }} className="btn-danger">Neu</button>
          </div>
        </div>
        <CharacterSheet />

        <div className="panel p-4 mt-4">
          <p className="section-subtitle mb-3">Inventar verwalten</p>
          <div className="flex gap-2 mb-3">
            <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key==='Enter' && addInventoryItem()}
              placeholder="Gegenstand…" className="input-dark flex-1" />
            <button onClick={addInventoryItem} className="btn-primary px-4">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(character.inventory||[]).map((item,i) => (
              <span key={i} className="badge-gold cursor-pointer hover:bg-red-900/30 transition-colors"
                onClick={() => setCharacter(prev => ({ ...prev, inventory: prev.inventory.filter((_,idx) => idx!==i) }))}>
                {item} ✕
              </span>
            ))}
          </div>
        </div>

        <div className="panel p-4 mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="section-subtitle mb-1">Aktuelle HP</p>
            <input type="number" value={character.currentHP??character.maxHP}
              onChange={e => setCharacter(prev => ({ ...prev, currentHP: Math.min(Number(e.target.value),prev.maxHP) }))}
              className="input-dark" min="0" max={character.maxHP} />
          </div>
          <div>
            <p className="section-subtitle mb-1">Max HP</p>
            <input type="number" value={character.maxHP}
              onChange={e => setCharacter(prev => ({ ...prev, maxHP: Number(e.target.value) }))}
              className="input-dark" min="1" />
          </div>
          <div>
            <p className="section-subtitle mb-1">Erfahrung (XP)</p>
            <input type="number" value={character.xp||0}
              onChange={e => setCharacter(prev => ({ ...prev, xp: Number(e.target.value) }))}
              className="input-dark" min="0" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title text-3xl mb-2">Charakter erschaffen</h1>
        <p className="font-body text-stone-500 italic">AD&D 2nd Edition</p>
        <div className="flex items-center gap-1 mt-4">
          {['Intro','Basis','Attribute','Details','Fertig'].map((label,i) => (
            <React.Fragment key={i}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading transition-colors ${
                i<=step ? 'bg-gold-600 text-black' : 'bg-stone-800 text-stone-600'}`}>{i+1}</div>
              {i<4 && <div className={`flex-1 h-px transition-colors ${i<step?'bg-gold-600':'bg-stone-800'}`}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 0 */}
      {step===0 && (
        <div className="panel-gold p-8 text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <h2 className="font-display text-2xl text-gold-400 mb-4">Wer bist du, Held?</h2>
          <p className="font-body text-stone-400 italic mb-8">
            Erschaffe deinen Helden für AD&D 2nd Edition. Wähle Rasse und Klasse, würfle Attribute und rüste dich für das Abenteuer.
          </p>
          <button onClick={() => setStep(1)} className="btn-primary text-base px-10 py-3">Beginnen →</button>
        </div>
      )}

      {/* Step 1 */}
      {step===1 && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-6">Grunddaten</h2>
          <div className="space-y-5">
            <div>
              <label className="section-subtitle block mb-1">Name</label>
              <input type="text" value={form.name}
                onChange={e => setForm(p => ({...p, name: e.target.value}))}
                placeholder="Thorin Eisenfaust…" className="input-dark" />
            </div>
            <div>
              <label className="section-subtitle block mb-2">Rasse</label>
              <div className="grid grid-cols-4 gap-2">
                {RACES.map(r => (
                  <button key={r} onClick={() => setForm(p => ({...p, race:r}))}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.race===r ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="section-subtitle block mb-2">Klasse</label>
              <div className="grid grid-cols-4 gap-2">
                {CLASSES.map(c => (
                  <button key={c} onClick={() => updateClass(c)}
                    className={`py-2 px-2 rounded border text-xs font-heading tracking-wide transition-all ${
                      form.class===c ? 'border-gold-500 text-gold-300 bg-gold-600/15' : 'border-stone-700 text-stone-400 hover:border-stone-500'}`}>
                    {c}
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

      {/* Step 2 */}
      {step===2 && (
        <div className="panel-gold p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl text-gold-400">Attribute (3d6)</h2>
            <button onClick={rollAllAttrs} className="btn-primary text-xs px-4 py-2">🎲 Alle würfeln</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ATTR_LABELS).map(([key, label]) => (
              <div key={key} className="panel p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="section-subtitle text-xs">{label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setAttr(key, form.attributes[key]-1)}
                    className="w-6 h-6 rounded border border-stone-700 text-stone-400 hover:border-stone-500">-</button>
                  <span className="font-display text-2xl text-gold-400 w-8 text-center">{form.attributes[key]}</span>
                  <button onClick={() => setAttr(key, form.attributes[key]+1)}
                    className="w-6 h-6 rounded border border-stone-700 text-stone-400 hover:border-stone-500">+</button>
                  <button onClick={() => setAttr(key, roll3d6())}
                    className="w-6 h-6 rounded border border-stone-700 text-xs ml-1 text-stone-500 hover:border-gold-700">🎲</button>
                </div>
              </div>
            ))}
          </div>
          <div className="panel p-3 mt-4 grid grid-cols-3 gap-2 text-center">
            <div><p className="section-subtitle">HP</p><p className="font-display text-2xl text-gold-400">{form.maxHP}</p></div>
            <div><p className="section-subtitle">RK</p><p className="font-display text-2xl text-gold-400">{form.armorClass}</p></div>
            <div><p className="section-subtitle">THAC0</p><p className="font-display text-2xl text-gold-400">{form.thac0}</p></div>
          </div>
          <button onClick={() => {
            const hp=calcHP(form.class,form.attributes.con); const ac=calcAC(form.attributes.dex)
            setForm(p => ({...p, maxHP:hp, currentHP:hp, armorClass:ac}))
          }} className="btn-ghost w-full mt-2 text-xs">HP & RK neu berechnen</button>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="btn-ghost">← Zurück</button>
            <button onClick={() => setStep(3)} className="btn-primary">Weiter →</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step===3 && (
        <div className="panel-gold p-6">
          <h2 className="font-heading text-xl text-gold-400 mb-6">Ausrüstung & Details</h2>
          <div className="space-y-4">
            <div>
              <label className="section-subtitle block mb-1">Rüstungsklasse</label>
              <div className="flex items-center gap-3">
                <input type="number" value={form.armorClass}
                  onChange={e => setForm(p => ({...p, armorClass:Number(e.target.value)}))}
                  className="input-dark w-24" min="0" max="10" />
                <span className="font-body text-xs text-stone-600 italic">10=keine, 8=Leder, 5=Kette, 3=Platte</span>
              </div>
            </div>
            <div>
              <label className="section-subtitle block mb-2">Startinventar</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && addInventoryItem()}
                  placeholder="Gegenstand…" className="input-dark flex-1" />
                <button onClick={addInventoryItem} className="btn-primary px-4">+</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.inventory.map((item,i) => (
                  <span key={i} onClick={() => removeItem(i)}
                    className="badge-gold cursor-pointer hover:bg-red-900/30 transition-colors">{item} ✕</span>
                ))}
              </div>
            </div>
            {CLASS_SPELLS[form.class] !== undefined && (
              <div>
                <label className="section-subtitle block mb-1">Zaubersprüche</label>
                <textarea value={form.spells} onChange={e => setForm(p => ({...p, spells:e.target.value}))}
                  className="input-dark w-full h-20 resize-none"
                  placeholder="Zaubersprüche (Name (Stufe), …)" />
              </div>
            )}
          </div>
          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(2)} className="btn-ghost">← Zurück</button>
            <button onClick={saveCharacter} disabled={!form.name.trim()} className="btn-primary">
              ✓ Charakter speichern
            </button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step===4 && character && (
        <div className="panel-gold p-8 text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="font-display text-2xl text-gold-400 mb-2">{character.name}</h2>
          <p className="font-body text-stone-400 italic mb-6">{character.race} {character.class} – bereit!</p>
          <CharacterSheet />
          <button onClick={() => setEditing(false)} className="btn-ghost mt-6">Zum Charakterbogen</button>
        </div>
      )}
    </div>
  )
}
