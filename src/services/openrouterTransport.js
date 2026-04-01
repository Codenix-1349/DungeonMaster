// ─── OpenRouter Transport ───────────────────────────────────────────────────
// HTTP/streaming transport for OpenRouter API calls.

import { PROJECT_NAME } from '../data/srd'
import { normalizeModelId } from './models'
import { streamChatProxy, testChatConnection as apiTestChat } from './api'
import { normalizeAssistantResponse } from './responseNormalization'
import { buildSystemPrompt } from './promptBuilder'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function buildFriendlyErrorMessage(status, apiMessage = '') {
  if (status === 401) {
    return 'Ungültiger API Key. Bitte prüfe den OpenRouter-Key in den Einstellungen.'
  }

  if (status === 402) {
    return 'OpenRouter meldet unzureichende Credits oder keine ausreichende Free-Allowance mehr.'
  }

  if (status === 429) {
    if (/rate.?limit/i.test(apiMessage) && /free|:free/i.test(apiMessage)) {
      return 'Das kostenlose Modell ist gerade überlastet. Wähle in den Einstellungen ein anderes Modell, um den Fehler zu beheben.'
    }
    return 'OpenRouter Rate-Limit erreicht. Bitte kurz warten oder ein anderes Modell in den Einstellungen wählen.'
  }

  if (status === 503) {
    return 'Kein verfügbarer Provider für dieses Modell. Bitte später erneut versuchen oder ein anderes Modell wählen.'
  }

  if (status === 404) {
    return 'Dieses Modell wurde von OpenRouter nicht gefunden. Bitte ein anderes Modell auswählen.'
  }

  return apiMessage || `API Fehler: ${status}`
}

async function extractError(response) {
  try {
    const text = await response.text()

    if (!text) {
      return buildFriendlyErrorMessage(response.status)
    }

    try {
      const json = JSON.parse(text)
      const apiMessage =
        json?.error?.message ||
        json?.message ||
        json?.detail ||
        ''

      return buildFriendlyErrorMessage(response.status, apiMessage)
    } catch {
      return buildFriendlyErrorMessage(response.status, text)
    }
  } catch {
    return buildFriendlyErrorMessage(response.status)
  }
}

/**
 * Send a message to OpenRouter with streaming
 * onChunk(text) called once with the final response text
 */
export async function sendMessage({ messages, model, apiKey, character, adventure, combat, sceneState, onChunk, useProxy = false }) {
  if (!useProxy && !apiKey) {
    throw new Error('Kein API Key konfiguriert. Bitte in den Einstellungen eingeben.')
  }

  const normalizedModel = normalizeModelId(model)
  const systemPrompt = buildSystemPrompt(character, adventure, messages, combat, sceneState)

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // Route through backend proxy when logged in with server-stored key
  if (useProxy) {
    try {
      const rawText = await streamChatProxy({
        messages: fullMessages,
        model: normalizedModel,
        temperature: 0.6,
        maxTokens: 1800,
        onChunk: null,
      })
      const normalizedText = normalizeAssistantResponse(rawText)
      if (normalizedText && onChunk) onChunk(normalizedText)
      return normalizedText
    } catch (proxyErr) {
      // Fallback to direct OpenRouter call if local apiKey is available
      if (apiKey) {
        console.warn('Chat-Proxy fehlgeschlagen, Fallback auf direkten API-Call:', proxyErr.message)
      } else {
        throw proxyErr
      }
    }
  }

  const body = {
    model: normalizedModel,
    max_tokens: 1800,
    stream: true,
    temperature: 0.6,
    messages: fullMessages,
  }

  // Retry on 429 (rate-limit) — openrouter/free may pick a different model on retry
  const MAX_RETRIES = 3
  let response
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': PROJECT_NAME,
      },
      body: JSON.stringify(body),
    })
    if (response.status !== 429 || attempt === MAX_RETRIES) break
    console.warn(`[openrouter] 429 rate-limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`)
    await new Promise(r => setTimeout(r, (attempt + 1) * 1000))
  }

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  if (!response.body) {
    throw new Error('Keine Streaming-Antwort vom Server erhalten.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue

      try {
        const json = JSON.parse(data)

        if (json?.error?.message) {
          throw new Error(json.error.message)
        }

        const delta = json?.choices?.[0]?.delta?.content
        if (delta) {
          fullText += delta
        }
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error
        }
      }
    }
  }

  const normalizedText = normalizeAssistantResponse(fullText.trim())
  if (normalizedText && onChunk) {
    onChunk(normalizedText)
  }

  return normalizedText
}

/**
 * Test API connection
 */
export async function testConnection(apiKey, model, { useProxy = false } = {}) {
  if (!useProxy && !apiKey) {
    throw new Error('Kein API Key konfiguriert.')
  }

  const normalizedModel = normalizeModelId(model)

  if (useProxy) {
    const data = await apiTestChat(normalizedModel)
    return data?.response?.choices?.[0]?.message?.content || 'OK'
  }

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': PROJECT_NAME,
    },
    body: JSON.stringify({
      model: normalizedModel,
      max_tokens: 12,
      messages: [{ role: 'user', content: 'Antworte nur mit: OK' }],
    }),
  })

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || 'OK'
}
