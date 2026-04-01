import { splitSentences, normalizeShortList } from './adventureParser'

// ─── Clue & Thread Extraction ───────────────────────────────────────────────

export function extractCluesFromMessages(messages = []) {
  const clueHints = ['hinweis', 'spur', 'schlüssel', 'karte', 'brief', 'zeichen', 'symbol', 'notiz', 'gerücht', 'amulett', 'ritual', 'name', 'blut', 'abdruck', 'siegel']
  const text = messages.map(message => message.content).join(' ')
  const clues = []

  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase()
    if (clueHints.some(hint => lower.includes(hint))) clues.push(sentence)
  }

  return normalizeShortList(clues, 4)
}

export function extractOpenThreads(messages = [], previousObjective = '', section = null) {
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

export function extractDiscoveredNpcs(messages = [], sectionNpcs = []) {
  if (!sectionNpcs.length) return []
  const text = messages.map(m => m.content).join(' ').toLowerCase()
  return sectionNpcs.filter(npc => text.toLowerCase().includes(npc.toLowerCase()))
}

// ── NPC Disposition / Suspicion Heuristics ──────────────────────────────────

const DISPOSITION_POSITIVE = /\b(lächelt|freundlich|vertraut|nickt.*zustimmend|hilfsbereit|dankbar|umarmt|lacht|willkommen|herzlich|begeistert|freut sich|segnet|belohnt|offenbart|anvertraut)\b/i
const DISPOSITION_NEGATIVE = /\b(wütend|verärgert|misstrauisch|abweisend|feindlich|droht|knurrt|verflucht|angreift|zornig|verweigert|wendet.*ab|verschränkt.*Arme|spuckt|beleidigt)\b/i
const SUSPICION_INCREASE = /\b(lüg|täusch|verdächtig|misstrauen|betrüg|hintergeh|stehlen|einbrech|gift|verrät|falsch|schwindel|durchschaut|ertappt|belausch)\b/i
const SUSPICION_DECREASE = /\b(vertrau|überzeugt|glaubt|beruhigt|besänftigt|ehrlich|aufrichtig|beweist|wahrheit|offen.*gesprochen|gestanden)\b/i

export function inferDispositionShift(assistantText = '') {
  const lower = assistantText.toLowerCase()
  const pos = (lower.match(DISPOSITION_POSITIVE) || []).length
  const neg = (lower.match(DISPOSITION_NEGATIVE) || []).length
  if (pos > neg) return 1
  if (neg > pos) return -1
  return 0
}

export function inferSuspicionShift(assistantText = '', userText = '') {
  const combined = `${assistantText} ${userText}`.toLowerCase()
  const up = (combined.match(SUSPICION_INCREASE) || []).length
  const down = (combined.match(SUSPICION_DECREASE) || []).length
  if (up > down) return 1
  if (down > up) return -1
  return 0
}

export const DISPOSITION_SCALE = ['feindlich', 'misstrauisch', 'neutral', 'freundlich', 'verbündet']

export function applyDispositionShift(current = 'neutral', shift = 0) {
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

export function extractNpcStateChanges(assistantText = '', knownNpcs = []) {
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

export function extractObjectStateChanges(assistantText = '', section = null) {
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
export function detectActiveNpc(messages = [], knownNpcs = []) {
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
