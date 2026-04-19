// ─── Shared Text Utilities ──────────────────────────────────────────────────

import { normalizeRuntimeIntent } from './runtimeModule.js'

const GERMAN_STOPWORDS = new Set([
  'aber','alle','allen','aller','alles','auch','auf','aus','bei','bin','bis','bist','da','dadurch','daher','darum','das','dass','dein','deine','dem','den','der','des','dessen','deshalb','die','dies','diese','diesem','diesen','dieser','dieses','doch','dort','du','durch','ein','eine','einem','einen','einer','eines','er','es','euer','eure','für','hat','hattest','hatte','hatten','hier','hinter','ich','ihr','ihre','im','in','ist','ja','jede','jedem','jeden','jeder','jedes','jetzt','kann','kannst','kein','keine','keinem','keinen','keiner','keines','mit','muss','nach','nicht','noch','nun','oder','seid','sein','seine','sich','sie','sind','so','solche','solchem','solchen','solcher','solches','soll','sollen','sollte','sondern','sonst','über','um','und','uns','unser','unsere','unter','vom','von','vor','war','waren','warst','was','weg','weil','weiter','welche','welchem','welchen','welcher','welches','wenn','werde','werden','wie','wieder','will','wir','wird','wirst','wo','wollen','wollte','würde','würden','zu','zum','zur','zurück'
])

const ADVENTURE_STRUCTURE_VERSION = 2
const STRUCTURED_ADVENTURE_VERSION = 3

export { ADVENTURE_STRUCTURE_VERSION, STRUCTURED_ADVENTURE_VERSION }

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncateText(text = '', maxLength = 220) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

export function firstSentences(text = '', maxLength = 220) {
  const sentences = String(text || '').match(/[^.!?]+[.!?]?/g) || [String(text || '')]
  let out = ''
  for (const sentence of sentences) {
    if ((out + ' ' + sentence).trim().length > maxLength) break
    out = `${out} ${sentence}`.trim()
  }
  return truncateText(out || text, maxLength)
}

function sanitizeParagraphs(text = '') {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function tokenizeText(text = '', minLength = 3) {
  return [...new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-zäöüß0-9\s-]/gi, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= minLength)
      .filter(token => !GERMAN_STOPWORDS.has(token))
  )]
}

export function extractKeywords(text = '', limit = 10) {
  const freq = new Map()
  tokenizeText(text, 4).forEach(token => {
    freq.set(token, (freq.get(token) || 0) + 1)
  })

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([token]) => token)
}

export function splitSentences(text = '') {
  return (String(text || '').match(/[^.!?\n]+[.!?]?/g) || [String(text || '')])
    .map(sentence => sentence.trim())
    .filter(Boolean)
}

export function normalizeShortList(items = [], limit = 4) {
  const seen = new Set()
  const out = []

  for (const item of items) {
    const normalized = truncateText(String(item || '').replace(/^[-•]\s*/, '').trim(), 120)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
    if (out.length >= limit) break
  }

  return out
}

// ─── Adventure Parsing Utilities ────────────────────────────────────────────

function looksLikeHeading(paragraph = '') {
  const text = paragraph.trim()
  if (!text) return false
  if (text.length > 90) return false
  if (/^(kapitel|szene|teil|abschnitt|akt|prolog|epilog|einleitung|startszene|finale|schluss)\b/i.test(text)) return true
  if (/^[IVXLC0-9]+[.)\-: ]/.test(text)) return true
  if (!/[.!?]/.test(text) && text.split(/\s+/).length <= 10) return true
  return false
}

function buildChunkTextFromParagraphs(paragraphs = []) {
  return paragraphs.join('\n\n').trim()
}

function makeChunkBase(index, sectionId, sectionTitle, text) {
  const lower = text.toLowerCase()
  return {
    index,
    sectionId,
    sectionTitle,
    text,
    lower,
    keywords: extractKeywords(`${sectionTitle} ${text}`, 8),
  }
}

