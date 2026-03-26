import { SPELL_LIST, getSpellSlots } from './spells'
import { SRD_RULE_BLOCKS, SRD_CORE_PROMPT_RULES } from './rules'

export const PROJECT_NAME = 'Dungeons & Daggers'
export const SRD_VERSION_LABEL = 'D&D SRD 5.2.1'
const ADVENTURE_STRUCTURE_VERSION = 2
const SCENE_STATE_VERSION = 2

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

function buildAdventureRecord(entry) {
  if (!entry) return null

  const text = String(entry.text || '').trim()
  const structure = entry.structure?.version === ADVENTURE_STRUCTURE_VERSION
    ? entry.structure
    : buildAdventureStructure(text, entry.title)

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

function findSectionById(structure, sectionId) {
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

function extractCluesFromMessages(messages = [], section = null) {
  const clueHints = ['hinweis', 'spur', 'schlüssel', 'karte', 'brief', 'zeichen', 'symbol', 'notiz', 'gerücht', 'amulett', 'ritual', 'name', 'blut', 'abdruck', 'siegel']
  const text = messages.map(message => message.content).join(' ')
  const clues = []

  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase()
    if (clueHints.some(hint => lower.includes(hint))) clues.push(sentence)
  }

  if (section?.summary) clues.push(section.summary)
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
  const firstSection = normalizedAdventure?.structure?.sections?.[0] || null
  const firstChunks = firstSection
    ? selectRelevantChunks(normalizedAdventure.structure, firstSection, [], 2).map(chunk => chunk.index)
    : []

  return {
    version: SCENE_STATE_VERSION,
    turnCount: 0,
    currentSectionId: firstSection?.id || null,
    currentSectionTitle: firstSection?.title || normalizedAdventure?.title || 'Abenteuerstart',
    currentLocation: firstSection?.title || normalizedAdventure?.title || 'Unbekannter Ort',
    relevantChunkIndexes: firstChunks,
    visitedSectionIds: firstSection ? [firstSection.id] : [],
    currentObjective: 'Die erste Szene betreten und Informationen sammeln.',
    activeQuest: firstSection?.summary || 'Das Abenteuer beginnen und die Lage erfassen.',
    lastPlayerAction: '',
    lastOutcome: '',
    summary: firstSection?.summary || 'Das Abenteuer beginnt und die erste Szene wird aufgebaut.',
    discoveredClues: firstSection?.keywords?.slice(0, 3) || [],
    openThreads: firstSection?.title ? [`Den Abschnitt „${firstSection.title}“ erkunden.`] : [],
    notableElements: firstSection?.keywords?.slice(0, 6) || [],
    recentSceneChanges: [],
    stableSectionTurns: 1,
    lastTransitionReason: 'Start des Abenteuers.',
    lastUpdatedAt: new Date().toISOString(),
  }
}

export function deriveSceneState({ adventure, previousSceneState = null, messages = [], combat = null, fallbackUserText = '' } = {}) {
  const normalizedAdventure = normalizeAdventureEntry(adventure)
  const structure = normalizedAdventure?.structure
  if (!structure?.sections?.length) {
    return createInitialSceneState(normalizedAdventure)
  }

  const previous = previousSceneState?.version === SCENE_STATE_VERSION
    ? previousSceneState
    : createInitialSceneState(normalizedAdventure)

  const recentMessages = messages.slice(-8)
  const latestUser = [...recentMessages].reverse().find(message => message.role === 'user')?.content || fallbackUserText || ''
  const latestAssistant = [...recentMessages].reverse().find(message => message.role === 'assistant')?.content || ''
  const combinedRecentText = recentMessages.map(message => message.content).join(' ')
  const searchTokens = tokenizeText(`${combinedRecentText} ${previous.currentSectionTitle || ''} ${previous.currentObjective || ''} ${previous.activeQuest || ''}`, 4)
  const previousSection = findSectionById(structure, previous.currentSectionId) || structure.sections[0]

  const scoredSections = structure.sections.map(section => {
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
  const shouldTransition = bestSection.id !== previousSection?.id && (explicitMove || assistantAnchorsNewSection || bestScore >= previousScore + 4)

  const currentSection = shouldTransition ? bestSection : (previousSection || bestSection)
  const relevantChunks = selectRelevantChunks(structure, currentSection, searchTokens, combat?.active ? 3 : 2)
  const visited = new Set(previous.visitedSectionIds || [])
  visited.add(currentSection.id)

  const summaryBase = currentSection.summary || 'Die aktuelle Szene entwickelt sich weiter.'
  const latestOutcome = latestAssistant ? firstSentences(latestAssistant, 220) : previous.lastOutcome || ''
  const summary = latestOutcome
    ? `${summaryBase} Letzte Entwicklung: ${latestOutcome}`
    : summaryBase

  const objective = deriveObjectiveFromUserText(latestUser, previous.currentObjective)
  const transitionReason = shouldTransition
    ? detectTransitionReason(previousSection, currentSection, latestUser, latestAssistant)
    : (previous.lastTransitionReason || 'Abschnitt bleibt stabil.')

  const recentSceneChanges = normalizeShortList([
    shouldTransition ? `Neuer Abschnitt: ${currentSection.title}` : '',
    latestOutcome,
    transitionReason,
  ], 3)

  return {
    version: SCENE_STATE_VERSION,
    turnCount: Number(previous.turnCount || 0) + (recentMessages.length ? 1 : 0),
    currentSectionId: currentSection.id,
    currentSectionTitle: currentSection.title,
    currentLocation: currentSection.title,
    relevantChunkIndexes: relevantChunks.map(chunk => chunk.index),
    visitedSectionIds: [...visited],
    currentObjective: objective,
    activeQuest: truncateText(previous.activeQuest || objective || summaryBase, 160),
    lastPlayerAction: truncateText(latestUser || previous.lastPlayerAction || '', 160),
    lastOutcome: latestOutcome,
    summary,
    discoveredClues: normalizeShortList([
      ...(previous.discoveredClues || []),
      ...extractCluesFromMessages(recentMessages, currentSection),
    ], 4),
    openThreads: extractOpenThreads(recentMessages, objective, currentSection),
    notableElements: mergeNotableElements(currentSection, `${latestUser} ${latestAssistant}`),
    recentSceneChanges,
    stableSectionTurns: shouldTransition ? 1 : Number(previous.stableSectionTurns || 0) + 1,
    lastTransitionReason: transitionReason,
    lastUpdatedAt: new Date().toISOString(),
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

  const currentSection = findSectionById(structure, effectiveSceneState.currentSectionId) || structure.sections[0]
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
    inventory: [...(CLASS_CONFIG[defaultClass]?.starterInventory || [])],
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

  const armorBonus = Number(character.armorBonus ?? 0)
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
    armorClass: Number(character.armorClass ?? calcArmorClass(attributes.dex, armorBonus, normalizedClass, attributes)),
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
