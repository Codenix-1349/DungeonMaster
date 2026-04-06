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

function _yParseMap(lines, pos, minIndent) {
  const map = {}
  while (pos < lines.length) {
    const l = lines[pos]
    if (l.indent < minIndent) break
    const kv = l.content.match(/^(\w+)\s*:\s*(.*)/)
    if (!kv) { pos++; continue }
    const key = kv[1], val = kv[2].trim()
    if (val) { map[key] = _yParseInline(val); pos++ }
    else if (pos + 1 < lines.length && lines[pos + 1].indent > l.indent) {
      const ci = lines[pos + 1].indent
      const r = lines[pos + 1].content.startsWith('- ')
        ? _yParseList(lines, pos + 1, ci)
        : _yParseMap(lines, pos + 1, ci)
      map[key] = r.value; pos = r.pos
    } else { map[key] = null; pos++ }
  }
  return { value: map, pos }
}

function _yParseList(lines, pos, minIndent) {
  const list = []
  while (pos < lines.length) {
    const l = lines[pos]
    if (l.indent < minIndent || !l.content.startsWith('- ')) break
    const itemText = l.content.slice(2).trim()
    const kv = itemText.match(/^(\w+)\s*:\s*(.*)/)
    if (!kv) { list.push(_yParseInline(itemText)); pos++; continue }

    // Complex list item
    const item = {}
    const key = kv[1], val = kv[2].trim()
    pos++
    if (val) { item[key] = _yParseInline(val) }
    else if (pos < lines.length && lines[pos].indent > l.indent) {
      const ci = lines[pos].indent
      const r = lines[pos].content.startsWith('- ')
        ? _yParseList(lines, pos, ci)
        : _yParseMap(lines, pos, ci)
      item[key] = r.value; pos = r.pos
    } else { item[key] = null }

    // Collect remaining properties of this list item
    const propIndent = l.indent + 2
    while (pos < lines.length && lines[pos].indent >= propIndent) {
      const pl = lines[pos]
      if (pl.indent === l.indent && pl.content.startsWith('- ')) break
      const pkv = pl.content.match(/^(\w+)\s*:\s*(.*)/)
      if (!pkv) { pos++; continue }
      const pKey = pkv[1], pVal = pkv[2].trim()
      if (pVal) { item[pKey] = _yParseInline(pVal); pos++ }
      else if (pos + 1 < lines.length && lines[pos + 1].indent > pl.indent) {
        const ci = lines[pos + 1].indent
        const r = lines[pos + 1].content.startsWith('- ')
          ? _yParseList(lines, pos + 1, ci)
          : _yParseMap(lines, pos + 1, ci)
        item[pKey] = r.value; pos = r.pos
      } else { item[pKey] = null; pos++ }
    }
    list.push(item)
  }
  return { value: list, pos }
}

function parseYamlLike(text) {
  const lines = text.split('\n')
    .map((raw, i) => ({ indent: Math.max(0, raw.search(/\S/)), content: raw.trim(), lineNum: i }))
    .filter(l => l.content && !l.content.startsWith('#'))
  return _yParseMap(lines, 0, 0).value
}

// ─── Runtime Module Parser ─────────────────────────────────────────────────
// Parses YAML-like structured module format (MODULE_ID + SECTIONS with nested
// interactions, reveals, registries). Maps to internal structure for compat.

function isRuntimeModule(text = '') {
  return /^MODULE_ID:/m.test(text) && /^SECTIONS:/m.test(text)
}

function validateRuntimeModuleStructure(module, sections = []) {
  const warnings = []

  if (!String(module?.playerPrimaryObjective || '').trim()) {
    warnings.push({
      code: 'runtime-player-primary-objective-missing',
      sectionId: null,
      interactionId: null,
      message: 'Runtime module should define PLAYER_PRIMARY_OBJECTIVE for player-facing quest framing.',
    })
  }

  for (const section of sections) {
    if (!String(section.playerObjective || '').trim()) {
      warnings.push({
        code: 'runtime-player-objective-missing',
        sectionId: section.id,
        interactionId: null,
        message: `Runtime section "${section.id || section.title || 'unknown'}" should define playerObjective for player-facing objective text.`,
      })
    }

    if (!String(section.introText || '').trim()) {
      warnings.push({
        code: 'runtime-intro-text-missing',
        sectionId: section.id,
        interactionId: null,
        message: `Runtime section "${section.id || section.title || 'unknown'}" should define introText for player-facing scene framing.`,
      })
    }

    for (const interaction of section.interactions || []) {
      const checkPolicy = typeof interaction.checkPolicy === 'string'
        ? interaction.checkPolicy.trim()
        : null
      if (checkPolicy && checkPolicy !== 'none') {
        warnings.push({
          code: 'runtime-check-policy-invalid',
          sectionId: section.id,
          interactionId: interaction.id || null,
          message: `Runtime interaction "${interaction.id || interaction.label || 'unknown'}" uses unsupported checkPolicy "${checkPolicy}". Use "none" or define check.`,
        })
        continue
      }

      if (interaction.check) continue
      if (checkPolicy === 'none') continue

      warnings.push({
        code: 'runtime-check-decision-missing',
        sectionId: section.id,
        interactionId: interaction.id || null,
        message: `Runtime interaction "${interaction.id || interaction.label || 'unknown'}" must define check or checkPolicy: none.`,
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
      requiresFlags: Array.isArray(e.requiresFlags) ? e.requiresFlags : [],
    }))

    const interactions = (sec.interactions || []).map(intr => ({
      id: intr.id || '',
      label: intr.label || '',
      kind: intr.kind || 'action',
      target: intr.target || null,
      requiresFlags: Array.isArray(intr.requiresFlags) ? intr.requiresFlags : [],
      blocksIfFlags: Array.isArray(intr.blocksIfFlags) ? intr.blocksIfFlags : [],
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
