import {
  EMPTY_CURRENCY,
  lookupItem, createInventoryItem,
} from './items.js'

export const PROJECT_NAME = 'Dungeons & Daggers'
export const SRD_VERSION_LABEL = 'D&D SRD 5.2.1'

export const ATTR_LABELS = {
  str: 'Stärke',
  dex: 'Geschicklichkeit',
  con: 'Konstitution',
  int: 'Intelligenz',
  wis: 'Weisheit',
  cha: 'Charisma',
}

export const ATTR_SHORT_LABELS = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

// ─── Race Configuration (D&D 5e SRD) ────────────────────────────────────────
export const RACE_CONFIG = {
  'Mensch':   { abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, hint: '+1 auf alle' },
  'Elf':      { abilityBonuses: { dex: 2 }, hint: '+2 GES' },
  'Zwerg':    { abilityBonuses: { con: 2 }, hint: '+2 KON' },
  'Halbling': { abilityBonuses: { dex: 2 }, hint: '+2 GES' },
  'Gnom':     { abilityBonuses: { int: 2 }, hint: '+2 INT' },
  'Halbelf':  { abilityBonuses: { cha: 2, dex: 1, con: 1 }, hint: '+2 CHA, +1 GES/KON' },
  'Halb-Ork': { abilityBonuses: { str: 2, con: 1 }, hint: '+2 STR, +1 KON' },
}
export const RACES = Object.keys(RACE_CONFIG)

export function applyRacialBonuses(baseAttributes, race) {
  const bonuses = RACE_CONFIG[race]?.abilityBonuses || {}
  return {
    str: (baseAttributes.str || 10) + (bonuses.str || 0),
    dex: (baseAttributes.dex || 10) + (bonuses.dex || 0),
    con: (baseAttributes.con || 10) + (bonuses.con || 0),
    int: (baseAttributes.int || 10) + (bonuses.int || 0),
    wis: (baseAttributes.wis || 10) + (bonuses.wis || 0),
    cha: (baseAttributes.cha || 10) + (bonuses.cha || 0),
  }
}

// ─── Skills (D&D 5e SRD) ────────────────────────────────────────────────────
export const SKILLS = [
  { key: 'acrobatics',     label: 'Akrobatik',          ability: 'dex' },
  { key: 'animalHandling', label: 'Umgang mit Tieren',  ability: 'wis' },
  { key: 'arcana',         label: 'Arkane Kunde',       ability: 'int' },
  { key: 'athletics',      label: 'Athletik',           ability: 'str' },
  { key: 'deception',      label: 'Täuschung',          ability: 'cha' },
  { key: 'history',        label: 'Geschichte',         ability: 'int' },
  { key: 'insight',        label: 'Motiv erkennen',     ability: 'wis' },
  { key: 'intimidation',   label: 'Einschüchtern',      ability: 'cha' },
  { key: 'investigation',  label: 'Nachforschung',      ability: 'int' },
  { key: 'medicine',       label: 'Heilkunde',          ability: 'wis' },
  { key: 'nature',         label: 'Naturkunde',         ability: 'int' },
  { key: 'perception',     label: 'Wahrnehmung',        ability: 'wis' },
  { key: 'performance',    label: 'Auftreten',          ability: 'cha' },
  { key: 'persuasion',     label: 'Überredung',         ability: 'cha' },
  { key: 'religion',       label: 'Religion',           ability: 'int' },
  { key: 'sleightOfHand',  label: 'Fingerfertigkeit',   ability: 'dex' },
  { key: 'stealth',        label: 'Heimlichkeit',       ability: 'dex' },
  { key: 'survival',       label: 'Überleben',          ability: 'wis' },
]