function buildAdventureStructure(text = '', title = 'Abenteuer') {
  const normalized = sanitizeParagraphs(text)
  if (!normalized) {
    return {
      version: ADVENTURE_STRUCTURE_VERSION,
      sections: [],
      chunks: [],
    }
  }

  const rawParagraphs = normalized
    .split(/\n\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

  const sections = []
  let pendingTitle = title
  let currentParagraphs = []
  let fallbackCounter = 1

  const pushSection = () => {
    if (!currentParagraphs.length) return
    sections.push({
      title: pendingTitle || `Abschnitt ${fallbackCounter}`,
      paragraphs: [...currentParagraphs],
    })
    currentParagraphs = []
    pendingTitle = ''
    fallbackCounter += 1
  }

  for (const paragraph of rawParagraphs) {
    if (looksLikeHeading(paragraph)) {
      pushSection()
      pendingTitle = paragraph
      continue
    }
    currentParagraphs.push(paragraph)
  }
  pushSection()

  if (sections.length === 0) {
    sections.push({ title, paragraphs: rawParagraphs })
  }

  const chunks = []
  const structuredSections = []

  sections.forEach((section, sectionIndex) => {
    const sectionId = `${slugify(section.title || `abschnitt-${sectionIndex + 1}`)}-${sectionIndex + 1}`
    const sectionParagraphs = section.paragraphs
    const sectionChunkIndexes = []
    let buffer = []
    let currentLength = 0

    const flushChunk = () => {
      if (!buffer.length) return
      const chunkText = buildChunkTextFromParagraphs(buffer)
      const chunkIndex = chunks.length
      chunks.push(makeChunkBase(chunkIndex, sectionId, section.title, chunkText))
      sectionChunkIndexes.push(chunkIndex)
      buffer = []
      currentLength = 0
    }

    for (const paragraph of sectionParagraphs) {
      const nextLength = currentLength + paragraph.length + (buffer.length ? 2 : 0)
      if (buffer.length && nextLength > 850) {
        flushChunk()
      }
      buffer.push(paragraph)
      currentLength += paragraph.length + (buffer.length > 1 ? 2 : 0)
    }
    flushChunk()

    const sectionText = sectionChunkIndexes.map(index => chunks[index]?.text || '').join('\n\n').trim()
    const summary = firstSentences(sectionText, 220)

    structuredSections.push({
      id: sectionId,
      index: sectionIndex,
      title: section.title || `Abschnitt ${sectionIndex + 1}`,
      chunkIndexes: sectionChunkIndexes,
      summary,
      keywords: extractKeywords(`${section.title} ${sectionText}`, 10),
      searchText: `${section.title} ${sectionText}`.toLowerCase(),
    })
  })

  return {
    version: ADVENTURE_STRUCTURE_VERSION,
    sections: structuredSections,
    chunks,
  }
}

// ─── Structured Adventure Parser ────────────────────────────────────────────

function isStructuredAdventureText(text = '') {
  return /\bSECTION_ID:\s*\S+/m.test(text)
}

function parseStructuredHeader(headerText = '') {
  const get = key => {
    const m = new RegExp(`^${key}:\\s*(.+)`, 'mi').exec(headerText)
    return m ? m[1].trim() : ''
  }
  return {
    moduleId: get('MODULE_ID'),
    moduleVersion: get('MODULE_VERSION'),
    system: get('SYSTEM'),
    startSectionId: get('START_SECTION_ID'),
    startLocation: get('START_LOCATION'),
    primaryObjective: get('PRIMARY_OBJECTIVE'),
    secondaryObjective: get('SECONDARY_OBJECTIVE'),
    tone: get('TONE'),
  }
}

function parseStructuredList(lines, startIdx) {
  const items = []
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    if (/^- /.test(line)) {
      items.push(line.replace(/^- /, '').trim())
    } else if (/^\S/.test(line) && !/^##/.test(line)) {
      break // next key-value field
    }
  }
  return items
}

