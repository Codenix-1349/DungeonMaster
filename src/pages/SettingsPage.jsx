import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../context/SoundContext'

import {
  AVAILABLE_MODELS,
  fetchModelCatalog,
  fetchOllamaModels,
  getModelMeta,
  getModelPricingDisplay,
  isPaidModel,
  testConnection,
} from '../services/openrouter'
import {
  AI_PROVIDER_OLLAMA,
  AI_PROVIDER_OPENROUTER,
  normalizeOllamaBaseUrl,
} from '../services/aiProviders'
import { PROJECT_NAME } from '../data/srd'

function pricingText(pricing) {
  if (!pricing) return 'Preise werden geladen oder konnten nicht ermittelt werden.'
  return `Input ${pricing.prompt} · Output ${pricing.completion}`
}

function providerCardClass(selected) {
  return selected
    ? 'border-gold-600/60 bg-gold-600/10'
    : 'border-stone-800 hover:border-stone-600'
}

export default function SettingsPage() {
  const {
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
  } = useGame()
  const { isLoggedIn, user, logout } = useAuth()
  const { musicVolume, sfxVolume, setMusicVolume, setSfxVolume, playSfx, playMusic } = useSound()

  useEffect(() => { playMusic('landing') }, [playMusic])

  const [keyInput, setKeyInput] = useState(apiKey)
  const [baseUrlInput, setBaseUrlInput] = useState(ollamaBaseUrl)
  const [ollamaModelInput, setOllamaModelInput] = useState(selectedModel)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [modelCatalog, setModelCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [ollamaModels, setOllamaModels] = useState([])
  const [ollamaLoading, setOllamaLoading] = useState(false)
  const [ollamaError, setOllamaError] = useState('')

  useEffect(() => {
    setKeyInput(apiKey)
  }, [apiKey])

  useEffect(() => {
    setBaseUrlInput(ollamaBaseUrl)
  }, [ollamaBaseUrl])

  useEffect(() => {
    setOllamaModelInput(selectedModel)
  }, [selectedModel, aiProvider])

  useEffect(() => {
    if (aiProvider !== AI_PROVIDER_OPENROUTER) {
      setModelCatalog([])
      setCatalogLoading(false)
      setCatalogError('')
      return
    }

    let cancelled = false

    async function loadCatalog() {
      setCatalogLoading(true)
      setCatalogError('')

      try {
        const catalog = await fetchModelCatalog(apiKey || keyInput.trim())
        if (!cancelled) {
          setModelCatalog(catalog)
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(error.message || 'Modellpreise konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false)
        }
      }
    }

    loadCatalog()

    return () => {
      cancelled = true
    }
  }, [aiProvider, apiKey, keyInput])

  useEffect(() => {
    if (aiProvider !== AI_PROVIDER_OLLAMA) {
      setOllamaModels([])
      setOllamaLoading(false)
      setOllamaError('')
      return
    }

    const baseUrl = normalizeOllamaBaseUrl(baseUrlInput || ollamaBaseUrl)
    let cancelled = false

    async function loadOllama() {
      setOllamaLoading(true)
      setOllamaError('')

      try {
        const models = await fetchOllamaModels(baseUrl)
        if (!cancelled) {
          setOllamaModels(models)
        }
      } catch (error) {
        if (!cancelled) {
          setOllamaModels([])
          setOllamaError(error.message || 'Lokale Ollama-Modelle konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) {
          setOllamaLoading(false)
        }
      }
    }

    loadOllama()

    return () => {
      cancelled = true
    }
  }, [aiProvider, baseUrlInput, ollamaBaseUrl])

  const selectedMeta = useMemo(
    () => getModelMeta(selectedModel, aiProvider),
    [selectedModel, aiProvider]
  )
  const selectedPricing = useMemo(
    () => getModelPricingDisplay(modelCatalog, selectedModel, aiProvider),
    [modelCatalog, selectedModel, aiProvider]
  )
  const selectedIsPaid = aiProvider === AI_PROVIDER_OPENROUTER && isPaidModel(selectedModel, aiProvider)

  const handleSave = async () => {
    try {
      if (aiProvider === AI_PROVIDER_OPENROUTER) {
        await setApiKey(keyInput.trim())
        setTestResult({ type: 'success', msg: 'OpenRouter-Key gespeichert.' })
      } else {
        const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrlInput)
        const model = ollamaModelInput.trim()
        if (!model) {
          setTestResult({ type: 'error', msg: 'Bitte ein lokales Ollama-Modell angeben.' })
          return
        }
        setOllamaBaseUrl(normalizedBaseUrl)
        setSelectedModel(model)
        setTestResult({ type: 'success', msg: 'Ollama-Konfiguration gespeichert.' })
      }
      setTimeout(() => setTestResult(null), 3000)
    } catch (error) {
      setTestResult({ type: 'error', msg: `✕ Fehler: ${error.message}` })
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      if (aiProvider === AI_PROVIDER_OPENROUTER) {
        const useProxy = isLoggedIn && (hasServerKey || keyInput.trim())
        if (!useProxy && !keyInput.trim()) {
          setTestResult({ type: 'error', msg: 'Bitte OpenRouter-Key eingeben.' })
          return
        }

        if (keyInput.trim()) {
          await setApiKey(keyInput.trim())
        }

        const msg = await testConnection(keyInput.trim(), selectedModel, {
          provider: aiProvider,
          useProxy,
        })
        setTestResult({
          type: 'success',
          msg: `✓ Verbindung erfolgreich: "${msg}"`,
        })
        return
      }

      const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrlInput)
      const model = ollamaModelInput.trim()
      if (!model) {
        setTestResult({ type: 'error', msg: 'Bitte ein lokales Ollama-Modell angeben.' })
        return
      }

      const msg = await testConnection('', model, {
        provider: aiProvider,
        ollamaBaseUrl: normalizedBaseUrl,
      })
      setOllamaBaseUrl(normalizedBaseUrl)
      setSelectedModel(model)
      setTestResult({
        type: 'success',
        msg: `✓ Ollama erreichbar: "${msg}"`,
      })
    } catch (e) {
      setTestResult({ type: 'error', msg: `✕ Fehler: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  const handleProviderChange = (provider) => {
    setAiProvider(provider)
    setTestResult(null)
  }

  const handleModelChange = (modelId) => {
    const nextMeta = getModelMeta(modelId, aiProvider)
    const nextPricing = getModelPricingDisplay(modelCatalog, modelId, aiProvider)

    if (nextMeta?.isPaid) {
      const confirmed = window.confirm(
        `Achtung: "${nextMeta.name}" ist kostenpflichtig.\n\n` +
        `${nextPricing ? `Aktuelle OpenRouter-Preise: ${pricingText(nextPricing)}.\n\n` : ''}` +
        `Dieses Modell liefert in der Regel deutlich besseres Storytelling, logischere Antworten, natürlichere Sprache und kreativere Szenen.\n\n` +
        `Es kann aber dein OpenRouter-Guthaben bzw. deine freie Allowance belasten.\n` +
        `Auch "Verbindung testen" sendet einen echten API-Request.\n\n` +
        `Trotzdem umschalten?`
      )

      if (!confirmed) return
    }

    setSelectedModel(modelId)
    setTestResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title text-3xl mb-2">Einstellungen</h1>
        <p className="font-body text-stone-500 italic">
          Konfiguriere deinen KI-Zugang und das Modell für {PROJECT_NAME}.
        </p>
      </div>

      <div className="panel p-6 mb-6">
        <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">KI-Anbieter</h2>
        <p className="font-body text-sm text-stone-500 italic mb-4">
          OpenRouter bleibt für Server-Keys und Hosted-Modelle erhalten. Ollama lokal erlaubt branchweises Testen ohne OpenRouter-Rate-Limits.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleProviderChange(AI_PROVIDER_OPENROUTER)}
            className={`rounded border p-4 text-left transition-all duration-200 ${providerCardClass(aiProvider === AI_PROVIDER_OPENROUTER)}`}
          >
            <p className="font-heading text-sm text-parchment mb-1">OpenRouter</p>
            <p className="font-body text-sm text-stone-400">
              Gehostete Modelle, optional serverseitiger Key, bestehender Proxy-Pfad.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange(AI_PROVIDER_OLLAMA)}
            className={`rounded border p-4 text-left transition-all duration-200 ${providerCardClass(aiProvider === AI_PROVIDER_OLLAMA)}`}
          >
            <p className="font-heading text-sm text-parchment mb-1">Ollama lokal</p>
            <p className="font-body text-sm text-stone-400">
              Lokaler Dienst auf deinem Rechner, kein OpenRouter-Key nötig, ideal zum Testen ohne Allowance.
            </p>
          </button>
        </div>
      </div>

      {aiProvider === AI_PROVIDER_OPENROUTER && (
        <>
          <div className="panel-gold p-6 mb-6">
            <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">OpenRouter API Key</h2>
            <p className="font-body text-sm text-stone-500 italic mb-4">
              {isLoggedIn
                ? 'Dein Key wird verschlüsselt auf dem Server gespeichert.'
                : 'Dein Key wird ausschließlich im lokalen Browser-Speicher abgelegt.'
              }{' '}
              Hol dir einen Key auf{' '}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-500 hover:text-gold-300 underline"
              >
                openrouter.ai
              </a>.
            </p>

            {isLoggedIn && hasServerKey && (
              <div className="mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-body text-xs text-emerald-500">
                  Server-Key aktiv{serverKeyHint ? ` (${serverKeyHint})` : ''}
                </span>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="input-dark pr-10 font-body"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleSave} className="btn-primary">Speichern</button>
              <button onClick={handleTest} disabled={testing} className="btn-ghost">
                {testing ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner w-4 h-4" /> Teste…
                  </span>
                ) : '🔌 Verbindung testen'}
              </button>
            </div>

            {apiKey && apiKey === keyInput && (
              <div className="mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-body text-xs text-emerald-500">API Key aktiv</span>
              </div>
            )}

            <div className="mt-4 rounded border border-amber-700/40 bg-amber-900/10 p-3">
              <p className="font-body text-sm text-amber-200">
                Hinweis: <span className="font-semibold">"Verbindung testen" ist ein echter API-Call.</span>{' '}
                Bei kostenpflichtigen Modellen kann selbst der Test OpenRouter-Guthaben oder Allowance verbrauchen.
              </p>
            </div>
          </div>

          <div className="panel p-5 mb-6">
            <h2 className="font-heading text-lg text-gold-400 mb-3 tracking-wide">Aktuell ausgewähltes Modell</h2>

            <div className={`rounded border p-4 ${
              selectedIsPaid
                ? 'border-amber-700/50 bg-amber-900/10'
                : 'border-emerald-700/40 bg-emerald-900/10'
            }`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="font-heading text-parchment">{selectedMeta.name}</p>
                  <p className="font-body text-xs text-stone-500">{selectedMeta.id}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-heading tracking-wide ${
                  selectedIsPaid
                    ? 'bg-amber-900/30 text-amber-300 border border-amber-700/50'
                    : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50'
                }`}>
                  {selectedMeta.badge}
                </span>
              </div>

              <p className="font-body text-sm text-stone-300 mb-2">{selectedMeta.description}</p>

              <p className="font-body text-sm text-stone-400">
                {catalogLoading ? 'OpenRouter-Preise werden geladen…' : pricingText(selectedPricing)}
              </p>

              {selectedPricing?.contextLength && (
                <p className="font-body text-xs text-stone-500 mt-1">
                  Kontextfenster: {selectedPricing.contextLength.toLocaleString()} Tokens
                </p>
              )}
            </div>
          </div>

          <div className="panel p-6 mb-6">
            <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">KI-Modell</h2>
            <p className="font-body text-sm text-stone-500 italic mb-4">
              Standard ist kostenlos. Kostenpflichtige Modelle sind meist deutlich besser bei Storytelling, Logik, Stil und Kreativität.
            </p>

            <div className="flex flex-col gap-3">
              {AVAILABLE_MODELS.map(model => {
                const pricing = getModelPricingDisplay(modelCatalog, model.id, aiProvider)
                const selected = selectedModel === model.id

                return (
                  <label
                    key={model.id}
                    className={`flex items-start gap-3 p-4 rounded border cursor-pointer transition-all duration-200 ${
                      selected
                        ? 'border-gold-600/60 bg-gold-600/10'
                        : 'border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={model.id}
                      checked={selected}
                      onChange={() => handleModelChange(model.id)}
                      className="hidden"
                    />

                    <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                      selected ? 'border-gold-500' : 'border-stone-600'
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-gold-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-sm text-parchment">{model.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-heading tracking-wide ${
                          model.isPaid
                            ? 'bg-amber-900/30 text-amber-300 border border-amber-700/50'
                            : 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50'
                        }`}>
                          {model.badge}
                        </span>
                      </div>

                      <p className="font-body text-xs text-stone-600 mt-1">{model.id}</p>
                      <p className="font-body text-sm text-stone-400 mt-2">{model.description}</p>

                      <p className="font-body text-xs text-stone-500 mt-2">
                        {catalogLoading ? 'Preise werden geladen…' : pricingText(pricing)}
                      </p>

                      {pricing?.contextLength && (
                        <p className="font-body text-xs text-stone-600 mt-1">
                          Kontextfenster: {pricing.contextLength.toLocaleString()} Tokens
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>

            {catalogError && (
              <div className="mt-4 rounded border border-blood-500/40 bg-blood-500/10 p-3">
                <p className="font-body text-sm text-red-400">{catalogError}</p>
              </div>
            )}
          </div>
        </>
      )}

      {aiProvider === AI_PROVIDER_OLLAMA && (
        <>
          <div className="panel-gold p-6 mb-6">
            <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">Ollama lokal</h2>
            <p className="font-body text-sm text-stone-500 italic mb-4">
              Kein API-Key nötig. Der Browser spricht direkt mit deinem lokalen Ollama-Dienst, standardmäßig auf <span className="text-stone-300">http://localhost:11434</span>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block font-heading text-sm text-parchment mb-1">Base URL</label>
                <input
                  type="text"
                  value={baseUrlInput}
                  onChange={e => setBaseUrlInput(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="input-dark font-body"
                />
              </div>

              <div>
                <label className="block font-heading text-sm text-parchment mb-1">Lokales Modell</label>
                <input
                  type="text"
                  value={ollamaModelInput}
                  onChange={e => setOllamaModelInput(e.target.value)}
                  placeholder="z. B. llama3.2 oder qwen3"
                  className="input-dark font-body"
                />
                <p className="font-body text-xs text-stone-500 mt-2">
                  Vorher lokal ziehen, z. B. <span className="text-stone-300">ollama pull llama3.2</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} className="btn-primary">Speichern</button>
              <button onClick={handleTest} disabled={testing} className="btn-ghost">
                {testing ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner w-4 h-4" /> Teste…
                  </span>
                ) : '🔌 Verbindung testen'}
              </button>
            </div>

            <div className="mt-4 rounded border border-emerald-700/40 bg-emerald-900/10 p-3">
              <p className="font-body text-sm text-emerald-300">
                Dieser Pfad geht lokal über dein Gerät und verbraucht keine OpenRouter-Allowance.
              </p>
            </div>
          </div>

          <div className="panel p-5 mb-6">
            <h2 className="font-heading text-lg text-gold-400 mb-3 tracking-wide">Aktuelles Ollama-Ziel</h2>
            <div className="rounded border border-emerald-700/40 bg-emerald-900/10 p-4">
              <p className="font-heading text-parchment">{selectedMeta.name || 'Kein Modell gewählt'}</p>
              <p className="font-body text-xs text-stone-500 mt-1">
                Base URL: {normalizeOllamaBaseUrl(baseUrlInput || ollamaBaseUrl)}
              </p>
              <p className="font-body text-sm text-stone-400 mt-2">
                Lokaler Ollama-Transport mit OpenAI-kompatiblem Chat-Endpunkt.
              </p>
            </div>
          </div>

          <div className="panel p-6 mb-6">
            <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">Lokale Modelle</h2>
            <p className="font-body text-sm text-stone-500 italic mb-4">
              Gefundene Modelle aus deinem lokalen Ollama. Ein Klick übernimmt den Namen in das Modellfeld.
            </p>

            {ollamaLoading ? (
              <p className="font-body text-sm text-stone-400">Lokale Modelle werden geladen…</p>
            ) : ollamaModels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ollamaModels.map(model => {
                  const modelName = String(model?.name || '').trim()
                  if (!modelName) return null
                  const selected = ollamaModelInput.trim() === modelName
                  return (
                    <button
                      key={modelName}
                      type="button"
                      onClick={() => setOllamaModelInput(modelName)}
                      className={`px-3 py-2 rounded border text-sm transition-all duration-150 ${
                        selected
                          ? 'border-gold-500 bg-gold-600/10 text-gold-300'
                          : 'border-stone-700 text-stone-300 hover:border-stone-500'
                      }`}
                    >
                      {modelName}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="font-body text-sm text-stone-400">
                Keine lokalen Modelle gefunden. Falls Ollama läuft, ziehe zuerst ein Modell mit <span className="text-stone-300">ollama pull &lt;modell&gt;</span>.
              </p>
            )}

            {ollamaError && (
              <div className="mt-4 rounded border border-blood-500/40 bg-blood-500/10 p-3">
                <p className="font-body text-sm text-red-400">{ollamaError}</p>
              </div>
            )}
          </div>
        </>
      )}

      {testResult && (
        <div
          className={`mb-6 p-3 rounded border font-body text-sm ${
            testResult.type === 'success'
              ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400'
              : 'bg-blood-500/10 border-blood-500/50 text-red-400'
          }`}
        >
          {testResult.msg}
        </div>
      )}

      <div className="panel-gold p-6 mb-6">
        <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">Sound</h2>
        <p className="font-body text-sm text-stone-500 italic mb-4">
          Musik und Soundeffekte getrennt regeln. Bei 0% ist der jeweilige Kanal stumm.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-heading text-sm text-parchment">Musik</label>
              <span className="font-heading text-sm text-gold-400">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={e => setMusicVolume(parseFloat(e.target.value))}
              className="w-full accent-gold-500 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-heading text-sm text-parchment">Soundeffekte</label>
              <span className="font-heading text-sm text-gold-400">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={e => setSfxVolume(parseFloat(e.target.value))}
                className="flex-1 accent-gold-500 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer"
              />
              <button
                onClick={() => playSfx('lock')}
                className="btn-ghost text-xs px-2 py-1 flex-shrink-0"
              >
                Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoggedIn && (
        <div className="panel-gold p-6 mb-6">
          <h2 className="font-heading text-lg text-gold-400 mb-1 tracking-wide">Konto</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-parchment">{user?.username || user?.email}</p>
              <p className="font-body text-xs text-stone-500">{user?.email}</p>
            </div>
            <button onClick={logout} className="btn-ghost text-sm">
              Abmelden
            </button>
          </div>
        </div>
      )}

      <div className="panel p-5">
        <h2 className="font-heading text-sm text-gold-600 mb-3 tracking-wide">Hinweise</h2>
        <ul className="font-body text-sm text-stone-500 space-y-2 italic">
          {isLoggedIn ? (
            <>
              <li>• Deine Daten werden sicher auf dem Server gespeichert (verschlüsselt).</li>
              <li>• OpenRouter-Keys werden serverseitig verschlüsselt gespeichert.</li>
            </>
          ) : (
            <li>• Alle Daten (Charakter, Abenteuer, Spielstand) werden lokal im Browser gespeichert.</li>
          )}
          <li>• OpenRouter ist für gehostete Modelle und den Server-Proxy gedacht.</li>
          <li>• Ollama lokal geht direkt über deinen lokalen Dienst und braucht keinen OpenRouter-Key.</li>
          <li>• OpenRouter-Preise werden live über den Modellkatalog geladen.</li>
          <li>• Kostenpflichtige OpenRouter-Modelle können dein Guthaben oder deine freie Allowance belasten.</li>
          <li>• PDF-Abenteuer werden als Text extrahiert und lokal gespeichert.</li>
        </ul>
      </div>
    </div>
  )
}
