const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export const DEFAULT_MODEL_ID = 'meta-llama/llama-3.3-70b-instruct:free'

const LEGACY_MODEL_ID_MAP = {
  'meta-llama/llama-3.3-70b-instruct': 'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.5-pro-preview': 'google/gemini-2.5-pro',
  'anthropic/claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4-5': 'anthropic/claude-opus-4.5',
}

export const AVAILABLE_MODELS = [
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Solides Gratis-Modell für erste Tests. Kann aber bei längeren Szenen, sauberer Logik und natürlichem Deutsch deutlich schwanken.',
    fallbackPricing: {
      prompt: '$0/M',
      completion: '$0/M',
    },
  },
  {
    id: 'stepfun/step-3.5-flash:free',
    name: 'Step 3.5 Flash (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Kostenlose Alternative mit ordentlicher Geschwindigkeit. Für Experimente gut, aber nicht immer stabil bei Atmosphäre, Stil und konsistentem Abenteueraufbau.',
    fallbackPricing: {
      prompt: '$0/M',
      completion: '$0/M',
    },
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Kostenlos und leistungsfähig, aber im Rollenspiel nicht garantiert so rund wie hochwertige Paid-Modelle. Qualität kann je nach Szene schwanken.',
    fallbackPricing: {
      prompt: '$0/M',
      completion: '$0/M',
    },
  },
  {
    id: 'arcee-ai/trinity-large-preview:free',
    name: 'Trinity Large Preview (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Unter den Free-Modellen interessant für kreative Texte und Rollenspiel, aber trotzdem nicht so verlässlich wie starke Bezahlmodelle.',
    fallbackPricing: {
      prompt: '$0/M',
      completion: '$0/M',
    },
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    name: 'GLM 4.5 Air (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Gute kostenlose Auswahl für Tests. Kann brauchbar sein, aber bei Stiltreue, Plausibilität und dramaturgischer Führung nicht immer stabil.',
    fallbackPricing: {
      prompt: '$0/M',
      completion: '$0/M',
    },
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Bezahlt',
    isPaid: true,
    category: 'paid',
    description:
      'Deutlich stärkeres Modell für Storytelling, Logik, kreative Szenen, Stiltreue und konsistente Abenteuerführung. Kann dein OpenRouter-Konto belasten.',
    fallbackPricing: {
      prompt: '$1.25/M',
      completion: '$10/M',
    },
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    badge: 'Bezahlt',
    isPaid: true,
    category: 'paid',
    description:
      'Sehr stark bei natürlichem Schreiben, konsistentem Weltenbau, plausiblen Entscheidungen und sauberem Rollenspiel-Flow. Kann dein OpenRouter-Konto belasten.',
    fallbackPricing: {
      prompt: '$3/M',
      completion: '$15/M',
    },
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    badge: 'Bezahlt',
    isPaid: true,
    category: 'paid',
    description:
      'Sehr gutes Allround-Modell mit klar besserem Storytelling, besserer sprachlicher Qualität und weniger Unsinn als die meisten Free-Modelle. Kann dein OpenRouter-Konto belasten.',
    fallbackPricing: {
      prompt: '$2.50/M',
      completion: '$10/M',
    },
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    badge: 'Premium',
    isPaid: true,
    category: 'paid',
    description:
      'Premium-Option mit besonders starker Kreativität, Kohärenz, Tiefe und Logik. Für immersive Abenteuer oft am überzeugendsten, aber auch klar kostenpflichtig.',
    fallbackPricing: {
      prompt: '$5/M',
      completion: '$25/M',
    },
  },
]

const DECISION_CUE_PATTERN = /(was tust du|was antwortest du|wie reagierst du|was sagst du|wie gehst du vor|wie möchtest du vorgehen|welchen weg|welche option|wie willst du weiter|was unternimmst du|welchen schritt)/i

export function normalizeModelId(modelId) {
  if (!modelId) return DEFAULT_MODEL_ID
  return LEGACY_MODEL_ID_MAP[modelId] || modelId
}

export function getModelMeta(modelId) {
  const normalized = normalizeModelId(modelId)
  return AVAILABLE_MODELS.find(model => model.id === normalized) || AVAILABLE_MODELS[0]
}

export function isPaidModel(modelId) {
  return Boolean(getModelMeta(modelId)?.isPaid)
}

