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

export const SRD_CORE_PROMPT_RULES = `
## D&D SRD 5.2.1 Grundprinzipien
- Nutze die sechs Attribute Stärke, Geschicklichkeit, Konstitution, Intelligenz, Weisheit und Charisma.
- Attributsmodifikator = floor((Attribut - 10) / 2).
- Trefferpunkte, AC, Angriff, Initiative und Zauberwerte aus dem App-Kontext sind maßgeblich.
- Wenn Regeln unklar sind, entscheide fair, simpel und konsistent im Geist des SRD statt seltene Sonderregeln zu erfinden.
`

export const SRD_RULE_BLOCKS = {
  core: {
    title: 'Allgemeine SRD-Basis',
    text: `
- Nutze SRD-5e-artige Logik statt Hausregeln zu erfinden.
- Erzähle stimmungsvoll, aber trenne Erzählung und Mechanik sauber.
- Wenn die App bereits Werte oder Würfelergebnisse liefert, behandle diese als verbindlich.
- Verlange nur dann einen Wurf, wenn die Handlung unsicher, riskant oder regelrelevant ist.
`,
  },
  combat: {
    title: 'Kampf',
    text: `
- Initiative: d20 + DEX-Modifikator. Höhere Initiative handelt zuerst.
- Angriff: d20 + passender Attributsmodifikator + Übungsbonus gegen die AC des Ziels.
- Nahkampf nutzt meist Stärke, Fernkampf meist Geschicklichkeit.
- Schaden wird mit dem passenden Schadenswürfel gewürfelt; beschreibe das Ergebnis erzählerisch.
- Wenn ein Kampf startet, nutze das Format **KAMPF BEGINNT**. Nach dem Ende: **KAMPF VORBEI**.
`,
  },
  spellcasting: {
    title: 'Zauberwirken',
    text: `
- Zauber-SG = 8 + Übungsbonus + Zauberattribut.
- Zauberangriffsbonus = Übungsbonus + Zauberattribut.
- Wenn ein Zauber einen Rettungswurf verlangt, nenne klar Art des Rettungswurfs und die SG.
- Wenn ein Zauber ein Angriffswurf ist, nutze den Zauberangriffsbonus aus dem Kontext.
- Erfinde keine Zauberwirkungen, die nicht plausibel zum genannten Zauber passen.
`,
  },
  abilityChecks: {
    title: 'Attributsproben & Fertigkeitsartige Situationen',
    text: `
- Nutze Attributsproben für Schleichen, Wahrnehmung, Nachforschen, Klettern, Einschüchtern, Überreden und ähnliche Aktionen.
- Nenne bei Bedarf das passende Attribut und den Grund für den Wurf.
- Verlange keine Probe für triviale Handlungen ohne Risiko.
- Gute Ideen dürfen Vorteile, leichtere SG oder automatische Teilerfolge rechtfertigen.
`,
  },
  social: {
    title: 'Soziale Szenen',
    text: `
- Soziale Interaktionen leben zuerst von Gespräch und Reaktion, nicht sofort von Würfen.
- Nutze Charisma-bezogene Proben nur dann, wenn der Ausgang unsicher und relevant ist.
- NSCs sollen nachvollziehbar reagieren und ihre Interessen behalten.
`,
  },
  exploration: {
    title: 'Erkundung',
    text: `
- Betone Umgebung, Hinweise, Risiken und Entscheidungsmöglichkeiten.
- Bei Suchen, Schleichen, Lauschen oder Fallenverdacht kombiniere Erzählung mit passenden Attributsproben.
- Gib konkrete beobachtbare Details statt vager Meta-Hinweise.
`,
  },
  equipment: {
    title: 'Ausrüstung & Gegenstände',
    text: `
- Nutze Inventar und Ausrüstung aus dem App-Kontext als verbindliche Grundlage.
- Wenn ein Gegenstand kreativ verwendet wird, bewerte das fair und pragmatisch.
- Heiltränke, Werkzeuge, Seile, Lichtquellen und ähnliche Gegenstände dürfen klare praktische Effekte haben.
`,
  },
  conditions: {
    title: 'Zustände & Folgen',
    text: `
- Wenn eine Figur leidet, beschreibe den Zustand klar und mit spielrelevanten Folgen.
- Übliche Folgen sind eingeschränkte Bewegung, Nachteil, Kontrollverlust, Angst oder Bewusstlosigkeit.
- Übertreibe nicht mit Sonderzuständen, wenn eine einfache Folge genügt.
`,
  },
  restHealing: {
    title: 'Rast & Heilung',
    text: `
- Bei kurzer oder langer Rast beschreibe Zeit, Sicherheit, Unterbrechungen und Erholung.
- Heilung und Ressourcenerholung sollen plausibel zur Situation passen.
- In gefährlicher Umgebung ist eine Rast nicht automatisch sicher.
`,
  },
  deathSaves: {
    title: 'Todesrettungswürfe',
    text: `
- Todesrettungswurf: d20; 10 oder höher = Erfolg, 9 oder niedriger = Fehlschlag.
- Natürliche 20 kann die Figur stabilisieren oder kurz aufrichten; natürliche 1 zählt als zwei Fehlschläge.
- Wenn die Figur am Boden ist, behandle die Situation ernst, knapp und klar.
`,
  },
}