function parseStructuredSection(block, index) {
  const lines = block.split('\n')

  // Title from ## SECTION header
  const titleLine = lines.find(l => /^## SECTION/.test(l)) || ''
  const titleMatch = titleLine.match(/^## SECTION\s+\d+:\s*(.+)/)
  const title = titleMatch ? titleMatch[1].trim() : `Abschnitt ${index + 1}`

  // Key-value extraction
  const get = key => {
    const idx = lines.findIndex(l => new RegExp(`^${key}:\\s*`, 'i').test(l))
    if (idx < 0) return ''
    return lines[idx].replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim()
  }

  // List extraction: find key line, collect subsequent `- ` lines
  const getList = key => {
    const idx = lines.findIndex(l => new RegExp(`^${key}:`, 'i').test(l))
    if (idx < 0) return []
    // Check if value is inline (e.g. "ENEMIES: none")
    const inline = lines[idx].replace(new RegExp(`^${key}:\\s*`, 'i'), '').trim()
    if (inline && inline.toLowerCase() !== 'none') return [inline]
    return parseStructuredList(lines, idx + 1)
  }

  // Parse EXITS: "Label -> target_id"
  const rawExits = getList('EXITS')
  const exits = rawExits.map(e => {
    const m = e.match(/^(.+?)\s*->\s*(\S+)/)
    return m ? { label: m[1].trim(), targetId: m[2].trim() } : { label: e, targetId: '' }
  })

  // SCENE_TEXT: everything after SCENE_TEXT: until end of block
  const sceneIdx = lines.findIndex(l => /^SCENE_TEXT:/i.test(l))
  let sceneText = ''
  if (sceneIdx >= 0) {
    const firstLine = lines[sceneIdx].replace(/^SCENE_TEXT:\s*/i, '').trim()
    const rest = lines.slice(sceneIdx + 1).join('\n').replace(/---\s*$/, '').trim()
    sceneText = firstLine ? `${firstLine}\n${rest}`.trim() : rest
  }

  const id = get('SECTION_ID')
  const location = get('LOCATION')
  const allText = `${title} ${location} ${sceneText} ${getList('VISIBLE_FEATURES').join(' ')} ${getList('NPCS').join(' ')} ${getList('DISCOVERABLE_CLUES').join(' ')}`

  return {
    id,
    index,
    title,
    location,
    type: get('SECTION_TYPE'),
    objective: get('CURRENT_OBJECTIVE'),
    requiresFlags: getList('REQUIRES_FLAGS'),
    blocksIfFlags: getList('BLOCKS_IF_FLAGS'),
    setsOnEntry: getList('SETS_FLAGS_ON_ENTRY'),
    canSetFlags: getList('CAN_SET_FLAGS'),
    visibleFeatures: getList('VISIBLE_FEATURES'),
    interactiveObjects: getList('INTERACTIVE_OBJECTS'),
    npcs: getList('NPCS'),
    enemies: getList('ENEMIES'),
    exits,
    transitionRules: getList('TRANSITION_RULES'),
    openThreads: getList('OPEN_THREADS'),
    clues: getList('DISCOVERABLE_CLUES'),
    suggestedActions: getList('SUGGESTED_ACTIONS'),
    sceneText,
    // Compatibility fields for existing scene state logic
    summary: firstSentences(sceneText, 220),
    keywords: extractKeywords(allText, 10),
    searchText: allText.toLowerCase(),
    chunkIndexes: [index], // 1 chunk per section for compatibility
  }
}

function parseGlobalRules(headerText = '') {
  const rulesStart = headerText.indexOf('## GLOBAL_RUNTIME_RULES')
  if (rulesStart < 0) return []
  const rulesBlock = headerText.slice(rulesStart)
  const nextSection = rulesBlock.indexOf('\n## ', 1)
  const rulesText = nextSection > 0 ? rulesBlock.slice(0, nextSection) : rulesBlock
  return rulesText.split('\n')
    .filter(l => /^\d+\.\s+/.test(l))
    .map(l => l.replace(/^\d+\.\s+/, '').trim())
}

function parseGlobalPlotFlags(headerText = '') {
  const flagsStart = headerText.indexOf('## GLOBAL_PLOT_FLAGS')
  if (flagsStart < 0) return []
  const flagsBlock = headerText.slice(flagsStart)
  const nextSection = flagsBlock.indexOf('\n## ', 1)
  const flagsText = nextSection > 0 ? flagsBlock.slice(0, nextSection) : flagsBlock
  return flagsText.split('\n')
    .filter(l => /^- /.test(l))
    .map(l => l.replace(/^- /, '').trim())
}

function parseStructuredAdventure(text = '', title = 'Abenteuer') {
  // Split into header (before first ## SECTION) and section blocks
  const sectionSplitRegex = /(?=^## SECTION\b)/gm
  const parts = text.split(sectionSplitRegex)

  const headerText = parts[0] || ''
  const sectionBlocks = parts.slice(1)

  const module = {
    ...parseStructuredHeader(headerText),
    runtimeMode: 'guided',
    globalRules: parseGlobalRules(headerText),
    plotFlags: parseGlobalPlotFlags(headerText),
  }

  const sections = sectionBlocks.map((block, i) => parseStructuredSection(block, i))

  // Generate compatibility chunks from sceneText
  const chunks = sections.map((section, i) => makeChunkBase(
    i,
    section.id,
    section.title,
    section.sceneText || section.summary,
  ))

  return {
    version: STRUCTURED_ADVENTURE_VERSION,
    format: 'structured',
    module,
    sections,
    chunks,
  }
}

// ─── YAML-like Indentation Parser ──────────────────────────────────────────
// Minimal indent-aware parser for runtime module format. Not full YAML — just
// enough to handle key:value, nested maps, lists, and inline arrays [A, B].

function _yParseInline(str) {
  if (!str) return null
  if (str === 'true') return true
  if (str === 'false') return false
  if (str === 'null') return null
  if (/^[+-]?\d+$/.test(str)) return parseInt(str, 10)
  if (str.startsWith('[') && str.endsWith(']')) {
    const inner = str.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(s => _yParseInline(s.trim()))
  }
  return str
}

// Consume a `|` block literal: lines indented strictly more than `keyIndent`
// (including blank lines inside the block) are joined with `\n`. The common
// leading indent of non-blank lines is stripped so the stored string begins
// at column 0.
function _yParseBlockLiteral(lines, pos, keyIndent) {
  const blockLines = []
  let contentIndent = null
  while (pos < lines.length) {
    const l = lines[pos]
    if (l.isBlank) { blockLines.push(''); pos++; continue }
    if (l.indent <= keyIndent) break
    if (contentIndent === null) contentIndent = l.indent
    const strip = Math.min(l.indent, contentIndent)
    blockLines.push(`${' '.repeat(Math.max(0, l.indent - strip))}${l.content}`)
    pos++
  }
  while (blockLines.length && blockLines[blockLines.length - 1] === '') blockLines.pop()
  return { value: blockLines.join('\n'), pos }
}

function _yParseMap(lines, pos, minIndent) {
  const map = {}
  while (pos < lines.length) {
    const l = lines[pos]
    if (l.isBlank) { pos++; continue }
    if (l.indent < minIndent) break
    const kv = l.content.match(/^(\w+)\s*:\s*(.*)/)
    if (!kv) { pos++; continue }
    const key = kv[1], val = kv[2].trim()
    if (val === '|' || val === '|-') {
      const r = _yParseBlockLiteral(lines, pos + 1, l.indent)
      map[key] = r.value; pos = r.pos
      continue
    }
    if (val) { map[key] = _yParseInline(val); pos++ }
    else {
      let next = pos + 1
      while (next < lines.length && lines[next].isBlank) next++
      if (next < lines.length && lines[next].indent > l.indent) {
        const ci = lines[next].indent
        const r = lines[next].content.startsWith('- ')
          ? _yParseList(lines, next, ci)
          : _yParseMap(lines, next, ci)
        map[key] = r.value; pos = r.pos
      } else { map[key] = null; pos++ }
    }
  }
  return { value: map, pos }
}

function _yParseList(lines, pos, minIndent) {
  const list = []
  while (pos < lines.length) {
    const l = lines[pos]
    if (l.isBlank) { pos++; continue }
    if (l.indent < minIndent || !l.content.startsWith('- ')) break
    const itemText = l.content.slice(2).trim()
    const kv = itemText.match(/^(\w+)\s*:\s*(.*)/)
    if (!kv) { list.push(_yParseInline(itemText)); pos++; continue }

    // Complex list item
    const item = {}
    const key = kv[1], val = kv[2].trim()
    pos++
    if (val === '|' || val === '|-') {
      const r = _yParseBlockLiteral(lines, pos, l.indent)
      item[key] = r.value; pos = r.pos
    } else if (val) { item[key] = _yParseInline(val) }
    else {
      let next = pos
      while (next < lines.length && lines[next].isBlank) next++
      if (next < lines.length && lines[next].indent > l.indent) {
        const ci = lines[next].indent
        const r = lines[next].content.startsWith('- ')
          ? _yParseList(lines, next, ci)
          : _yParseMap(lines, next, ci)
        item[key] = r.value; pos = r.pos
      } else { item[key] = null }
    }

    // Collect remaining properties of this list item
    const propIndent = l.indent + 2
    while (pos < lines.length) {
      const pl = lines[pos]
      if (pl.isBlank) { pos++; continue }
      if (pl.indent < propIndent) break
      if (pl.indent === l.indent && pl.content.startsWith('- ')) break
      const pkv = pl.content.match(/^(\w+)\s*:\s*(.*)/)
      if (!pkv) { pos++; continue }
      const pKey = pkv[1], pVal = pkv[2].trim()
      if (pVal === '|' || pVal === '|-') {
        const r = _yParseBlockLiteral(lines, pos + 1, pl.indent)
        item[pKey] = r.value; pos = r.pos
        continue
      }
      if (pVal) { item[pKey] = _yParseInline(pVal); pos++ }
      else {
        let next = pos + 1
        while (next < lines.length && lines[next].isBlank) next++
        if (next < lines.length && lines[next].indent > pl.indent) {
          const ci = lines[next].indent
          const r = lines[next].content.startsWith('- ')
            ? _yParseList(lines, next, ci)
            : _yParseMap(lines, next, ci)
          item[pKey] = r.value; pos = r.pos
        } else { item[pKey] = null; pos++ }
      }
    }
    list.push(item)
  }
  return { value: list, pos }
}

function parseYamlLike(text) {
  // Preserve blank lines (needed for `|` block literals to keep paragraphs)
  // but strip standalone comment lines. Non-comment lines keep their raw
  // indent so block literals can compute a common strip level.
  const lines = text.split('\n').map((raw, i) => {
    const trimmed = raw.trim()
    if (!trimmed) return { indent: 0, content: '', lineNum: i, isBlank: true }
    if (trimmed.startsWith('#')) return { indent: 0, content: '', lineNum: i, isBlank: true }
    return { indent: Math.max(0, raw.search(/\S/)), content: trimmed, lineNum: i, isBlank: false }
  })
  return _yParseMap(lines, 0, 0).value
}

// ─── Runtime Module Parser ─────────────────────────────────────────────────
// Parses YAML-like structured module format (MODULE_ID + SECTIONS with nested
// interactions, reveals, registries). Maps to internal structure for compat.

function isRuntimeModule(text = '') {
  return /^MODULE_ID:/m.test(text) && /^SECTIONS:/m.test(text)
}

function pushRuntimeValidationWarning(warnings, seenWarnings, warning) {
  const normalized = {
    code: warning.code,
    sectionId: warning.sectionId || null,
    interactionId: warning.interactionId || null,
    message: warning.message,
  }
  const warningKey = [
    normalized.code,
    normalized.sectionId || '',
    normalized.interactionId || '',
    normalized.message,
  ].join('|')

  if (seenWarnings.has(warningKey)) return
  seenWarnings.add(warningKey)
  warnings.push(normalized)
}

function normalizeRuntimeValidationText(value = '') {
  return String(value || '').trim().toLowerCase()
}

function runtimeValidationTextIncludes(text = '', phrase = '') {
  const source = normalizeRuntimeValidationText(text)
  const needle = normalizeRuntimeValidationText(phrase)
  return Boolean(source && needle && source.includes(needle))
}

function getRuntimeInteractionResultEntries(interaction) {
  if (!interaction?.results || typeof interaction.results !== 'object') return []

  return Object.entries(interaction.results)
    .filter(([, result]) => result && typeof result === 'object')
    .map(([outcome, result]) => ({ outcome, result }))
}

function validatePlayerFacingRuntimeText({
  warnings,
  seenWarnings,
  text,
  fieldLabel,
  sectionId = null,
  hiddenNpcNames = [],
  hiddenObjectLabels = [],
  clueTexts = [],
} = {}) {
  const sourceText = String(text || '').trim()
  if (!sourceText) return

  for (const npcName of hiddenNpcNames) {
    if (!runtimeValidationTextIncludes(sourceText, npcName)) continue
    pushRuntimeValidationWarning(warnings, seenWarnings, {
      code: 'runtime-player-facing-hidden-npc',
      sectionId,
      interactionId: null,
      message: `Runtime ${fieldLabel} mentions hidden NPC "${npcName}".`,
    })
  }

  for (const objectLabel of hiddenObjectLabels) {
    if (!runtimeValidationTextIncludes(sourceText, objectLabel)) continue
    pushRuntimeValidationWarning(warnings, seenWarnings, {
      code: 'runtime-player-facing-hidden-object',
      sectionId,
      interactionId: null,
      message: `Runtime ${fieldLabel} mentions hidden object label "${objectLabel}".`,
    })
  }

  for (const clueText of clueTexts) {
    if (!runtimeValidationTextIncludes(sourceText, clueText)) continue
    pushRuntimeValidationWarning(warnings, seenWarnings, {
      code: 'runtime-player-facing-hidden-clue',
      sectionId,
      interactionId: null,
      message: `Runtime ${fieldLabel} contains authored clue text that should stay unrevealed.`,
    })
  }
}

function validateRuntimeModuleStructure(module, sections = []) {
  const warnings = []
  const seenWarnings = new Set()
  const npcRegistry = module?.npcRegistry || {}
  const clueRegistry = module?.clueRegistry || {}
  const objectRegistry = module?.objectRegistry || {}
  const sectionIds = new Set()
  const staticInteractionIds = new Map()
  const revealedOnlyInteractionIds = new Map()
  const authoredRuntimeObjectIds = new Map()
  const allHiddenObjectLabels = new Set()

  const registerStaticInteractionId = (interactionId, sectionId, sourceDescription) => {
    const normalizedId = String(interactionId || '').trim()
    if (!normalizedId) return false

    const previous = staticInteractionIds.get(normalizedId) || revealedOnlyInteractionIds.get(normalizedId)
    if (previous) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-interaction-id-duplicate',
        sectionId,
        interactionId: normalizedId,
        message: `Runtime interaction id "${normalizedId}" is authored multiple times (${previous.sourceDescription} and ${sourceDescription}).`,
      })
      return false
    }

    staticInteractionIds.set(normalizedId, { sectionId, sourceDescription })
    return true
  }

  const registerRevealedInteractionId = (interactionId, sectionId, sourceDescription) => {
    const normalizedId = String(interactionId || '').trim()
    if (!normalizedId) return false

    const staticMatch = staticInteractionIds.get(normalizedId)
    if (staticMatch) {
      if (staticMatch.sectionId && sectionId && staticMatch.sectionId !== sectionId) {
        pushRuntimeValidationWarning(warnings, seenWarnings, {
          code: 'runtime-revealed-interaction-section-mismatch',
          sectionId,
          interactionId: normalizedId,
          message: `Revealed runtime interaction "${normalizedId}" is assigned to section "${sectionId}" but its static authored definition lives in section "${staticMatch.sectionId}".`,
        })
      }
      return true
    }

    const previous = revealedOnlyInteractionIds.get(normalizedId)
    if (previous) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-interaction-id-duplicate',
        sectionId,
        interactionId: normalizedId,
        message: `Runtime interaction id "${normalizedId}" is authored multiple times (${previous.sourceDescription} and ${sourceDescription}).`,
      })
      return false
    }

    revealedOnlyInteractionIds.set(normalizedId, { sectionId, sourceDescription })
    return true
  }

  const hasKnownInteractionId = interactionId => {
    const normalizedId = String(interactionId || '').trim()
    return Boolean(normalizedId && (staticInteractionIds.has(normalizedId) || revealedOnlyInteractionIds.has(normalizedId)))
  }

  const registerRuntimeObjectId = (objectId, sectionId, interactionId) => {
    const normalizedId = String(objectId || '').trim()
    if (!normalizedId) return false

    const previous = authoredRuntimeObjectIds.get(normalizedId)
    if (previous) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-revealed-object-id-duplicate',
        sectionId,
        interactionId,
        message: `Runtime object "${normalizedId}" is revealed multiple times (${previous.sectionId || 'unknown'} and ${sectionId || 'unknown'}).`,
      })
      return false
    }

    authoredRuntimeObjectIds.set(normalizedId, { sectionId, interactionId })
    return true
  }

  if (!String(module?.playerPrimaryObjective || '').trim()) {
    pushRuntimeValidationWarning(warnings, seenWarnings, {
      code: 'runtime-player-primary-objective-missing',
      sectionId: null,
      interactionId: null,
      message: 'Runtime module should define PLAYER_PRIMARY_OBJECTIVE for player-facing quest framing.',
    })
  }

  for (const section of sections) {
    const sectionId = String(section?.id || '').trim()
    if (!sectionId) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-section-id-missing',
        sectionId: null,
        interactionId: null,
        message: 'Runtime sections must define a stable id.',
      })
    } else if (sectionIds.has(sectionId)) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-section-id-duplicate',
        sectionId,
        interactionId: null,
        message: `Runtime section id "${sectionId}" is authored multiple times.`,
      })
    } else {
      sectionIds.add(sectionId)
    }

    for (const interaction of section.interactions || []) {
      const interactionId = String(interaction?.id || '').trim()
      if (!interactionId) {
        pushRuntimeValidationWarning(warnings, seenWarnings, {
          code: 'runtime-interaction-id-missing',
          sectionId,
          interactionId: null,
          message: `Runtime section "${sectionId || section.title || 'unknown'}" contains an interaction without a stable id.`,
        })
      } else {
        registerStaticInteractionId(interactionId, sectionId, `section ${sectionId}`)
      }

      for (const { result } of getRuntimeInteractionResultEntries(interaction)) {
        for (const runtimeObject of result?.revealRuntime?.objects || []) {
          const runtimeObjectId = String(runtimeObject?.id || '').trim()
          const owningSectionId = String(runtimeObject?.sectionId || sectionId || '').trim() || null

          if (runtimeObjectId) {
            registerRuntimeObjectId(runtimeObjectId, owningSectionId, interactionId || null)
          }

          const runtimeObjectLabel = String(runtimeObject?.label || '').trim()
          if (runtimeObjectLabel) {
            allHiddenObjectLabels.add(runtimeObjectLabel)
          }
        }
      }
    }
  }

  for (const section of sections) {
    const sectionId = String(section?.id || '').trim() || null
    for (const interaction of section.interactions || []) {
      const interactionId = String(interaction?.id || '').trim()
      for (const { result } of getRuntimeInteractionResultEntries(interaction)) {
        for (const revealedInteraction of result?.revealRuntime?.interactions || []) {
          const revealedInteractionId = String(revealedInteraction?.id || '').trim()
          const owningSectionId = String(revealedInteraction?.sectionId || sectionId || '').trim() || null
          if (!revealedInteractionId) continue
          registerRevealedInteractionId(
            revealedInteractionId,
            owningSectionId,
            `revealed interaction from ${interactionId || 'unknown interaction'}`
          )
        }
      }
    }
  }

  if (!String(module?.startSectionId || '').trim() || !sectionIds.has(module.startSectionId)) {
    pushRuntimeValidationWarning(warnings, seenWarnings, {
      code: 'runtime-start-section-unknown',
      sectionId: null,
      interactionId: null,
      message: `Runtime module start section "${module?.startSectionId || ''}" does not exist.`,
    })
  }

  for (const [clueId, clue] of Object.entries(clueRegistry)) {
    const sourceSectionId = String(clue?.sourceSectionId || '').trim()
    if (sourceSectionId && !sectionIds.has(sourceSectionId)) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-clue-source-section-unknown',
        sectionId: sourceSectionId,
        interactionId: null,
        message: `Runtime clue "${clueId}" references unknown source section "${sourceSectionId}".`,
      })
    }

    for (const condition of clue?.revealConditions || []) {
      const interactionId = String(condition?.interactionId || '').trim()
      if (!interactionId) continue
      if (hasKnownInteractionId(interactionId)) continue
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-clue-reveal-interaction-unknown',
        sectionId: sourceSectionId || null,
        interactionId,
        message: `Runtime clue "${clueId}" references unknown interaction "${interactionId}" in revealConditions.`,
      })
    }
  }

  const allClueTexts = Object.values(clueRegistry)
    .map(clue => String(clue?.text || '').trim())
    .filter(Boolean)
  const startSection = sections.find(section => section.id === module?.startSectionId) || null
  const startVisibleNpcIds = new Set(startSection?.visibleNpcs || [])
  const startHiddenNpcNames = Object.entries(npcRegistry)
    .filter(([npcId]) => !startVisibleNpcIds.has(npcId))
    .map(([, npc]) => String(npc?.name || '').trim())
    .filter(Boolean)

  validatePlayerFacingRuntimeText({
    warnings,
    seenWarnings,
    text: module?.playerPrimaryObjective || '',
    fieldLabel: 'PLAYER_PRIMARY_OBJECTIVE',
    sectionId: null,
    hiddenNpcNames: startHiddenNpcNames,
    hiddenObjectLabels: [...allHiddenObjectLabels],
    clueTexts: allClueTexts,
  })

  for (const section of sections) {
    const sectionId = String(section?.id || '').trim() || null
    if (!String(section.playerObjective || '').trim()) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-player-objective-missing',
        sectionId,
        interactionId: null,
        message: `Runtime section "${sectionId || section.title || 'unknown'}" should define playerObjective for player-facing objective text.`,
      })
    }

    if (!String(section.introText || '').trim()) {
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-intro-text-missing',
        sectionId,
        interactionId: null,
        message: `Runtime section "${sectionId || section.title || 'unknown'}" should define introText for player-facing scene framing.`,
      })
    }

    const visibleNpcIds = new Set(section.visibleNpcs || [])
    const hiddenNpcNames = Object.entries(npcRegistry)
      .filter(([npcId]) => !visibleNpcIds.has(npcId))
      .map(([, npc]) => String(npc?.name || '').trim())
      .filter(Boolean)

    validatePlayerFacingRuntimeText({
      warnings,
      seenWarnings,
      text: section.playerObjective,
      fieldLabel: `section "${sectionId || section.title || 'unknown'}" playerObjective`,
      sectionId,
      hiddenNpcNames,
      hiddenObjectLabels: [...allHiddenObjectLabels],
      clueTexts: allClueTexts,
    })
    validatePlayerFacingRuntimeText({
      warnings,
      seenWarnings,
      text: section.introText,
      fieldLabel: `section "${sectionId || section.title || 'unknown'}" introText`,
      sectionId,
      hiddenNpcNames,
      hiddenObjectLabels: [...allHiddenObjectLabels],
      clueTexts: allClueTexts,
    })

    for (const [featureIndex, feature] of (section.visibleFeatures || []).entries()) {
      validatePlayerFacingRuntimeText({
        warnings,
        seenWarnings,
        text: feature,
        fieldLabel: `section "${sectionId || section.title || 'unknown'}" visibleFeatures[${featureIndex}]`,
        sectionId,
        hiddenNpcNames,
        hiddenObjectLabels: [...allHiddenObjectLabels],
        clueTexts: allClueTexts,
      })
    }

    for (const [threadIndex, thread] of (section.openThreads || []).entries()) {
      validatePlayerFacingRuntimeText({
        warnings,
        seenWarnings,
        text: thread,
        fieldLabel: `section "${sectionId || section.title || 'unknown'}" openThreads[${threadIndex}]`,
        sectionId,
        hiddenNpcNames,
        hiddenObjectLabels: [...allHiddenObjectLabels],
        clueTexts: allClueTexts,
      })
    }

    for (const npcId of section.visibleNpcs || []) {
      if (npcRegistry[npcId]) continue
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-visible-npc-unknown',
        sectionId,
        interactionId: null,
        message: `Runtime section "${sectionId || section.title || 'unknown'}" references unknown NPC "${npcId}" in visibleNpcs.`,
      })
    }

    for (const exit of section.exits || []) {
      const targetSectionId = String(exit?.targetId || '').trim()
      if (targetSectionId && sectionIds.has(targetSectionId)) continue
      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-exit-target-unknown',
        sectionId,
        interactionId: null,
        message: `Runtime exit "${exit?.id || exit?.label || 'unknown'}" references unknown target section "${targetSectionId}".`,
      })
    }

    for (const interaction of section.interactions || []) {
      const interactionId = String(interaction?.id || '').trim() || null
      const interactionKind = String(interaction?.kind || '').trim().toLowerCase()
      const checkPolicy = typeof interaction.checkPolicy === 'string'
        ? interaction.checkPolicy.trim()
        : null

      if (interactionKind === 'talk') {
        const targetNpcId = String(interaction?.target || '').trim()
        if (!targetNpcId) {
          pushRuntimeValidationWarning(warnings, seenWarnings, {
            code: 'runtime-talk-target-missing',
            sectionId,
            interactionId,
            message: `Runtime talk interaction "${interactionId || interaction.label || 'unknown'}" must target an NPC id from NPC_REGISTRY.`,
          })
        } else if (!npcRegistry[targetNpcId]) {
          pushRuntimeValidationWarning(warnings, seenWarnings, {
            code: 'runtime-talk-target-unknown',
            sectionId,
            interactionId,
            message: `Runtime talk interaction "${interactionId || interaction.label || 'unknown'}" targets unknown NPC "${targetNpcId}".`,
          })
        }
      }

      const gatedRuntimeObjectId = String(interaction?.availability?.runtimeObjectVisible || '').trim()
      if (gatedRuntimeObjectId && !objectRegistry[gatedRuntimeObjectId]) {
        pushRuntimeValidationWarning(warnings, seenWarnings, {
          code: 'runtime-availability-object-unknown',
          sectionId,
          interactionId,
          message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" gates visibility on unknown object "${gatedRuntimeObjectId}".`,
        })
      } else if (gatedRuntimeObjectId && !authoredRuntimeObjectIds.has(gatedRuntimeObjectId)) {
        pushRuntimeValidationWarning(warnings, seenWarnings, {
          code: 'runtime-availability-object-not-authored',
          sectionId,
          interactionId,
          message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" gates visibility on object "${gatedRuntimeObjectId}" that is never authored as a runtime reveal.`,
        })
      }

      if (checkPolicy && checkPolicy !== 'none') {
        pushRuntimeValidationWarning(warnings, seenWarnings, {
          code: 'runtime-check-policy-invalid',
          sectionId,
          interactionId,
          message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" uses unsupported checkPolicy "${checkPolicy}". Use "none" or define check.`,
        })
        continue
      }

      for (const { outcome, result } of getRuntimeInteractionResultEntries(interaction)) {
        for (const clueId of result?.revealClues || []) {
          if (clueRegistry[clueId]) continue
          pushRuntimeValidationWarning(warnings, seenWarnings, {
            code: 'runtime-reveal-clue-unknown',
            sectionId,
            interactionId,
            message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals unknown clue "${clueId}" on ${outcome}.`,
          })
        }

        for (const npcUpdate of result?.npcUpdates || []) {
          const npcId = String(npcUpdate?.npcId || '').trim()
          if (npcId && npcRegistry[npcId]) continue
          pushRuntimeValidationWarning(warnings, seenWarnings, {
            code: 'runtime-npc-update-unknown',
            sectionId,
            interactionId,
            message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" updates unknown NPC "${npcId}" on ${outcome}.`,
          })
        }

        for (const objectUpdate of result?.objectStateUpdates || []) {
          const objectId = String(objectUpdate?.objectId || '').trim()
          if (objectId && !objectRegistry[objectId]) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-object-state-update-unknown',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" updates unknown object "${objectId}" on ${outcome}.`,
            })
            continue
          }

          if (objectId && !authoredRuntimeObjectIds.has(objectId)) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-object-state-update-not-authored',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" updates object "${objectId}" that is never authored as a runtime reveal.`,
            })
          }
        }

        for (const runtimeObject of result?.revealRuntime?.objects || []) {
          const runtimeObjectId = String(runtimeObject?.id || '').trim()
          const runtimeObjectSectionId = String(runtimeObject?.sectionId || sectionId || '').trim() || null
          const runtimeObjectLabel = String(runtimeObject?.label || '').trim()

          if (!runtimeObjectId) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-object-id-missing',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals an object without an id on ${outcome}.`,
            })
          } else if (!objectRegistry[runtimeObjectId]) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-object-unknown',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals object "${runtimeObjectId}" that is missing from OBJECT_REGISTRY.`,
            })
          }

          if (!runtimeObjectLabel) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-object-label-missing',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals object "${runtimeObjectId || 'unknown'}" without a player-facing label.`,
            })
          }

          if (runtimeObjectSectionId && !sectionIds.has(runtimeObjectSectionId)) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-object-section-unknown',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals object "${runtimeObjectId || 'unknown'}" into unknown section "${runtimeObjectSectionId}".`,
            })
          }
        }

        for (const revealedInteraction of result?.revealRuntime?.interactions || []) {
          const revealedInteractionId = String(revealedInteraction?.id || '').trim()
          const revealedInteractionLabel = String(revealedInteraction?.label || '').trim()
          const revealedInteractionSectionId = String(revealedInteraction?.sectionId || sectionId || '').trim() || null
          const revealedInteractionKind = String(revealedInteraction?.kind || '').trim().toLowerCase()
          const revealedTarget = String(revealedInteraction?.target || '').trim()

          if (!revealedInteractionId) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-interaction-id-missing',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals an interaction without an id on ${outcome}.`,
            })
          }

          if (!revealedInteractionLabel) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-interaction-label-missing',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals interaction "${revealedInteractionId || 'unknown'}" without a label on ${outcome}.`,
            })
          }

          if (revealedInteractionSectionId && !sectionIds.has(revealedInteractionSectionId)) {
            pushRuntimeValidationWarning(warnings, seenWarnings, {
              code: 'runtime-revealed-interaction-section-unknown',
              sectionId,
              interactionId,
              message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals interaction "${revealedInteractionId || 'unknown'}" into unknown section "${revealedInteractionSectionId}".`,
            })
          }

          if (revealedInteractionKind === 'talk') {
            if (!revealedTarget) {
              pushRuntimeValidationWarning(warnings, seenWarnings, {
                code: 'runtime-revealed-talk-target-missing',
                sectionId,
                interactionId,
                message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals talk interaction "${revealedInteractionId || 'unknown'}" without an NPC target.`,
              })
            } else if (!npcRegistry[revealedTarget]) {
              pushRuntimeValidationWarning(warnings, seenWarnings, {
                code: 'runtime-revealed-talk-target-unknown',
                sectionId,
                interactionId,
                message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" reveals talk interaction "${revealedInteractionId || 'unknown'}" for unknown NPC "${revealedTarget}".`,
              })
            }
          }
        }
      }

      if (interaction.check) continue
      if (checkPolicy === 'none') continue

      pushRuntimeValidationWarning(warnings, seenWarnings, {
        code: 'runtime-check-decision-missing',
        sectionId,
        interactionId,
        message: `Runtime interaction "${interactionId || interaction.label || 'unknown'}" must define check or checkPolicy: none.`,
      })
    }
  }

  return warnings
}