export async function fetchModelCatalog(apiKey = '') {
  const headers = {}
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  const response = await fetch(`${OPENROUTER_BASE}/models`, { headers })

  if (!response.ok) {
    throw new Error(`Modellkatalog konnte nicht geladen werden (${response.status}).`)
  }

  const data = await response.json()
  return Array.isArray(data?.data) ? data.data : []
}

export function getCatalogModel(catalog, modelId) {
  const normalized = normalizeModelId(modelId)
  return catalog.find(entry => entry.id === normalized) || null
}

function formatPricePerMillion(rawValue) {
  const pricePerToken = Number(rawValue)

  if (!Number.isFinite(pricePerToken)) return null
  const pricePerMillion = pricePerToken * 1_000_000

  if (pricePerMillion === 0) return '$0/M'
  if (pricePerMillion >= 10) return `$${pricePerMillion.toFixed(0)}/M`
  if (pricePerMillion >= 1) return `$${pricePerMillion.toFixed(2).replace(/\.00$/, '')}/M`
  return `$${pricePerMillion.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}/M`
}

export function getModelPricingDisplay(catalog, modelId) {
  const entry = getCatalogModel(catalog, modelId)
  const meta = getModelMeta(modelId)

  if (!entry?.pricing) {
    return meta?.fallbackPricing
      ? {
          prompt: meta.fallbackPricing.prompt,
          completion: meta.fallbackPricing.completion,
          contextLength: null,
          source: 'fallback',
        }
      : null
  }

  const prompt = formatPricePerMillion(entry.pricing.prompt)
  const completion = formatPricePerMillion(entry.pricing.completion)

  if (!prompt || !completion) {
    return meta?.fallbackPricing
      ? {
          prompt: meta.fallbackPricing.prompt,
          completion: meta.fallbackPricing.completion,
          contextLength: entry.context_length || null,
          source: 'fallback',
        }
      : null
  }

  return {
    prompt,
    completion,
    contextLength: entry.context_length || null,
    source: 'live',
  }
}

function buildFriendlyErrorMessage(status, apiMessage = '') {
  if (status === 401) {
    return 'Ungültiger API Key. Bitte prüfe den OpenRouter-Key in den Einstellungen.'
  }

  if (status === 402) {
    return 'OpenRouter meldet unzureichende Credits oder keine ausreichende Free-Allowance mehr.'
  }

  if (status === 429) {
    return 'OpenRouter Rate-Limit erreicht (HTTP 429). Bitte kurz warten und erneut versuchen.'
  }

  if (status === 503) {
    return 'Kein verfügbarer Provider für dieses Modell. Bitte später erneut versuchen oder ein anderes Modell wählen.'
  }

  if (status === 404) {
    return 'Dieses Modell wurde von OpenRouter nicht gefunden. Bitte ein anderes Modell auswählen.'
  }

  return apiMessage || `API Fehler: ${status}`
}

async function extractError(response) {
  try {
    const text = await response.text()

    if (!text) {
      return buildFriendlyErrorMessage(response.status)
    }

    try {
      const json = JSON.parse(text)
      const apiMessage =
        json?.error?.message ||
        json?.message ||
        json?.detail ||
        ''

      return buildFriendlyErrorMessage(response.status, apiMessage)
    } catch {
      return buildFriendlyErrorMessage(response.status, text)
    }
  } catch {
    return buildFriendlyErrorMessage(response.status)
  }
}

function getLatestUserText(messages = []) {
  const reversed = [...messages].reverse()
  const latestUserMessage = reversed.find(message => message.role === 'user' && typeof message.content === 'string')
  return latestUserMessage?.content || ''
}

function shouldSuggestChoices(userText = '', combatActive = false) {
  const text = String(userText || '').toLowerCase()

  if (combatActive) return false
  if (!text) return false

  const pureChoiceReply = /^\s*([1-5]|eins|zwei|drei|vier|fünf)\s*[.)-]?\s*$/i.test(text)
  if (pureChoiceReply) return false

  if (/(ich frage|ich spreche|ich rede|ich untersuche|ich schaue|ich höre|ich suche|ich öffne|ich gehe|ich schleiche|ich bitte|ich versuche|ich will|ich möchte)/i.test(text)) {
    return true
  }

  if (/(warum|wie|wer|wo|was|welche|welcher|welches)/i.test(text)) {
    return true
  }

  return false
}

