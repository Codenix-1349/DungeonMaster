// ─── Spell Effect Resolution (Code-based, not AI) ────────────────────────────
//
// Each spell that can be mechanically resolved in combat gets an entry here.
// Spells NOT listed here are cast "narratively" — the AI describes the effect.
//
// type:
//   'damage'   → roll dice, apply to target(s)
//   'healing'  → roll dice, restore HP
//   'buff'     → apply a temporary effect
//   'debuff'   → apply a negative effect (save-based)
//   'utility'  → no direct mechanical effect, AI narrates
//
// delivery:
//   'attack'   → caster rolls d20 + spellAttackBonus vs target AC
//   'save'     → target rolls save vs caster's spellSaveDC
//   'auto'     → no roll needed (e.g. Magic Missile)
//   'self'     → affects caster only

export const SPELL_EFFECTS = {
  // ── Cantrips ──────────────────────────────────────────────────────────────
  fire_bolt:        { type: 'damage', delivery: 'attack', dice: '1d10', damageType: 'Feuer', range: 120, scaling: { 5: '2d10', 11: '3d10', 17: '4d10' } },
  ray_of_frost:     { type: 'damage', delivery: 'attack', dice: '1d8',  damageType: 'Kälte', range: 60,  scaling: { 5: '2d8', 11: '3d8', 17: '4d8' }, extraEffect: 'Tempo -10ft' },
  shocking_grasp:   { type: 'damage', delivery: 'attack', dice: '1d8',  damageType: 'Blitz', range: 5,   scaling: { 5: '2d8', 11: '3d8', 17: '4d8' }, extraEffect: 'Keine Reaktion' },
  eldritch_blast:   { type: 'damage', delivery: 'attack', dice: '1d10', damageType: 'Energie', range: 120, scaling: { 5: '2d10', 11: '3d10', 17: '4d10' } },
  sacred_flame:     { type: 'damage', delivery: 'save', save: 'dex', dice: '1d8', damageType: 'Strahlend', range: 60, scaling: { 5: '2d8', 11: '3d8', 17: '4d8' } },
  thorn_whip:       { type: 'damage', delivery: 'attack', dice: '1d6',  damageType: 'Stich', range: 30, scaling: { 5: '2d6', 11: '3d6', 17: '4d6' } },
  produce_flame:    { type: 'damage', delivery: 'attack', dice: '1d8',  damageType: 'Feuer', range: 30, scaling: { 5: '2d8', 11: '3d8', 17: '4d8' } },
  vicious_mockery:  { type: 'damage', delivery: 'save', save: 'wis', dice: '1d4', damageType: 'Psychisch', range: 60, scaling: { 5: '2d4', 11: '3d4', 17: '4d4' }, extraEffect: 'Nachteil auf nächsten Angriff' },
  poison_spray:     { type: 'damage', delivery: 'save', save: 'con', dice: '1d12', damageType: 'Gift', range: 10, scaling: { 5: '2d12', 11: '3d12', 17: '4d12' } },

  // ── 1st Level ─────────────────────────────────────────────────────────────
  magic_missile:    { type: 'damage', delivery: 'auto', dice: '3d4+3', damageType: 'Energie', range: 120, upcast: { perLevel: '1d4+1' } },
  shield_spell:     { type: 'buff', delivery: 'self', effect: '+5 AC bis nächste Runde', duration: 1, reaction: true },
  sleep:            { type: 'debuff', delivery: 'auto', dice: '5d8', damageType: 'none', effect: 'HP-basiert einschläfern', range: 90, upcast: { perLevel: '2d8' } },
  burning_hands:    { type: 'damage', delivery: 'save', save: 'dex', dice: '3d6', damageType: 'Feuer', range: 15, area: 'Kegel', upcast: { perLevel: '1d6' } },
  mage_armor:       { type: 'buff', delivery: 'self', effect: 'AC = 13 + GES-Mod', duration: 480 },
  thunderwave:      { type: 'damage', delivery: 'save', save: 'con', dice: '2d8', damageType: 'Donner', range: 15, area: 'Würfel', upcast: { perLevel: '1d8' }, extraEffect: 'Stoß 3m' },
  charm_person:     { type: 'debuff', delivery: 'save', save: 'wis', effect: 'Bezaubert', range: 30, duration: 60 },
  cure_wounds:      { type: 'healing', delivery: 'self', dice: '1d8', range: 5, upcast: { perLevel: '1d8' } },
  healing_word:     { type: 'healing', delivery: 'self', dice: '1d4', range: 60, bonusAction: true, upcast: { perLevel: '1d4' } },
  bless:            { type: 'buff', delivery: 'auto', effect: '+1d4 auf Angriff und RW', duration: 10, concentration: true },
  guiding_bolt:     { type: 'damage', delivery: 'attack', dice: '4d6', damageType: 'Strahlend', range: 120, upcast: { perLevel: '1d6' }, extraEffect: 'Nächster Angriff hat Vorteil' },
  shield_of_faith:  { type: 'buff', delivery: 'self', effect: '+2 AC', duration: 10, concentration: true },
  inflict_wounds:   { type: 'damage', delivery: 'attack', dice: '3d10', damageType: 'Nekrotisch', range: 5, upcast: { perLevel: '1d10' } },
  sanctuary:        { type: 'buff', delivery: 'self', effect: 'Angreifer muss WEI-RW bestehen', duration: 1 },
  faerie_fire:      { type: 'debuff', delivery: 'save', save: 'dex', effect: 'Leuchtet + Vorteil auf Angriffe', range: 60, area: 'Würfel 6m', concentration: true },
  entangle:         { type: 'debuff', delivery: 'save', save: 'str', effect: 'Festgehalten', range: 90, area: 'Quadrat 6m', concentration: true },
  goodberry:        { type: 'healing', delivery: 'self', flatHealing: 10, effect: '10 Beeren, je 1 HP' },
  hunters_mark:     { type: 'buff', delivery: 'self', effect: '+1d6 Schaden auf Ziel', duration: 60, concentration: true, bonusDamage: '1d6' },
  hex:              { type: 'buff', delivery: 'self', effect: '+1d6 nekrot. Schaden auf Ziel', duration: 60, concentration: true, bonusDamage: '1d6' },
  hellish_rebuke:   { type: 'damage', delivery: 'save', save: 'dex', dice: '2d10', damageType: 'Feuer', range: 60, reaction: true, upcast: { perLevel: '1d10' } },
  detect_magic:     { type: 'utility', delivery: 'self', effect: 'Magische Auren sichtbar', duration: 10, concentration: true },
  heroism:          { type: 'buff', delivery: 'self', effect: 'Immun gegen Angst + temp. HP pro Runde', duration: 10, concentration: true },
  expeditious_retreat: { type: 'buff', delivery: 'self', effect: 'Dash als Bonusaktion', duration: 10, concentration: true },
  protection_from_evil: { type: 'buff', delivery: 'self', effect: 'Schutz vor Aberrationen/Celestischen/Elementaren/Feen/Unholden/Untoten', duration: 10, concentration: true },

  // ── 2nd Level ─────────────────────────────────────────────────────────────
  misty_step:       { type: 'utility', delivery: 'self', effect: 'Teleport 9m', bonusAction: true },
  invisibility:     { type: 'buff', delivery: 'self', effect: 'Unsichtbar bis Angriff/Zauber', duration: 60, concentration: true },
  hold_person:      { type: 'debuff', delivery: 'save', save: 'wis', effect: 'Paralysiert', range: 60, duration: 10, concentration: true },
  scorching_ray:    { type: 'damage', delivery: 'attack', dice: '2d6', damageType: 'Feuer', range: 120, multiAttack: 3, upcast: { perLevel: '+1 Strahl' } },
  mirror_image:     { type: 'buff', delivery: 'self', effect: '3 Duplikate (AC 10+GES)', duration: 1 },
  web:              { type: 'debuff', delivery: 'save', save: 'dex', effect: 'Festgehalten', range: 60, area: 'Würfel 6m', concentration: true },
  spiritual_weapon: { type: 'damage', delivery: 'attack', dice: '1d8', damageType: 'Energie', range: 60, bonusAction: true, upcast: { perTwoLevels: '1d8' } },
  lesser_restoration: { type: 'utility', delivery: 'self', effect: 'Heilt 1 Zustand (blind/taub/vergiftet/gelähmt/krank)', range: 5 },
  silence:          { type: 'debuff', delivery: 'auto', effect: 'Kein Klang — keine Verbal-Zauber', range: 120, area: 'Sphäre 6m', concentration: true },
  moonbeam:         { type: 'damage', delivery: 'save', save: 'con', dice: '2d10', damageType: 'Strahlend', range: 120, area: 'Zylinder 1.5m', concentration: true, upcast: { perLevel: '1d10' } },
  pass_without_trace: { type: 'buff', delivery: 'self', effect: '+10 Heimlichkeit für Gruppe', duration: 60, concentration: true },
  shatter:          { type: 'damage', delivery: 'save', save: 'con', dice: '3d8', damageType: 'Donner', range: 60, area: 'Sphäre 3m', upcast: { perLevel: '1d8' } },
  suggestion:       { type: 'debuff', delivery: 'save', save: 'wis', effect: 'Ziel folgt Vorschlag', range: 30, duration: 480, concentration: true },
  darkness:         { type: 'utility', delivery: 'auto', effect: 'Magische Dunkelheit 4.5m Radius', range: 60, concentration: true },
  aid:              { type: 'healing', delivery: 'auto', flatHealing: 5, effect: '+5 Max-HP für bis zu 3 Ziele (8h)', upcast: { perLevel: '+5 HP' } },

  // ── 3rd Level ─────────────────────────────────────────────────────────────
  fireball:         { type: 'damage', delivery: 'save', save: 'dex', dice: '8d6', damageType: 'Feuer', range: 150, area: 'Sphäre 6m', upcast: { perLevel: '1d6' } },
  lightning_bolt:   { type: 'damage', delivery: 'save', save: 'dex', dice: '8d6', damageType: 'Blitz', range: 100, area: 'Linie 30m', upcast: { perLevel: '1d6' } },
  counterspell:     { type: 'utility', delivery: 'auto', effect: 'Zauber bis Grad 3 abbrechen', range: 60, reaction: true },
  haste:            { type: 'buff', delivery: 'self', effect: '+2 AC, doppelte Tempo, extra Aktion', duration: 10, concentration: true },
  fly:              { type: 'buff', delivery: 'self', effect: 'Fluggeschwindigkeit 18m', duration: 10, concentration: true },
  dispel_magic:     { type: 'utility', delivery: 'auto', effect: 'Zaubereffekt aufheben (bis Grad 3 auto)', range: 120 },
  spirit_guardians: { type: 'damage', delivery: 'save', save: 'wis', dice: '3d8', damageType: 'Strahlend', range: 0, area: 'Aura 4.5m', concentration: true, upcast: { perLevel: '1d8' } },
  revivify:         { type: 'healing', delivery: 'self', flatHealing: 1, effect: 'Tote Kreatur mit 1 HP wiederbeleben (max 1 Minute tot)', range: 5 },
  call_lightning:   { type: 'damage', delivery: 'save', save: 'dex', dice: '3d10', damageType: 'Blitz', range: 120, area: 'Zylinder 1.5m', concentration: true, upcast: { perLevel: '1d10' } },
  mass_healing_word:{ type: 'healing', delivery: 'self', dice: '1d4', targets: 6, range: 60, bonusAction: true, upcast: { perLevel: '1d4' } },
  fear:             { type: 'debuff', delivery: 'save', save: 'wis', effect: 'Verängstigt + Flucht', area: 'Kegel 9m', concentration: true },
  protection_from_energy: { type: 'buff', delivery: 'self', effect: 'Resistenz gegen 1 Schadenstyp', duration: 60, concentration: true },
  conjure_barrage:  { type: 'damage', delivery: 'save', save: 'dex', dice: '3d8', damageType: 'Hieb/Stich', range: 60, area: 'Kegel 18m' },
  hypnotic_pattern: { type: 'debuff', delivery: 'save', save: 'wis', effect: 'Bezaubert + handlungsunfähig', range: 120, area: 'Würfel 9m', concentration: true },
}

