import { SPELL_LIST, getSpellSlots } from './spells'
import { SRD_RULE_BLOCKS, SRD_CORE_PROMPT_RULES } from './rules'
import {
  ITEM_CATALOG, EMPTY_CURRENCY,
  lookupItem, createInventoryItem, generateInventoryId,
} from './items'

export const PROJECT_NAME = 'Dungeons & Daggers'
export const SRD_VERSION_LABEL = 'D&D SRD 5.2.1'
const ADVENTURE_STRUCTURE_VERSION = 2
const SCENE_STATE_VERSION = 3

const GERMAN_STOPWORDS = new Set([
  'aber','alle','allen','aller','alles','auch','auf','aus','bei','bin','bis','bist','da','dadurch','daher','darum','das','dass','dein','deine','dem','den','der','des','dessen','deshalb','die','dies','diese','diesem','diesen','dieser','dieses','doch','dort','du','durch','ein','eine','einem','einen','einer','eines','er','es','euer','eure','für','hat','hattest','hatte','hatten','hier','hinter','ich','ihr','ihre','im','in','ist','ja','jede','jedem','jeden','jeder','jedes','jetzt','kann','kannst','kein','keine','keinem','keinen','keiner','keines','mit','muss','nach','nicht','noch','nun','oder','seid','sein','seine','sich','sie','sind','so','solche','solchem','solchen','solcher','solches','soll','sollen','sollte','sondern','sonst','über','um','und','uns','unser','unsere','unter','vom','von','vor','war','waren','warst','was','weg','weil','weiter','welche','welchem','welchen','welcher','welches','wenn','werde','werden','wie','wieder','will','wir','wird','wirst','wo','wollen','wollte','würde','würden','zu','zum','zur','zurück'
])

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
// NOTE: Canonical spell data now lives in ./spells.js.
//       These re-exports keep existing consumer imports working.

export {
  SPELL_LIST,
  CASTER_PROGRESSION,
  SPELL_SLOTS,
  getClassSpells,
  getSpellSlots,
  getCantripsKnownCount,
  getSpellsKnownCount,
  getMaxSpellLevel,
} from './spells'


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
} from './rules'

const SPELLCASTING_CLASSES = new Set(
  Object.entries(CLASS_CONFIG)
    .filter(([, config]) => Boolean(config.spellcastingAbility))
    .map(([className]) => className)
)

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function truncateText(text = '', maxLength = 220) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

function firstSentences(text = '', maxLength = 220) {
  const sentences = String(text || '').match(/[^.!?]+[.!?]?/g) || [String(text || '')]
  let out = ''
  for (const sentence of sentences) {
    if ((out + ' ' + sentence).trim().length > maxLength) break
    out = `${out} ${sentence}`.trim()
  }
  return truncateText(out || text, maxLength)
}

function sanitizeParagraphs(text = '') {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function tokenizeText(text = '', minLength = 3) {
  return [...new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-zäöüß0-9\s-]/gi, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= minLength)
      .filter(token => !GERMAN_STOPWORDS.has(token))
  )]
}

function extractKeywords(text = '', limit = 10) {
  const freq = new Map()
  tokenizeText(text, 4).forEach(token => {
    freq.set(token, (freq.get(token) || 0) + 1)
  })

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([token]) => token)
}

function looksLikeHeading(paragraph = '') {
  const text = paragraph.trim()
  if (!text) return false
  if (text.length > 90) return false
  if (/^(kapitel|szene|teil|abschnitt|akt|prolog|epilog|einleitung|startszene|finale|schluss)\b/i.test(text)) return true
  if (/^[IVXLC0-9]+[.)\-: ]/.test(text)) return true
  if (!/[.!?]/.test(text) && text.split(/\s+/).length <= 10) return true
  return false
}

function buildChunkTextFromParagraphs(paragraphs = []) {
  return paragraphs.join('\n\n').trim()
}

function makeChunkBase(index, sectionId, sectionTitle, text) {
  const lower = text.toLowerCase()
  return {
    index,
    sectionId,
    sectionTitle,
    text,
    lower,
    keywords: extractKeywords(`${sectionTitle} ${text}`, 8),
  }
}

function buildAdventureStructure(text = '', title = 'Abenteuer') {
  const normalized = sanitizeParagraphs(text)
  if (!normalized) {
    return {
      version: ADVENTURE_STRUCTURE_VERSION,
      sections: [],
      chunks: [],
    }
  }

  const rawParagraphs = normalized
    .split(/\n\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

  const sections = []
  let pendingTitle = title
  let currentParagraphs = []
  let fallbackCounter = 1

  const pushSection = () => {
    if (!currentParagraphs.length) return
    sections.push({
      title: pendingTitle || `Abschnitt ${fallbackCounter}`,
      paragraphs: [...currentParagraphs],
    })
    currentParagraphs = []
    pendingTitle = ''
    fallbackCounter += 1
  }

  for (const paragraph of rawParagraphs) {
    if (looksLikeHeading(paragraph)) {
      pushSection()
      pendingTitle = paragraph
      continue
    }
    currentParagraphs.push(paragraph)
  }
  pushSection()

  if (sections.length === 0) {
    sections.push({ title, paragraphs: rawParagraphs })
  }

  const chunks = []
  const structuredSections = []

  sections.forEach((section, sectionIndex) => {
    const sectionId = `${slugify(section.title || `abschnitt-${sectionIndex + 1}`)}-${sectionIndex + 1}`
    const sectionParagraphs = section.paragraphs
    const sectionChunkIndexes = []
    let buffer = []
    let currentLength = 0

    const flushChunk = () => {
      if (!buffer.length) return
      const chunkText = buildChunkTextFromParagraphs(buffer)
      const chunkIndex = chunks.length
      chunks.push(makeChunkBase(chunkIndex, sectionId, section.title, chunkText))
      sectionChunkIndexes.push(chunkIndex)
      buffer = []
      currentLength = 0
    }

    for (const paragraph of sectionParagraphs) {
      const nextLength = currentLength + paragraph.length + (buffer.length ? 2 : 0)
      if (buffer.length && nextLength > 850) {
        flushChunk()
      }
      buffer.push(paragraph)
      currentLength += paragraph.length + (buffer.length > 1 ? 2 : 0)
    }
    flushChunk()

    const sectionText = sectionChunkIndexes.map(index => chunks[index]?.text || '').join('\n\n').trim()
    const summary = firstSentences(sectionText, 220)

    structuredSections.push({
      id: sectionId,
      index: sectionIndex,
      title: section.title || `Abschnitt ${sectionIndex + 1}`,
      chunkIndexes: sectionChunkIndexes,
      summary,
      keywords: extractKeywords(`${section.title} ${sectionText}`, 10),
      searchText: `${section.title} ${sectionText}`.toLowerCase(),
    })
  })

  return {
    version: ADVENTURE_STRUCTURE_VERSION,
    sections: structuredSections,
    chunks,
  }
}

// ─── Structured Adventure Parser ────────────────────────────────────────────

const STRUCTURED_ADVENTURE_VERSION = 3

function isStructuredAdventureText(text = '') {
  return /\bSECTION_ID:\s*\S+/m.test(text)
}

function parseStructuredHeader(headerText = '') {
  const get = key => {
    const m = new RegExp(`^${key}:\\s*(.+)`, 'mi').exec(headerText)
    return m ? m[1].trim() : ''
  }
  return {
    moduleId: get('MODULE_ID'),
    moduleVersion: get('MODULE_VERSION'),
    system: get('SYSTEM'),
    startSectionId: get('START_SECTION_ID'),
    startLocation: get('START_LOCATION'),
    primaryObjective: get('PRIMARY_OBJECTIVE'),
    secondaryObjective: get('SECONDARY_OBJECTIVE'),
    tone: get('TONE'),
  }
}

function parseStructuredList(lines, startIdx) {
  const items = []
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (/^- /.test(line)) {
      items.push(line.replace(/^- /, '').trim())
    } else if (/^\S/.test(line) && !/^##/.test(line)) {
      break // next key-value field
    }
  }
  return items
}

