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

export function buildProxyMessages({ messages = [], authoritativeContext = null } = {}) {
  if (!authoritativeContext) {
    return sanitizeProxyMessages(messages, { allowSystem: true })
  }

  const sanitizedMessages = sanitizeProxyMessages(messages)
  const systemPrompt = buildSystemPrompt(
    authoritativeContext.character || null,
    authoritativeContext.adventure || null,
    sanitizedMessages,
    authoritativeContext.combat || null,
    authoritativeContext.sceneState || null,
    authoritativeContext.runtimeRequestMode || null,
    authoritativeContext.runtimeResolution || null
  )

  return [
    { role: 'system', content: systemPrompt },
    ...sanitizedMessages,
  ]
}
