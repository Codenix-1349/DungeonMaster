export const AI_PROVIDER_OPENROUTER = 'openrouter'
export const AI_PROVIDER_OLLAMA = 'ollama'

export const OLLAMA_LOCAL_BASE_URL = 'http://localhost:11434'

export function normalizeAiProvider(value = '') {
  return String(value || '').trim().toLowerCase() === AI_PROVIDER_OLLAMA
    ? AI_PROVIDER_OLLAMA
    : AI_PROVIDER_OPENROUTER
}

export function normalizeOllamaBaseUrl(value = '') {
  const trimmed = String(value || '').trim()
  const base = trimmed || OLLAMA_LOCAL_BASE_URL
  return base.replace(/\/+$/, '')
}

export function isOpenRouterProvider(value = '') {
  return normalizeAiProvider(value) === AI_PROVIDER_OPENROUTER
}

export function isOllamaProvider(value = '') {
  return normalizeAiProvider(value) === AI_PROVIDER_OLLAMA
}
