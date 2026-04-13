import { beforeEach, describe, expect, it, vi } from 'vitest'

const streamChatProxy = vi.fn()
const testChatConnection = vi.fn()
const normalizeModelId = vi.fn(model => `normalized:${model}`)
const normalizeAssistantResponse = vi.fn(text => `normalized:${text}`)
const buildSystemPrompt = vi.fn(() => 'SYSTEM PROMPT')

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

const { sendMessage } = await import('../services/openrouterTransport.js')

describe('openrouterTransport proxy prompt authority', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends raw chat history plus prompt context to the proxy', async () => {
    streamChatProxy.mockResolvedValue('Erzaehlung')

    const messages = [
      { role: 'user', content: 'Ich oeffne die Tuer.' },
      { role: 'assistant', content: 'Die Scharniere knarren.' },
    ]
    const character = { name: 'Aria' }
    const adventure = { title: 'Graufurt' }
    const combat = { active: false }
    const sceneState = { currentSectionTitle: 'Torhaus' }
    const onChunk = vi.fn()

    const result = await sendMessage({
      messages,
      model: 'openrouter/free',
      apiKey: null,
      character,
      adventure,
      combat,
      sceneState,
      onChunk,
      useProxy: true,
    })

    expect(streamChatProxy).toHaveBeenCalledTimes(1)
    expect(streamChatProxy).toHaveBeenCalledWith({
      messages,
      model: 'normalized:openrouter/free',
      temperature: 0.6,
      maxTokens: 1800,
      promptContext: {
        character,
        adventure,
        combat,
        sceneState,
      },
      onChunk: null,
    })
    expect(buildSystemPrompt).not.toHaveBeenCalled()
    expect(onChunk).toHaveBeenCalledWith('normalized:Erzaehlung')
    expect(result).toBe('normalized:Erzaehlung')
  })
})