function parseStructuredSection(block, index) {
  const lines = block.split('\n')

  // Title from ## SECTION header
  const titleLine = lines.find(l => /^## SECTION/.test(l)) || ''
  const titleMatch = titleLine.match(/^## SECTION\s+\d+:\s*(.+)/)
  const title = titleMatch ? titleMatch[1].trim() : `Abschnitt ${index + 1}`

  // Key-value extraction
  const get = key => {
    const idx = lines.findIndex(l => new RegExp(`^${key}:\\s*`, 'i').test(l))
    if (idx < 0) return ''
    return lines[idx].replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim()
  }

  // List extraction: find key line, collect subsequent `- ` lines
  const getList = key => {
    const idx = lines.findIndex(l => new RegExp(`^${key}:`, 'i').test(l))
    if (idx < 0) return []
    // Check if value is inline (e.g. "ENEMIES: none")
    const inline = lines[idx].replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim()
    if (inline && inline.toLowerCase() !== 'none') return [inline]
    return parseStructuredList(lines, idx + 1)
  }

  // Parse EXITS: "Label -> target_id"
  const rawExits = getList('EXITS')
  const exits = rawExits.map(e => {
    const m = e.match(/^(.+?)\s*->\s*(\S+)/)
    return m ? { label: m[1].trim(), targetId: m[2].trim() } : { label: e, targetId: '' }
  })

  // SCENE_TEXT: everything after SCENE_TEXT: until end of block
  const sceneIdx = lines.findIndex(l => /^SCENE_TEXT:/i.test(l))
  let sceneText = ''
  if (sceneIdx >= 0) {
    const firstLine = lines[sceneIdx].replace(/^SCENE_TEXT:\s*/i, '').trim()
    const rest = lines.slice(sceneIdx + 1).join('\n').replace(/---\s*$/, '').trim()
    sceneText = firstLine ? `${firstLine}\n${rest}`.trim() : rest
  }

  const id = get('SECTION_ID')
  const location = get('LOCATION')
  const allText = `${title} ${location} ${sceneText} ${getList('VISIBLE_FEATURES').join(' ')} ${getList('NPCS').join(' ')} ${getList('DISCOVERABLE_CLUES').join(' ')}`

  return {
    id,
    index,
    title,
    location,
    type: get('SECTION_TYPE'),
    objective: get('CURRENT_OBJECTIVE'),
    requiresFlags: getList('REQUIRES_FLAGS'),
    blocksIfFlags: getList('BLOCKS_IF_FLAGS'),
    setsOnEntry: getList('SETS_FLAGS_ON_ENTRY'),
    canSetFlags: getList('CAN_SET_FLAGS'),
    visibleFeatures: getList('VISIBLE_FEATURES'),
    interactiveObjects: getList('INTERACTIVE_OBJECTS'),
    npcs: getList('NPCS'),
    enemies: getList('ENEMIES'),
    exits,
    transitionRules: getList('TRANSITION_RULES'),
    openThreads: getList('OPEN_THREADS'),
    clues: getList('DISCOVERABLE_CLUES'),
    suggestedActions: getList('SUGGESTED_ACTIONS'),
    sceneText,
    // Compatibility fields for existing scene state logic
    summary: firstSentences(sceneText, 220),
    keywords: extractKeywords(allText, 10),
    searchText: allText.toLowerCase(),
    chunkIndexes: [index], // 1 chunk per section for compatibility
  }
}

function parseGlobalRules(headerText = '') {
  const rulesStart = headerText.indexOf('## GLOBAL_RUNTIME_RULES')
  if (rulesStart < 0) return []
  const rulesBlock = headerText.slice(rulesStart)
  const nextSection = rulesBlock.indexOf('\n## ', 1)
  const rulesText = nextSection > 0 ? rulesBlock.slice(0, nextSection) : rulesBlock
  return rulesText.split('\n')
    .filter(l => /^\d+\.\s+/.test(l))
    .map(l => l.replace(/^\d+\.\s+/, '').trim())
}

function parseGlobalPlotFlags(headerText = '') {
  const flagsStart = headerText.indexOf('## GLOBAL_PLOT_FLAGS')
  if (flagsStart < 0) return []
  const flagsBlock = headerText.slice(flagsStart)
  const nextSection = flagsBlock.indexOf('\n## ', 1)
  const flagsText = nextSection > 0 ? flagsBlock.slice(0, nextSection) : flagsBlock
  return flagsText.split('\n')
    .filter(l => /^- /.test(l))
    .map(l => l.replace(/^- /, '').trim())
}

function parseStructuredAdventure(text = '', title = 'Abenteuer') {
  // Split into header (before first ## SECTION) and section blocks
  const sectionSplitRegex = /(?=^## SECTION\b)/gm
  const parts = text.split(sectionSplitRegex)

  const headerText = parts[0] || ''
  const sectionBlocks = parts.slice(1)

  const module = {
    ...parseStructuredHeader(headerText),
    globalRules: parseGlobalRules(headerText),
    plotFlags: parseGlobalPlotFlags(headerText),
  }

  const sections = sectionBlocks.map((block, i) => parseStructuredSection(block, i))

  // Generate compatibility chunks from sceneText
  const chunks = sections.map((section, i) => makeChunkBase(
    i,
    section.id,
    section.title,
    section.sceneText || section.summary,
  ))

  return {
    version: STRUCTURED_ADVENTURE_VERSION,
    format: 'structured',
    module,
    sections,
    chunks,
  }
}

function buildAdventureRecord(entry) {
  if (!entry) return null

  const text = String(entry.text || '').trim()

  let structure
  if (isStructuredAdventureText(text)) {
    // Structured adventure format (version 3)
    structure = entry.structure?.version === STRUCTURED_ADVENTURE_VERSION && entry.structure?.format === 'structured'
      ? entry.structure
      : parseStructuredAdventure(text, entry.title)
  } else {
    // Legacy prose format (version 2)
    structure = entry.structure?.version === ADVENTURE_STRUCTURE_VERSION
      ? entry.structure
      : buildAdventureStructure(text, entry.title)
  }

  return {
    ...entry,
    text,
    pages: entry.pages || (entry.filename?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'TXT'),
    charCount: entry.charCount || text.length,
    structure,
  }
}

function scoreChunkAgainstTokens(chunk, tokens = []) {
  let score = 0
  for (const token of tokens) {
    if (chunk.lower.includes(token)) score += token.length >= 8 ? 3 : 2
    if (chunk.keywords.includes(token)) score += 2
  }
  return score
}

function scoreSectionAgainstTokens(section, tokens = []) {
  let score = 0
  for (const token of tokens) {
    if (section.searchText.includes(token)) score += token.length >= 8 ? 3 : 2
    if (section.keywords.includes(token)) score += 3
  }
  return score
}

function deriveObjectiveFromUserText(userText = '', previousObjective = '') {
  const trimmed = truncateText(userText, 140)
  if (!trimmed) return previousObjective || 'Die Umgebung erkunden und auf neue Informationen reagieren.'

  const generic = ['ok', 'weiter', 'los', 'ja', 'nein', 'hm', 'hmm']
  if (generic.includes(trimmed.toLowerCase())) return previousObjective || 'Die aktuelle Szene weiterverfolgen.'

  return trimmed
}

function mergeNotableElements(section = null, recentText = '') {
  const sectionKeywords = section?.keywords || []
  const recentKeywords = extractKeywords(recentText, 6)
  return [...new Set([...sectionKeywords, ...recentKeywords])].slice(0, 6)
}

export function findSectionById(structure, sectionId) {
  return structure?.sections?.find(section => section.id === sectionId) || null
}

function computeSectionTransitionWeight(section, previousSection, latestUser = '') {
  if (!section || !previousSection) return 0
  if (section.id === previousSection.id) return 8
  if (Math.abs(section.index - previousSection.index) === 1) return 3

  const text = latestUser.toLowerCase()
  if (text.includes('zurück') || text.includes('wieder')) {
    return section.index < previousSection.index ? 3 : 0
  }
  if (text.includes('weiter') || text.includes('tiefer') || text.includes('nächste') || text.includes('hinein')) {
    return section.index > previousSection.index ? 3 : 0
  }
  return 0
}

function selectRelevantChunks(structure, section, tokens = [], maxChunks = 3) {
  if (!structure || !section) return []

  const chunkCandidates = (section.chunkIndexes || [])
    .map(index => structure.chunks[index])
    .filter(Boolean)
    .map(chunk => ({
      ...chunk,
      score: scoreChunkAgainstTokens(chunk, tokens) + (chunk.index === section.chunkIndexes[0] ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  const picked = []
  const pickedIndexes = new Set()

  if (section.chunkIndexes[0] !== undefined) {
    const firstChunk = structure.chunks[section.chunkIndexes[0]]
    if (firstChunk) {
      picked.push(firstChunk)
      pickedIndexes.add(firstChunk.index)
    }
  }

  for (const chunk of chunkCandidates) {
    if (picked.length >= maxChunks) break
    if (pickedIndexes.has(chunk.index)) continue
    picked.push(chunk)
    pickedIndexes.add(chunk.index)
  }

  return picked.sort((a, b) => a.index - b.index)
}

function normalizeShortList(items = [], limit = 4) {
  const seen = new Set()
  const out = []

  for (const item of items) {
    const normalized = truncateText(String(item || '').replace(/^[-•]\s*/, '').trim(), 120)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
    if (out.length >= limit) break
  }

  return out
}

function splitSentences(text = '') {
  return (String(text || '').match(/[^.!?\n]+[.!?]?/g) || [String(text || '')])
    .map(sentence => sentence.trim())
    .filter(Boolean)
}

function extractCluesFromMessages(messages = []) {
  const clueHints = ['hinweis', 'spur', 'schlüssel', 'karte', 'brief', 'zeichen', 'symbol', 'notiz', 'gerücht', 'amulett', 'ritual', 'name', 'blut', 'abdruck', 'siegel']
  const text = messages.map(message => message.content).join(' ')
  const clues = []

  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase()
    if (clueHints.some(hint => lower.includes(hint))) clues.push(sentence)
  }

  return normalizeShortList(clues, 4)
}

function extractOpenThreads(messages = [], previousObjective = '', section = null) {
  const threadHints = ['muss', 'soll', 'will', 'ziel', 'suche', 'finden', 'öffnen', 'retten', 'bergen', 'untersuchen', 'folgen', 'verfolgen', 'erreichen', 'sprechen']
  const userMessages = messages.filter(message => message.role === 'user').slice(-4)
  const threads = []

  for (const message of userMessages) {
    const content = String(message.content || '').trim()
    const lower = content.toLowerCase()
    if (threadHints.some(hint => lower.includes(hint)) || content.length > 40) {
      threads.push(content)
    }
  }

  if (previousObjective) threads.unshift(previousObjective)
  if (section?.title) threads.unshift(`Aktuell relevant: ${section.title}`)

  return normalizeShortList(threads, 4)
}

function extractDiscoveredNpcs(messages = [], sectionNpcs = []) {
  if (!sectionNpcs.length) return []
  const text = messages.map(m => m.content).join(' ').toLowerCase()
  return sectionNpcs.filter(npc => text.toLowerCase().includes(npc.toLowerCase()))
}

// ── NPC Disposition / Suspicion Heuristics ──────────────────────────────────

const DISPOSITION_POSITIVE = /\b(lächelt|freundlich|vertraut|nickt.*zustimmend|hilfsbereit|dankbar|umarmt|lacht|willkommen|herzlich|begeistert|freut sich|segnet|belohnt|offenbart|anvertraut)\b/i
const DISPOSITION_NEGATIVE = /\b(wütend|verärgert|misstrauisch|abweisend|feindlich|droht|knurrt|verflucht|angreift|zornig|verweigert|wendet.*ab|verschränkt.*Arme|spuckt|beleidigt)\b/i
const SUSPICION_INCREASE = /\b(lüg|täusch|verdächtig|misstrauen|betrüg|hintergeh|stehlen|einbrech|gift|verrät|falsch|schwindel|durchschaut|ertappt|belausch)\b/i
const SUSPICION_DECREASE = /\b(vertrau|überzeugt|glaubt|beruhigt|besänftigt|ehrlich|aufrichtig|beweist|wahrheit|offen.*gesprochen|gestanden)\b/i

function inferDispositionShift(assistantText = '') {
  const lower = assistantText.toLowerCase()
  const pos = (lower.match(DISPOSITION_POSITIVE) || []).length
  const neg = (lower.match(DISPOSITION_NEGATIVE) || []).length
  if (pos > neg) return 1
  if (neg > pos) return -1
  return 0
}

function inferSuspicionShift(assistantText = '', userText = '') {
  const combined = `${assistantText} ${userText}`.toLowerCase()
  const up = (combined.match(SUSPICION_INCREASE) || []).length
  const down = (combined.match(SUSPICION_DECREASE) || []).length
  if (up > down) return 1
  if (down > up) return -1
  return 0
}

const DISPOSITION_SCALE = ['feindlich', 'misstrauisch', 'neutral', 'freundlich', 'verbündet']

function applyDispositionShift(current = 'neutral', shift = 0) {
  if (shift === 0) return current
  const idx = DISPOSITION_SCALE.indexOf(current)
  const currentIdx = idx >= 0 ? idx : 2 // default to neutral
  const newIdx = Math.max(0, Math.min(DISPOSITION_SCALE.length - 1, currentIdx + shift))
  return DISPOSITION_SCALE[newIdx]
}

// ── Object & NPC State extraction ────────────────────────────────────────────

const NPC_DEAD_PATTERN = /\b(stirbt|tot|getötet|besiegt|fällt.*leblos|niedergestreckt|erschlagen|vernichtet)\b/i
const NPC_FLED_PATTERN = /\b(flieht|flüchtet|rennt.*davon|verschwindet|entkommt|zieht.*zurück)\b/i
const OBJ_OPEN_PATTERN = /\b(öffnet|geöffnet|aufgeschlossen|entriegelt|aufgebrochen|aufgestoßen)\b/i
const OBJ_CLOSED_PATTERN = /\b(schließt|verschlossen|verriegelt|versperrt|zugeschlagen)\b/i
const OBJ_DESTROYED_PATTERN = /\b(zerstört|zerbrochen|zertrümmert|eingestürzt|vernichtet|zerplatzt|zerfallen)\b/i

function extractNpcStateChanges(assistantText = '', knownNpcs = []) {
  const changes = {}
  if (!knownNpcs.length || !assistantText) return changes
  const lower = assistantText.toLowerCase()

  for (const npc of knownNpcs) {
    const npcLower = npc.toLowerCase()
    // Check nearby context: find sentences mentioning this NPC
    for (const sentence of splitSentences(assistantText)) {
      if (!sentence.toLowerCase().includes(npcLower)) continue
      if (NPC_DEAD_PATTERN.test(sentence)) changes[npc] = 'dead'
      else if (NPC_FLED_PATTERN.test(sentence)) changes[npc] = 'fled'
    }
  }
  return changes
}

function extractObjectStateChanges(assistantText = '', section = null) {
  const changes = {}
  const objects = section?.interactiveObjects || []
  if (!objects.length || !assistantText) return changes

  for (const obj of objects) {
    const objLower = obj.toLowerCase()
    for (const sentence of splitSentences(assistantText)) {
      if (!sentence.toLowerCase().includes(objLower)) continue
      if (OBJ_DESTROYED_PATTERN.test(sentence)) changes[obj] = 'destroyed'
      else if (OBJ_OPEN_PATTERN.test(sentence)) changes[obj] = 'open'
      else if (OBJ_CLOSED_PATTERN.test(sentence)) changes[obj] = 'closed'
    }
  }
  return changes
}

// Detect active NPC from recent messages (NPC the player is talking to)
function detectActiveNpc(messages = [], knownNpcs = []) {
  if (!knownNpcs.length) return null
  const recent = messages.slice(-4)
  const text = recent.map(m => m.content).join(' ').toLowerCase()
  // NPC mentioned most often in recent context is likely active
  let best = null
  let bestCount = 0
  for (const npc of knownNpcs) {
    const re = new RegExp(npc.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    const count = (text.match(re) || []).length
    if (count > bestCount) { bestCount = count; best = npc }
  }
  return bestCount >= 2 ? best : null
}

// Build compact memory summary from key state
function buildMemorySummary(previous, currentSection, latestOutcome, objective, isTransition = false) {
  const MAX_LEN = 400
  const prev = previous.memorySummary || ''

  // On scene transitions: insert a landmark marker to preserve key story beats
  const landmark = isTransition && currentSection?.title
    ? `[→ ${currentSection.title}]`
    : ''

  // Extract the most meaningful sentence from the latest outcome (not just first N chars)
  let condensedOutcome = ''
  if (latestOutcome) {
    const sentences = splitSentences(latestOutcome)
    // Prefer sentences with action/discovery keywords over pure description
    const meaningful = sentences.find(s =>
      /\b(entdeck|erfahr|erhalt|besieg|öffn|find|flieht|stirbt|warnt|verrät|überzeug|scheitert|gelingt)\b/i.test(s)
    )
    condensedOutcome = meaningful || sentences[0] || ''
    if (condensedOutcome.length > 160) condensedOutcome = condensedOutcome.slice(0, 157) + '...'
  }

  // Build new summary: landmarks + condensed outcomes
  const newPart = [landmark, condensedOutcome].filter(Boolean).join(' ')
  if (!newPart && !prev) return ''
  if (!newPart) return prev.length <= MAX_LEN ? prev : prev.slice(prev.length - MAX_LEN).replace(/^\S*\s/, '')

  const combined = prev ? `${prev} ${newPart}` : newPart
  if (combined.length <= MAX_LEN) return combined

  // When truncating, try to preserve landmark markers [→ ...] as story structure
  const landmarks = []
  const landmarkRe = /\[→ [^\]]+\]/g
  let lm
  while ((lm = landmarkRe.exec(combined)) !== null) landmarks.push(lm[0])

  // Keep last 2 landmarks + recent text
  const recentLandmarks = landmarks.slice(-2).join(' ')
  const recentText = combined.slice(combined.length - (MAX_LEN - recentLandmarks.length - 1)).replace(/^\S*\s/, '')
  const result = recentLandmarks ? `${recentLandmarks} ${recentText}` : recentText
  return result.slice(0, MAX_LEN)
}

function detectTransitionReason(previousSection, currentSection, latestUser = '', latestAssistant = '') {
  if (!previousSection || !currentSection) return ''
  if (previousSection.id === currentSection.id) return 'Abschnitt bleibt stabil.'

  const user = latestUser.toLowerCase()
  const assistant = latestAssistant.toLowerCase()

  if (user.includes('gehe') || user.includes('betrete') || user.includes('öffne') || user.includes('folge') || user.includes('verlasse')) {
    return 'Szenenwechsel durch bewusste Orts- oder Richtungsaktion des Spielers.'
  }

  if (assistant.includes(currentSection.title.toLowerCase())) {
    return 'Spielleitertext verweist klar auf einen neuen Abenteuerabschnitt.'
  }

  return 'Szenenwechsel durch stärkere Kontexttreffer im aktuellen Abenteuerabschnitt.'
}

export function createInitialSceneState(adventure) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure

  // For structured adventures, use startSectionId from module header
  let startSection = null
  if (structure?.format === 'structured' && structure.module?.startSectionId) {
    startSection = findSectionById(structure, structure.module.startSectionId)
  }
  const firstSection = startSection || structure?.sections?.[0] || null

  const firstChunks = firstSection
    ? selectRelevantChunks(structure, firstSection, [], 2).map(chunk => chunk.index)
    : []

  // Structured adventures provide richer initial data
  const isStructured = structure?.format === 'structured'

  // Build initial plotFlags from setsOnEntry of the start section
  const initialFlags = {}
  if (isStructured && firstSection?.setsOnEntry?.length) {
    for (const flag of firstSection.setsOnEntry) initialFlags[flag] = true
  }

  return {
    version: SCENE_STATE_VERSION,
    turnCount: 0,

    // ── GM State (engine truth) ──
    gmState: {
      currentSectionId: firstSection?.id || null,
      plotFlags: initialFlags,
      objectStates: {},
      npcStates: {},
      triggeredEvents: [],
      sectionVisitCounts: firstSection ? { [firstSection.id]: 1 } : {},
    },

    // ── Player Knowledge (what the player knows) ──
    playerKnowledge: {
      knownNpcs: [],
      knownPlaces: firstSection ? [firstSection.title] : [],
      discoveredClues: [],
      knownFactions: [],
      knownFacts: [],
    },

    // ── Dialogue State (NPC interaction tracking) ──
    dialogueState: {
      activeNpcId: null,
      npcRelations: {},
    },

    // ── Memory Summary (compact session history) ──
    memorySummary: '',

    // ── Inferred (AI-derived soft hints, scene-scoped, initially empty) ──
    inferred: { source: 'ai_inferred', npcStates: {}, objectStates: {}, dialogueHints: {} },

    // ── Scene State (current narrative frame) ──
    currentSectionTitle: firstSection?.title || normalizedAdventure?.title || 'Abenteuerstart',
    currentLocation: (isStructured ? firstSection?.location : firstSection?.title) || normalizedAdventure?.title || 'Unbekannter Ort',
    relevantChunkIndexes: firstChunks,
    visitedSectionIds: firstSection ? [firstSection.id] : [],
    currentObjective: (isStructured ? firstSection?.objective : null) || 'Die erste Szene betreten und Informationen sammeln.',
    activeQuest: (isStructured ? structure.module?.primaryObjective : null) || firstSection?.summary || 'Das Abenteuer beginnen und die Lage erfassen.',
    lastPlayerAction: '',
    recentActions: [],
    lastOutcome: '',
    summary: firstSection?.summary || 'Das Abenteuer beginnt und die erste Szene wird aufgebaut.',
    openThreads: (isStructured ? firstSection?.openThreads?.slice(0, 4) : null) || (firstSection?.title ? [`Den Abschnitt „${firstSection.title}” erkunden.`] : []),
    notableElements: firstSection?.keywords?.slice(0, 6) || [],
    recentSceneChanges: [],
    stableSectionTurns: 1,
    lastTransitionReason: 'Start des Abenteuers.',
    lastUpdatedAt: new Date().toISOString(),
  }
}

// ── Recent Actions tracker (engine truth — player actually did these) ──────
// Tracks last 3 player actions for choice deduplication. Resets on section transition.
function buildRecentActions(previous = [], latestAction = '', isTransition = false) {
  if (isTransition) return latestAction?.length >= 3 ? [latestAction] : []
  if (!latestAction || latestAction.length < 3) return (previous || []).slice(0, 3)
  return [latestAction, ...(previous || [])].slice(0, 3)
}

// ── Phase 2.5b: Inferred hints builder (tightened) ────────────────────────
// Short-lived, scene-scoped soft hints from AI narrative. NOT authoritative.
// - No facts/factions (too close to pseudo-truth, removed in 2.5b)
// - NPC/object hints scoped to current section, reset on transition
// - Dialogue hints kept only for active NPC
function buildInferredHints(previous, latestAssistant, latestUser, currentSection, knownNpcs, activeNpc, isTransition) {
  const prevInferred = previous.inferred || {}

  // NPC state hints: scoped to current section's NPCs, reset on transition
  const sectionNpcs = new Set((currentSection.npcs || []).map(n => n.toLowerCase()))
  const prevNpcHints = isTransition ? {} : { ...(prevInferred.npcStates || {}) }
  const freshNpcChanges = extractNpcStateChanges(latestAssistant, knownNpcs)
  const npcStates = {}
  for (const [npc, state] of Object.entries({ ...prevNpcHints, ...freshNpcChanges })) {
    if (sectionNpcs.has(npc.toLowerCase())) npcStates[npc] = state
  }

  // Object state hints: scoped to current section's objects, reset on transition
  const sectionObjects = new Set((currentSection.interactiveObjects || []).map(o => o.toLowerCase()))
  const prevObjHints = isTransition ? {} : { ...(prevInferred.objectStates || {}) }
  const freshObjChanges = extractObjectStateChanges(latestAssistant, currentSection)
  const objectStates = {}
  for (const [obj, state] of Object.entries({ ...prevObjHints, ...freshObjChanges })) {
    if (sectionObjects.has(obj.toLowerCase())) objectStates[obj] = state
  }

  // Dialogue hints: only for active NPC, all others dropped
  const dialogueHints = {}
  if (activeNpc) {
    const prevHint = (!isTransition && prevInferred.dialogueHints?.[activeNpc]) || { dispositionTrend: 0, suspicionTrend: 0 }
    dialogueHints[activeNpc] = {
      dispositionTrend: Math.max(-3, Math.min(3, prevHint.dispositionTrend + inferDispositionShift(latestAssistant))),
      suspicionTrend: Math.max(-3, Math.min(3, prevHint.suspicionTrend + inferSuspicionShift(latestAssistant, latestUser))),
    }
  }

  return { source: 'ai_inferred', npcStates, objectStates, dialogueHints }
}

export function deriveSceneState({ adventure, previousSceneState = null, messages = [], combat = null, fallbackUserText = '' } = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
  if (!structure?.sections?.length) {
    return createInitialSceneState(normalizedAdventure)
  }

  // Migrate v2 → v3: keep existing flat fields, add empty sub-objects
  let previous
  if (previousSceneState?.version === SCENE_STATE_VERSION) {
    previous = previousSceneState
  } else if (previousSceneState?.version === 2) {
    previous = {
      ...previousSceneState,
      version: SCENE_STATE_VERSION,
      gmState: {
        currentSectionId: previousSceneState.currentSectionId,
        plotFlags: {},
        objectStates: {},
        npcStates: {},
        triggeredEvents: [],
        sectionVisitCounts: Object.fromEntries((previousSceneState.visitedSectionIds || []).map(id => [id, 1])),
      },
      playerKnowledge: {
        knownNpcs: previousSceneState.knownNpcs || [],
        knownPlaces: [],
        discoveredClues: previousSceneState.discoveredClues || [],
        knownFactions: [],
        knownFacts: [],
      },
      dialogueState: { activeNpcId: null, npcRelations: {} },
      memorySummary: previousSceneState.summary || '',
    }
  } else {
    previous = createInitialSceneState(normalizedAdventure)
  }

  const recentMessages = messages.slice(-8)
  const latestUser = [...recentMessages].reverse().find(message => message.role === 'user')?.content || fallbackUserText || ''
  const latestAssistant = [...recentMessages].reverse().find(message => message.role === 'assistant')?.content || ''
  const combinedRecentText = recentMessages.map(message => message.content).join(' ')
  const searchTokens = tokenizeText(`${combinedRecentText} ${previous.currentSectionTitle || ''} ${previous.currentObjective || ''} ${previous.activeQuest || ''}`, 4)
  const previousSection = findSectionById(structure, previous.gmState?.currentSectionId) || structure.sections[0]

  // Flag-gate check: section accessible only if all requiresFlags are set and no blocksIfFlags are set
  const currentFlags = previous.gmState?.plotFlags || {}
  const isSectionAccessible = (section) => {
    if (section.requiresFlags?.length) {
      if (!section.requiresFlags.every(f => currentFlags[f])) return false
    }
    if (section.blocksIfFlags?.length) {
      if (section.blocksIfFlags.some(f => currentFlags[f])) return false
    }
    return true
  }

  const scoredSections = structure.sections.map(section => {
    // Flag-gated sections are unreachable (unless it's the current section)
    if (section.id !== previousSection?.id && !isSectionAccessible(section)) {
      return { section, score: -Infinity }
    }
    let score = scoreSectionAgainstTokens(section, searchTokens)
    score += computeSectionTransitionWeight(section, previousSection, latestUser)
    if (combat?.active && /(kampf|gegner|initiative|angriff|schaden|boss)/i.test(section.searchText)) score += 3
    if (latestAssistant && section.title && latestAssistant.toLowerCase().includes(section.title.toLowerCase())) score += 6
    if (!latestUser && section.index === 0) score += 4
    if (section.id === previousSection?.id) score += 4
    return { section, score }
  }).sort((a, b) => b.score - a.score || a.section.index - b.section.index)

  const bestEntry = scoredSections[0]
  const bestSection = bestEntry?.section || previousSection || structure.sections[0]
  const bestScore = bestEntry?.score ?? 0
  const previousScore = (scoredSections.find(entry => entry.section.id === previousSection?.id)?.score) ?? 0
  const explicitMove = /\b(gehe|betrete|betritt|verlasse|folge|öffne|steige|klettere|reise|laufe|renne|krieche)\b/i.test(latestUser)
  const assistantAnchorsNewSection = Boolean(bestSection?.title && latestAssistant.toLowerCase().includes(bestSection.title.toLowerCase()) && bestSection.id !== previousSection?.id)

  // Structured adventures: match player/AI text against EXIT labels for direct transitions
  let exitTargetSection = null
  if (structure.format === 'structured' && previousSection?.exits?.length) {
    const combined = `${latestUser} ${latestAssistant}`.toLowerCase()
    for (const exit of previousSection.exits) {
      if (!exit.targetId || exit.targetId === previousSection.id) continue
      const labelWords = exit.label.toLowerCase().split(/\s+/).filter(w => w.length >= 4)
      const matchCount = labelWords.filter(w => combined.includes(w)).length
      if (matchCount >= Math.max(1, Math.ceil(labelWords.length * 0.5))) {
        const candidate = findSectionById(structure, exit.targetId)
        // Only allow transition if target section's flag-gates are satisfied
        if (candidate && isSectionAccessible(candidate)) {
          exitTargetSection = candidate
          break
        }
      }
    }
  }

  const shouldTransition = exitTargetSection
    ? true
    : (bestSection.id !== previousSection?.id && (explicitMove || assistantAnchorsNewSection || bestScore >= previousScore + 4))

  const currentSection = exitTargetSection || (shouldTransition ? bestSection : (previousSection || bestSection))
  const relevantChunks = selectRelevantChunks(structure, currentSection, searchTokens, combat?.active ? 3 : 2)
  const visited = new Set(previous.visitedSectionIds || [])
  visited.add(currentSection.id)

  const summaryBase = currentSection.summary || 'Die aktuelle Szene entwickelt sich weiter.'
  const latestOutcome = latestAssistant ? firstSentences(latestAssistant, 220) : previous.lastOutcome || ''
  const summary = latestOutcome
    ? `${summaryBase} Letzte Entwicklung: ${latestOutcome}`
    : summaryBase

  // Structured adventures: use section's objective on transition, otherwise derive from user text
  const isStructured = structure.format === 'structured'
  const objective = (isStructured && shouldTransition && currentSection.objective)
    ? currentSection.objective
    : deriveObjectiveFromUserText(latestUser, isStructured ? (currentSection.objective || previous.currentObjective) : previous.currentObjective)
  const transitionReason = shouldTransition
    ? detectTransitionReason(previousSection, currentSection, latestUser, latestAssistant)
    : (previous.lastTransitionReason || 'Abschnitt bleibt stabil.')

  const recentSceneChanges = normalizeShortList([
    shouldTransition ? `Neuer Abschnitt: ${currentSection.title}` : '',
    latestOutcome,
    transitionReason,
  ], 3)

  // ── Build sub-objects ──

  const prevGm = previous.gmState || {}
  const prevPk = previous.playerKnowledge || {}
  const prevDlg = previous.dialogueState || {}

  // GM State: plotFlags, objectStates, npcStates, events, visit counts
  const newPlotFlags = { ...(prevGm.plotFlags || {}) }
  if (isStructured && shouldTransition && currentSection.setsOnEntry?.length) {
    for (const flag of currentSection.setsOnEntry) newPlotFlags[flag] = true
  }

  // Authoritative NPC/object states: carry forward only, no AI-derived writes (Phase 2.5)
  const newNpcStates = { ...(prevGm.npcStates || {}) }
  const newObjectStates = { ...(prevGm.objectStates || {}) }

  const visitCounts = { ...(prevGm.sectionVisitCounts || {}) }
  visitCounts[currentSection.id] = (visitCounts[currentSection.id] || 0) + (shouldTransition || !previous.turnCount ? 1 : 0)

  const triggeredEvents = [...(prevGm.triggeredEvents || [])]
  if (shouldTransition) {
    triggeredEvents.push(`T${previous.turnCount || 0}: → ${currentSection.title}`)
    if (triggeredEvents.length > 10) triggeredEvents.splice(0, triggeredEvents.length - 10)
  }

  // Player Knowledge: accumulate from messages
  const newKnownNpcs = [...new Set([
    ...(prevPk.knownNpcs || []),
    ...extractDiscoveredNpcs(recentMessages, currentSection.npcs || []),
  ])]
  const newClues = normalizeShortList([
    ...(prevPk.discoveredClues || []),
    ...extractCluesFromMessages(recentMessages),
  ], 8)
  const newKnownPlaces = [...new Set([
    ...(prevPk.knownPlaces || []),
    ...(shouldTransition ? [currentSection.title] : []),
  ])]
  // Authoritative facts/factions: carry forward only, no AI-derived writes (Phase 2.5)
  const newFacts = normalizeShortList([...(prevPk.knownFacts || [])], 8)
  const newFactions = normalizeShortList([...(prevPk.knownFactions || [])], 6)

  // Dialogue State: detect active NPC + update disposition/suspicion
  const activeNpc = detectActiveNpc(recentMessages, newKnownNpcs)
  const npcRelations = { ...(prevDlg.npcRelations || {}) }
  if (activeNpc && !npcRelations[activeNpc]) {
    npcRelations[activeNpc] = { disposition: 'neutral', suspicion: 0, lastTopic: '' }
  }
  // Authoritative dialogue: carry forward, update lastTopic only — no AI-derived disposition/suspicion (Phase 2.5)
  if (activeNpc && npcRelations[activeNpc]) {
    npcRelations[activeNpc] = {
      ...npcRelations[activeNpc],
      lastTopic: truncateText(latestUser, 80),
    }
  }

  // Memory Summary
  const memorySummary = buildMemorySummary(previous, currentSection, latestOutcome, objective, shouldTransition)

  return {
    version: SCENE_STATE_VERSION,
    turnCount: Number(previous.turnCount || 0) + (recentMessages.length ? 1 : 0),

    // ── GM State ──
    gmState: {
      currentSectionId: currentSection.id,
      plotFlags: newPlotFlags,
      objectStates: newObjectStates,
      npcStates: newNpcStates,
      triggeredEvents,
      sectionVisitCounts: visitCounts,
    },

    // ── Player Knowledge ──
    playerKnowledge: {
      knownNpcs: newKnownNpcs,
      knownPlaces: newKnownPlaces,
      discoveredClues: newClues,
      knownFactions: newFactions,
      knownFacts: newFacts,
    },

    // ── Dialogue State ──
    dialogueState: {
      activeNpcId: activeNpc,
      npcRelations,
    },

    // ── Memory Summary ──
    memorySummary,

    // ── Inferred (AI-derived soft hints, scene-scoped, NOT authoritative truth) ──
    inferred: buildInferredHints(previous, latestAssistant, latestUser, currentSection, prevPk.knownNpcs || [], activeNpc, shouldTransition),

    // ── Scene State (current narrative frame) ──
    currentSectionTitle: currentSection.title,
    currentLocation: (isStructured ? currentSection.location : null) || currentSection.title,
    relevantChunkIndexes: relevantChunks.map(chunk => chunk.index),
    visitedSectionIds: [...visited],
    currentObjective: objective,
    activeQuest: truncateText(previous.activeQuest || objective || summaryBase, 160),
    lastPlayerAction: truncateText(latestUser || previous.lastPlayerAction || '', 160),
    recentActions: buildRecentActions(previous.recentActions, latestUser, shouldTransition),
    lastOutcome: latestOutcome,
    summary,
    openThreads: (isStructured && currentSection.openThreads?.length)
      ? normalizeShortList([...(previous.openThreads || []), ...currentSection.openThreads], 4)
      : extractOpenThreads(recentMessages, objective, currentSection),
    notableElements: mergeNotableElements(currentSection, `${latestUser} ${latestAssistant}`),
    recentSceneChanges,
    stableSectionTurns: shouldTransition ? 1 : Number(previous.stableSectionTurns || 0) + 1,
    lastTransitionReason: transitionReason,
    lastUpdatedAt: new Date().toISOString(),
  }
}

// ─── Structured adventure: compact AI context builder ────────────────────────

function buildStructuredAdventureContext(structure, sceneState) {
  const section = findSectionById(structure, sceneState?.gmState?.currentSectionId) || structure.sections[0]
  if (!section) return { text: 'Kein Abenteuerabschnitt verfügbar.', selectedIndexes: [], sectionTitle: '' }

  const lines = []
  lines.push(`## Aktuelle Szene: ${section.title}`)
  if (section.type) lines.push(`TYP: ${section.type}`)
  if (section.objective) lines.push(`ZIEL: ${section.objective}`)

  // Visible elements — ONLY these may be described to the player
  if (section.visibleFeatures?.length) lines.push(`SICHTBAR (nur diese Dinge existieren hier): ${section.visibleFeatures.join(' | ')}`)

  // NPC visibility: split into known (player has encountered) and hidden
  const knownNpcs = sceneState?.playerKnowledge?.knownNpcs || []
  const sectionNpcs = section.npcs || []
  const visibleNpcs = sectionNpcs.filter(npc => knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
  const hiddenNpcs = sectionNpcs.filter(npc => !knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase()))
  if (visibleNpcs.length) lines.push(`ANWESENDE NPCS (nur diese sind hier, keine anderen erfinden): ${visibleNpcs.join(' | ')}`)

  if (section.enemies?.length) lines.push(`GEGNER: ${section.enemies.join(' | ')}`)
  if (section.exits?.length) {
    lines.push(`AUSGÄNGE: ${section.exits.map(e => e.label).join(' | ')}`)
  }
  if (section.interactiveObjects?.length) lines.push(`OBJEKTE: ${section.interactiveObjects.join(' | ')}`)
  if (section.openThreads?.length) lines.push(`FÄDEN: ${section.openThreads.join(' | ')}`)
  if (section.suggestedActions?.length) lines.push(`VORGESCHLAGENE AKTIONEN: ${section.suggestedActions.join(' | ')}`)

  // Internal GM instructions — the AI must follow these but NEVER reveal them directly
  const internal = []
  if (hiddenNpcs.length) internal.push(`NOCH NICHT SICHTBARE NPCS (erst natürlich einführen wenn Spieler sie entdeckt/anspricht/auf sie trifft): ${hiddenNpcs.join(' | ')}`)
  if (section.transitionRules?.length) internal.push(`ÜBERGANGSREGELN: ${section.transitionRules.join(' | ')}`)
  if (section.clues?.length) internal.push(`ENTDECKBARE HINWEISE (NUR enthüllen wenn Spieler aktiv sucht/fragt — NIEMALS vorweg verraten): ${section.clues.join(' | ')}`)
  if (internal.length) {
    lines.push(`\n## Interne Spielleiter-Anweisungen (NICHT dem Spieler mitteilen)`)
    lines.push(...internal)
  }

  // Scene text as prose for atmosphere
  if (section.sceneText) lines.push(`\n${section.sceneText}`)

  // Neighboring exits — title only, no objectives (avoids spoilers)
  const exitSections = section.exits
    ?.map(e => structure.sections.find(s => s.id === e.targetId))
    .filter(Boolean) || []
  if (exitSections.length) {
    lines.push(`\nNÄCHSTE SZENEN: ${exitSections.map(s => s.title).join(' | ')}`)
  }

  return {
    text: lines.join('\n'),
    selectedIndexes: section.chunkIndexes || [section.index],
    sectionTitle: section.title,
    module: structure.module || null,
  }
}

export function buildRelevantAdventureContext({ adventure, sceneState = null, messages = [], combat = null } = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
  if (!structure?.sections?.length) {
    return {
      text: normalizedAdventure?.text ? truncateText(normalizedAdventure.text, 1800) : 'Kein Text verfügbar',
      selectedIndexes: [],
      sectionTitle: normalizedAdventure?.title || 'Abenteuer',
    }
  }

  const effectiveSceneState = sceneState?.version === SCENE_STATE_VERSION
    ? sceneState
    : deriveSceneState({ adventure: normalizedAdventure, previousSceneState: sceneState, messages, combat })

  // ── Structured adventures: compact key-value format ──
  if (structure.format === 'structured') {
    return buildStructuredAdventureContext(structure, effectiveSceneState)
  }

  // ── Prose adventures: existing chunk-based logic ──
  const currentSection = findSectionById(structure, effectiveSceneState.gmState?.currentSectionId) || structure.sections[0]
  const selectedChunks = (effectiveSceneState.relevantChunkIndexes || [])
    .map(index => structure.chunks[index])
    .filter(Boolean)

  const fallbackChunks = selectedChunks.length > 0
    ? selectedChunks
    : selectRelevantChunks(structure, currentSection, tokenizeText(messages.map(message => message.content).join(' '), 4), combat?.active ? 3 : 2)

  const chunkText = fallbackChunks
    .slice(0, combat?.active ? 3 : 2)
    .map(chunk => `### Auszug ${chunk.index + 1}\n${chunk.text}`)
    .join('\n\n')

  const neighborSection = structure.sections[currentSection.index + 1] || structure.sections[currentSection.index - 1] || null
  const neighborHint = neighborSection
    ? `\n\n### Benachbarter Abschnitt\n${neighborSection.title}: ${neighborSection.summary}`
    : ''

  return {
    text: `### Aktueller Abenteuerabschnitt\n${currentSection.title}: ${currentSection.summary}\n\n${chunkText}${neighborHint}`.trim(),
    selectedIndexes: fallbackChunks.map(chunk => chunk.index),
    sectionTitle: currentSection.title,
  }
}

export function normalizeAdventureEntry(entry) {
  return buildAdventureRecord(entry)
}

export function prepareAdventureForStorage(entry) {
  return buildAdventureRecord(entry)
}

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

/**
 * Check whether an inventory array is already structured (objects with type/itemKey).
 */
export function isStructuredInventory(inventory) {
  if (!Array.isArray(inventory) || inventory.length === 0) return true
  return typeof inventory[0] === 'object' && inventory[0] !== null && ('type' in inventory[0] || 'itemKey' in inventory[0])
}

/**
 * Migrate a string[] inventory to StructuredItem[].
 * If already structured, returns as-is.
 * Auto-equips the first weapon, armor, and shield matching class defaults.
 */
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

/**
 * Create a structured starter inventory for a class.
 */
export function migrateStarterInventory(className) {
  const normalizedClass = legacyClassNameToCurrent(className)
  const strings = CLASS_CONFIG[normalizedClass]?.starterInventory || []
  return migrateInventory(strings, normalizedClass)
}

// ─── Equipment-Based AC Calculation ──────────────────────────────────────────

/**
 * Find equipped items by type in a structured inventory.
 */
export function getEquippedItem(inventory, type) {
  if (!Array.isArray(inventory)) return null
  return inventory.find(i => typeof i === 'object' && i.type === type && i.equipped) || null
}

/**
 * Compute armorBonus from structured equipped items (for legacy field compat).
 */
export function deriveArmorBonusFromEquipment(inventory, dexScore = 10, className = '', attributes = {}) {
  const ac = calcArmorClassFromEquipment(inventory, dexScore, className, attributes)
  // armorBonus = ac - (10 + dexMod), clamped ≥ 0
  const dexMod = getAbilityModifier(dexScore)
  return Math.max(0, ac - 10 - dexMod)
}

/**
 * Calculate AC from equipped armor + shield in a structured inventory.
 * Falls back to the legacy formula if inventory is not structured.
 */
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
export { ITEM_CATALOG, EMPTY_CURRENCY, lookupItem, createInventoryItem, generateInventoryId } from './items'
export { CURRENCY_CONFIG, CURRENCY_ORDER, calcCarryingCapacity, calcTotalWeight, calcTotalGoldValue } from './items'
export { getItemsByType, getWeapons, getArmors, getArmorsForClass, canUseShield } from './items'
export { ITEM_TYPES, ARMOR_PROFICIENCY, SHIELD_PROFICIENCY } from './items'

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
