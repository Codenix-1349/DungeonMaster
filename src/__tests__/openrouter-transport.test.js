import { beforeEach, describe, expect, it, vi } from 'vitest'

const streamChatProxy = vi.fn()
const testChatConnection = vi.fn()
const normalizeModelId = vi.fn(model => `normalized:${model}`)
const normalizeAssistantResponse = vi.fn(text => `normalized:${text}`)
const buildSystemPrompt = vi.fn(() => 'SYSTEM PROMPT')
const fetchMock = vi.fn()

globalThis.fetch = fetchMock

vi.mock('../services/api', () => ({
  streamChatProxy,
  testChatConnection,
}))

vi.mock('../services/models', () => ({
  normalizeModelId,
}))

vi.mock('../services/responseNormalization', () => ({
  normalizeAssistantResponse,
}))

vi.mock('../services/promptBuilder', () => ({
  buildSystemPrompt,
}))

const { fetchOllamaModels, sendMessage, testConnection } = await import('../services/openrouterTransport.js')

describe('openrouterTransport proxy prompt authority', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
  })

  it('sends raw chat history plus session authority metadata to the proxy', async () => {
    streamChatProxy.mockResolvedValue('Erzaehlung')

    const messages = [
      { role: 'user', content: 'Ich oeffne die Tuer.' },
      { role: 'assistant', content: 'Die Scharniere knarren.' },
    ]
    const sessionId = 'session-graufurt-1'
    const character = { name: 'Aria' }
    const adventure = { title: 'Graufurt' }
    const combat = { active: false }
    const sceneState = { currentSectionTitle: 'Torhaus' }
    const onChunk = vi.fn()

    const result = await sendMessage({
      messages,
      model: 'openrouter/free',
      apiKey: null,
      sessionId,
      character,
      adventure,
      combat,
      sceneState,
      runtimeRequestMode: 'runtime_flavor_only',
      onChunk,
      useProxy: true,
    })

    expect(streamChatProxy).toHaveBeenCalledTimes(1)
    expect(streamChatProxy).toHaveBeenCalledWith({
      messages,
      model: 'normalized:openrouter/free',
      temperature: 0.6,
      maxTokens: 1800,
      sessionId,
      runtimeRequestMode: 'runtime_flavor_only',
      runtimeResolution: null,
      onChunk: null,
    })
    expect(buildSystemPrompt).not.toHaveBeenCalled()
    expect(onChunk).toHaveBeenCalledWith('normalized:Erzaehlung')
    expect(result).toBe('normalized:Erzaehlung')
  })

  it('sends direct local Ollama chat requests to the OpenAI-compatible endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: {
        getReader() {
          let done = false
          return {
            async read() {
              if (done) return { done: true, value: undefined }
              done = true
              return {
                done: false,
                value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Lokale Antwort"}}]}\n\ndata: [DONE]\n\n'),
              }
            },
          }
        },
      },
    })

    const result = await sendMessage({
      messages: [{ role: 'user', content: 'Hallo lokal' }],
      model: 'llama3.2',
      apiKey: 'ignored-openrouter-key',
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434/',
      character: { name: 'Aria' },
      adventure: { title: 'Graufurt' },
      combat: { active: false },
      sceneState: { currentSectionTitle: 'Torhaus' },
      runtimeRequestMode: 'runtime_flavor_only',
      onChunk: vi.fn(),
      useProxy: false,
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('normalized:llama3.2')
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYSTEM PROMPT' })
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      { name: 'Aria' },
      { title: 'Graufurt' },
      [{ role: 'user', content: 'Hallo lokal' }],
      { active: false },
      { currentSectionTitle: 'Torhaus' },
      'runtime_flavor_only',
      null
    )
    expect(result).toBe('normalized:Lokale Antwort')
  })

  it('forwards authoritative runtime resolution metadata to the proxy', async () => {
    streamChatProxy.mockResolvedValue('Erzaehlung')

    const runtimeResolution = {
      kind: 'escalation',
      intent: 'attack',
      outcome: 'combat_start',
      npcName: 'Elsa Dorn',
      consequence: 'Elsa reagiert sofort feindselig, und die Situation kippt in offenen Kampf.',
    }

    await sendMessage({
      messages: [{ role: 'user', content: 'Ich greife Elsa an.' }],
      model: 'openrouter/free',
      apiKey: null,
      sessionId: 'session-graufurt-2',
      character: { name: 'Aria' },
      adventure: { title: 'Graufurt' },
      combat: { active: true, enemies: [] },
      sceneState: { currentSectionTitle: 'Vorhalle' },
      runtimeRequestMode: 'runtime_authoritative_resolution',
      runtimeResolution,
      onChunk: vi.fn(),
      useProxy: true,
    })

    expect(streamChatProxy).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-graufurt-2',
      runtimeRequestMode: 'runtime_authoritative_resolution',
      runtimeResolution,
    }))
  })

  it('requires an active session id on the proxy path', async () => {
    await expect(sendMessage({
      messages: [{ role: 'user', content: 'Hallo' }],
      model: 'openrouter/free',
      apiKey: null,
      character: { name: 'Aria' },
      adventure: { title: 'Graufurt' },
      combat: { active: false },
      sceneState: { currentSectionTitle: 'Torhaus' },
      runtimeRequestMode: 'runtime_flavor_only',
      onChunk: vi.fn(),
      useProxy: true,
    })).rejects.toThrow('Keine aktive Session')
  })

  it('lists local Ollama models from api tags', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: 'llama3.2:latest' }, { name: 'qwen3:8b' }],
      }),
    })

    const models = await fetchOllamaModels('http://localhost:11434/')

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags')
    expect(models).toEqual([{ name: 'llama3.2:latest' }, { name: 'qwen3:8b' }])
  })

  it('tests local Ollama connectivity without requiring an OpenRouter key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
      }),
    })

    const result = await testConnection('', 'llama3.2', {
      provider: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
    })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(result).toBe('OK')
  })
})
