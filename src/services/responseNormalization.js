// ─── Response Normalization ─────────────────────────────────────────────────
// Post-process AI responses: strip meta-leaks, enforce decision boundaries,
// normalize choice formatting.

const META_LEAK_PATTERN = /^\s*(\[?(system|hinweis|anmerkung|ooc|out.of.character|meta|antwort.?format|note)\b)/i
const DECISION_CUE_PATTERN = /was (tust|machst|wirst|willst|antwortest) du\??\s*$/i
const STRONG_DECISION_TRIGGER_PATTERN = /was (tust|machst|wirst|willst|antwortest) du\?|wie reagierst du\?|wohin gehst du\?/i
const PLAYER_AUTO_ACTION_PATTERN = /^(du (gehst|nimmst|öffnest|greifst|ziehst|läufst|rennst|springst|kletterst|schwimmst|schleichst))/im

function responseAlreadyHasChoices(text = '') {
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean)
  let hits = 0

  for (const line of lines) {
    if (/^(?:\*\*)?(?:[1-5])[.)]\s+/.test(line) || /^(?:\*\*)?(?:[1-5])\s*:\s+/.test(line)) {
      hits += 1
    }
  }

  return hits >= 2
}

function normalizeChoiceEnding(text = '') {
  if (!responseAlreadyHasChoices(text)) return text

  const lines = String(text).split('\n')
  const normalized = []

  for (const line of lines) {
    normalized.push(line)
  }

  const joined = normalized.join('\n')
  if (!/etwas anderes/i.test(joined)) {
    normalized.push('5. **Etwas anderes (beschreibe)**')
  }

  return normalized.join('\n')
}

const TRAILING_STAT_LINE = /^[+-]?\d{1,4}(?:\s*\/\s*\d{1,4})?$/

function stripTrailingStatLines(text = '') {
  const lines = String(text || '').split('\n')
  while (lines.length) {
    const last = lines[lines.length - 1].trim()
    if (!last || TRAILING_STAT_LINE.test(last)) {
      lines.pop()
      continue
    }
    break
  }
  return lines.join('\n').trim()
}

function stripMetaLeak(text = '') {
  const cleanedLines = String(text)
    .split('\n')
    .filter(line => !META_LEAK_PATTERN.test(line))

  const cleaned = cleanedLines.join('\n').trim()

  if (cleaned) return cleaned
  return 'Die Szene hält für einen Herzschlag inne und wartet auf deine Entscheidung.\n\nWas tust du?'
}

function endsWithDecisionPrompt(text = '') {
  const normalized = String(text || '').trim()
  if (!normalized) return false

  if (DECISION_CUE_PATTERN.test(normalized)) return true
  if (/\?\s*$/.test(normalized)) return true
  if (/etwas anderes \(beschreibe\)/i.test(normalized)) return true

  return false
}

function forceDecisionQuestion(text = '', preferred = 'Was tust du?') {
  const normalized = String(text || '').trim()
  if (!normalized) return preferred
  if (endsWithDecisionPrompt(normalized)) return normalized
  return `${normalized}\n\n${preferred}`
}

function enforceDecisionBoundary(text = '') {
  const normalized = String(text || '').trim()
  if (!normalized) return normalized
  if (responseAlreadyHasChoices(normalized) || endsWithDecisionPrompt(normalized)) return normalized

  const paragraphs = normalized.split(/\n{2,}/).map(part => part.trim()).filter(Boolean)
  if (paragraphs.length < 2) return normalized

  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    if (!STRONG_DECISION_TRIGGER_PATTERN.test(paragraph)) continue

    const trailing = paragraphs.slice(index + 1).join('\n\n')
    if (!trailing) continue

    const continuesPlayerAction =
      PLAYER_AUTO_ACTION_PATTERN.test(trailing) ||
      /^(Dann|Kurz darauf|Schließlich|Wenig später|Ohne zu zögern|Du\b)/im.test(trailing)

    if (!continuesPlayerAction) continue

    const kept = paragraphs.slice(0, index + 1).join('\n\n').trim()
    const preferredQuestion = /antwort/i.test(paragraph) || /\?$/.test(paragraph) ? 'Was antwortest du?' : 'Was tust du?'
    return forceDecisionQuestion(kept, preferredQuestion)
  }

  return normalized
}

export function normalizeAssistantResponse(text = '') {
  const noMeta = stripMetaLeak(text)
  const noStats = stripTrailingStatLines(noMeta)
  const choiceNormalized = normalizeChoiceEnding(noStats)
  return enforceDecisionBoundary(choiceNormalized)
}