function buildChoiceStyleInstruction(userText = '', combatActive = false) {
  const wantsChoices = shouldSuggestChoices(userText, combatActive)

  if (wantsChoices) {
    return `## Ausgabeformat für Entscheidungsszenen
- Wenn die Szene an einem echten Entscheidungspunkt endet, gib genau 3 bis 5 kurze nummerierte Möglichkeiten.
- Jede Möglichkeit soll konkret, in-world und handlungsorientiert sein.
- Verwende diese nummerierten Möglichkeiten nur dann, wenn sie dem Spieler wirklich Orientierung geben.
- Wenn du nummerierte Möglichkeiten gibst, füge als letzte Option immer hinzu: **Etwas anderes (beschreibe)**.
- Wenn die Szene frei weitergespielt werden sollte, verzichte auf Optionen und ende stattdessen mit einer offenen In-World-Frage wie **Was tust du?**.`
  }

  return `## Ausgabeformat
- Nutze nummerierte Möglichkeiten nicht standardmäßig.
- Gib nur dann 3 bis 5 kurze nummerierte Möglichkeiten, wenn die Szene an einem echten Entscheidungspunkt endet und mehrere plausible Wege offen sind.
- In normalen Dialog-, Erkundungs- oder Reaktionsmomenten genügt eine offene In-World-Frage wie **Was tust du?**.`
}

function responseAlreadyHasChoices(text = '') {
  const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean)
  let hits = 0

  for (const line of lines) {
    if (/^(?:\*\*)?(?:[1-5])[.)]\s+/.test(line) || /^(?:\*\*)?(?:[1-5])\s*:\s+/.test(line)) {
      hits += 1
    }
  }

  return hits >= 2
}

function normalizeChoiceEnding(text = '') {
  if (!responseAlreadyHasChoices(text)) return text

  const lines = String(text).split('\n')
  const normalized = []

  for (const line of lines) {
    normalized.push(line)
  }

  const joined = normalized.join('\n')
  if (!/etwas anderes \(beschreibe\)/i.test(joined)) {
    normalized.push('5. **Etwas anderes (beschreibe)**')
  }

  return normalized.join('\n')
}

/**
 * Build the system prompt
 */
