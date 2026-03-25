import React, { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../context/SoundContext'

import {
  AVAILABLE_MODELS,
  fetchModelCatalog,
  getModelMeta,
  getModelPricingDisplay,
  isPaidModel,
  testConnection,
} from '../services/openrouter'
import { PROJECT_NAME } from '../data/srd'

function pricingText(pricing) {
  if (!pricing) return 'Preise werden geladen oder konnten nicht ermittelt werden.'
  return `Input ${pricing.prompt} · Output ${pricing.completion}`
}

export default function SettingsPage() {
  const { apiKey, setApiKey, selectedModel, setSelectedModel, hasServerKey, serverKeyHint } = useGame()
  const { isLoggedIn, user, logout } = useAuth()
  const { musicVolume, sfxVolume, setMusicVolume, setSfxVolume, playSfx, playMusic } = useSound()

  useEffect(() => { playMusic('landing') }, [playMusic])

  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [modelCatalog, setModelCatalog] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
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
  }, [apiKey])

  const selectedMeta = useMemo(() => getModelMeta(selectedModel), [selectedModel])
  const selectedPricing = useMemo(
    () => getModelPricingDisplay(modelCatalog, selectedModel),
    [modelCatalog, selectedModel]
  )

  const handleSave = () => {
    setApiKey(keyInput.trim())
    setTestResult({ type: 'success', msg: 'API Key gespeichert.' })
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleTest = async () => {
    const useProxy = isLoggedIn && (hasServerKey || keyInput.trim())
    if (!useProxy && !keyInput.trim()) {
      setTestResult({ type: 'error', msg: 'Bitte API Key eingeben.' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      // Save key first when logged in so the backend has it
      if (isLoggedIn && keyInput.trim()) {
        setApiKey(keyInput.trim())
      }
      const msg = await testConnection(keyInput.trim(), selectedModel, { useProxy })
      if (!isLoggedIn) setApiKey(keyInput.trim())
      setTestResult({
        type: 'success',
        msg: `✓ Verbindung erfolgreich: „${msg}"`,
      })
    } catch (e) {
      setTestResult({ type: 'error', msg: `✗ Fehler: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  const handleModelChange = (modelId) => {
    const nextMeta = getModelMeta(modelId)
    const nextPricing = getModelPricingDisplay(modelCatalog, modelId)

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

  const selectedIsPaid = isPaidModel(selectedModel)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="section-title text-3xl mb-2">Einstellungen</h1>
        <p className="font-body text-stone-500 italic">
          Konfiguriere deinen API-Zugang und das Modell für {PROJECT_NAME}.
        </p>
      </div>

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

        {testResult && (
          <div
            className={`mt-4 p-3 rounded border font-body text-sm ${
              testResult.type === 'success'
                ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400'
                : 'bg-blood-500/10 border-blood-500/50 text-red-400'
            }`}
          >
            {testResult.msg}
          </div>
        )}

        {apiKey && apiKey === keyInput && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-body text-xs text-emerald-500">API Key aktiv</span>
          </div>
        )}

        <div className="mt-4 rounded border border-amber-700/40 bg-amber-900/10 p-3">
          <p className="font-body text-sm text-amber-200">
            Hinweis: <span className="font-semibold">„Verbindung testen“ ist ein echter API-Call.</span>{' '}
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
            const pricing = getModelPricingDisplay(modelCatalog, model.id)
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
              <li>• Der API-Key wird serverseitig verschlüsselt — er verlässt nie den Server.</li>
            </>
          ) : (
            <li>• Alle Daten (Charakter, Abenteuer, Spielstand) werden lokal im Browser gespeichert.</li>
          )}
          <li>• Die einzige externe Verbindung ist der OpenRouter API-Endpunkt.</li>
          <li>• Die Preisanzeige wird live über den OpenRouter-Modellkatalog geladen.</li>
          <li>• Kostenlos ist gut zum Testen, kann aber qualitativ deutlich schwächer sein.</li>
          <li>• Bezahlmodelle sind meist deutlich besser bei Storytelling, Logik, Konsistenz und Kreativität.</li>
          <li>• Kostenpflichtige Modelle können dein OpenRouter-Guthaben oder deine freie Allowance belasten.</li>
          <li>• PDF-Abenteuer werden als Text extrahiert und lokal gespeichert.</li>
        </ul>
      </div>
    </div>
  )
}