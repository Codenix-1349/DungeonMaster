// ─── LLM Transport ──────────────────────────────────────────────────────────
// Direct browser transport for OpenRouter and local Ollama.

import { PROJECT_NAME } from '../data/srd'
import { normalizeModelId } from './models'
import { streamChatProxy, testChatConnection as apiTestChat } from './api'
import { normalizeAssistantResponse } from './responseNormalization'
import { buildSystemPrompt } from './promptBuilder'
import {
  AI_PROVIDER_OLLAMA,
  AI_PROVIDER_OPENROUTER,
  normalizeAiProvider,
  normalizeOllamaBaseUrl,
} from './aiProviders'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

function buildOpenRouterErrorMessage(status, apiMessage = '') {
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

function buildOllamaErrorMessage(status, apiMessage = '') {
  if (status === 404) {
    return 'Ollama-Modell oder Endpunkt nicht gefunden. Prüfe Base-URL und Modellname.'
  }

  if (status === 400) {
    return apiMessage || 'Ollama konnte die Anfrage nicht verarbeiten. Prüfe Modellname und Request.'
  }

  if (status >= 500) {
    return apiMessage || `Ollama meldet einen Serverfehler (${status}).`
  }

  return apiMessage || `Ollama Fehler: ${status}`
}

async function extractError(response, provider = AI_PROVIDER_OPENROUTER) {
  try {
    const text = await response.text()

    if (!text) {
      return provider === AI_PROVIDER_OLLAMA
        ? buildOllamaErrorMessage(response.status)
        : buildOpenRouterErrorMessage(response.status)
    }

    try {
      const json = JSON.parse(text)
      const apiMessage =
        json?.error?.message ||
        json?.message ||
        json?.detail ||
        ''

      return provider === AI_PROVIDER_OLLAMA
        ? buildOllamaErrorMessage(response.status, apiMessage)
        : buildOpenRouterErrorMessage(response.status, apiMessage)
    } catch {
      return provider === AI_PROVIDER_OLLAMA
        ? buildOllamaErrorMessage(response.status, text)
        : buildOpenRouterErrorMessage(response.status, text)
    }
  } catch {
    return provider === AI_PROVIDER_OLLAMA
      ? buildOllamaErrorMessage(response.status)
      : buildOpenRouterErrorMessage(response.status)
  }
}

function getDirectChatEndpoint(provider, ollamaBaseUrl) {
  if (provider === AI_PROVIDER_OLLAMA) {
    return `${normalizeOllamaBaseUrl(ollamaBaseUrl)}/v1/chat/completions`
  }
  return `${OPENROUTER_BASE}/chat/completions`
}

async function streamDirectChat({
  endpoint,
  provider = AI_PROVIDER_OPENROUTER,
  body,
  headers = {},
}) {
  let response

  try {
    if (provider === AI_PROVIDER_OPENROUTER) {
      const maxRetries = 3
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
        if (response.status !== 429 || attempt === maxRetries) break
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000))
      }
    } else {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    }
  } catch (error) {
    if (provider === AI_PROVIDER_OLLAMA) {
      throw new Error('Ollama lokal nicht erreichbar. Läuft der Dienst auf der angegebenen Base-URL?')
    }
    throw error
  }

  if (!response.ok) {
    throw new Error(await extractError(response, provider))
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

  return fullText.trim()
}

export async function fetchOllamaModels(baseUrl = '') {
  const endpoint = `${normalizeOllamaBaseUrl(baseUrl)}/api/tags`
  let response

  try {
    response = await fetch(endpoint)
  } catch {
    throw new Error('Ollama lokal nicht erreichbar. Läuft der Dienst auf der angegebenen Base-URL?')
  }

  if (!response.ok) {
    throw new Error(await extractError(response, AI_PROVIDER_OLLAMA))
  }

  const data = await response.json().catch(() => ({}))
  return Array.isArray(data?.models) ? data.models : []
}

/**
 * Send a message to OpenRouter with streaming
 * onChunk(text) called once with the final response text
 */
export async function sendMessage({
  messages,
  model,
  apiKey,
  character,
  adventure,
  combat,
  sceneState,
  runtimeRequestMode = null,
  runtimeResolution = null,
  onChunk,
  useProxy = false,
  provider = AI_PROVIDER_OPENROUTER,
  ollamaBaseUrl = '',
}) {
  const activeProvider = normalizeAiProvider(provider)

  if (activeProvider === AI_PROVIDER_OPENROUTER && !useProxy && !apiKey) {
    throw new Error('Kein API Key konfiguriert. Bitte in den Einstellungen eingeben.')
  }

  const normalizedModel = normalizeModelId(model, activeProvider)

  // Route through backend proxy when logged in with server-stored key
  if (activeProvider === AI_PROVIDER_OPENROUTER && useProxy) {
    try {
      const rawText = await streamChatProxy({
        messages,
        model: normalizedModel,
        temperature: 0.6,
        maxTokens: 1800,
        promptContext: {
          character,
          adventure,
          combat,
          sceneState,
          runtimeRequestMode,
          runtimeResolution,
        },
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

  const systemPrompt = buildSystemPrompt(character, adventure, messages, combat, sceneState, runtimeRequestMode, runtimeResolution)
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  const body = {
    model: normalizedModel,
    max_tokens: 1800,
    stream: true,
    temperature: 0.6,
    messages: fullMessages,
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  if (activeProvider === AI_PROVIDER_OPENROUTER) {
    headers.Authorization = `Bearer ${apiKey}`
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = PROJECT_NAME
  }

  const rawText = await streamDirectChat({
    endpoint: getDirectChatEndpoint(activeProvider, ollamaBaseUrl),
    provider: activeProvider,
    body,
    headers,
  })

  const normalizedText = normalizeAssistantResponse(rawText)
  if (normalizedText && onChunk) {
    onChunk(normalizedText)
  }

  return normalizedText
}

/**
 * Test API connection
 */
export async function testConnection(apiKey, model, {
  useProxy = false,
  provider = AI_PROVIDER_OPENROUTER,
  ollamaBaseUrl = '',
} = {}) {
  const activeProvider = normalizeAiProvider(provider)

  if (activeProvider === AI_PROVIDER_OPENROUTER && !useProxy && !apiKey) {
    throw new Error('Kein API Key konfiguriert.')
  }

  const normalizedModel = normalizeModelId(model, activeProvider)

  if (activeProvider === AI_PROVIDER_OPENROUTER && useProxy) {
    const data = await apiTestChat(normalizedModel)
    return data?.response?.choices?.[0]?.message?.content || 'OK'
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  if (activeProvider === AI_PROVIDER_OPENROUTER) {
    headers.Authorization = `Bearer ${apiKey}`
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = PROJECT_NAME
  }

  let response
  try {
    response = await fetch(getDirectChatEndpoint(activeProvider, ollamaBaseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: normalizedModel,
        max_tokens: 12,
        stream: false,
        messages: [{ role: 'user', content: 'Antworte nur mit: OK' }],
      }),
    })
  } catch {
    if (activeProvider === AI_PROVIDER_OLLAMA) {
      throw new Error('Ollama lokal nicht erreichbar. Läuft der Dienst auf der angegebenen Base-URL?')
    }
    throw new Error('Verbindung zum API-Endpunkt fehlgeschlagen.')
  }

  if (!response.ok) {
    throw new Error(await extractError(response, activeProvider))
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || 'OK'
}
