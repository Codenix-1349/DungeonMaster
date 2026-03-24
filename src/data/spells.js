// ─── Spell System (D&D 5e SRD) ──────────────────────────────────────────────

const SPELL_RAW = [
  // Cantrips (Level 0)
  ['fire_bolt', 'Feuerpfeil', 0, '1d10 Feuer (120ft)', 'Zauberer', 'Hexer'],
  ['ray_of_frost', 'Froststrahl', 0, '1d8 Kälte + Tempo−10ft (60ft)', 'Zauberer', 'Hexer'],
  ['shocking_grasp', 'Schockgriff', 0, '1d8 Blitz Nahkampf', 'Zauberer', 'Hexer'],
  ['eldritch_blast', 'Geisterstrahl', 0, '1d10 Energie (120ft)', 'Hexenmeister'],
  ['mage_hand', 'Magierhand', 0, 'Unsichtbare Hand (30ft)', 'Zauberer', 'Hexer', 'Barde', 'Hexenmeister'],
  ['light', 'Licht', 0, 'Gegenstand leuchtet (1h)', 'Zauberer', 'Hexer', 'Barde', 'Kleriker'],
  ['minor_illusion', 'Kleine Illusion', 0, 'Bild oder Geräusch (30ft)', 'Zauberer', 'Hexer', 'Barde', 'Hexenmeister'],
  ['prestidigitation', 'Taschenspielerei', 0, 'Kleine magische Effekte', 'Zauberer', 'Hexer', 'Barde', 'Hexenmeister'],
  ['sacred_flame', 'Heilige Flamme', 0, '1d8 Strahlend GES-RW (60ft)', 'Kleriker'],
  ['guidance', 'Führung', 0, '+1d4 auf einen Wurf', 'Kleriker', 'Druide'],
  ['spare_dying', 'Sterben verhindern', 0, 'Stabilisiert Kreatur', 'Kleriker'],
  ['thaumaturgy', 'Thaumaturgie', 0, 'Übernatürliche Effekte', 'Kleriker'],
  ['thorn_whip', 'Dornenpeitsche', 0, '1d6 Stich + Zug (30ft)', 'Druide'],
  ['druidcraft', 'Druidenkunst', 0, 'Kleine Natureffekte', 'Druide'],
  ['produce_flame', 'Flamme erzeugen', 0, '1d8 Feuer oder Licht', 'Druide'],
  ['vicious_mockery', 'Spott', 0, '1d4 Psychisch WEI-RW', 'Barde'],
  ['poison_spray', 'Giftsprüher', 0, '1d12 Gift KON-RW', 'Druide', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['mending', 'Flicken', 0, 'Repariert Gegenstand', 'Zauberer', 'Hexer', 'Barde', 'Kleriker', 'Druide'],
  ['message', 'Botschaft', 0, 'Flüsternachricht (120ft)', 'Zauberer', 'Hexer', 'Barde'],

  // 1st Level
  ['magic_missile', 'Magisches Geschoss', 1, '3×1d4+1 Energie (auto)', 'Zauberer', 'Hexer'],
  ['shield_spell', 'Schild', 1, '+5 AC Reaktion (1 Runde)', 'Zauberer', 'Hexer'],
  ['sleep', 'Schlaf', 1, '5d8 HP einschläfern', 'Zauberer', 'Hexer', 'Barde'],
  ['burning_hands', 'Brennende Hände', 1, '3d6 Feuer Kegel', 'Zauberer', 'Hexer'],
  ['mage_armor', 'Magierrüstung', 1, 'AC 13+GES (8h)', 'Zauberer', 'Hexer'],
  ['thunderwave', 'Donnerwoge', 1, '2d8 Donner + Stoß', 'Zauberer', 'Hexer', 'Barde', 'Druide'],
  ['charm_person', 'Person bezaubern', 1, 'Ziel wird freundlich (1h)', 'Zauberer', 'Hexer', 'Barde', 'Druide', 'Hexenmeister'],
  ['cure_wounds', 'Wunden heilen', 1, '1d8+Mod HP heilen', 'Barde', 'Kleriker', 'Druide', 'Paladin', 'Waldläufer'],
  ['healing_word', 'Heilendes Wort', 1, '1d4+Mod HP Bonus (60ft)', 'Barde', 'Kleriker', 'Druide'],
  ['bless', 'Segen', 1, '+1d4 Angriff/RW für 3 Ziele', 'Kleriker', 'Paladin'],
  ['guiding_bolt', 'Leitbolzen', 1, '4d6 Strahlend + Vorteil', 'Kleriker'],
  ['shield_of_faith', 'Schild des Glaubens', 1, '+2 AC (10min)', 'Kleriker', 'Paladin'],
  ['inflict_wounds', 'Wunden zufügen', 1, '3d10 Nekrotisch Nahkampf', 'Kleriker'],
  ['sanctuary', 'Heiligtum', 1, 'WEI-RW um Ziel anzugreifen', 'Kleriker'],
  ['faerie_fire', 'Feenfeuer', 1, 'Ziele leuchten + Vorteil', 'Barde', 'Druide'],
  ['entangle', 'Verstricken', 1, 'Ranken fesseln (20ft)', 'Druide', 'Waldläufer'],
  ['goodberry', 'Gute Beeren', 1, '10 Beeren heilen je 1 HP', 'Druide', 'Waldläufer'],
  ['hunters_mark', 'Jägerzeichen', 1, '+1d6 Schaden auf Ziel', 'Waldläufer'],
  ['hex', 'Verhexung', 1, '+1d6 Nekrotisch auf Ziel', 'Hexenmeister'],
  ['hellish_rebuke', 'Höllischer Tadel', 1, '2d10 Feuer Reaktion', 'Hexenmeister'],
  ['detect_magic', 'Magie entdecken', 1, 'Magische Auren sehen (10min)', 'Barde', 'Kleriker', 'Druide', 'Paladin', 'Waldläufer', 'Zauberer', 'Hexer'],
  ['heroism', 'Heldenmut', 1, 'Immun Angst + temp HP', 'Barde', 'Paladin'],
  ['expeditious_retreat', 'Eiliger Rückzug', 1, 'Dash als Bonusaktion (10min)', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['protection_from_evil', 'Schutz vor Bösem', 1, 'Schutz vor Kreaturen', 'Kleriker', 'Paladin', 'Hexenmeister', 'Zauberer'],

  // 2nd Level
  ['misty_step', 'Nebelschritt', 2, 'Teleport 30ft Bonusaktion', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['invisibility', 'Unsichtbarkeit', 2, 'Ziel unsichtbar (1h)', 'Zauberer', 'Hexer', 'Barde', 'Hexenmeister'],
  ['hold_person', 'Person festhalten', 2, 'Ziel paralysiert WEI-RW', 'Zauberer', 'Hexer', 'Barde', 'Kleriker', 'Druide', 'Hexenmeister'],
  ['scorching_ray', 'Sengender Strahl', 2, '3×2d6 Feuer', 'Zauberer', 'Hexer'],
  ['mirror_image', 'Spiegelbild', 2, '3 Duplikate (1min)', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['web', 'Netz', 2, 'Fläche klebrig GES-RW', 'Zauberer', 'Hexer'],
  ['spiritual_weapon', 'Geistliche Waffe', 2, '1d8+Mod Kraft Bonusaktion', 'Kleriker'],
  ['lesser_restoration', 'Geringere Wiederherstellung', 2, 'Heilt Zustand', 'Barde', 'Kleriker', 'Druide', 'Paladin', 'Waldläufer'],
  ['silence', 'Stille', 2, 'Kein Klang in 20ft (10min)', 'Barde', 'Kleriker', 'Waldläufer'],
  ['moonbeam', 'Mondstrahl', 2, '2d10 Strahlend Fläche', 'Druide'],
  ['pass_without_trace', 'Spurlos gehen', 2, '+10 Heimlichkeit Gruppe', 'Druide', 'Waldläufer'],
  ['shatter', 'Zerschmettern', 2, '3d8 Donner (60ft)', 'Barde', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['suggestion', 'Suggestion', 2, 'Ziel folgt Vorschlag', 'Barde', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['darkness', 'Dunkelheit', 2, 'Magische Dunkelheit (60ft)', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['aid', 'Beistand', 2, '+5 Max HP für 3 Ziele (8h)', 'Kleriker', 'Paladin'],

  // 3rd Level
  ['fireball', 'Feuerball', 3, '8d6 Feuer 20ft Kugel (150ft)', 'Zauberer', 'Hexer'],
  ['lightning_bolt', 'Blitzschlag', 3, '8d6 Blitz Linie 100ft', 'Zauberer', 'Hexer'],
  ['counterspell', 'Gegenzauber', 3, 'Zauber abbrechen Reaktion', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['haste', 'Hast', 3, '2×Tempo +2AC +Aktion', 'Zauberer', 'Hexer'],
  ['fly', 'Fliegen', 3, 'Fluggeschwindigkeit 60ft (10min)', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['dispel_magic', 'Magie bannen', 3, 'Zaubereffekt aufheben', 'Barde', 'Kleriker', 'Druide', 'Paladin', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['spirit_guardians', 'Geisterbeschwörung', 3, '3d8 Schaden um Wirker', 'Kleriker'],
  ['revivify', 'Wiederbelebung', 3, 'Tote Kreatur beleben (1min)', 'Kleriker', 'Paladin', 'Druide'],
  ['call_lightning', 'Ruf der Blitze', 3, '3d10 Blitz wiederholt', 'Druide'],
  ['mass_healing_word', 'Massenheilung', 3, '1d4+Mod HP für 6 Ziele', 'Kleriker', 'Barde'],
  ['fear', 'Angst', 3, 'Kreaturen flüchten WEI-RW', 'Barde', 'Zauberer', 'Hexer', 'Hexenmeister'],
  ['protection_from_energy', 'Schutz vor Energie', 3, 'Resistenz Schadenstyp', 'Kleriker', 'Druide', 'Waldläufer', 'Zauberer', 'Hexer'],
  ['conjure_barrage', 'Geschosshagel', 3, '3d8 Schaden Kegel 60ft', 'Waldläufer'],
  ['hypnotic_pattern', 'Hypnotisches Muster', 3, 'Kreaturen bezaubert 30ft', 'Barde', 'Zauberer', 'Hexer', 'Hexenmeister'],
]

export const SPELL_LIST = SPELL_RAW.map(([key, name, level, description, ...classes]) => ({
  key, name, level, description, classes,
}))

// Caster progression: cantrips known, spells known, slot type per class
export const CASTER_PROGRESSION = {
  'Zauberer':     { cantrips: [3,3,3,4,4,4,4,4,4,5], spells: [4,5,6,7,8,9,10,11,12,14], slotType: 'full' },
  'Hexer':        { cantrips: [4,4,4,5,5,5,5,5,5,6], spells: [2,3,4,5,6,7,8,9,10,11], slotType: 'full' },
  'Kleriker':     { cantrips: [3,3,3,4,4,4,4,4,4,5], spells: [4,5,6,7,8,9,10,11,12,14], slotType: 'full' },
  'Druide':       { cantrips: [2,2,2,3,3,3,3,3,3,4], spells: [4,5,6,7,8,9,10,11,12,14], slotType: 'full' },
  'Barde':        { cantrips: [2,2,2,3,3,3,3,3,3,4], spells: [4,5,6,7,8,9,10,11,12,14], slotType: 'full' },
  'Hexenmeister': { cantrips: [2,2,2,3,3,3,3,3,3,4], spells: [2,3,4,5,6,7,8,9,10,10], slotType: 'warlock' },
  'Waldläufer':   { cantrips: [0,0,0,0,0,0,0,0,0,0], spells: [0,2,3,3,4,4,5,5,6,6], slotType: 'half' },
  'Paladin':      { cantrips: [0,0,0,0,0,0,0,0,0,0], spells: [0,2,3,3,4,4,5,5,6,6], slotType: 'half' },
}

// Spell slot tables [1st, 2nd, 3rd] per character level (index 0 = level 1)
export const SPELL_SLOTS = {
  full: [
    [2,0,0],[3,0,0],[4,2,0],[4,3,0],[4,3,2],
    [4,3,3],[4,3,3],[4,3,3],[4,3,3],[4,3,3],
  ],
  half: [
    [0,0,0],[2,0,0],[3,0,0],[3,0,0],[4,2,0],
    [4,2,0],[4,3,0],[4,3,0],[4,3,2],[4,3,2],
  ],
  warlock: [
    [1,0,0],[2,0,0],[2,2,0],[2,2,0],[2,2,2],
    [2,2,2],[2,2,2],[2,2,2],[3,3,3],[3,3,3],
  ],
}

export function getClassSpells(className, spellLevel) {
  return SPELL_LIST.filter(s => s.level === spellLevel && s.classes.includes(className))
}

export function getSpellSlots(className, charLevel) {
  const prog = CASTER_PROGRESSION[className]
  if (!prog) return {}
  const table = SPELL_SLOTS[prog.slotType]
  if (!table) return {}
  const row = table[Math.min(charLevel, table.length) - 1] || []
  const result = {}
  row.forEach((count, i) => { if (count > 0) result[i + 1] = count })
  return result
}

export function getCantripsKnownCount(className, charLevel) {
  const prog = CASTER_PROGRESSION[className]
  if (!prog) return 0
  return prog.cantrips[Math.min(charLevel, prog.cantrips.length) - 1] || 0
}

export function getSpellsKnownCount(className, charLevel) {
  const prog = CASTER_PROGRESSION[className]
  if (!prog) return 0
  return prog.spells[Math.min(charLevel, prog.spells.length) - 1] || 0
}

export function getMaxSpellLevel(className, charLevel) {
  const slots = getSpellSlots(className, charLevel)
  const levels = Object.keys(slots).map(Number)
  return levels.length ? Math.max(...levels) : 0
}
