// ─── SRD 5e Item Catalog (German) ────────────────────────────────────────────
// Comprehensive catalog of D&D 5e SRD items with structured properties.
// All weights in kg, costs in GM.

// ─── Item Types ──────────────────────────────────────────────────────────────

export const ITEM_TYPES = {
  weapon:     'Waffe',
  armor:      'Rüstung',
  shield:     'Schild',
  gear:       'Ausrüstung',
  tool:       'Werkzeug',
  consumable: 'Verbrauchsgut',
  ammo:       'Munition',
  focus:      'Fokus',
}

// ─── Currency ────────────────────────────────────────────────────────────────

export const CURRENCY_CONFIG = {
  km: { label: 'Kupfermünzen', short: 'KM', rate: 0.01 },
  sm: { label: 'Silbermünzen', short: 'SM', rate: 0.1  },
  em: { label: 'Elektrummünzen', short: 'EM', rate: 0.5 },
  gm: { label: 'Goldmünzen', short: 'GM', rate: 1     },
  pm: { label: 'Platinmünzen', short: 'PM', rate: 10   },
}

export const CURRENCY_ORDER = ['km', 'sm', 'em', 'gm', 'pm']

export const EMPTY_CURRENCY = { km: 0, sm: 0, em: 0, gm: 0, pm: 0 }

// ─── Armor Categories & Proficiency Mapping ──────────────────────────────────

export const ARMOR_PROFICIENCY = {
  'Kämpfer':      ['leicht', 'mittel', 'schwer'],
  'Paladin':      ['leicht', 'mittel', 'schwer'],
  'Kleriker':     ['leicht', 'mittel'],
  'Waldläufer':   ['leicht', 'mittel'],
  'Druide':       ['leicht', 'mittel'],
  'Schurke':      ['leicht'],
  'Barde':        ['leicht'],
  'Hexenmeister': ['leicht'],
  'Barbar':       ['leicht', 'mittel'],
  'Mönch':        [],
  'Zauberer':     [],
  'Hexer':        [],
}

export const SHIELD_PROFICIENCY = {
  'Kämpfer': true, 'Paladin': true, 'Kleriker': true, 'Waldläufer': true,
  'Druide': true, 'Barbar': true,
  'Schurke': false, 'Barde': false, 'Hexenmeister': false, 'Mönch': false,
  'Zauberer': false, 'Hexer': false,
}

// ─── Item Catalog ────────────────────────────────────────────────────────────
// Each key is a slug; name is the German display name.

