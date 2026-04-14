import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { useSound } from '../context/SoundContext'

async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''

  for (let i = 1; i <= Math.min(pdf.numPages, 200); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    text += pageText + '\n\n'
  }

  return text.trim()
}

async function extractTextFromTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

export default function AdventurePage() {
  const navigate = useNavigate()
  const { adventures, setAdventures, adventure, setAdventure, characters, activeSession, unloadActiveSession } = useGame()
  const { playMusic } = useSound()

  useEffect(() => { playMusic('landing') }, [playMusic])

  const [dragOver, setDragOver] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processMsg, setProcessMsg] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const processFile = useCallback(async (file) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.txt')) {
      setError('Nur PDF und TXT Dateien werden unterstützt.')
      return
    }

    setProcessing(true)
    setError('')
    setProcessMsg(`Verarbeite "${file.name}"…`)

    try {
      let text = ''
      if (name.endsWith('.pdf')) {
        setProcessMsg('Extrahiere Text aus PDF…')
        text = await extractTextFromPDF(file)
      } else {
        text = await extractTextFromTXT(file)
      }

      const title = file.name.replace(/\.(pdf|txt)$/i, '')
      const newAdventure = {
        id: Date.now().toString(),
        title,
        filename: file.name,
        text: text.substring(0, 50000),
        addedAt: new Date().toISOString(),
        pages: name.endsWith('.pdf') ? 'PDF' : 'TXT',
        charCount: text.length,
      }

      setAdventures(prev => {
        const filtered = prev.filter(a => a.title !== title)
        return [newAdventure, ...filtered]
      })
      setProcessMsg(`✓ "${title}" erfolgreich geladen!`)
      setTimeout(() => setProcessMsg(''), 3000)
    } catch (e) {
      setError(`Fehler beim Verarbeiten: ${e.message}`)
    } finally {
      setProcessing(false)
    }
  }, [setAdventures])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = [...e.dataTransfer.files]
    if (files[0]) processFile(files[0])
  }, [processFile])

  const handleFileInput = useCallback((e) => {
    if (e.target.files[0]) processFile(e.target.files[0])
  }, [processFile])

  const releaseSessionLock = useCallback(() => {
    if (!activeSession) return true

    const confirmed = window.confirm(
      'Es ist noch eine Session geladen. Sie bleibt gespeichert, wird aber entladen, damit du ein anderes Abenteuer auswählen kannst. Fortfahren?'
    )

    if (!confirmed) return false

    unloadActiveSession()
    return true
  }, [activeSession, unloadActiveSession])

  const selectAdventure = useCallback((adv) => {
    if (activeSession && !releaseSessionLock()) return
    setAdventure(adv)
  }, [activeSession, releaseSessionLock, setAdventure])

  const deleteAdventure = useCallback((id) => {
    const target = adventures.find(entry => entry.id === id)
    if (target?.builtin) return
    setAdventures(prev => prev.filter(a => a.id !== id))
    if (adventure?.id === id && !activeSession) setAdventure(null)
  }, [setAdventures, adventure, setAdventure, activeSession, adventures])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="section-title text-3xl mb-2">Abenteuer-Module</h1>
          <p className="font-body text-stone-500 italic">Lade Abenteuermodule als PDF oder TXT hoch und stelle deine Modulbibliothek für neue Sessions bereit.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge-gold">{adventures.length === 1 ? '1 Modul' : `${adventures.length} Module`}</span>
          <span className="badge-gold">{characters.length === 1 ? '1 Held verfügbar' : `${characters.length} Helden verfügbar`}</span>
          <button onClick={() => navigate('/game?mode=new')} className="btn-primary">Neues Abenteuer vorbereiten</button>
        </div>
      </div>

      {activeSession && (
        <div className="panel-gold p-4 mb-6">
          <p className="section-subtitle mb-1">Session-Sperre</p>
          <p className="font-body text-sm text-stone-400">
            Eine Session ist aktuell geladen. Für eine neue Abenteuer-Auswahl wird diese Session zuerst entladen, aber nicht gelöscht.
          </p>
          <div className="mt-3">
            <button onClick={releaseSessionLock} className="btn-ghost text-xs px-3 py-1.5">Session entladen</button>
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center mb-8 transition-all duration-300 cursor-pointer ${
          dragOver
            ? 'border-gold-500 bg-gold-600/10'
            : 'border-stone-700 hover:border-stone-500'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileInput}
          className="hidden"
        />

        {processing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="spinner w-10 h-10" />
            <p className="font-body text-stone-400 italic">{processMsg}</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">📜</div>
            <p className="font-heading text-lg text-gold-500 mb-2">Abenteuer hier ablegen</p>
            <p className="font-body text-stone-500 italic text-sm">PDF oder TXT · Klicken zum Auswählen</p>
            {processMsg && (
              <p className="font-body text-emerald-400 text-sm mt-3">{processMsg}</p>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="bg-blood-500/10 border border-blood-500/50 rounded p-3 mb-6 text-red-400 font-body text-sm">
          {error}
        </div>
      )}

      {adventure && (
        <div className="panel-gold p-4 mb-6 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl">⚔️</span>
            <div className="min-w-0">
              <p className="section-subtitle">Ausgewähltes Abenteuer</p>
              <p className="font-heading text-parchment truncate">{adventure.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/game?mode=new')} className="btn-primary text-xs">Mit Held neu starten</button>
            {!activeSession && <button onClick={() => setAdventure(null)} className="btn-ghost text-xs">Abwählen</button>}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-heading text-lg text-gold-600 tracking-wide mb-4">
          Bibliothek {adventures.length > 0 && <span className="text-stone-600">({adventures.length})</span>}
        </h2>

        {adventures.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="font-body text-stone-500 italic">Noch keine Abenteuer geladen.</p>
            <p className="font-body text-xs text-stone-600 mt-1">
              Lade ein PDF- oder TXT-Abenteuermodul hoch, um es später gezielt mit einem Helden zu starten.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {adventures.map(adv => (
              <div
                key={adv.id}
                className={`panel p-4 flex flex-col md:flex-row md:items-center gap-4 transition-all duration-200 ${
                  adventure?.id === adv.id ? 'border-gold-600/50' : ''
                }`}
              >
                <div className="text-2xl">
                  {adv.pages === 'PDF' ? '📕' : '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-parchment text-sm leading-tight mb-0.5">{adv.title}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-gold">{adv.pages}</span>
                    {adv.builtin && <span className="badge-gold">Demo</span>}
                    <span className="font-body text-xs text-stone-600">
                      {(adv.charCount || 0).toLocaleString()} Zeichen
                    </span>
                    <span className="font-body text-xs text-stone-700">
                      {new Date(adv.addedAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {adventure?.id !== adv.id ? (
                    <button
                      onClick={() => selectAdventure(adv)}
                      className="btn-primary text-xs px-3 py-1.5"
                      title={activeSession ? 'Lädt die aktuelle Session aus, damit du dieses Abenteuer auswählen kannst.' : undefined}
                    >
                      Auswählen
                    </button>
                  ) : (
                    <span className="badge-green">● Aktiv</span>
                  )}
                  <button onClick={() => navigate('/game?mode=new')} className="btn-ghost text-xs px-3 py-1.5">
                    Neue Session
                  </button>
                  {!adv.builtin && (
                  <button
                    onClick={() => deleteAdventure(adv.id)}
                    className="btn-danger text-xs px-3 py-1.5"
                    title="Abenteuer löschen"
                  >
                    🗑
                  </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
