import { describe, expect, it } from 'vitest'
import { resolveStoredOllamaModel } from '../context/ApiConfigContext.jsx'

describe('resolveStoredOllamaModel', () => {
  it('falls back to llama3.2 when no local Ollama model is stored', () => {
    expect(resolveStoredOllamaModel('')).toBe('llama3.2')
    expect(resolveStoredOllamaModel()).toBe('llama3.2')
  })

  it('replaces known OpenRouter model ids with the Ollama default', () => {
    expect(resolveStoredOllamaModel('google/gemma-4-31b-it:free')).toBe('llama3.2')
    expect(resolveStoredOllamaModel('openrouter/free')).toBe('llama3.2')
  })

  it('keeps genuine Ollama model ids unchanged', () => {
    expect(resolveStoredOllamaModel('llama3.2')).toBe('llama3.2')
    expect(resolveStoredOllamaModel('llama3.2:latest')).toBe('llama3.2:latest')
    expect(resolveStoredOllamaModel('hf.co/example/custom-model')).toBe('hf.co/example/custom-model')
  })
})
