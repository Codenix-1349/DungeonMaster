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

export const RACES = ['Mensch', 'Elf', 'Zwerg', 'Halbling', 'Gnom', 'Halbelf', 'Halb-Ork']
export const CLASSES = ['Kämpfer', 'Zauberer', 'Kleriker', 'Schurke', 'Waldläufer', 'Paladin', 'Druide', 'Barde']

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
}

export const ABILITY_SAVE_LABELS = [
  { key: 'str', label: 'STR Save' },
  { key: 'dex', label: 'DEX Save' },
  { key: 'con', label: 'CON Save' },
  { key: 'int', label: 'INT Save' },
  { key: 'wis', label: 'WIS Save' },
  { key: 'cha', label: 'CHA Save' },
]

export const SRD_QUICK_RULES = [
  {
    title: 'Initiative',
    text: 'Jede beteiligte Kreatur würfelt d20 + DEX-Modifikator. Höher gewinnt und handelt zuerst.',
  },
  {
    title: 'Angriff',
    text: 'Angriffswurf = d20 + Attributsmodifikator + Übungsbonus. Trifft, wenn das Ergebnis mindestens die Rüstungsklasse des Ziels erreicht.',
  },
  {
    title: 'Zauber & Rettungswurf',
    text: 'Zauber-SG = 8 + Übungsbonus + Zauberattribut. Spell Attack = Übungsbonus + Zauberattribut.',
  },
]

export const SRD_SYSTEM_PROMPT_RULES = `
## D&D SRD 5.2.1 Kernlogik
- Nutze die sechs Attribute Stärke, Geschicklichkeit, Konstitution, Intelligenz, Weisheit und Charisma.
- Attributsmodifikator = floor((Attribut - 10) / 2).
- Angriffswurf: d20 + passender Attributsmodifikator + Übungsbonus gegen die Rüstungsklasse (RK/AC) des Ziels.
- Initiative: d20 + Geschicklichkeitsmodifikator. Höher handelt zuerst.
- Standard-Rüstungsklasse ohne Rüstung: 10 + Geschicklichkeitsmodifikator.
- Nahkampfangriffe nutzen meistens Stärke, Fernkampfwaffen meistens Geschicklichkeit.
- Zauber-SG: 8 + Übungsbonus + Zauberattribut.
- Zauberangriffsbonus: Übungsbonus + Zauberattribut.
- Trefferpunkte und Zustände werden von der App nachgehalten; beschreibe die Folgen erzählerisch.
- Wenn Regeln unklar sind, entscheide fair, simpel und konsistent im Geist des SRD statt seltene Sonderregeln zu erfinden.
`

export function legacyClassNameToCurrent(className) {
  if (className === 'Magier') return 'Zauberer'
  if (className === 'Dieb') return 'Schurke'
  return className
}

export function getAbilityModifier(score = 10) {
  return Math.floor((Number(score) - 10) / 2)
}

export function getProficiencyBonus(level = 1) {
  const normalizedLevel = Math.max(1, Number(level) || 1)
  return 2 + Math.floor((normalizedLevel - 1) / 4)
}

export function roll4d6DropLowest() {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
  rolls.sort((a, b) => a - b)
  return rolls.slice(1).reduce((sum, roll) => sum + roll, 0)
}

export function calcHitPoints(className, conScore = 10, level = 1) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const hitDie = CLASS_CONFIG[normalizedClass]?.hitDie || 8
  const conMod = getAbilityModifier(conScore)
  const base = hitDie
  const extraLevels = Math.max(0, (Number(level) || 1) - 1) * Math.max(1, Math.ceil(hitDie / 2) + conMod)
  return Math.max(1, base + conMod + extraLevels)
}

export function calcArmorClass(dexScore = 10, armorBonus = 0) {
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

export function createCharacterTemplate() {
  const defaultClass = 'Kämpfer'
  const defaultAttributes = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }

  return {
    name: '',
    race: 'Mensch',
    class: defaultClass,
    level: 1,
    xp: 0,
    attributes: defaultAttributes,
    maxHP: calcHitPoints(defaultClass, defaultAttributes.con, 1),
    currentHP: calcHitPoints(defaultClass, defaultAttributes.con, 1),
    armorClass: calcArmorClass(defaultAttributes.dex, 2),
    armorBonus: 2,
    proficiencyBonus: getProficiencyBonus(1),
    initiativeBonus: calcInitiativeBonus(defaultAttributes.dex),
    attackBonus: calcAttackBonus(defaultClass, defaultAttributes, 1),
    spellSaveDC: calcSpellSaveDC(defaultClass, defaultAttributes, 1),
    spellAttackBonus: calcSpellAttackBonus(defaultClass, defaultAttributes, 1),
    inventory: [...(CLASS_CONFIG[defaultClass]?.starterInventory || [])],
    spells: CLASS_CONFIG[defaultClass]?.spells || '',
  }
}

export function recalcCharacterStats(character) {
  if (!character) return null

  const normalizedClass = legacyClassNameToCurrent(character.class || 'Kämpfer')
  const level = Math.max(1, Number(character.level) || 1)
  const attributes = {
    str: Number(character.attributes?.str ?? 10),
    dex: Number(character.attributes?.dex ?? 10),
    con: Number(character.attributes?.con ?? 10),
    int: Number(character.attributes?.int ?? 10),
    wis: Number(character.attributes?.wis ?? 10),
    cha: Number(character.attributes?.cha ?? 10),
  }

  const armorBonus = Number(character.armorBonus ?? 0)
  const maxHP = Math.max(1, Number(character.maxHP) || calcHitPoints(normalizedClass, attributes.con, level))
  const currentHP = Math.max(0, Math.min(Number(character.currentHP ?? maxHP), maxHP))
  const proficiencyBonus = getProficiencyBonus(level)

  return {
    ...character,
    class: normalizedClass,
    level,
    attributes,
    armorBonus,
    armorClass: Number(character.armorClass ?? calcArmorClass(attributes.dex, armorBonus)),
    maxHP,
    currentHP,
    proficiencyBonus,
    initiativeBonus: calcInitiativeBonus(attributes.dex),
    attackBonus: calcAttackBonus(normalizedClass, attributes, level),
    spellSaveDC: calcSpellSaveDC(normalizedClass, attributes, level),
    spellAttackBonus: calcSpellAttackBonus(normalizedClass, attributes, level),
    inventory: Array.isArray(character.inventory) ? character.inventory : [...(CLASS_CONFIG[normalizedClass]?.starterInventory || [])],
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
    attributes: {
      ...base.attributes,
      ...(character.attributes || {}),
    },
    inventory: Array.isArray(character.inventory) ? character.inventory : base.inventory,
  }

  return recalcCharacterStats(merged)
}