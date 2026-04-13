// ─── openrouter.js — Re-export facade ──────────────────────────────────────
// This file re-exports from the split modules so that all existing consumer
// imports keep working unchanged.
// The actual logic now lives in:
//   promptBuilder.js, responseNormalization.js, tagParsers.js, openrouterTransport.js

// ── Model catalog (unchanged, still in models.js) ──────────────────────────
export {
  DEFAULT_MODEL_ID,
  AVAILABLE_MODELS,
  normalizeModelId,
  getModelMeta,
  isPaidModel,
  fetchModelCatalog,
  getCatalogModel,
  getModelPricingDisplay,
} from './models'

// ── Tag Parsers ─────────────────────────────────────────────────────────────
export {
  parseLootTags,
  parseCurrencyTags,
  parseLostItemTags,
  parseCheckTags,
  stripCheckTags,
  stripProbeHintTags,
  formatProbeHinweisTags,
  parseHPTags,
  parseXPTags,
  parseEnemyTags,
} from './tagParsers'

// ── Prompt Builder ──────────────────────────────────────────────────────────
export { buildSystemPrompt } from './promptBuilder'

// ── Transport (send/test) ───────────────────────────────────────────────────
export { sendMessage, testConnection, fetchOllamaModels } from './openrouterTransport'
