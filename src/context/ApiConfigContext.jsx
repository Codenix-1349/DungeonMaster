import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_MODEL_ID, normalizeModelId } from '../services/models'
import { useAuth } from './AuthContext'
import { fetchApiConfig, updateApiConfig } from '../services/api'

const ApiConfigContext = createContext(null)

function getInitialModel() {
  const stored = localStorage.getItem('dm_model')
  const normalized = normalizeModelId(stored || DEFAULT_MODEL_ID)
  localStorage.setItem('dm_model', normalized)
  return normalized
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
          const normalized = normalizeModelId(cfg.modelId)
          setSelectedModelState(normalized)
          localStorage.setItem('dm_model', normalized)
        }
      })
      .catch(() => {})
  }, [isLoggedIn])

  const setApiKey = useCallback((key) => {
    setApiKeyState(key)
    localStorage.setItem('dm_apiKey', key)
    if (isLoggedIn) {
      updateApiConfig({ apiKey: key }).then(() => {
        setHasServerKey(!!key)
        if (key && key.length > 8) {
          setServerKeyHint(key.slice(0, 5) + '...' + key.slice(-3))
        } else {
          setServerKeyHint(null)
        }
      }).catch(() => {})
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

  return (
    <ApiConfigContext.Provider value={{
      apiKey,
      setApiKey,
      selectedModel,
      setSelectedModel,
      hasServerKey,
      serverKeyHint,
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