export const CLASS_SKILL_OPTIONS = {
  'Kämpfer':       { count: 2, options: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'] },
  'Zauberer':      { count: 2, options: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'] },
  'Kleriker':      { count: 2, options: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
  'Schurke':       { count: 4, options: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleightOfHand', 'stealth'] },
  'Waldläufer':    { count: 3, options: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
  'Paladin':       { count: 2, options: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
  'Druide':        { count: 2, options: ['arcana', 'animalHandling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
  'Barde':         { count: 3, options: SKILLS.map(s => s.key) },
  'Barbar':        { count: 2, options: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
  'Mönch':         { count: 2, options: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
  'Hexenmeister':  { count: 2, options: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
  'Hexer':         { count: 2, options: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
}

export function calcSkillBonus(abilityScore, level, isProficient) {
  return getAbilityModifier(abilityScore) + (isProficient ? getProficiencyBonus(level) : 0)
}

const VALID_ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function resolveSkillCheck({ skillOrAbility, dc, advantage = null, character }) {
  const attrs = character?.attributes || {}
  const level = character?.level || 1
  const proficiencies = character?.skillProficiencies || []

  const skillDef = SKILLS.find(s => s.key === skillOrAbility)
  const isSkill = Boolean(skillDef)

  if (!isSkill && !VALID_ABILITY_KEYS.includes(skillOrAbility)) return null

  const abilityKey = isSkill ? skillDef.ability : skillOrAbility
  const abilityScore = attrs[abilityKey] || 10
  const isProficient = isSkill && proficiencies.includes(skillOrAbility)
  const modifier = calcSkillBonus(abilityScore, level, isProficient)

  const roll1 = Math.floor(Math.random() * 20) + 1
  const roll2 = (advantage === 'advantage' || advantage === 'disadvantage')
    ? Math.floor(Math.random() * 20) + 1
    : null

  let d20Result
  if (advantage === 'advantage') {
    d20Result = Math.max(roll1, roll2)
  } else if (advantage === 'disadvantage') {
    d20Result = Math.min(roll1, roll2)
  } else {
    d20Result = roll1
  }

  const total = d20Result + modifier
  const success = total >= dc

  const label = isSkill ? skillDef.label : (ATTR_LABELS[abilityKey] || abilityKey.toUpperCase())

  return {
    label,
    skillOrAbility,
    abilityKey,
    isSkill,
    isProficient,
    modifier,
    d20Result,
    roll1,
    roll2,
    advantage,
    total,
    dc,
    success,
  }
}

export const CLASSES = ['Kämpfer', 'Zauberer', 'Kleriker', 'Schurke', 'Waldläufer', 'Paladin', 'Druide', 'Barde', 'Barbar', 'Mönch', 'Hexenmeister', 'Hexer']

export const CLASS_CONFIG = {
  'Kämpfer': {
    hitDie: 10,
    primaryAbility: 'str',
    starterInventory: ['Langschwert', 'Schild', 'Kettenhemd', 'Rucksack', 'Seil (15m)', 'Heiltrank'],
    spells: '',
  },
  'Zauberer': {
    hitDie: 6,
    primaryAbility: 'int',
    spellcastingAbility: 'int',
    starterInventory: ['Stab', 'Komponentenbeutel', 'Zauberbuch', 'Rucksack', 'Fackeln x5', 'Heiltrank'],
    spells: 'Magisches Geschoss, Schild, Schlaf',
  },
  'Kleriker': {
    hitDie: 8,
    primaryAbility: 'wis',
    spellcastingAbility: 'wis',
    starterInventory: ['Streitkolben', 'Schild', 'Kettenhemd', 'Heiliges Symbol', 'Rucksack', 'Heiltrank'],
    spells: 'Heilendes Wort, Segen, Schild des Glaubens',
  },
  'Schurke': {
    hitDie: 8,
    primaryAbility: 'dex',
    starterInventory: ['Rapier', 'Kurzbogen', 'Dolch', 'Lederrüstung', 'Diebeswerkzeug', 'Rucksack'],
    spells: '',
  },
  'Waldläufer': {
    hitDie: 10,
    primaryAbility: 'dex',
    spellcastingAbility: 'wis',
    starterInventory: ['Langbogen', 'Zweihandschwert', 'Lederrüstung', 'Reiseproviant x5', 'Rucksack'],
    spells: 'Jägerzeichen',
  },
  'Paladin': {
    hitDie: 10,
    primaryAbility: 'str',
    spellcastingAbility: 'cha',
    starterInventory: ['Langschwert', 'Schild', 'Kettenhemd', 'Heiliges Symbol', 'Rucksack'],
    spells: 'Segen, Wunden heilen',
  },
  'Druide': {
    hitDie: 8,
    primaryAbility: 'wis',
    spellcastingAbility: 'wis',
    starterInventory: ['Krummsäbel', 'Lederrüstung', 'Holzschild', 'Druidenfokus', 'Rucksack'],
    spells: 'Dornenpeitsche, Feenfeuer, Heilendes Wort',
  },
  'Barde': {
    hitDie: 8,
    primaryAbility: 'cha',
    spellcastingAbility: 'cha',
    starterInventory: ['Rapier', 'Laute', 'Lederrüstung', 'Rucksack', 'Heiltrank'],
    spells: 'Spott, Heilendes Wort, Feenfeuer',
  },
  'Barbar': {
    hitDie: 12,
    primaryAbility: 'str',
    unarmoredDefense: 'con',
    starterInventory: ['Großaxt', 'Wurfspeer x4', 'Entdeckerpaket', 'Heiltrank'],
    spells: '',
  },
  'Mönch': {
    hitDie: 8,
    primaryAbility: 'dex',
    unarmoredDefense: 'wis',
    starterInventory: ['Kurzstock', 'Dolch', 'Entdeckerpaket', 'Wurfpfeile x10'],
    spells: '',
  },
  'Hexenmeister': {
    hitDie: 8,
    primaryAbility: 'cha',
    spellcastingAbility: 'cha',
    starterInventory: ['Leichte Armbrust', 'Arkaner Fokus', 'Lederrüstung', 'Rucksack', 'Heiltrank'],
    spells: 'Geisterstrahl, Verhexung',
  },
  'Hexer': {
    hitDie: 6,
    primaryAbility: 'cha',
    spellcastingAbility: 'cha',
    starterInventory: ['Leichte Armbrust', 'Arkaner Fokus', 'Rucksack', 'Heiltrank'],
    spells: 'Magisches Geschoss, Schlaf, Feuerhände',
  },
}

export const CLASS_WEAPON_DEFAULTS = {
  'Kämpfer':    { damageDice: '1d8', abilityMod: 'str', label: 'Langschwert' },
  'Zauberer':   { damageDice: '1d6', abilityMod: 'str', label: 'Stab' },
  'Kleriker':   { damageDice: '1d6', abilityMod: 'str', label: 'Streitkolben' },
  'Schurke':    { damageDice: '1d8', abilityMod: 'dex', label: 'Rapier' },
  'Waldläufer': { damageDice: '1d8', abilityMod: 'dex', label: 'Langbogen' },
  'Paladin':    { damageDice: '1d8', abilityMod: 'str', label: 'Langschwert' },
  'Druide':     { damageDice: '1d6', abilityMod: 'wis', label: 'Krummsäbel' },
  'Barde':        { damageDice: '1d8', abilityMod: 'dex', label: 'Rapier' },
  'Barbar':       { damageDice: '1d12', abilityMod: 'str', label: 'Großaxt' },
  'Mönch':        { damageDice: '1d6', abilityMod: 'dex', label: 'Kurzstock' },
  'Hexenmeister': { damageDice: '1d10', abilityMod: 'cha', label: 'Geisterstrahl' },
  'Hexer':        { damageDice: '1d8', abilityMod: 'cha', label: 'Leichte Armbrust' },
}

export function getClassWeaponDefaults(className) {
  return CLASS_WEAPON_DEFAULTS[className]
    || { damageDice: '1d6', abilityMod: 'str', label: 'Waffe' }
}

// Allowed armor presets per class (D&D 5e SRD proficiencies, simplified)
export const CLASS_ARMOR_OPTIONS = {
  'Kämpfer':      [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2 }, { label: 'Kette', bonus: 4 }, { label: 'Kette + Schild', bonus: 6, isDefault: true }, { label: 'Platte + Schild', bonus: 8 }],
  'Paladin':      [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2 }, { label: 'Kette', bonus: 4 }, { label: 'Kette + Schild', bonus: 6, isDefault: true }, { label: 'Platte + Schild', bonus: 8 }],
  'Kleriker':     [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2 }, { label: 'Kette', bonus: 4 }, { label: 'Kette + Schild', bonus: 6, isDefault: true }],
  'Waldläufer':   [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2, isDefault: true }, { label: 'Kette', bonus: 4 }, { label: 'Kette + Schild', bonus: 6 }],
  'Druide':       [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2, isDefault: true }, { label: 'Leder + Schild', bonus: 4 }],
  'Schurke':      [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2, isDefault: true }],
  'Barde':        [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2, isDefault: true }],
  'Hexenmeister': [{ label: 'Keine', bonus: 0 }, { label: 'Leder', bonus: 2, isDefault: true }],
  'Barbar':       [{ label: 'Ungerüstet', bonus: 0, isDefault: true }],
  'Mönch':        [{ label: 'Ungerüstet', bonus: 0, isDefault: true }],
  'Zauberer':     [{ label: 'Keine', bonus: 0, isDefault: true }],
  'Hexer':        [{ label: 'Keine', bonus: 0, isDefault: true }],
}

export function getDefaultArmorBonus(className) {
  const options = CLASS_ARMOR_OPTIONS[className] || [{ bonus: 0, isDefault: true }]
  const def = options.find(o => o.isDefault)
  return def ? def.bonus : (options[0]?.bonus ?? 0)
}

// ── Spell System (re-exported from data/spells.js) ───────────────────────────
export {
  SPELL_LIST,
  CASTER_PROGRESSION,
  SPELL_SLOTS,
  getClassSpells,
  getSpellSlots,
  getCantripsKnownCount,
  getSpellsKnownCount,
  getMaxSpellLevel,
} from './spells.js'


export const ABILITY_SAVE_LABELS = [
  { key: 'str', label: 'STR Save' },
  { key: 'dex', label: 'DEX Save' },
  { key: 'con', label: 'CON Save' },
  { key: 'int', label: 'INT Save' },
  { key: 'wis', label: 'WIS Save' },
  { key: 'cha', label: 'CHA Save' },
]

// -- Rules (re-exported from data/rules.js) ----------------------------------------
export {
  SRD_QUICK_RULES,
  SRD_CORE_PROMPT_RULES,
  SRD_RULE_BLOCKS,
  resolveRelevantRuleBlockKeys,
  buildRelevantRulesContext,
} from './rules.js'

const SPELLCASTING_CLASSES = new Set(
  Object.entries(CLASS_CONFIG)
    .filter(([, config]) => Boolean(config.spellcastingAbility))
    .map(([className]) => className)
)

// ─── Character Calc Functions ───────────────────────────────────────────────

export function legacyClassNameToCurrent(className) {
  if (className === 'Magier') return 'Zauberer'
  if (className === 'Dieb') return 'Schurke'
  return className
}

export function hasSpellcasting(className = '') {
  return SPELLCASTING_CLASSES.has(legacyClassNameToCurrent(className))
}

export function getAbilityModifier(score = 10) {
  return Math.floor((Number(score) - 10) / 2)
}

export function roll4d6DropLowest() {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
  rolls.sort((a, b) => a - b)
  return rolls.slice(1).reduce((sum, roll) => sum + roll, 0)
}

export function getProficiencyBonus(level = 1) {
  const normalizedLevel = Math.max(1, Number(level) || 1)
  return 2 + Math.floor((normalizedLevel - 1) / 4)
}

export function calcHitPoints(className, conScore = 10, level = 1) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const hitDie = CLASS_CONFIG[normalizedClass]?.hitDie || 8
  const conMod = getAbilityModifier(conScore)
  const base = hitDie
  const extraLevels = Math.max(0, (Number(level) || 1) - 1) * Math.max(1, Math.ceil(hitDie / 2) + conMod)
  return Math.max(1, base + conMod + extraLevels)
}

export function calcArmorClass(dexScore = 10, armorBonus = 0, className = '', attributes = {}) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const unarmoredAbility = CLASS_CONFIG[normalizedClass]?.unarmoredDefense
  // Barbar/Mönch: unarmored defense when no armor bonus
  if (unarmoredAbility && Number(armorBonus || 0) === 0) {
    return 10 + getAbilityModifier(dexScore) + getAbilityModifier(attributes[unarmoredAbility] || 10)
  }
  return 10 + getAbilityModifier(dexScore) + Number(armorBonus || 0)
}

export function calcInitiativeBonus(dexScore = 10) {
  return getAbilityModifier(dexScore)
}

export function calcAttackBonus(className, attributes = {}, level = 1) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const primaryAbility = CLASS_CONFIG[normalizedClass]?.primaryAbility || 'str'
  return getProficiencyBonus(level) + getAbilityModifier(attributes?.[primaryAbility] || 10)
}

export function calcSpellSaveDC(className, attributes = {}, level = 1) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const spellcastingAbility = CLASS_CONFIG[normalizedClass]?.spellcastingAbility
  if (!spellcastingAbility) return null
  return 8 + getProficiencyBonus(level) + getAbilityModifier(attributes?.[spellcastingAbility] || 10)
}

export function calcSpellAttackBonus(className, attributes = {}, level = 1) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const spellcastingAbility = CLASS_CONFIG[normalizedClass]?.spellcastingAbility
  if (!spellcastingAbility) return null
  return getProficiencyBonus(level) + getAbilityModifier(attributes?.[spellcastingAbility] || 10)
}

