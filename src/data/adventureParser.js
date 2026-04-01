// ─── Shared Text Utilities ──────────────────────────────────────────────────

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

// ─── Adventure Record Building ──────────────────────────────────────────────

function buildAdventureRecord(entry) {
  if (!entry) return null

  const text = String(entry.text || '').trim()

  let structure
  if (isStructuredAdventureText(text)) {
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