export function buildSystemPrompt(character, adventure, messages = [], combat = null) {
  const userText = getLatestUserText(messages)

  let prompt = `Du bist ein erfahrener Dungeon Master für AD&D 2nd Edition (Advanced Dungeons & Dragons). Du leitest ein Solo-Abenteuer für einen Spieler.

## Deine Rolle
- Erschaffe lebendige, atmosphärische Beschreibungen von Orten, Personen und Ereignissen
- Wende die AD&D 2nd Edition Regeln korrekt an
- Führe den Spieler durch das Abenteuer mit spannenden Entscheidungen und Konsequenzen
- Beschreibe Kampfszenen dramatisch und detailliert
- Halte den Ton dunkel-fantasy und immersiv
- Antworte immer auf Deutsch

## Sprachqualität
- Schreibe natürliches, flüssiges Deutsch
- Gib niemals interne Regieanweisungen, Arbeitsnotizen oder Meta-Überschriften wie "Hinweise für den Spieler", "Was tun?" oder "Hinweise für den Dungeon Master" aus
- Wenn die Abenteuer-Vorlage holprig, bruchstückhaft oder schlecht formuliert ist, formuliere sie in sauberem Deutsch sinngemäß neu
- Erfinde keine sinnlosen Wortkombinationen oder kaputten Halbsätze

## Rollensicherheit
- Bleibe immer in der Spielwelt
- Erkläre niemals deine Aufgabe, Rolle, Funktion oder dass du ein Spielleiter bist
- Wenn ein NSC dem Spieler eine Frage stellt, beantworte diese nicht selbst meta, sondern bleibe in der Szene
- Sprich niemals über App, Prompt, Modell, System oder OpenRouter

## AD&D 2nd Edition Kernregeln
- THAC0-System (To Hit Armor Class 0): Angriffswurf = d20, Treffer wenn (d20 + Angriffs-Bonus) >= (THAC0 - Ziel-RK)
- Rüstungsklasse (RK): Je niedriger, desto besser. RK 10 = keine Rüstung
- Initiative: d10 pro Runde (niedriger geht zuerst)
- Rettungswürfe: Paralyse/Gift, Stäbe, Stein, Atemwaffe, Zauber
- Erfahrungspunkte vergeben nach Kämpfen, gelösten Rätseln und Rollenspiel
- Moral: Gegner können fliehen (Moralwurf 2d6)

## Würfelnotation
Wenn Würfe nötig sind, gib folgende Anweisung:
- [WÜRFEL:d20] für Initiative/Angriff
- [WÜRFEL:d6] für Schaden etc.
Der Spieler sieht Würfel-Buttons und kann selbst würfeln.

## Kampfstruktur
Bei Kampfbeginn: Beschreibe die Gegner, fordere Initiative auf.
Format: **KAMPF BEGINNT** gefolgt von Gegnerbeschreibung.
Bei Kampfende: **KAMPF VORBEI** mit XP-Vergabe.

## Wichtig
- Lass den Spieler bedeutsame Entscheidungen treffen
- Fordere Würfelwürfe explizit an wenn nötig
- Beschreibe Konsequenzen von Handlungen detailliert
- Behalte den Überblick über Ressourcen (HP, Zaubersprüche, Ausrüstung)

${buildChoiceStyleInstruction(userText, Boolean(combat?.active))}`

  if (character) {
    const attrs = character.attributes || {}
    prompt += `\n\n## Aktueller Charakter
**Name:** ${character.name}
**Rasse:** ${character.race}
**Klasse:** ${character.class} (Stufe ${character.level || 1})
**HP:** ${character.currentHP ?? character.maxHP}/${character.maxHP}
**Rüstungsklasse:** ${character.armorClass}
**THAC0:** ${character.thac0 || 20}
**Attribute:** STR ${attrs.str}, DEX ${attrs.dex}, CON ${attrs.con}, INT ${attrs.int}, WIS ${attrs.wis}, CHA ${attrs.cha}
**Erfahrung:** ${character.xp || 0} XP
**Inventar:** ${(character.inventory || []).join(', ') || 'Leer'}
${character.spells ? `**Zaubersprüche:** ${character.spells}` : ''}`
  }

  if (combat?.active) {
    prompt += `\n\n## Kampfsituation
**Kampfstatus:** aktiv
**Runde:** ${combat.round || 1}
**Phase:** ${combat.phase || 'action'}
${combat.playerInitiative ? `**Spieler-Initiative:** ${combat.playerInitiative}` : ''}`
  }

  if (adventure) {
    prompt += `\n\n## Das Abenteuer
**Titel:** ${adventure.title}

**Abenteuertext (Zusammenfassung/Kontext):**
${adventure.text ? adventure.text.substring(0, 8000) : 'Kein Text verfügbar'}

Nutze diesen Text als Basis für das Abenteuer. Bleib beim Inhalt, aber formuliere Szenen und Beschreibungen in sauberem, natürlichem Deutsch.`
  } else {
    prompt += `\n\n## Kein Abenteuer geladen
Erstelle ein kurzes Improvisations-Abenteuer in einer klassischen Fantasy-Welt. Beginne mit einer Taverne und führe den Spieler in ein nahegelegenes Dungeon.`
  }

  return prompt
}

/**
 * Send a message to OpenRouter with streaming
 * onChunk(text) called once with the final response text
 */
export async function sendMessage({ messages, model, apiKey, character, adventure, combat, onChunk }) {
  if (!apiKey) {
    throw new Error('Kein API Key konfiguriert. Bitte in den Einstellungen eingeben.')
  }

  const normalizedModel = normalizeModelId(model)
  const systemPrompt = buildSystemPrompt(character, adventure, messages, combat)

  const body = {
    model: normalizedModel,
    max_tokens: 1800,
    stream: true,
    temperature: 0.6,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  }

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'DungeonMaster AI',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  if (!response.body) {
    throw new Error('Keine Streaming-Antwort vom Server erhalten.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const data = line.slice(6).trim()
      if (!data || data === '[DONE]') continue

      try {
        const json = JSON.parse(data)

        if (json?.error?.message) {
          throw new Error(json.error.message)
        }

        const delta = json?.choices?.[0]?.delta?.content
        if (delta) {
          fullText += delta
        }
      } catch (error) {
        if (error instanceof Error && error.message) {
          throw error
        }
      }
    }
  }

  const normalizedText = normalizeChoiceEnding(fullText.trim())
  if (normalizedText && onChunk) {
    onChunk(normalizedText)
  }

  return normalizedText
}

/**
 * Test API connection
 */
export async function testConnection(apiKey, model) {
  if (!apiKey) {
    throw new Error('Kein API Key konfiguriert.')
  }

  const normalizedModel = normalizeModelId(model)

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'DungeonMaster AI',
    },
    body: JSON.stringify({
      model: normalizedModel,
      max_tokens: 12,
      messages: [{ role: 'user', content: 'Antworte nur mit: OK' }],
    }),
  })

  if (!response.ok) {
    throw new Error(await extractError(response))
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || 'OK'
}