// ─── Inventory Migration (string[] → StructuredItem[]) ───────────────────────

export function isStructuredInventory(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) return true
  return typeof inventory[0] === 'object' && inventory[0] !== null && ('type' in inventory[0] || 'itemKey' in inventory[0])
}

export function migrateInventory(inventory, className = 'Kämpfer') {
  if (!Array.isArray(inventory)) return []
  if (isStructuredInventory(inventory)) return inventory

  const normalizedClass = legacyClassNameToCurrent(className)
  const classWeapon = CLASS_WEAPON_DEFAULTS[normalizedClass]
  const items = []

  for (const entry of inventory) {
    if (typeof entry !== 'string') continue
    const result = lookupItem(entry)
    if (result) {
      items.push(createInventoryItem(result.catalogEntry, { quantity: result.quantity }))
    } else {
      items.push(createInventoryItem(entry))
    }
  }

  // Auto-equip first matching weapon, armor, shield
  let weaponEquipped = false
  let armorEquipped = false
  let shieldEquipped = false

  for (const item of items) {
    if (!weaponEquipped && item.type === 'weapon') {
      // Prefer class default weapon
      if (classWeapon && item.name === classWeapon.label) {
        item.equipped = true
        weaponEquipped = true
      }
    }
    if (!armorEquipped && item.type === 'armor') {
      item.equipped = true
      armorEquipped = true
    }
    if (!shieldEquipped && item.type === 'shield') {
      item.equipped = true
      shieldEquipped = true
    }
  }
  // If no weapon matched by class default name, equip first weapon found
  if (!weaponEquipped) {
    const firstWeapon = items.find(i => i.type === 'weapon')
    if (firstWeapon) firstWeapon.equipped = true
  }

  return items
}

