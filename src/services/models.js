// ─── OpenRouter Model Catalog ────────────────────────────────────────────────

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export const DEFAULT_MODEL_ID = 'openrouter/free'

const LEGACY_MODEL_ID_MAP = {
  'meta-llama/llama-3.3-70b-instruct': 'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.5-pro-preview': 'google/gemini-2.5-pro',
  'anthropic/claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4-5': 'anthropic/claude-opus-4.5',
  'stepfun/step-3.5-flash:free': 'openrouter/free',
}

export const AVAILABLE_MODELS = [
  {
    id: 'openrouter/free',
    name: 'Auto-Free (Empfohlen)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Routet automatisch zum besten verfügbaren Free-Modell. Vermeidet Rate-Limits auf einzelnen Modellen.',
    fallbackPricing: { prompt: '$0/M', completion: '$0/M' },
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Solides Gratis-Modell für erste Tests. Kann aber bei längeren Szenen, sauberer Logik und natürlichem Deutsch deutlich schwanken.',
    fallbackPricing: { prompt: '$0/M', completion: '$0/M' },
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Kostenlos und leistungsfähig, aber im Rollenspiel nicht garantiert so rund wie hochwertige Paid-Modelle. Qualität kann je nach Szene schwanken.',
    fallbackPricing: { prompt: '$0/M', completion: '$0/M' },
  },
  {
    id: 'arcee-ai/trinity-large-preview:free',
    name: 'Trinity Large Preview (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Unter den Free-Modellen interessant für kreative Texte und Rollenspiel, aber trotzdem nicht so verlässlich wie starke Bezahlmodelle.',
    fallbackPricing: { prompt: '$0/M', completion: '$0/M' },
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    name: 'GLM 4.5 Air (Free)',
    badge: 'Kostenlos',
    isPaid: false,
    category: 'free',
    description:
      'Gute kostenlose Auswahl für Tests. Kann brauchbar sein, aber bei Stiltreue, Plausibilität und dramaturgischer Führung nicht immer stabil.',
    fallbackPricing: { prompt: '$0/M', completion: '$0/M' },
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    badge: 'Bezahlt',
    isPaid: true,
    category: 'paid',
    description:
      'Deutlich stärkeres Modell für Storytelling, Logik, kreative Szenen, Stiltreue und konsistente Abenteuerführung. Kann dein OpenRouter-Konto belasten.',
    fallbackPricing: { prompt: '$1.25/M', completion: '$10/M' },
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    badge: 'Bezahlt',
    isPaid: true,
    category: 'paid',
    description:
      'Sehr stark bei natürlichem Schreiben, konsistentem Weltenbau, plausiblen Entscheidungen und sauberem Rollenspiel-Flow. Kann dein OpenRouter-Konto belasten.',
    fallbackPricing: { prompt: '$3/M', completion: '$15/M' },
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    badge: 'Bezahlt',
    isPaid: true,
    category: 'paid',
    description:
      'Sehr gutes Allround-Modell mit klar besserem Storytelling, besserer sprachlicher Qualität und weniger Unsinn als die meisten Free-Modelle. Kann dein OpenRouter-Konto belasten.',
    fallbackPricing: { prompt: '$2.50/M', completion: '$10/M' },
  },
  {
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    badge: 'Premium',
    isPaid: true,
    category: 'paid',
    description:
      'Premium-Option mit besonders starker Kreativität, Kohärenz, Tiefe und Logik. Für immersive Abenteuer oft am überzeugendsten, aber auch klar kostenpflichtig.',
    fallbackPricing: { prompt: '$5/M', completion: '$25/M' },
  },
]

export function normalizeModelId(modelId) {
  if (!modelId) return DEFAULT_MODEL_ID
  return LEGACY_MODEL_ID_MAP[modelId] || modelId
}

/**
 * Safeguard: if the resolved model is paid but the user never explicitly
 * confirmed a paid switch, fall back to the free default.
 * Call this whenever loading a model from storage or server — NOT when
 * the user actively picks a model in the UI (that has its own confirm).
 */
export function ensureFreeUnlessExplicit(modelId) {
  const normalized = normalizeModelId(modelId)
  const meta = AVAILABLE_MODELS.find(m => m.id === normalized)
  // Known paid model → reject, unknown model → allow (could be a new free model)
  if (meta?.isPaid) return DEFAULT_MODEL_ID
  return normalized
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
