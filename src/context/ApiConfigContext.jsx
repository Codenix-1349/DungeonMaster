import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { DEFAULT_MODEL_ID, normalizeModelId } from '../services/models'

const ApiConfigContext = createContext(null)

function getInitialModel() {
  const stored = localStorage.getItem('dm_model')
  const normalized = normalizeModelId(stored || DEFAULT_MODEL_ID)
  localStorage.setItem('dm_model', normalized)
  return normalized
}

export function ApiConfigProvider({ children }) {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('dm_apiKey') || '')
  const [selectedModel, setSelectedModelState] = useState(getInitialModel)

  const setApiKey = useCallback((key) => {
    setApiKeyState(key)
    localStorage.setItem('dm_apiKey', key)
  }, [])

  const setSelectedModel = useCallback((model) => {
    const normalized = normalizeModelId(model)
    setSelectedModelState(normalized)
    localStorage.setItem('dm_model', normalized)
  }, [])

  return (
    <ApiConfigContext.Provider value={{
      apiKey,
      setApiKey,
      selectedModel,
      setSelectedModel,
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