export function migrateStarterInventory(className) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const strings = CLASS_CONFIG[normalizedClass]?.starterInventory || []
  return migrateInventory(strings, normalizedClass)
}

// ─── Equipment-Based AC Calculation ──────────────────────────────────────────

export function getEquippedItem(inventory, type) {
  if (!Array.isArray(inventory)) return null
  return inventory.find(i => typeof i === 'object' && i.type === type && i.equipped) || null
}

export function deriveArmorBonusFromEquipment(inventory, dexScore = 10, className = '', attributes = {}) {
  const ac = calcArmorClassFromEquipment(inventory, dexScore, className, attributes)
  // armorBonus = ac - (10 + dexMod), clamped ≥ 0
  const dexMod = getAbilityModifier(dexScore)
  return Math.max(0, ac - 10 - dexMod)
}

export function calcArmorClassFromEquipment(inventory, dexScore = 10, className = '', attributes = {}) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const dexMod = getAbilityModifier(dexScore)

  const equippedArmor = getEquippedItem(inventory, 'armor')
  const equippedShield = getEquippedItem(inventory, 'shield')
  const shieldBonus = equippedShield?.properties?.acBonus || 0

  if (equippedArmor) {
    const props = equippedArmor.properties || {}
    const acBase = Number(props.acBase) || 10
    const maxDex = props.maxDexBonus
    const effectiveDex = (maxDex !== null && maxDex !== undefined) ? Math.min(dexMod, maxDex) : dexMod
    return acBase + effectiveDex + shieldBonus
  }

  // No armor equipped → unarmored defense
  const unarmoredAbility = CLASS_CONFIG[normalizedClass]?.unarmoredDefense
  if (unarmoredAbility) {
    return 10 + dexMod + getAbilityModifier(attributes[unarmoredAbility] || 10) + shieldBonus
  }

  // Base unarmored: 10 + DEX mod (+ shield if any)
  return 10 + dexMod + shieldBonus
}

