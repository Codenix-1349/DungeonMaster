import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID, normalizeModelId, ensureFreeUnlessExplicit } from '../services/models'
import {
  DEFAULT_OLLAMA_MODEL,
  AI_PROVIDER_OLLAMA,
  AI_PROVIDER_OPENROUTER,
  normalizeAiProvider,
  normalizeOllamaBaseUrl,
} from '../services/aiProviders'
import { useAuth } from './AuthContext'
import { fetchApiConfig, updateApiConfig } from '../services/api'

const ApiConfigContext = createContext(null)

function getStoredOpenRouterModel() {
  const stored = localStorage.getItem('dm_model')
  const safe = ensureFreeUnlessExplicit(stored || DEFAULT_MODEL_ID, AI_PROVIDER_OPENROUTER)
  localStorage.setItem('dm_model', safe)
  return safe
}

export function resolveStoredOllamaModel(modelId = '') {
  const normalized = String(modelId || '').trim()
  if (!normalized) return DEFAULT_OLLAMA_MODEL

  const normalizedOpenRouterModel = normalizeModelId(normalized, AI_PROVIDER_OPENROUTER)
  const isKnownOpenRouterModel = AVAILABLE_MODELS.some(model => model.id === normalizedOpenRouterModel)

  return isKnownOpenRouterModel ? DEFAULT_OLLAMA_MODEL : normalized
}

function getStoredOllamaModel() {
  const safe = resolveStoredOllamaModel(localStorage.getItem('dm_ollamaModel'))
  localStorage.setItem('dm_ollamaModel', safe)
  return safe
}

function getInitialProvider() {
  const provider = normalizeAiProvider(localStorage.getItem('dm_aiProvider') || AI_PROVIDER_OPENROUTER)
  localStorage.setItem('dm_aiProvider', provider)
  return provider
}

function getInitialModel(provider) {
  return provider === AI_PROVIDER_OLLAMA
    ? getStoredOllamaModel()
    : getStoredOpenRouterModel()
}

export function ApiConfigProvider({ children }) {
  const { isLoggedIn } = useAuth()
  const initialProvider = getInitialProvider()

  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('dm_apiKey') || '')
  const [hasServerKey, setHasServerKey] = useState(false)
  const [serverKeyHint, setServerKeyHint] = useState(null)
  const [aiProvider, setAiProviderState] = useState(initialProvider)
  const [selectedModel, setSelectedModelState] = useState(() => getInitialModel(initialProvider))
  const [ollamaBaseUrl, setOllamaBaseUrlState] = useState(() => normalizeOllamaBaseUrl(localStorage.getItem('dm_ollamaBaseUrl')))

  // Load config from backend on mount when logged in
  useEffect(() => {
    if (!isLoggedIn) return
    fetchApiConfig()
      .then(cfg => {
        setHasServerKey(cfg.hasKey)
        setServerKeyHint(cfg.keyHint || null)
        if (cfg.modelId) {
          // Safeguard: never auto-switch to a paid model from server config
          const safe = ensureFreeUnlessExplicit(cfg.modelId, AI_PROVIDER_OPENROUTER)
          localStorage.setItem('dm_model', safe)
          if (aiProvider === AI_PROVIDER_OPENROUTER) {
            setSelectedModelState(safe)
          }
        }
        // When server has the key, clear it from localStorage (avoid plaintext leak)
        if (cfg.hasKey) {
          localStorage.removeItem('dm_apiKey')
          setApiKeyState('')
        }
      })
      .catch(() => {})
  }, [isLoggedIn, aiProvider])

  const setApiKey = useCallback(async (key) => {
    if (isLoggedIn) {
      // Logged-in users: send to server only, don't persist locally
      setApiKeyState('')
      await updateApiConfig({ apiKey: key })
      setHasServerKey(!!key)
      if (key && key.length > 8) {
        setServerKeyHint(key.slice(0, 5) + '...' + key.slice(-3))
      } else {
        setServerKeyHint(null)
      }
      localStorage.removeItem('dm_apiKey')
    } else {
      // Not logged in: localStorage is the only storage
      setApiKeyState(key)
      localStorage.setItem('dm_apiKey', key)
    }
  }, [isLoggedIn])

  const setSelectedModel = useCallback((model) => {
    const normalized = normalizeModelId(model, aiProvider)
    setSelectedModelState(normalized)
    if (aiProvider === AI_PROVIDER_OLLAMA) {
      localStorage.setItem('dm_ollamaModel', normalized)
      return
    }

    localStorage.setItem('dm_model', normalized)
    if (isLoggedIn && aiProvider === AI_PROVIDER_OPENROUTER) {
      updateApiConfig({ modelId: normalized }).catch(() => {})
    }
  }, [aiProvider, isLoggedIn])

  const setAiProvider = useCallback((provider) => {
    const normalized = normalizeAiProvider(provider)
    localStorage.setItem('dm_aiProvider', normalized)
    setAiProviderState(normalized)
    setSelectedModelState(getInitialModel(normalized))
  }, [])

  const setOllamaBaseUrl = useCallback((value) => {
    const normalized = normalizeOllamaBaseUrl(value)
    setOllamaBaseUrlState(normalized)
    localStorage.setItem('dm_ollamaBaseUrl', normalized)
  }, [])

  // True when API calls can be made (either direct key or server proxy)
  const apiReady = aiProvider === AI_PROVIDER_OLLAMA
    ? Boolean(ollamaBaseUrl && selectedModel)
    : !!(apiKey || hasServerKey)

  return (
    <ApiConfigContext.Provider value={{
      apiKey,
      setApiKey,
      aiProvider,
      setAiProvider,
      ollamaBaseUrl,
      setOllamaBaseUrl,
      selectedModel,
      setSelectedModel,
      hasServerKey,
      serverKeyHint,
      apiReady,
    }}>
      {children}
    </ApiConfigContext.Provider>
  )
}

export function useApiConfig() {
  const ctx = useContext(ApiConfigContext)
  if (!ctx) throw new Error('useApiConfig must be used within ApiConfigProvider')
  return ctx
}