// ─── Dice Helpers ─────────────────────────────────────────────────────────────

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

function parseDice(diceStr = '1d6') {
  const match = String(diceStr).match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!match) return { count: 1, sides: 6, bonus: 0 }
  return {
    count: parseInt(match[1]) || 1,
    sides: parseInt(match[2]) || 6,
    bonus: parseInt(match[3] || '0') || 0,
  }
}

export function rollDice(diceStr = '1d6') {
  const { count, sides, bonus } = parseDice(diceStr)
  let total = bonus
  const rolls = []
  for (let i = 0; i < count; i++) {
    const r = rollDie(sides)
    rolls.push(r)
    total += r
  }
  return { total: Math.max(0, total), rolls, diceStr }
}

// Get cantrip scaling dice for character level
function getScaledDice(effect, charLevel) {
  if (!effect.scaling) return effect.dice
  const thresholds = Object.keys(effect.scaling).map(Number).sort((a, b) => b - a)
  for (const threshold of thresholds) {
    if (charLevel >= threshold) return effect.scaling[threshold]
  }
  return effect.dice
}

// Get upcast dice for a spell cast at a higher slot level
function getUpcastDice(effect, baseLevel, castLevel) {
  if (!effect.upcast || castLevel <= baseLevel) return effect.dice
  const extra = castLevel - baseLevel
  if (effect.upcast.perLevel) {
    // Add extra dice per level above base
    const baseParsed = parseDice(effect.dice)
    const extraParsed = parseDice(effect.upcast.perLevel)
    const totalCount = baseParsed.count + (extraParsed.count * extra)
    return `${totalCount}d${baseParsed.sides}${baseParsed.bonus ? `+${baseParsed.bonus + (extraParsed.bonus * extra)}` : (extraParsed.bonus * extra ? `+${extraParsed.bonus * extra}` : '')}`
  }
  return effect.dice
}