function attachRuntimeModuleValidation(structure) {
  if (structure?.format !== 'structured') return structure
  if (structure?.module?.runtimeMode !== 'engine') return structure

  return {
    ...structure,
    module: {
      ...structure.module,
      validationWarnings: validateRuntimeModuleStructure(structure.module, structure.sections || []),
    },
  }
}

function parseRuntimeModule(text, title = 'Abenteuer') {
  const doc = parseYamlLike(text)

  const module = {
    moduleId: doc.MODULE_ID || '',
    moduleVersion: doc.MODULE_VERSION || '',
    system: doc.SYSTEM || '',
    runtimeMode: 'engine',
    startSectionId: doc.START_SECTION_ID || '',
    primaryObjective: doc.PRIMARY_OBJECTIVE || '',
    playerPrimaryObjective: doc.PLAYER_PRIMARY_OBJECTIVE || '',
    secondaryObjective: doc.SECONDARY_OBJECTIVE || '',
    tone: doc.TONE || '',
    globalRules: doc.RUNTIME_RULES || [],
    plotFlags: doc.PLOT_FLAGS || [],
    npcRegistry: doc.NPC_REGISTRY || {},
    clueRegistry: doc.CLUE_REGISTRY || {},
    objectRegistry: doc.OBJECT_REGISTRY || {},
  }

  const rawSections = doc.SECTIONS || []
  const sections = rawSections.map((sec, i) => {
    const id = sec.id || `section-${i}`
    const location = sec.location || ''
    const titleStr = location || id

    const exits = (sec.exits || []).map(e => ({
      id: e.id || '',
      label: e.label || '',
      targetId: e.targetSectionId || '',
      aliases: Array.isArray(e.aliases) ? e.aliases.map(alias => String(alias || '').trim()).filter(Boolean) : [],
      intent: normalizeRuntimeIntent(e.intent),
      requiresFlags: Array.isArray(e.requiresFlags) ? e.requiresFlags : [],
    }))

    const interactions = (sec.interactions || []).map(intr => ({
      id: intr.id || '',
      label: intr.label || '',
      aliases: Array.isArray(intr.aliases) ? intr.aliases.map(alias => String(alias || '').trim()).filter(Boolean) : [],
      kind: intr.kind || 'action',
      target: intr.target || null,
      intent: normalizeRuntimeIntent(intr.intent, { fallbackTarget: intr.target || null }),
      requiresFlags: Array.isArray(intr.requiresFlags) ? intr.requiresFlags : [],
      blocksIfFlags: Array.isArray(intr.blocksIfFlags) ? intr.blocksIfFlags : [],
      repeatable: intr.repeatable === true,
      availability: intr.availability || {},
      checkPolicy: typeof intr.checkPolicy === 'string' ? intr.checkPolicy.trim() : null,
      check: intr.check || null,
      results: intr.results || {},
      aiNarrationHint: intr.aiNarrationHint || '',
    }))

    // Derive interactiveObjects from visible interactions for compat
    const interactiveObjects = [...new Set(
      interactions.filter(intr => intr.availability?.visible).map(intr => intr.target).filter(Boolean)
    )]

    const npcs = (sec.visibleNpcs || []).map(npcId => {
      const reg = module.npcRegistry[npcId]
      return reg?.name || npcId
    })

    const setsOnEntry = sec.onEntry?.setFlags || sec.setsOnEntry || []

    const allText = `${titleStr} ${location} ${sec.objective || ''} ${sec.playerObjective || ''} ${sec.introText || ''} ${(sec.visibleFeatures || []).join(' ')} ${npcs.join(' ')}`
    const playerFacingSummarySource = sec.introText || sec.playerObjective || sec.objective || titleStr

    return {
      id, index: i, title: titleStr, location,
      type: sec.type || '',
      objective: sec.objective || '',
      playerObjective: sec.playerObjective || '',
      requiresFlags: sec.requiresFlags || [],
      blocksIfFlags: sec.blocksIfFlags || [],
      setsOnEntry,
      canSetFlags: sec.canSetFlags || [],
      visibleFeatures: sec.visibleFeatures || [],
      interactiveObjects,
      npcs,
      visibleNpcs: sec.visibleNpcs || [],
      enemies: sec.enemies || [],
      exits, interactions,
      transitionRules: sec.transitionRules || [],
      openThreads: sec.openThreads || [],
      clues: sec.clues || [],
      suggestedActions: sec.suggestedActions || [],
      introText: sec.introText || '',
      sceneText: sec.sceneText || '',
      summary: firstSentences(playerFacingSummarySource, 220),
      keywords: extractKeywords(allText, 10),
      searchText: allText.toLowerCase(),
      chunkIndexes: [i],
    }
  })

  const chunks = sections.map((sec, i) => makeChunkBase(i, sec.id, sec.title, sec.sceneText || sec.summary))

  return attachRuntimeModuleValidation({
    version: STRUCTURED_ADVENTURE_VERSION,
    format: 'structured',
    module,
    sections,
    chunks,
  })
}