const SPELLCASTING_CLASSES = new Set(
  Object.entries(CLASS_CONFIG)
    .filter(([, config]) => Boolean(config.spellcastingAbility))
    .map(([className]) => className)
)

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

function containsAny(text, parts) {
  return parts.some(part => text.includes(part))
}

export function resolveRelevantRuleBlockKeys({ character, combat, userText = '' } = {}) {
  const text = String(userText || '').toLowerCase()
  const activeCombat = Boolean(combat?.active) || containsAny(text, [
    '[kampfaktion]',
    'kampf',
    'angriff',
    'greife',
    'greif',
    'initiative',
    'schaden',
    'rüstungsklasse',
    'ac ',
    'gegner',
    'attacke',
    'attackiere',
  ])

  const wantsSpellcasting = containsAny(text, [
    'zauber',
    'cantrip',
    'wirke',
    'wirken',
    'magie',
    'magisch',
    'heilendes wort',
    'magisches geschoss',
    'segen',
    'shield',
    'spell',
  ])

  const wantsChecks = containsAny(text, [
    'untersuche',
    'suche',
    'schleiche',
    'schleich',
    'lausche',
    'klettere',
    'kletter',
    'erkenne',
    'wahrnehm',
    'spur',
    'falle',
    'heimlich',
    'nachforsch',
    'überprüfe',
    '[würfelwurf]',
  ])

  const wantsSocial = containsAny(text, [
    'spreche',
    'rede',
    'frage',
    'überrede',
    'täusche',
    'einschüchtere',
    'verhandle',
    'überzeugen',
    'drohe',
    'bitte',
  ])

  const wantsExploration = containsAny(text, [
    'umgebung',
    'raum',
    'erkunde',
    'erkund',
    'gehe weiter',
    'tür',
    'pfad',
    'gang',
    'truhe',
    'hinein',
    'vorsichtig',
  ])

  const wantsEquipment = containsAny(text, [
    'inventar',
    'gegenstand',
    'heiltrank',
    'trank',
    'seil',
    'fackel',
    'schild',
    'waffe',
    'bogen',
    'benutze',
    'nutze',
    'ausrüstung',
  ])

  const wantsRest = containsAny(text, [
    'rast',
    'ruhe',
    'schlaf',
    'pause',
    'short rest',
    'long rest',
    'ausruhen',
    'lagern',
  ])

  const wantsDeathSaves = (character?.currentHP ?? 1) <= 0 || containsAny(text, [
    'todesrettung',
    'death save',
    'sterbe',
    'bewusstlos',
    'verblute',
    'am boden',
  ])

  const keys = ['core']

  if (activeCombat) keys.push('combat', 'conditions')
  if (wantsDeathSaves || ((character?.currentHP ?? 1) <= 0 && activeCombat)) keys.push('deathSaves')
  if (wantsSpellcasting || (hasSpellcasting(character?.class) && containsAny(text, ['wirke', 'zauber', 'magie', 'heile']))) keys.push('spellcasting')
  if (wantsChecks) keys.push('abilityChecks')
  if (wantsSocial) keys.push('social')
  if (wantsExploration) keys.push('exploration')
  if (wantsEquipment) keys.push('equipment')
  if (wantsRest) keys.push('restHealing')

  return [...new Set(keys)]
}

export function buildRelevantRulesContext({ character, combat, userText = '' } = {}) {
  const keys = resolveRelevantRuleBlockKeys({ character, combat, userText })

  const sections = keys
    .map(key => {
      const block = SRD_RULE_BLOCKS[key]
      if (!block) return null
      return `### ${block.title}\n${block.text.trim()}`
    })
    .filter(Boolean)

  return {
    keys,
    text: sections.join('\n\n').trim(),
  }
}