// ─── Re-export items utilities ───────────────────────────────────────────────
export { ITEM_CATALOG, EMPTY_CURRENCY, lookupItem, createInventoryItem, generateInventoryId } from './items.js'
export { CURRENCY_CONFIG, CURRENCY_ORDER, calcCarryingCapacity, calcTotalWeight, calcTotalGoldValue } from './items.js'
export { getItemsByType, getWeapons, getArmors, getArmorsForClass, canUseShield } from './items.js'
export { ITEM_TYPES, ARMOR_PROFICIENCY, SHIELD_PROFICIENCY } from './items.js'

export function createCharacterTemplate() {
  const defaultClass = 'Kämpfer'
  const defaultRace = 'Mensch'
  const defaultBaseAttributes = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  const defaultAttributes = applyRacialBonuses(defaultBaseAttributes, defaultRace)

  return {
    name: '',
    race: defaultRace,
    class: defaultClass,
    level: 1,
    xp: 0,
    baseAttributes: defaultBaseAttributes,
    attributes: defaultAttributes,
    skillProficiencies: [],
    maxHP: calcHitPoints(defaultClass, defaultAttributes.con, 1),
    currentHP: calcHitPoints(defaultClass, defaultAttributes.con, 1),
    armorClass: calcArmorClass(defaultAttributes.dex, getDefaultArmorBonus(defaultClass), defaultClass, defaultAttributes),
    armorBonus: getDefaultArmorBonus(defaultClass),
    proficiencyBonus: getProficiencyBonus(1),
    initiativeBonus: calcInitiativeBonus(defaultAttributes.dex),
    attackBonus: calcAttackBonus(defaultClass, defaultAttributes, 1),
    spellSaveDC: calcSpellSaveDC(defaultClass, defaultAttributes, 1),
    spellAttackBonus: calcSpellAttackBonus(defaultClass, defaultAttributes, 1),
    inventory: migrateStarterInventory(defaultClass),
    currency: { ...EMPTY_CURRENCY },
    spells: CLASS_CONFIG[defaultClass]?.spells || '',
    knownCantrips: [],
    knownSpells: [],
    spellSlots: {},
    currentSpellSlots: {},
  }
}

