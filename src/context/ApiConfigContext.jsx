import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_MODEL_ID, normalizeModelId, ensureFreeUnlessExplicit } from '../services/models'
import { useAuth } from './AuthContext'
import { fetchApiConfig, updateApiConfig } from '../services/api'

const ApiConfigContext = createContext(null)

function getInitialModel() {
  const stored = localStorage.getItem('dm_model')
  // Safeguard: never auto-load a paid model from storage
  const safe = ensureFreeUnlessExplicit(stored || DEFAULT_MODEL_ID)
  localStorage.setItem('dm_model', safe)
  return safe
}

export function ApiConfigProvider({ children }) {
  const { isLoggedIn } = useAuth()

  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('dm_apiKey') || '')
  const [hasServerKey, setHasServerKey] = useState(false)
  const [serverKeyHint, setServerKeyHint] = useState(null)
  const [selectedModel, setSelectedModelState] = useState(getInitialModel)

  // Load config from backend on mount when logged in
  useEffect(() => {
    if (!isLoggedIn) return
    fetchApiConfig()
      .then(cfg => {
        setHasServerKey(cfg.hasKey)
        setServerKeyHint(cfg.keyHint || null)
        if (cfg.modelId) {
          // Safeguard: never auto-switch to a paid model from server config
          const safe = ensureFreeUnlessExplicit(cfg.modelId)
          setSelectedModelState(safe)
          localStorage.setItem('dm_model', safe)
        }
        // When server has the key, clear it from localStorage (avoid plaintext leak)
        if (cfg.hasKey) {
          localStorage.removeItem('dm_apiKey')
          setApiKeyState('')
        }
      })
      .catch(() => {})
  }, [isLoggedIn])

  const setApiKey = useCallback((key) => {
    if (isLoggedIn) {
      // Logged-in users: send to server only, don't persist locally
      setApiKeyState('')
      updateApiConfig({ apiKey: key }).then(() => {
        setHasServerKey(!!key)
        if (key && key.length > 8) {
          setServerKeyHint(key.slice(0, 5) + '...' + key.slice(-3))
        } else {
          setServerKeyHint(null)
        }
        localStorage.removeItem('dm_apiKey')
      }).catch(() => {})
    } else {
      // Not logged in: localStorage is the only storage
      setApiKeyState(key)
      localStorage.setItem('dm_apiKey', key)
    }
  }, [isLoggedIn])

  const setSelectedModel = useCallback((model) => {
    const normalized = normalizeModelId(model)
    setSelectedModelState(normalized)
    localStorage.setItem('dm_model', normalized)
    if (isLoggedIn) {
      updateApiConfig({ modelId: normalized }).catch(() => {})
    }
  }, [isLoggedIn])

  // True when API calls can be made (either direct key or server proxy)
  const apiReady = !!(apiKey || hasServerKey)

  return (
    <ApiConfigContext.Provider value={{
      apiKey,
      setApiKey,
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