// ─── Adventure Record Building ──────────────────────────────────────────────

function buildAdventureRecord(entry) {
  if (!entry) return null

  const text = String(entry.text || '').trim()

  let structure
  if (isRuntimeModule(text)) {
    // Runtime module format (YAML-like, version 3)
    structure = entry.structure?.version === STRUCTURED_ADVENTURE_VERSION && entry.structure?.format === 'structured' && entry.structure?.module?.npcRegistry
      ? attachRuntimeModuleValidation(entry.structure)
      : parseRuntimeModule(text, entry.title)
  } else if (isStructuredAdventureText(text)) {
    // Structured adventure format (version 3)
    structure = entry.structure?.version === STRUCTURED_ADVENTURE_VERSION && entry.structure?.format === 'structured'
      ? entry.structure
      : parseStructuredAdventure(text, entry.title)
  } else {
    // Legacy prose format (version 2)
    structure = entry.structure?.version === ADVENTURE_STRUCTURE_VERSION
      ? entry.structure
      : buildAdventureStructure(text, entry.title)
  }

  return {
    ...entry,
    text,
    pages: entry.pages || (entry.filename?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'TXT'),
    charCount: entry.charCount || text.length,
    structure,
  }
}

export function normalizeAdventureEntry(entry) {
  return buildAdventureRecord(entry)
}

export function prepareAdventureForStorage(entry) {
  return buildAdventureRecord(entry)
}
