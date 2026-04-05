// ─── Tag Parsers ────────────────────────────────────────────────────────────
// Parse AI response tags: loot, currency, skill checks, HP, XP

export function parseLootTags(text = '') {
  const items = []
  const regex = /\[BEUTE:([^\]]+)\]/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    items.push(m[1].trim())
  }
  return items
}

export function parseCurrencyTags(text = '') {
  const changes = {}
  const regex = /\[(KM|SM|EM|GM|PM):\+?(-?\d+)\]/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    const denom = m[1].toLowerCase()
    changes[denom] = (changes[denom] || 0) + parseInt(m[2])
  }
  return changes
}

export function parseLostItemTags(text = '') {
  const items = []
  const regex = /\[VERLOREN:([^\]]+)\]/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    items.push(m[1].trim())
  }
  return items
}

export function parseCheckTags(text = '') {
  const regex = /\[PROBE:(\w+)\|SG:(\d+)(?:\|(VORTEIL|NACHTEIL))?\]/gi
  const m = regex.exec(text)
  if (!m) return null
  return {
    skillOrAbility: m[1].toLowerCase(),
    dc: parseInt(m[2]),
    advantage: m[3]?.toUpperCase() === 'VORTEIL' ? 'advantage'
             : m[3]?.toUpperCase() === 'NACHTEIL' ? 'disadvantage'
             : null,
  }
}

export function stripCheckTags(text = '') {
  return text
    .replace(/\s*\[PROBE:\w+\|SG:\d+(?:\|(?:VORTEIL|NACHTEIL))?\]/gi, '')
}

export function stripProbeHintTags(text = '') {
  return text
    .replace(/\s*\[PROBE_HINWEIS:\w+\|SG:\d+(?:\|(?:VORTEIL|NACHTEIL))?\]/gi, '')
}

// Replace [PROBE_HINWEIS:] tags with readable inline text (e.g. "🎲 Probe")
export function formatProbeHinweisTags(text = '', getLabel) {
  return text.replace(
    /\s*\[PROBE_HINWEIS:(\w+)\|SG:(\d+)(?:\|(?:VORTEIL|NACHTEIL))?\]/gi,
    (_, skill, dc) => {
      const label = getLabel ? getLabel(skill.toLowerCase()) : skill
      return ` (🎲 ${label}, SG ${dc})`
    }
  )
}

export function parseHPTags(text = '') {
  const changes = []
  const regex = /\[HP:([+-]\d+)\]/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    changes.push(parseInt(m[1]))
  }
  return changes
}

export function parseXPTags(text = '') {
  let total = 0
  const regex = /\[XP:(\d+)\]/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    total += parseInt(m[1])
  }
  return total
}

// Parse enemy tags from AI text — supports both formats:
//   [GEGNER:Name|HP:X|AC:Y|ATK:+Z|DMG:WdX+N|XP:N]
//   [Name|HP:X|AC:Y|ATK:+Z|DMG:WdX+N|XP:N]
export function parseEnemyTags(text = '') {
  const enemies = []
  const regex = /\[(?:GEGNER:)?([^|\]]+)\|HP:(\d+)\|AC:(\d+)\|ATK:\+?([-\d]+)\|DMG:([^|\]]+)\|XP:(\d+)\]/gi
  let m
  while ((m = regex.exec(text)) !== null) {
    const maxHP = parseInt(m[2]) || 10
    enemies.push({
      id: `enemy-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name: m[1].trim(),
      maxHP,
      currentHP: maxHP,
      ac: parseInt(m[3]) || 12,
      attackBonus: parseInt(m[4]) || 3,
      damageDice: m[5].trim(),
      xp: parseInt(m[6]) || 25,
      initiativeBonus: 0,
    })
  }
  return enemies
}