export function recalcCharacterStats(character) {
  if (!character) return null

  const normalizedClass = legacyClassNameToCurrent(character.class || 'Kämpfer')
  const race = character.race || 'Mensch'
  const level = Math.max(1, Number(character.level) || 1)

  // Use baseAttributes if available, otherwise treat current attributes as base (legacy migration)
  const baseAttributes = {
    str: Number(character.baseAttributes?.str ?? character.attributes?.str ?? 10),
    dex: Number(character.baseAttributes?.dex ?? character.attributes?.dex ?? 10),
    con: Number(character.baseAttributes?.con ?? character.attributes?.con ?? 10),
    int: Number(character.baseAttributes?.int ?? character.attributes?.int ?? 10),
    wis: Number(character.baseAttributes?.wis ?? character.attributes?.wis ?? 10),
    cha: Number(character.baseAttributes?.cha ?? character.attributes?.cha ?? 10),
  }
  const attributes = applyRacialBonuses(baseAttributes, race)

  // Migrate inventory to structured format
  const rawInventory = Array.isArray(character.inventory) ? character.inventory : [...(CLASS_CONFIG[normalizedClass]?.starterInventory || [])]
  const inventory = migrateInventory(rawInventory, normalizedClass)
  const currency = character.currency && typeof character.currency === 'object'
    ? { ...EMPTY_CURRENCY, ...character.currency }
    : { ...EMPTY_CURRENCY }

  // Derive AC from equipment if structured, otherwise use legacy armorBonus
  const hasStructured = isStructuredInventory(inventory)
  let armorBonus, armorClass
  if (hasStructured && inventory.length > 0) {
    armorClass = calcArmorClassFromEquipment(inventory, attributes.dex, normalizedClass, attributes)
    armorBonus = deriveArmorBonusFromEquipment(inventory, attributes.dex, normalizedClass, attributes)
  } else {
    armorBonus = Number(character.armorBonus ?? 0)
    armorClass = calcArmorClass(attributes.dex, armorBonus, normalizedClass, attributes)
  }

  const maxHP = Math.max(1, Number(character.maxHP) || calcHitPoints(normalizedClass, attributes.con, level))
  const currentHP = Math.max(0, Math.min(Number(character.currentHP ?? maxHP), maxHP))
  const proficiencyBonus = getProficiencyBonus(level)
  const skillProficiencies = Array.isArray(character.skillProficiencies) ? character.skillProficiencies : []

  return {
    ...character,
    class: normalizedClass,
    race,
    level,
    baseAttributes,
    attributes,
    skillProficiencies,
    armorBonus,
    armorClass,
    maxHP,
    currentHP,
    proficiencyBonus,
    initiativeBonus: calcInitiativeBonus(attributes.dex),
    attackBonus: calcAttackBonus(normalizedClass, attributes, level),
    spellSaveDC: calcSpellSaveDC(normalizedClass, attributes, level),
    spellAttackBonus: calcSpellAttackBonus(normalizedClass, attributes, level),
    inventory,
    currency,
    spells: typeof character.spells === 'string'
      ? character.spells
      : (CLASS_CONFIG[normalizedClass]?.spells || ''),
  }
}