export const ITEM_CATALOG = {

  // ── Einfache Nahkampfwaffen ────────────────────────────────────────────────

  dolch: {
    key: 'dolch', name: 'Dolch', type: 'weapon', weight: 0.5, cost: 2,
    properties: { damageDice: '1d4', damageType: 'Stich', abilityMod: 'str', weaponProperties: ['Finesse', 'Leicht', 'Wurfwaffe'], range: '6/18', category: 'einfach' },
  },
  kurzstock: {
    key: 'kurzstock', name: 'Kurzstock', type: 'weapon', weight: 2, cost: 0.2,
    properties: { damageDice: '1d6', damageType: 'Wucht', abilityMod: 'str', weaponProperties: ['Vielseitig'], versatileDice: '1d8', category: 'einfach' },
  },
  grosskeule: {
    key: 'grosskeule', name: 'Großkeule', type: 'weapon', weight: 5, cost: 0.2,
    properties: { damageDice: '1d8', damageType: 'Wucht', abilityMod: 'str', weaponProperties: ['Zweihändig'], category: 'einfach' },
  },
  handaxt: {
    key: 'handaxt', name: 'Handaxt', type: 'weapon', weight: 1, cost: 5,
    properties: { damageDice: '1d6', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Leicht', 'Wurfwaffe'], range: '6/18', category: 'einfach' },
  },
  wurfspeer: {
    key: 'wurfspeer', name: 'Wurfspeer', type: 'weapon', weight: 1, cost: 0.5,
    properties: { damageDice: '1d6', damageType: 'Stich', abilityMod: 'str', weaponProperties: ['Wurfwaffe'], range: '9/36', category: 'einfach' },
  },
  leichter_hammer: {
    key: 'leichter_hammer', name: 'Leichter Hammer', type: 'weapon', weight: 1, cost: 2,
    properties: { damageDice: '1d4', damageType: 'Wucht', abilityMod: 'str', weaponProperties: ['Leicht', 'Wurfwaffe'], range: '6/18', category: 'einfach' },
  },
  streitkolben: {
    key: 'streitkolben', name: 'Streitkolben', type: 'weapon', weight: 2, cost: 5,
    properties: { damageDice: '1d6', damageType: 'Wucht', abilityMod: 'str', weaponProperties: [], category: 'einfach' },
  },
  speer: {
    key: 'speer', name: 'Speer', type: 'weapon', weight: 1.5, cost: 1,
    properties: { damageDice: '1d6', damageType: 'Stich', abilityMod: 'str', weaponProperties: ['Wurfwaffe', 'Vielseitig'], versatileDice: '1d8', range: '6/18', category: 'einfach' },
  },
  sichel: {
    key: 'sichel', name: 'Sichel', type: 'weapon', weight: 0.5, cost: 1,
    properties: { damageDice: '1d4', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Leicht'], category: 'einfach' },
  },
  keule: {
    key: 'keule', name: 'Keule', type: 'weapon', weight: 1, cost: 0.1,
    properties: { damageDice: '1d4', damageType: 'Wucht', abilityMod: 'str', weaponProperties: ['Leicht'], category: 'einfach' },
  },

  // ── Einfache Fernkampfwaffen ───────────────────────────────────────────────

  leichte_armbrust: {
    key: 'leichte_armbrust', name: 'Leichte Armbrust', type: 'weapon', weight: 2.5, cost: 25,
    properties: { damageDice: '1d8', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Munition', 'Laden', 'Zweihändig'], range: '24/96', category: 'einfach' },
  },
  kurzbogen: {
    key: 'kurzbogen', name: 'Kurzbogen', type: 'weapon', weight: 1, cost: 25,
    properties: { damageDice: '1d6', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Munition', 'Zweihändig'], range: '24/96', category: 'einfach' },
  },
  schleuder: {
    key: 'schleuder', name: 'Schleuder', type: 'weapon', weight: 0, cost: 0.1,
    properties: { damageDice: '1d4', damageType: 'Wucht', abilityMod: 'dex', weaponProperties: ['Munition'], range: '9/36', category: 'einfach' },
  },
  wurfpfeil: {
    key: 'wurfpfeil', name: 'Wurfpfeil', type: 'weapon', weight: 0.1, cost: 0.05,
    properties: { damageDice: '1d4', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Finesse', 'Wurfwaffe'], range: '6/18', category: 'einfach' },
  },

  // ── Militärische Nahkampfwaffen ────────────────────────────────────────────

  langschwert: {
    key: 'langschwert', name: 'Langschwert', type: 'weapon', weight: 1.5, cost: 15,
    properties: { damageDice: '1d8', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Vielseitig'], versatileDice: '1d10', category: 'militärisch' },
  },
  rapier: {
    key: 'rapier', name: 'Rapier', type: 'weapon', weight: 1, cost: 25,
    properties: { damageDice: '1d8', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Finesse'], category: 'militärisch' },
  },
  krummsaebel: {
    key: 'krummsaebel', name: 'Krummsäbel', type: 'weapon', weight: 1.5, cost: 25,
    properties: { damageDice: '1d6', damageType: 'Hieb', abilityMod: 'dex', weaponProperties: ['Finesse', 'Leicht'], category: 'militärisch' },
  },
  kurzschwert: {
    key: 'kurzschwert', name: 'Kurzschwert', type: 'weapon', weight: 1, cost: 10,
    properties: { damageDice: '1d6', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Finesse', 'Leicht'], category: 'militärisch' },
  },
  grossaxt: {
    key: 'grossaxt', name: 'Großaxt', type: 'weapon', weight: 3.5, cost: 30,
    properties: { damageDice: '1d12', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Schwer', 'Zweihändig'], category: 'militärisch' },
  },
  zweihandschwert: {
    key: 'zweihandschwert', name: 'Zweihandschwert', type: 'weapon', weight: 3, cost: 50,
    properties: { damageDice: '2d6', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Schwer', 'Zweihändig'], category: 'militärisch' },
  },
  streitaxt: {
    key: 'streitaxt', name: 'Streitaxt', type: 'weapon', weight: 2, cost: 10,
    properties: { damageDice: '1d8', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Vielseitig'], versatileDice: '1d10', category: 'militärisch' },
  },
  kriegshammer: {
    key: 'kriegshammer', name: 'Kriegshammer', type: 'weapon', weight: 1, cost: 15,
    properties: { damageDice: '1d8', damageType: 'Wucht', abilityMod: 'str', weaponProperties: ['Vielseitig'], versatileDice: '1d10', category: 'militärisch' },
  },
  morgenstern: {
    key: 'morgenstern', name: 'Morgenstern', type: 'weapon', weight: 2, cost: 15,
    properties: { damageDice: '1d8', damageType: 'Stich', abilityMod: 'str', weaponProperties: [], category: 'militärisch' },
  },
  hellebarde: {
    key: 'hellebarde', name: 'Hellebarde', type: 'weapon', weight: 3, cost: 20,
    properties: { damageDice: '1d10', damageType: 'Hieb', abilityMod: 'str', weaponProperties: ['Schwer', 'Reichweite', 'Zweihändig'], category: 'militärisch' },
  },
  pike: {
    key: 'pike', name: 'Pike', type: 'weapon', weight: 9, cost: 5,
    properties: { damageDice: '1d10', damageType: 'Stich', abilityMod: 'str', weaponProperties: ['Schwer', 'Reichweite', 'Zweihändig'], category: 'militärisch' },
  },
  kriegspickel: {
    key: 'kriegspickel', name: 'Kriegspickel', type: 'weapon', weight: 1, cost: 5,
    properties: { damageDice: '1d8', damageType: 'Stich', abilityMod: 'str', weaponProperties: [], category: 'militärisch' },
  },
  dreschflegel: {
    key: 'dreschflegel', name: 'Dreschflegel', type: 'weapon', weight: 1, cost: 10,
    properties: { damageDice: '1d8', damageType: 'Wucht', abilityMod: 'str', weaponProperties: [], category: 'militärisch' },
  },
  peitsche: {
    key: 'peitsche', name: 'Peitsche', type: 'weapon', weight: 1.5, cost: 2,
    properties: { damageDice: '1d4', damageType: 'Hieb', abilityMod: 'dex', weaponProperties: ['Finesse', 'Reichweite'], category: 'militärisch' },
  },
  lanze: {
    key: 'lanze', name: 'Lanze', type: 'weapon', weight: 3, cost: 10,
    properties: { damageDice: '1d12', damageType: 'Stich', abilityMod: 'str', weaponProperties: ['Reichweite'], category: 'militärisch' },
  },

  // ── Militärische Fernkampfwaffen ───────────────────────────────────────────

  langbogen: {
    key: 'langbogen', name: 'Langbogen', type: 'weapon', weight: 1, cost: 50,
    properties: { damageDice: '1d8', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Munition', 'Schwer', 'Zweihändig'], range: '45/180', category: 'militärisch' },
  },
  schwere_armbrust: {
    key: 'schwere_armbrust', name: 'Schwere Armbrust', type: 'weapon', weight: 9, cost: 50,
    properties: { damageDice: '1d10', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Munition', 'Schwer', 'Laden', 'Zweihändig'], range: '30/120', category: 'militärisch' },
  },
  hand_armbrust: {
    key: 'hand_armbrust', name: 'Handarmbrust', type: 'weapon', weight: 1.5, cost: 75,
    properties: { damageDice: '1d6', damageType: 'Stich', abilityMod: 'dex', weaponProperties: ['Munition', 'Leicht', 'Laden'], range: '9/36', category: 'militärisch' },
  },

  // ── Zauberstab / Stab als Waffe ────────────────────────────────────────────

  stab: {
    key: 'stab', name: 'Stab', type: 'weapon', weight: 2, cost: 0.2,
    properties: { damageDice: '1d6', damageType: 'Wucht', abilityMod: 'str', weaponProperties: ['Vielseitig'], versatileDice: '1d8', category: 'einfach' },
  },

  // ── Rüstungen ──────────────────────────────────────────────────────────────

  // Leichte Rüstung
  wattierte_ruestung: {
    key: 'wattierte_ruestung', name: 'Wattierte Rüstung', type: 'armor', weight: 4, cost: 5,
    properties: { acBase: 11, maxDexBonus: null, category: 'leicht', stealthDisadvantage: true },
  },
  lederruestung: {
    key: 'lederruestung', name: 'Lederrüstung', type: 'armor', weight: 5, cost: 10,
    properties: { acBase: 11, maxDexBonus: null, category: 'leicht', stealthDisadvantage: false },
  },
  beschlagene_lederruestung: {
    key: 'beschlagene_lederruestung', name: 'Beschlagene Lederrüstung', type: 'armor', weight: 6.5, cost: 45,
    properties: { acBase: 12, maxDexBonus: null, category: 'leicht', stealthDisadvantage: false },
  },

  // Mittlere Rüstung
  fellruestung: {
    key: 'fellruestung', name: 'Fellrüstung', type: 'armor', weight: 6, cost: 10,
    properties: { acBase: 12, maxDexBonus: 2, category: 'mittel', stealthDisadvantage: false },
  },
  kettenhemd: {
    key: 'kettenhemd', name: 'Kettenhemd', type: 'armor', weight: 10, cost: 50,
    properties: { acBase: 13, maxDexBonus: 2, category: 'mittel', stealthDisadvantage: false },
  },
  schuppenpanzer: {
    key: 'schuppenpanzer', name: 'Schuppenpanzer', type: 'armor', weight: 22.5, cost: 50,
    properties: { acBase: 14, maxDexBonus: 2, category: 'mittel', stealthDisadvantage: true },
  },
  brustpanzer: {
    key: 'brustpanzer', name: 'Brustpanzer', type: 'armor', weight: 10, cost: 400,
    properties: { acBase: 14, maxDexBonus: 2, category: 'mittel', stealthDisadvantage: false },
  },
  halbplatte: {
    key: 'halbplatte', name: 'Halbplatte', type: 'armor', weight: 20, cost: 750,
    properties: { acBase: 15, maxDexBonus: 2, category: 'mittel', stealthDisadvantage: true },
  },

  // Schwere Rüstung
  ringpanzer: {
    key: 'ringpanzer', name: 'Ringpanzer', type: 'armor', weight: 20, cost: 30,
    properties: { acBase: 14, maxDexBonus: 0, category: 'schwer', minStr: 0, stealthDisadvantage: true },
  },
  kettenpanzer: {
    key: 'kettenpanzer', name: 'Kettenpanzer', type: 'armor', weight: 27.5, cost: 75,
    properties: { acBase: 16, maxDexBonus: 0, category: 'schwer', minStr: 13, stealthDisadvantage: true },
  },
  schienenpanzer: {
    key: 'schienenpanzer', name: 'Schienenpanzer', type: 'armor', weight: 30, cost: 200,
    properties: { acBase: 17, maxDexBonus: 0, category: 'schwer', minStr: 15, stealthDisadvantage: true },
  },
  plattenpanzer: {
    key: 'plattenpanzer', name: 'Plattenpanzer', type: 'armor', weight: 32.5, cost: 1500,
    properties: { acBase: 18, maxDexBonus: 0, category: 'schwer', minStr: 15, stealthDisadvantage: true },
  },

  // ── Schild ─────────────────────────────────────────────────────────────────

  schild: {
    key: 'schild', name: 'Schild', type: 'shield', weight: 3, cost: 10,
    properties: { acBonus: 2 },
  },
  holzschild: {
    key: 'holzschild', name: 'Holzschild', type: 'shield', weight: 3, cost: 10,
    properties: { acBonus: 2 },
  },

  // ── Verbrauchsgüter ────────────────────────────────────────────────────────

  heiltrank: {
    key: 'heiltrank', name: 'Heiltrank', type: 'consumable', weight: 0.25, cost: 50,
    properties: { effect: 'heal', healDice: '2d4+2', description: 'Stellt 2W4+2 Trefferpunkte wieder her.' },
    stackable: true,
  },
  grosser_heiltrank: {
    key: 'grosser_heiltrank', name: 'Großer Heiltrank', type: 'consumable', weight: 0.25, cost: 150,
    properties: { effect: 'heal', healDice: '4d4+4', description: 'Stellt 4W4+4 Trefferpunkte wieder her.' },
    stackable: true,
  },
  ueberragender_heiltrank: {
    key: 'ueberragender_heiltrank', name: 'Überragender Heiltrank', type: 'consumable', weight: 0.25, cost: 500,
    properties: { effect: 'heal', healDice: '8d4+8', description: 'Stellt 8W4+8 Trefferpunkte wieder her.' },
    stackable: true,
  },
  gegengift: {
    key: 'gegengift', name: 'Gegengift', type: 'consumable', weight: 0, cost: 50,
    properties: { effect: 'cure_poison', description: 'Gibt Vorteil auf Rettungswürfe gegen Gift für 1 Stunde.' },
    stackable: true,
  },

  // ── Munition ───────────────────────────────────────────────────────────────

  pfeile_20: {
    key: 'pfeile_20', name: 'Pfeile (20)', type: 'ammo', weight: 0.5, cost: 1,
    properties: { ammoType: 'arrow', count: 20 },
    stackable: true,
  },
  bolzen_20: {
    key: 'bolzen_20', name: 'Bolzen (20)', type: 'ammo', weight: 0.75, cost: 1,
    properties: { ammoType: 'bolt', count: 20 },
    stackable: true,
  },
  schleuderkugeln_20: {
    key: 'schleuderkugeln_20', name: 'Schleuderkugeln (20)', type: 'ammo', weight: 0.75, cost: 0.04,
    properties: { ammoType: 'sling', count: 20 },
    stackable: true,
  },
  wurfpfeile_10: {
    key: 'wurfpfeile_10', name: 'Wurfpfeile (10)', type: 'ammo', weight: 1, cost: 0.5,
    properties: { ammoType: 'dart', count: 10 },
    stackable: true,
  },

  // ── Fokus ──────────────────────────────────────────────────────────────────

  arkaner_fokus: {
    key: 'arkaner_fokus', name: 'Arkaner Fokus', type: 'focus', weight: 0.5, cost: 10,
    properties: { focusType: 'arcane' },
  },
  druidenfokus: {
    key: 'druidenfokus', name: 'Druidenfokus', type: 'focus', weight: 0.5, cost: 5,
    properties: { focusType: 'druidic' },
  },
  heiliges_symbol: {
    key: 'heiliges_symbol', name: 'Heiliges Symbol', type: 'focus', weight: 0.5, cost: 5,
    properties: { focusType: 'holy' },
  },
  komponentenbeutel: {
    key: 'komponentenbeutel', name: 'Komponentenbeutel', type: 'focus', weight: 1, cost: 25,
    properties: { focusType: 'component' },
  },

  // ── Werkzeuge ──────────────────────────────────────────────────────────────

  diebeswerkzeug: {
    key: 'diebeswerkzeug', name: 'Diebeswerkzeug', type: 'tool', weight: 0.5, cost: 25,
    properties: { toolType: 'thieves' },
  },
  heilerset: {
    key: 'heilerset', name: 'Heilerset', type: 'tool', weight: 1.5, cost: 5,
    properties: { toolType: 'healer', charges: 10, description: 'Stabilisiert sterbende Kreaturen und heilt 1W6+4 HP.' },
  },
  kletterausruestung: {
    key: 'kletterausruestung', name: 'Kletterausrüstung', type: 'tool', weight: 6, cost: 25,
    properties: { toolType: 'climbing' },
  },
  navigationsgeraet: {
    key: 'navigationsgeraet', name: 'Navigationsgerät', type: 'tool', weight: 1, cost: 25,
    properties: { toolType: 'navigation' },
  },

  // ── Musikinstrumente ───────────────────────────────────────────────────────

  laute: {
    key: 'laute', name: 'Laute', type: 'tool', weight: 1, cost: 35,
    properties: { toolType: 'instrument', instrumentType: 'Laute' },
  },
  floete: {
    key: 'floete', name: 'Flöte', type: 'tool', weight: 0.5, cost: 2,
    properties: { toolType: 'instrument', instrumentType: 'Flöte' },
  },
  trommel: {
    key: 'trommel', name: 'Trommel', type: 'tool', weight: 1.5, cost: 6,
    properties: { toolType: 'instrument', instrumentType: 'Trommel' },
  },

  // ── Allgemeine Ausrüstung ──────────────────────────────────────────────────

  rucksack: {
    key: 'rucksack', name: 'Rucksack', type: 'gear', weight: 2.5, cost: 2,
    properties: { capacity: 15 },
  },
  seil_15m: {
    key: 'seil_15m', name: 'Seil (15m)', type: 'gear', weight: 5, cost: 1,
    properties: {},
  },
  seil_30m: {
    key: 'seil_30m', name: 'Seil (30m)', type: 'gear', weight: 5, cost: 1,
    properties: {},
  },
  fackel: {
    key: 'fackel', name: 'Fackel', type: 'gear', weight: 0.5, cost: 0.01,
    properties: { light: '6/6', burnTime: '1h' },
    stackable: true,
  },
  laterne: {
    key: 'laterne', name: 'Laterne', type: 'gear', weight: 1, cost: 5,
    properties: { light: '9/9', burnTime: '6h' },
  },
  oelflaesche: {
    key: 'oelflaesche', name: 'Ölfläschchen', type: 'gear', weight: 0.5, cost: 0.1,
    properties: {},
    stackable: true,
  },
  feuerstein_stahl: {
    key: 'feuerstein_stahl', name: 'Feuerstein & Stahl', type: 'gear', weight: 0.5, cost: 0.5,
    properties: {},
  },
  wasserschlauch: {
    key: 'wasserschlauch', name: 'Wasserschlauch', type: 'gear', weight: 2.5, cost: 0.2,
    properties: { capacity: '2 Liter' },
  },
  reiseproviant: {
    key: 'reiseproviant', name: 'Reiseproviant', type: 'gear', weight: 1, cost: 0.5,
    properties: { description: '1 Tag Ration' },
    stackable: true,
  },
  decke: {
    key: 'decke', name: 'Decke', type: 'gear', weight: 1.5, cost: 0.5,
    properties: {},
  },
  zelt: {
    key: 'zelt', name: 'Zelt (2 Personen)', type: 'gear', weight: 10, cost: 2,
    properties: {},
  },
  eisenpfloeche: {
    key: 'eisenpfloeche', name: 'Eisenpflöcke (10)', type: 'gear', weight: 1.25, cost: 1,
    properties: {},
  },
  hammer: {
    key: 'hammer', name: 'Hammer', type: 'gear', weight: 1.5, cost: 1,
    properties: {},
  },
  kreidestift: {
    key: 'kreidestift', name: 'Kreide (10 Stück)', type: 'gear', weight: 0, cost: 0.01,
    properties: {},
  },
  spiegel: {
    key: 'spiegel', name: 'Spiegel (Stahl)', type: 'gear', weight: 0.25, cost: 5,
    properties: {},
  },
  fernglas: {
    key: 'fernglas', name: 'Fernglas', type: 'gear', weight: 0.5, cost: 1000,
    properties: {},
  },
  glocke: {
    key: 'glocke', name: 'Glocke', type: 'gear', weight: 0, cost: 1,
    properties: {},
  },
  tinte_feder: {
    key: 'tinte_feder', name: 'Tinte & Feder', type: 'gear', weight: 0, cost: 10,
    properties: {},
  },
  papier: {
    key: 'papier', name: 'Papier (10 Blatt)', type: 'gear', weight: 0, cost: 2,
    properties: {},
    stackable: true,
  },
  kette_3m: {
    key: 'kette_3m', name: 'Kette (3m)', type: 'gear', weight: 5, cost: 5,
    properties: {},
  },
  schloss: {
    key: 'schloss', name: 'Schloss', type: 'gear', weight: 0.5, cost: 10,
    properties: {},
  },
  brecheisen: {
    key: 'brecheisen', name: 'Brecheisen', type: 'gear', weight: 2.5, cost: 2,
    properties: { description: 'Vorteil auf STR-Proben zum Aufhebeln.' },
  },
  schaufel: {
    key: 'schaufel', name: 'Schaufel', type: 'gear', weight: 2.5, cost: 2,
    properties: {},
  },
  angel: {
    key: 'angel', name: 'Angel', type: 'gear', weight: 2, cost: 1,
    properties: {},
  },
  zauberbuch: {
    key: 'zauberbuch', name: 'Zauberbuch', type: 'gear', weight: 1.5, cost: 50,
    properties: { description: 'Enthält die Zauber des Zauberers.' },
  },
  beutel: {
    key: 'beutel', name: 'Beutel', type: 'gear', weight: 0.5, cost: 0.5,
    properties: { capacity: 3 },
  },
  entdeckerpaket: {
    key: 'entdeckerpaket', name: 'Entdeckerpaket', type: 'gear', weight: 5, cost: 10,
    properties: { description: 'Rucksack, Schlafsack, Wasserschlauch, Rationen (10), Seil (15m), Fackeln (10), Feuerstein.' },
  },
  manacles: {
    key: 'manacles', name: 'Handschellen', type: 'gear', weight: 3, cost: 2,
    properties: {},
  },
  strickleiter: {
    key: 'strickleiter', name: 'Strickleiter (3m)', type: 'gear', weight: 12.5, cost: 1,
    properties: {},
  },
  phiole: {
    key: 'phiole', name: 'Phiole', type: 'gear', weight: 0, cost: 1,
    properties: {},
  },
  gift_basis: {
    key: 'gift_basis', name: 'Basisgift (Phiole)', type: 'consumable', weight: 0, cost: 100,
    properties: { effect: 'poison', description: '+1d4 Giftschaden für 1 Minute auf einer Waffe.' },
    stackable: true,
  },
}

// ─── Name Lookup Index ───────────────────────────────────────────────────────
// Maps lowercase German names to catalog keys for fast fuzzy lookup.

const _nameLookup = new Map()
const _aliasLookup = new Map()

// Build the lookup maps once
for (const [key, item] of Object.entries(ITEM_CATALOG)) {
  _nameLookup.set(item.name.toLowerCase(), key)
}

// Common aliases / alternate names from starterInventory strings
const ALIASES = {
  'fackeln x5': { key: 'fackel', quantity: 5 },
  'fackeln x10': { key: 'fackel', quantity: 10 },
  'wurfspeer x4': { key: 'wurfspeer', quantity: 4 },
  'wurfpfeile x10': { key: 'wurfpfeil', quantity: 10 },
  'reiseproviant x5': { key: 'reiseproviant', quantity: 5 },
  'reiseproviant x10': { key: 'reiseproviant', quantity: 10 },
  'seil': { key: 'seil_15m', quantity: 1 },
  'seil (15m)': { key: 'seil_15m', quantity: 1 },
  'seil (30m)': { key: 'seil_30m', quantity: 1 },
}

for (const alias of Object.keys(ALIASES)) {
  _aliasLookup.set(alias.toLowerCase(), ALIASES[alias])
}

// ─── Utility Functions ───────────────────────────────────────────────────────

let _invIdCounter = 0

export function generateInventoryId() {
  return `inv-${Date.now().toString(36)}-${(++_invIdCounter).toString(36)}`
}

/**
 * Look up an item in the catalog by name or key.
 * Returns { catalogEntry, quantity } or null.
 */
export function lookupItem(nameOrKey) {
  if (!nameOrKey) return null
  const input = String(nameOrKey).trim()
  const lower = input.toLowerCase()

  // Direct key match
  if (ITEM_CATALOG[lower]) {
    return { catalogEntry: ITEM_CATALOG[lower], quantity: 1 }
  }

  // Alias match (handles "Fackeln x5", "Seil (15m)", etc.)
  const alias = _aliasLookup.get(lower)
  if (alias) {
    return { catalogEntry: ITEM_CATALOG[alias.key], quantity: alias.quantity }
  }

  // Exact name match
  const nameKey = _nameLookup.get(lower)
  if (nameKey) {
    return { catalogEntry: ITEM_CATALOG[nameKey], quantity: 1 }
  }

  // Parse "Name xN" pattern
  const xMatch = input.match(/^(.+?)\s+x(\d+)$/i)
  if (xMatch) {
    const baseName = xMatch[1].trim().toLowerCase()
    const qty = parseInt(xMatch[2])
    const baseKey = _nameLookup.get(baseName)
    if (baseKey) {
      return { catalogEntry: ITEM_CATALOG[baseKey], quantity: qty }
    }
  }

  // Fuzzy: try startsWith on catalog names
  for (const [name, key] of _nameLookup.entries()) {
    if (name.startsWith(lower) || lower.startsWith(name)) {
      return { catalogEntry: ITEM_CATALOG[key], quantity: 1 }
    }
  }

  return null
}

/**
 * Create a structured inventory item from a catalog entry (or custom data).
 */
export function createInventoryItem(catalogEntryOrName, overrides = {}) {
  const lookup = typeof catalogEntryOrName === 'string'
    ? lookupItem(catalogEntryOrName)
    : null

  const entry = typeof catalogEntryOrName === 'object' && catalogEntryOrName.key
    ? catalogEntryOrName
    : lookup?.catalogEntry

  if (entry) {
    return {
      id: generateInventoryId(),
      itemKey: entry.key,
      name: entry.name,
      type: entry.type,
      quantity: lookup?.quantity || 1,
      weight: entry.weight || 0,
      equipped: false,
      properties: { ...entry.properties },
      stackable: entry.stackable || false,
      ...overrides,
    }
  }

  // Custom / unrecognized item
  const name = typeof catalogEntryOrName === 'string' ? catalogEntryOrName : 'Unbekannt'
  return {
    id: generateInventoryId(),
    itemKey: null,
    name,
    type: 'gear',
    quantity: 1,
    weight: 0,
    equipped: false,
    properties: {},
    stackable: false,
    custom: true,
    ...overrides,
  }
}

/**
 * Calculate carrying capacity in kg (SRD: STR × 7.5 kg).
 */
export function calcCarryingCapacity(strScore) {
  return Math.max(1, Number(strScore) || 10) * 7.5
}

/**
 * Calculate total weight of all inventory items.
 */
export function calcTotalWeight(inventory) {
  if (!Array.isArray(inventory)) return 0
  return inventory.reduce((sum, item) => {
    if (typeof item === 'string') return sum // legacy
    return sum + (item.weight || 0) * (item.quantity || 1)
  }, 0)
}

/**
 * Convert all currency to GM equivalent.
 */
export function calcTotalGoldValue(currency) {
  if (!currency) return 0
  return CURRENCY_ORDER.reduce((sum, denom) => {
    return sum + (currency[denom] || 0) * CURRENCY_CONFIG[denom].rate
  }, 0)
}

/**
 * Get all items from the catalog filtered by type.
 */
export function getItemsByType(type) {
  return Object.values(ITEM_CATALOG).filter(item => item.type === type)
}

/**
 * Get all weapons from the catalog.
 */
export function getWeapons() { return getItemsByType('weapon') }

/**
 * Get all armor from the catalog (not shields).
 */
export function getArmors() { return getItemsByType('armor') }

/**
 * Get armor items available for a specific class.
 */
export function getArmorsForClass(className) {
  const proficiencies = ARMOR_PROFICIENCY[className] || []
  return getArmors().filter(a => proficiencies.includes(a.properties.category))
}

/**
 * Check if a class can use shields.
 */
export function canUseShield(className) {
  return SHIELD_PROFICIENCY[className] || false
}

// ─── Loot Generation (Code-Driven) ──────────────────────────────────────────
// Replaces AI-driven loot decisions with deterministic, level-scaled tables.
// Based on D&D 5e DMG treasure tables (simplified for solo play).

// Gold rewards by total encounter XP (all enemies combined)
function rollRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Calculate gold reward for a combat encounter based on total enemy XP.
 * Returns { gm, sm, km } currency patch.
 */
export function generateGoldReward(totalXP) {
  if (totalXP <= 0) return {}
  // Scale: roughly 1 GM per 2 XP, with variance
  const baseGold = Math.round(totalXP * 0.5)
  const variance = Math.max(1, Math.round(baseGold * 0.3))
  const gm = rollRange(Math.max(1, baseGold - variance), baseGold + variance)

  // Sometimes also silver/copper
  const sm = Math.random() < 0.5 ? rollRange(0, Math.round(gm * 2)) : 0
  const km = Math.random() < 0.3 ? rollRange(0, Math.round(gm * 5)) : 0

  const result = {}
  if (gm > 0) result.gm = gm
  if (sm > 0) result.sm = sm
  if (km > 0) result.km = km
  return result
}

// Loot pools by tier (based on player level)
const LOOT_POOL_TIER1 = [ // Level 1-4
  'heiltrank', 'fackel', 'seil_15m', 'dolch', 'handaxt',
  'reiseproviant', 'oelflaesche', 'pfeile_20', 'bolzen_20',
  'gegengift', 'wurfspeer', 'sichel', 'keule',
]
const LOOT_POOL_TIER2 = [ // Level 5-8
  'heiltrank', 'grosser_heiltrank', 'kurzschwert', 'streitaxt',
  'lederruestung', 'schild', 'heilerset', 'langbogen',
  'rapier', 'kettenhemd', 'diebeswerkzeug',
]
const LOOT_POOL_TIER3 = [ // Level 9+
  'grosser_heiltrank', 'ueberragender_heiltrank', 'langschwert',
  'zweihandschwert', 'brustpanzer', 'halbplatte', 'schild',
  'schienenpanzer', 'schwere_armbrust',
]

function getLootPool(playerLevel) {
  if (playerLevel >= 9) return LOOT_POOL_TIER3
  if (playerLevel >= 5) return LOOT_POOL_TIER2
  return LOOT_POOL_TIER1
}

/**
 * Generate item loot for a combat encounter.
 * Returns an array of item keys to add to inventory.
 * @param {number} totalXP - Total XP of all defeated enemies
 * @param {number} playerLevel - Current player level
 * @returns {string[]} Array of ITEM_CATALOG keys
 */
export function generateItemLoot(totalXP, playerLevel = 1) {
  const items = []
  const pool = getLootPool(playerLevel)

  // Drop chance based on encounter difficulty
  // Small encounters (< 100 XP): ~30% chance of 1 item
  // Medium (100-300 XP): ~50% chance of 1 item, ~20% of 2
  // Hard (300+ XP): ~70% chance of 1-2 items
  let dropCount = 0
  if (totalXP >= 300) {
    dropCount = Math.random() < 0.7 ? (Math.random() < 0.4 ? 2 : 1) : 0
  } else if (totalXP >= 100) {
    dropCount = Math.random() < 0.5 ? 1 : (Math.random() < 0.2 ? 1 : 0)
  } else {
    dropCount = Math.random() < 0.3 ? 1 : 0
  }

  for (let i = 0; i < dropCount; i++) {
    const key = pool[Math.floor(Math.random() * pool.length)]
    if (ITEM_CATALOG[key]) items.push(key)
  }

  return items
}

/**
 * Roll dice from a dice string like "2d4+2".
 * Used for potion healing and other item effects.
 */
export function rollItemDice(diceStr = '1d4') {
  const match = String(diceStr).match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!match) return 0
  const count = parseInt(match[1]) || 1
  const sides = parseInt(match[2]) || 4
  const bonus = parseInt(match[3] || '0') || 0
  let total = bonus
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1
  }
  return Math.max(0, total)
}
