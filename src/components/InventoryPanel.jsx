import React, { useMemo, useState } from 'react'
import {
  ITEM_TYPES, ITEM_CATALOG, CURRENCY_CONFIG, CURRENCY_ORDER, EMPTY_CURRENCY,
  calcCarryingCapacity, calcTotalWeight, calcTotalGoldValue,
  getArmorsForClass, canUseShield, getWeapons,
} from '../data/items'
import { getAbilityModifier } from '../data/srd'

// ─── Slot Display ────────────────────────────────────────────────────────────

function EquipSlot({ label, item, slotType, inventory, editable, onEquip, onUnequip }) {
  const [open, setOpen] = useState(false)

  const eligibleItems = useMemo(() => {
    if (!inventory) return []
    return inventory.filter(i =>
      typeof i === 'object' && i.type === slotType && !i.equipped
    )
  }, [inventory, slotType])

  const slotInfo = item ? (
    slotType === 'weapon'
      ? `${item.properties?.damageDice || '?'} ${item.properties?.damageType || ''}`
      : slotType === 'armor'
        ? `AC ${item.properties?.acBase || '?'}`
        : slotType === 'shield'
          ? `+${item.properties?.acBonus || 2} AC`
          : ''
  ) : null

  return (
    <div className={`panel p-3 ${item ? 'border border-gold-700/40' : 'border border-stone-800'}`}>
      <p className="font-heading text-xs text-stone-500 mb-1">{label}</p>
      {item ? (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-heading text-sm text-gold-400">{item.name}</p>
            {slotInfo && <p className="font-body text-xs text-stone-500">{slotInfo}</p>}
          </div>
          {editable && (
            <button
              onClick={() => onUnequip(item.id)}
              className="btn-ghost text-xs px-2 py-0.5"
              title="Ablegen"
            >&#x2715;</button>
          )}
        </div>
      ) : (
        <div>
          <p className="font-body text-xs text-stone-600 italic">
            {slotType === 'weapon' ? 'Keine Waffe' : slotType === 'armor' ? 'Keine Rüstung' : 'Kein Schild'}
          </p>
          {editable && eligibleItems.length > 0 && (
            <div className="relative mt-1">
              <button onClick={() => setOpen(!open)} className="btn-ghost text-xs px-2 py-0.5">
                Ausrüsten...
              </button>
              {open && (
                <div className="absolute z-20 mt-1 left-0 w-48 panel p-1 border border-stone-700 max-h-40 overflow-y-auto">
                  {eligibleItems.map(i => (
                    <button
                      key={i.id}
                      className="w-full text-left px-2 py-1 text-xs font-body text-stone-300 hover:bg-stone-800 rounded"
                      onClick={() => { onEquip(i.id); setOpen(false) }}
                    >
                      {i.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Currency Row ────────────────────────────────────────────────────────────

function CurrencyWallet({ currency, editable, onUpdateCurrency }) {
  const coins = currency || EMPTY_CURRENCY

  return (
    <div className="flex flex-wrap gap-2">
      {CURRENCY_ORDER.map(denom => {
        const cfg = CURRENCY_CONFIG[denom]
        const value = coins[denom] || 0
        return (
          <div key={denom} className="panel p-2 flex items-center gap-1.5 min-w-[70px]">
            <span className="font-heading text-xs text-stone-500">{cfg.short}</span>
            {editable ? (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => onUpdateCurrency({ [denom]: -1 })}
                  className="text-stone-600 hover:text-stone-400 text-xs font-bold w-4 h-4 flex items-center justify-center"
                  disabled={value <= 0}
                >&minus;</button>
                <span className="font-heading text-sm text-gold-400 min-w-[20px] text-center">{value}</span>
                <button
                  onClick={() => onUpdateCurrency({ [denom]: 1 })}
                  className="text-stone-600 hover:text-stone-400 text-xs font-bold w-4 h-4 flex items-center justify-center"
                >+</button>
              </div>
            ) : (
              <span className="font-heading text-sm text-gold-400">{value}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Weight Bar ──────────────────────────────────────────────────────────────

function WeightBar({ inventory, strScore }) {
  const totalWeight = calcTotalWeight(inventory)
  const capacity = calcCarryingCapacity(strScore)
  const percent = capacity > 0 ? Math.min(100, (totalWeight / capacity) * 100) : 0
  const encumbered = totalWeight > capacity

  return (
    <div>
      <div className="hp-bar-bg">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            background: encumbered
              ? 'linear-gradient(90deg, #dc2626, #f87171)'
              : percent > 75
                ? 'linear-gradient(90deg, #d97706, #fbbf24)'
                : 'linear-gradient(90deg, #4a7c59, #6aae5e)',
          }}
        />
      </div>
      <p className={`font-body text-xs mt-0.5 ${encumbered ? 'text-red-400' : 'text-stone-500'}`}>
        {totalWeight.toFixed(1)} / {capacity.toFixed(1)} kg
        {encumbered && ' — Überladen!'}
      </p>
    </div>
  )
}

// ─── Item Picker (for adding items) ──────────────────────────────────────────

function ItemPicker({ onAdd, onClose }) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')

  const filtered = useMemo(() => {
    const items = Object.values(ITEM_CATALOG)
    return items.filter(item => {
      if (tab !== 'all' && item.type !== tab) return false
      if (search) {
        const s = search.toLowerCase()
        return item.name.toLowerCase().includes(s) || item.key.includes(s)
      }
      return true
    }).slice(0, 30)
  }, [search, tab])

  const tabs = [
    { key: 'all', label: 'Alle' },
    { key: 'weapon', label: 'Waffen' },
    { key: 'armor', label: 'Rüstung' },
    { key: 'shield', label: 'Schild' },
    { key: 'consumable', label: 'Tränke' },
    { key: 'gear', label: 'Ausrüstung' },
    { key: 'tool', label: 'Werkzeuge' },
  ]

  return (
    <div className="panel border border-stone-700 p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="font-heading text-xs text-stone-400">Gegenstand hinzufügen</p>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-400 text-xs">&#x2715;</button>
      </div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Suchen..."
        className="input-dark w-full mb-2 text-sm"
        autoFocus
      />
      <div className="flex flex-wrap gap-1 mb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`text-xs px-2 py-0.5 rounded font-body ${tab === t.key ? 'bg-gold-700/30 text-gold-400' : 'text-stone-500 hover:text-stone-400'}`}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {filtered.map(item => (
          <button
            key={item.key}
            className="w-full text-left px-2 py-1.5 text-xs font-body text-stone-300 hover:bg-stone-800 rounded flex items-center justify-between"
            onClick={() => { onAdd(item.key); onClose() }}
          >
            <span>{item.name}</span>
            <span className="text-stone-600">
              {item.weight > 0 ? `${item.weight} kg` : ''}
              {item.cost > 0 ? ` · ${item.cost} GM` : ''}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-stone-600 italic px-2 py-1">Nichts gefunden.</p>
        )}
      </div>
    </div>
  )
}

// ─── Main InventoryPanel ─────────────────────────────────────────────────────

export default function InventoryPanel({
  mode = 'readonly',
  character,
  onEquip,
  onUnequip,
  onRemove,
  onAdd,
  onUpdateCurrency,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customItem, setCustomItem] = useState('')
  const editable = mode === 'editable'
  const inventory = character?.inventory || []
  const currency = character?.currency || EMPTY_CURRENCY

  const equippedWeapon = inventory.find(i => typeof i === 'object' && i.type === 'weapon' && i.equipped) || null
  const equippedArmor = inventory.find(i => typeof i === 'object' && i.type === 'armor' && i.equipped) || null
  const equippedShield = inventory.find(i => typeof i === 'object' && i.type === 'shield' && i.equipped) || null
  const unequippedItems = inventory.filter(i => typeof i === 'object' && !i.equipped)

  const totalGold = calcTotalGoldValue(currency)

  // ── Compact mode ─────────────────────────────────────────────────────────

  if (mode === 'compact') {
    return (
      <div className="panel p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-stone-500">Waffe</span>
          <span className="font-heading text-xs text-gold-400">
            {equippedWeapon ? `${equippedWeapon.name} (${equippedWeapon.properties?.damageDice || '?'})` : 'Keine'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-stone-500">Gold</span>
          <span className="font-heading text-xs text-gold-400">{totalGold.toFixed(1)} GM</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs text-stone-500">Items</span>
          <span className="font-heading text-xs text-stone-400">{inventory.length}</span>
        </div>
      </div>
    )
  }

  // ── Full mode (readonly / editable) ──────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Equip Slots */}
      <div>
        <p className="section-subtitle mb-2">Ausrüstung</p>
        <div className="grid grid-cols-3 gap-2">
          <EquipSlot label="Waffe" item={equippedWeapon} slotType="weapon" inventory={inventory} editable={editable} onEquip={onEquip} onUnequip={onUnequip} />
          <EquipSlot label="Rüstung" item={equippedArmor} slotType="armor" inventory={inventory} editable={editable} onEquip={onEquip} onUnequip={onUnequip} />
          <EquipSlot label="Schild" item={equippedShield} slotType="shield" inventory={inventory} editable={editable} onEquip={onEquip} onUnequip={onUnequip} />
        </div>
      </div>

      {/* Currency */}
      <div>
        <p className="section-subtitle mb-2">Geldbeutel</p>
        <CurrencyWallet currency={currency} editable={editable} onUpdateCurrency={onUpdateCurrency} />
        {totalGold > 0 && (
          <p className="font-body text-xs text-stone-600 mt-1">Gesamt: {totalGold.toFixed(1)} GM</p>
        )}
      </div>

      {/* Weight */}
      <div>
        <p className="section-subtitle mb-2">Tragkapazität</p>
        <WeightBar inventory={inventory} strScore={character?.attributes?.str || 10} />
      </div>

      {/* Item List */}
      <div>
        <p className="section-subtitle mb-2">Gegenstände ({inventory.length})</p>
        <div className="panel p-3">
          {inventory.length === 0 ? (
            <p className="font-body text-xs text-stone-600 italic">Inventar leer.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {inventory.map((item, idx) => {
                if (typeof item === 'string') {
                  return <span key={idx} className="badge-gold">{item}</span>
                }
                const isEquipped = item.equipped
                const qtyLabel = item.quantity > 1 ? ` x${item.quantity}` : ''
                const typeLabel = ITEM_TYPES[item.type] || ''
                return (
                  <span
                    key={item.id || idx}
                    className={`badge-gold relative group ${isEquipped ? 'ring-1 ring-gold-500/50' : ''} ${editable ? 'cursor-pointer' : ''}`}
                    title={`${typeLabel}${item.weight ? ` · ${(item.weight * (item.quantity || 1)).toFixed(1)} kg` : ''}`}
                    onClick={editable && !isEquipped && ['weapon', 'armor', 'shield'].includes(item.type) ? () => onEquip(item.id) : undefined}
                  >
                    {item.name}{qtyLabel}
                    {isEquipped && <span className="text-gold-500 ml-1 text-[10px]">&#9733;</span>}
                    {editable && (
                      <button
                        className="ml-1 text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                        title="Entfernen"
                      >&#x2715;</button>
                    )}
                  </span>
                )
              })}
            </div>
          )}

          {/* Add item controls */}
          {editable && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customItem}
                  onChange={e => setCustomItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customItem.trim()) {
                      onAdd(customItem.trim())
                      setCustomItem('')
                    }
                  }}
                  placeholder="Eigener Gegenstand..."
                  className="input-dark flex-1 text-sm"
                />
                <button
                  onClick={() => { if (customItem.trim()) { onAdd(customItem.trim()); setCustomItem('') } }}
                  className="btn-primary px-3 text-sm"
                >+</button>
                <button
                  onClick={() => setPickerOpen(!pickerOpen)}
                  className="btn-ghost px-3 text-sm"
                  title="SRD-Katalog durchsuchen"
                >&#x1F4D6;</button>
              </div>
              {pickerOpen && (
                <ItemPicker onAdd={onAdd} onClose={() => setPickerOpen(false)} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