export function normalizeCharacter(character) {
  if (!character) return null

  const base = createCharacterTemplate()
  const merged = {
    ...base,
    ...character,
    class: legacyClassNameToCurrent(character.class || base.class),
    race: character.race || base.race,
    baseAttributes: {
      ...base.baseAttributes,
      ...(character.baseAttributes || character.attributes || {}),
    },
    attributes: {
      ...base.attributes,
      ...(character.attributes || {}),
    },
    skillProficiencies: Array.isArray(character.skillProficiencies) ? character.skillProficiencies : [],
    knownCantrips: Array.isArray(character.knownCantrips) ? character.knownCantrips : [],
    knownSpells: Array.isArray(character.knownSpells) ? character.knownSpells : [],
    spellSlots: character.spellSlots && typeof character.spellSlots === 'object' ? character.spellSlots : {},
    currentSpellSlots: character.currentSpellSlots && typeof character.currentSpellSlots === 'object' ? character.currentSpellSlots : (character.spellSlots && typeof character.spellSlots === 'object' ? { ...character.spellSlots } : {}),
    inventory: Array.isArray(character.inventory) ? character.inventory : base.inventory,
    currency: character.currency && typeof character.currency === 'object'
      ? { ...EMPTY_CURRENCY, ...character.currency }
      : { ...EMPTY_CURRENCY },
  }

  return recalcCharacterStats(merged)
}

// ─── XP & Level System (D&D 5e SRD) ─────────────────────────────────────────
export const XP_THRESHOLDS = [
  0,       // Level 1
  300,     // Level 2
  900,     // Level 3
  2700,    // Level 4
  6500,    // Level 5
  14000,   // Level 6
  23000,   // Level 7
  34000,   // Level 8
  48000,   // Level 9
  64000,   // Level 10
  85000,   // Level 11
  100000,  // Level 12
  120000,  // Level 13
  140000,  // Level 14
  165000,  // Level 15
  195000,  // Level 16
  225000,  // Level 17
  265000,  // Level 18
  305000,  // Level 19
  355000,  // Level 20
]

export function getLevelFromXP(xp = 0) {
  let level = 1
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1
    else break
  }
  return Math.min(level, 20)
}

export function getXPForNextLevel(level = 1) {
  return XP_THRESHOLDS[Math.min(level, 19)] ?? null
}

// Enemy XP by Challenge Rating (D&D 5e SRD)
export const CR_XP = {
  0: 10, '1/8': 25, '1/4': 50, '1/2': 100,
  1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800,
  6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
}

// Typical enemy stats by type for AI-free fallbacks
export const ENEMY_PRESETS = {
  goblin:    { name: 'Goblin',     hp: 7,  ac: 15, attackBonus: 4, damageDice: '1d6', damageBonus: 2, xp: 50  },
  orc:       { name: 'Ork',        hp: 15, ac: 13, attackBonus: 5, damageDice: '1d12', damageBonus: 3, xp: 100 },
  skeleton:  { name: 'Skelett',    hp: 13, ac: 13, attackBonus: 4, damageDice: '1d6', damageBonus: 2, xp: 50  },
  bandit:    { name: 'Bandit',     hp: 11, ac: 12, attackBonus: 3, damageDice: '1d6', damageBonus: 1, xp: 25  },
  wolf:      { name: 'Wolf',       hp: 11, ac: 13, attackBonus: 4, damageDice: '2d4', damageBonus: 2, xp: 50  },
  zombie:    { name: 'Zombie',     hp: 22, ac: 8,  attackBonus: 3, damageDice: '1d6', damageBonus: 1, xp: 50  },
  cultist:   { name: 'Kultist',    hp: 9,  ac: 12, attackBonus: 3, damageDice: '1d4', damageBonus: 1, xp: 25  },
  guard:     { name: 'Wächter',    hp: 11, ac: 16, attackBonus: 3, damageDice: '1d6', damageBonus: 1, xp: 25  },
}
