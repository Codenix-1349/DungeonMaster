import { buildSystemPrompt } from '../../../src/services/promptBuilder.js'

function isAllowedRole(role, { allowSystem = false } = {}) {
  return role === 'user' || role === 'assistant' || (allowSystem && role === 'system')
}

export function sanitizeProxyMessages(messages = [], { allowSystem = false } = {}) {
  if (!Array.isArray(messages)) return []

  return messages
    .filter(message => isAllowedRole(message?.role, { allowSystem }))
    .map(message => ({
      role: message.role,
      content: typeof message?.content === 'string' ? message.content : '',
    }))
    .filter(message => message.content)
}

export function buildProxyMessages({ messages = [], promptContext = null } = {}) {
  if (!promptContext) {
    return sanitizeProxyMessages(messages, { allowSystem: true })
  }

  const sanitizedMessages = sanitizeProxyMessages(messages)
  const systemPrompt = buildSystemPrompt(
    promptContext.character || null,
    promptContext.adventure || null,
    sanitizedMessages,
    promptContext.combat || null,
    promptContext.sceneState || null
  )

  return [
    { role: 'system', content: systemPrompt },
    ...sanitizedMessages,
  ]
}
