export const PROXY_HISTORY_MESSAGE_LIMIT = 8

const MEMORY_SUMMARY_MAX_LENGTH = 400
const MEMORY_SUMMARY_TURN_LIMIT = 4

function truncateAtWord(text = '', maxLength = MEMORY_SUMMARY_MAX_LENGTH) {
  const normalized = String(text || '').trim()
  if (!normalized || normalized.length <= maxLength) return normalized

  const sliced = normalized.slice(0, Math.max(0, maxLength - 3))
  const lastSpace = sliced.lastIndexOf(' ')
  const base = lastSpace >= 40 ? sliced.slice(0, lastSpace) : sliced
  return `${base.trim()}...`
}

function stripTrailingChoiceLists(text = '') {
  return String(text || '')
    .replace(/(?:\n\s*\*{0,2}\d+[.)]\s+.+)+\s*$/g, '')
    .trim()
}

function compactSessionMessageContent(text = '') {
  return stripTrailingChoiceLists(String(text || ''))
    .replace(/\s*\([^\)]*SG\s*\d+[^\)]*\)/gi, '')
    .replace(/\[(?:Probe|Kampfrunde|Erzaehlhinweis)[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitizeSessionChatMessages(gameLog = []) {
  if (!Array.isArray(gameLog)) return []

  return gameLog
    .filter(message => message?.role === 'user' || message?.role === 'assistant')
    .map(message => ({
      role: message.role,
      content: compactSessionMessageContent(message.content),
    }))
    .filter(message => message.content)
}

export function stripSceneStateMemorySummary(sceneState = null) {
  if (!sceneState || typeof sceneState !== 'object') return sceneState || null
  const { memorySummary: _ignored, ...rest } = sceneState
  return rest
}

export function applyServerMemoryToSceneState(sceneState = null, memorySummary = '') {
  const strippedSceneState = stripSceneStateMemorySummary(sceneState)
  if (!strippedSceneState) return null

  return {
    ...strippedSceneState,
    memorySummary: String(memorySummary || '').trim(),
  }
}

function buildTurnSummary(turn = {}) {
  const parts = []
  if (turn.user) parts.push(`Spieler: ${turn.user}`)
  if (turn.assistant) parts.push(`Welt: ${turn.assistant}`)
  return parts.join(' | ')
}

export function buildServerMemorySummary({ gameLog = [], sceneState = null } = {}) {
  const sanitizedMessages = sanitizeSessionChatMessages(gameLog)
  const compactedMessages = sanitizedMessages.slice(0, Math.max(0, sanitizedMessages.length - PROXY_HISTORY_MESSAGE_LIMIT))
  if (!compactedMessages.length) return ''

  const turns = []
  let activeTurn = { user: '', assistant: '' }

  function pushTurn() {
    const turnSummary = buildTurnSummary(activeTurn)
    if (turnSummary) turns.push(turnSummary)
    activeTurn = { user: '', assistant: '' }
  }

  for (const message of compactedMessages) {
    if (message.role === 'user') {
      pushTurn()
      activeTurn.user = truncateAtWord(message.content, 110)
      continue
    }

    if (!activeTurn.assistant) {
      activeTurn.assistant = truncateAtWord(message.content, 140)
      continue
    }

    pushTurn()
    activeTurn.assistant = truncateAtWord(message.content, 140)
  }

  pushTurn()

  const recentTurns = turns.slice(-MEMORY_SUMMARY_TURN_LIMIT)
  const sectionLabel = String(sceneState?.currentSectionTitle || '').trim()
  const summaryBody = recentTurns.join(' || ')
  const summary = sectionLabel
    ? `[Bis ${sectionLabel}] ${summaryBody}`
    : summaryBody

  return truncateAtWord(summary, MEMORY_SUMMARY_MAX_LENGTH)
}

export function buildAuthoritativeChatMessages({ gameLog = [], fallbackMessages = [] } = {}) {
  const authoritativeMessages = sanitizeSessionChatMessages(gameLog)
  if (authoritativeMessages.length) {
    return authoritativeMessages.slice(-PROXY_HISTORY_MESSAGE_LIMIT)
  }

  return sanitizeSessionChatMessages(fallbackMessages)
}