// ─── Combat Spell Resolution ──────────────────────────────────────────────────

/**
 * Resolve a spell's mechanical effect in combat.
 * Returns { success, resultText, damage, healing, effect, isCrit } or null if not resolvable.
 */
export function resolveSpellInCombat({
  spellKey,
  spellName,
  spellLevel,      // base spell level (0 for cantrip)
  castLevel,       // slot level used (0 for cantrip)
  casterLevel,     // character level
  spellAttackBonus,
  spellSaveDC,
  abilityMod,      // spellcasting ability modifier
  targetAC,        // for attack-based spells
  targetName,
}) {
  const effect = SPELL_EFFECTS[spellKey]
  if (!effect) {
    // No structured effect — AI will narrate
    return { success: true, resultText: `${spellName} gewirkt!`, narrate: true }
  }

  const result = {
    success: false,
    resultText: '',
    damage: 0,
    healing: 0,
    effect: effect.effect || null,
    effectType: effect.type,
    isCrit: false,
    narrate: false,
    bonusAction: effect.bonusAction || false,
    concentration: effect.concentration || false,
  }

  // Determine dice
  let dice = effect.dice
  if (spellLevel === 0) {
    dice = getScaledDice(effect, casterLevel)
  } else if (castLevel > spellLevel) {
    dice = getUpcastDice(effect, spellLevel, castLevel)
  }

  // ── Healing spells ──────────────────────────────────────────────────────
  if (effect.type === 'healing') {
    if (effect.flatHealing) {
      let flat = effect.flatHealing
      if (effect.upcast?.perLevel && castLevel > spellLevel) {
        const match = effect.upcast.perLevel.match(/\+?(\d+)/)
        if (match) flat += parseInt(match[1]) * (castLevel - spellLevel)
      }
      result.healing = flat
      result.success = true
      result.resultText = `${spellName}: ${flat} HP wiederhergestellt. ${effect.effect || ''}`
    } else {
      const roll = rollDice(dice)
      const healAmount = roll.total + (abilityMod || 0)
      result.healing = Math.max(1, healAmount)
      result.success = true
      result.resultText = `${spellName}: ${result.healing} HP geheilt (${dice}+${abilityMod} = ${roll.rolls.join('+')}+${abilityMod})`
    }
    return result
  }

  // ── Buff/utility spells ─────────────────────────────────────────────────
  if (effect.type === 'buff' || effect.type === 'utility') {
    result.success = true
    result.resultText = `${spellName}: ${effect.effect || 'Effekt aktiv.'}`
    return result
  }

  // ── Debuff spells (save-based, no damage) ───────────────────────────────
  if (effect.type === 'debuff' && !dice) {
    result.success = true
    if (effect.delivery === 'save') {
      result.resultText = `${spellName} gewirkt! ${targetName || 'Ziel'} muss ${effect.save?.toUpperCase()}-RW gegen SG ${spellSaveDC} bestehen. ${effect.effect || ''}`
    } else {
      result.resultText = `${spellName}: ${effect.effect || 'Effekt aktiv.'}`
    }
    return result
  }

  // ── Damage spells ───────────────────────────────────────────────────────
  if (effect.type === 'damage' || (effect.type === 'debuff' && dice)) {
    if (effect.delivery === 'attack') {
      // Spell attack roll
      const attackRoll = rollDie(20)
      const attackTotal = attackRoll + (spellAttackBonus || 0)
      const isCrit = attackRoll === 20
      const isFumble = attackRoll === 1

      if (isFumble) {
        result.success = false
        result.resultText = `${spellName}: Patzer! Nat. 1 — ${targetName || 'Ziel'} verfehlt.`
        return result
      }

      if (isCrit || attackTotal >= (targetAC || 10)) {
        const roll = rollDice(dice)
        let dmg = roll.total
        if (isCrit) {
          const critRoll = rollDice(dice)
          dmg += critRoll.total
        }
        result.damage = Math.max(1, dmg)
        result.isCrit = isCrit
        result.success = true
        result.resultText = isCrit
          ? `${spellName} KRITISCH! ${result.damage} ${effect.damageType} Schaden gegen ${targetName || 'Ziel'}`
          : `${spellName} trifft! (${attackTotal} vs AC ${targetAC}) ${result.damage} ${effect.damageType} Schaden (${dice})`
      } else {
        result.success = false
        result.resultText = `${spellName} verfehlt (${attackTotal} vs AC ${targetAC}) gegen ${targetName || 'Ziel'}`
      }
      return result
    }

    if (effect.delivery === 'save') {
      // Save-based damage — always hits, half on save
      const roll = rollDice(dice)
      result.damage = Math.max(1, roll.total)
      result.success = true
      result.resultText = `${spellName}: ${result.damage} ${effect.damageType || ''} Schaden (${dice}). ${targetName || 'Ziel'} muss ${effect.save?.toUpperCase()}-RW gegen SG ${spellSaveDC} bestehen (halb bei Erfolg).${effect.extraEffect ? ' ' + effect.extraEffect + '.' : ''}`
      return result
    }

    if (effect.delivery === 'auto') {
      // Auto-hit (e.g., Magic Missile)
      const roll = rollDice(dice)
      result.damage = Math.max(1, roll.total)
      result.success = true
      result.resultText = `${spellName}: ${result.damage} ${effect.damageType || ''} Schaden (${dice}) gegen ${targetName || 'Ziel'} — trifft automatisch!`
      return result
    }
  }

  // Fallback
  result.success = true
  result.resultText = `${spellName} gewirkt!`
  result.narrate = true
  return result
}

/**
 * Resolve using a healing potion.
 * Returns { healing, resultText }
 */
export function resolveHealingPotion() {
  const roll = rollDice('2d4')
  const healing = roll.total + 2
  return {
    healing,
    resultText: `Heiltrank: ${healing} HP wiederhergestellt (2d4+2 = ${roll.rolls.join('+')}+2)`,
  }
}
