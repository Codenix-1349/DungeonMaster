// ─── Choice Engine ──────────────────────────────────────────────────────────
// Central choice layer: generates normalized, prioritized choices from
// three sources (structured runtime data, AI response, contextual fallback).
// Designed as a durable building block for Phase 3/6/8.
//
// Choice flow:
//   1. Structured runtime data (exits, NPCs, objects, suggestedActions)
//   2. AI-parsed choices (numbered lists from model response)
//   3. Contextual fallbacks (scene-aware generic options)
//
// The UI consumes only normalized Choice objects — never raw AI text.

import { getAllowedRuntimeInteractions, normalizeRuntimeNpcState } from '../data/runtimeModule'

// ─── Choice Schema ──────────────────────────────────────────────────────────
// {
//   id:         string   — unique key (e.g. 'exit-0', 'npc-gareth', 'ai-2', 'fallback-explore')
//   label:      string   — display text
//   source:     string   — 'structured' | 'ai' | 'fallback'
//   kind:       string   — 'exit' | 'npc' | 'object' | 'action' | 'explore' | 'free'
//   target:     string?  — exit targetId, NPC name, object name, or null
//   check:      object?  — { skillOrAbility, dc, advantage } or null
//   priority:   number   — lower = higher priority (for stable ordering)
//   isFallback: boolean  — true for engine-generated fallbacks
// }

// ─── Skill Keyword Map (moved from GamePage.jsx) ───────────────────────────
// Maps German action keywords to SRD 5e skills + default DCs.
// Used for code-side probe inference when AI omits [PROBE_HINWEIS:] tags.

export const SKILL_KEYWORD_MAP = [
  { pattern: /\b(untersuch|durchsuch|inspizier|prüf.*sorgfältig|absuch.*hinweis|absuch.*spur|absuch.*fall|nach.*fallen.*such|nach.*hinweis|nach.*spur|forsch|analys)/i, skill: 'investigation', dc: 12 },
  { pattern: /\b(beobacht|lausch|horch|aufmerksam|spitz.*ohren|umhör|scharf.*aug|wahrnehm)/i, skill: 'perception', dc: 12 },
  { pattern: /\b(schleich|versteck|unbemerkt|heimlich|leise.*beweg|ungesehen|anschleich|unauffällig)/i, skill: 'stealth', dc: 13 },
  { pattern: /\b(überzeug|beruhig|überred|besänftig|appellier|bitt.*eindringlich)/i, skill: 'persuasion', dc: 13 },
  { pattern: /\b(täusch|belüg|vormach|ablenkungsmanöver|bluffen|vorgeb|verheimlich)/i, skill: 'deception', dc: 13 },
  { pattern: /\b(einschüchter|bedrohe|drohe|Angst.*einjag)/i, skill: 'intimidation', dc: 13 },
  { pattern: /\b(kletter|hinaufkletter|hinunterklett|schwimm|spring.*über|hochzieh|erklettern|erklimm)/i, skill: 'athletics', dc: 13 },
  { pattern: /\b(balancier|ausweich|akrobat|herunterspring|abroll)/i, skill: 'acrobatics', dc: 12 },
  { pattern: /\b(schloss.*knack|schloss.*öffn|dietrich|aufbrech.*schloss|Taschendieb)/i, skill: 'sleightOfHand', dc: 14 },
  { pattern: /\b(magisch.*erkenn|arkane.*zeichen|Magie.*ident|magische.*Aura|verzaubert|entziffere.*Runen)/i, skill: 'arcana', dc: 13 },
  { pattern: /\b(spur.*les|spur.*folg|orientier|navigier|wildnis|überleb|fährt.*les)/i, skill: 'survival', dc: 12 },
  { pattern: /\b(absicht.*erkenn|durchschau|lüge.*erkenn|aufrichtig|motiv|hintergedank)/i, skill: 'insight', dc: 13 },
  { pattern: /\b(geschichtl|historisch|erinner.*an.*Wissen|alt.*Legende|bekannt.*Geschichte)/i, skill: 'history', dc: 12 },
  { pattern: /\b(heilig|gebet|götter|religiös|segnung|untote.*erkenn)/i, skill: 'religion', dc: 12 },
  { pattern: /\b(pflanz|tier.*erkenn|gift.*erkenn|natürlich|natur.*wissen)/i, skill: 'nature', dc: 12 },
  { pattern: /\b(verbind.*Wunde|stabilisier|erste.*Hilfe|heilen(?!.*zauber))/i, skill: 'medicine', dc: 12 },
]

export function inferCheckFromLabel(label) {
  const lower = label.toLowerCase()
  if (/\b(geh|verlasse|zurück|weiter.*geh|etwas anderes|beschreibe selbst|warte|raste|ruh)/i.test(lower)) return null
  for (const { pattern, skill, dc } of SKILL_KEYWORD_MAP) {
    if (pattern.test(lower)) return { skillOrAbility: skill, dc, advantage: null }
  }
  return null
}

// ─── AI Choice Parsing ──────────────────────────────────────────────────────

const PROBE_HINWEIS_RE = /\s*\[PROBE_HINWEIS:(\w+)\|SG:(\d+)(?:\|(VORTEIL|NACHTEIL))?\]/i

function parseProbeHinweis(label) {
  const m = label.match(PROBE_HINWEIS_RE)
  if (!m) return { label, check: null }
  return {
    label: label.replace(PROBE_HINWEIS_RE, '').trim(),
    check: {
      skillOrAbility: m[1].toLowerCase(),
      dc: parseInt(m[2]),
      advantage: m[3]?.toUpperCase() === 'VORTEIL' ? 'advantage'
               : m[3]?.toUpperCase() === 'NACHTEIL' ? 'disadvantage'
               : null,
    },
  }
}

/** Parse numbered choices from AI response text into normalized Choice objects. */
export function parseAiChoices(text = '') {
  const clean = String(text).replace(/\*\*/g, '')
  const segments = clean.split(/(?=(?:^|\n|\s{2,}|[.!?]\s)\d[.):])/g)
  const choices = []
  const seen = new Set()
  let hasOther = false

  for (const seg of segments) {
    const m = seg.trim().match(/^([1-9])[.):]\s*(.+)/)
    if (!m) continue
    const rawLabel = m[2].trim().split('\n')[0].trim()
    const { label, check } = parseProbeHinweis(rawLabel)
    const effectiveCheck = check || inferCheckFromLabel(label)
    const key = label.toLowerCase()
    const isOther = /etwas anderes|selbst beschreiben/i.test(label)
    if (isOther && hasOther) continue
    if (isOther) hasOther = true
    if (label && label.length < 200 && !seen.has(key)) {
      seen.add(key)
      choices.push({
        id: `ai-${choices.length}`,
        label,
        source: 'ai',
        kind: isOther ? 'free' : 'action',
        target: null,
        check: effectiveCheck,
        priority: 10 + choices.length,
        isFallback: false,
      })
    }
  }
  return choices
}

// ─── Recent Action Matching ─────────────────────────────────────────────────
// Check if a choice target or label was recently acted upon by the player.
// Uses recentActions from sceneState (engine truth, not AI-inferred).

function wasRecentlyActedOn(label, target, recentActions = []) {
  if (!recentActions.length) return false
  const labelLower = label.toLowerCase()
  const targetLower = target?.toLowerCase() || ''
  for (const action of recentActions) {
    const actionLower = action.toLowerCase()
    // Direct label match (player clicked the exact button)
    if (actionLower === labelLower) return true
    // Target mentioned in player action (e.g. "Tresen" in "Ich untersuche den Tresen")
    if (targetLower && targetLower.length >= 3 && actionLower.includes(targetLower)) return true
    // Label's core words appear in action
    if (labelLower.length >= 6 && actionLower.includes(labelLower)) return true
  }
  return false
}

// ─── Structured Runtime Choices ─────────────────────────────────────────────

function buildStructuredChoices(section, sceneState, isRuntimeModule = false) {
  if (!section) return []
  const choices = []
  const inferred = sceneState?.inferred || {}
  const knownNpcs = sceneState?.playerKnowledge?.knownNpcs || []
  const activeNpcId = sceneState?.dialogueState?.activeNpcId || null
  const recentActions = sceneState?.recentActions || []

  // Exits — navigation options (flag-gated, deprioritize recently used)
  const exitFlags = sceneState?.gmState?.plotFlags || {}
  const exits = section.exits || []
  for (let i = 0; i < exits.length; i++) {
    const exit = exits[i]
    if (!exit.label) continue
    if (exit.requiresFlags?.length && !exit.requiresFlags.every(f => exitFlags[f])) continue
    const recent = wasRecentlyActedOn(exit.label, null, recentActions)
    choices.push({
      id: `exit-${i}`,
      label: exit.label,
      source: 'structured',
      kind: 'exit',
      target: exit.targetId || null,
      check: null,
      priority: recent ? 70 + i : 20 + i,
      isFallback: false,
    })
  }

  // NPCs — talk to visible, known NPCs (skip dead/fled, deprioritize recently talked to)
  const npcs = section.npcs || []
  if (isRuntimeModule && npcs.length) {
    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i]
      const npcId = section.visibleNpcs?.[i] || npc
      const npcState = normalizeRuntimeNpcState(sceneState?.gmState?.npcStates?.[npcId])
      const presence = npcState.state || npcState.status || null
      if (npcState.currentlyVisible === false) continue
      if (presence === 'dead' || presence === 'fled') continue
      if (activeNpcId && activeNpcId.toLowerCase() === npc.toLowerCase()) continue
      const label = `Mit ${npc} sprechen`
      const recent = wasRecentlyActedOn(label, npc, recentActions)
      choices.push({
        id: `npc-${npcId.toLowerCase().replace(/\s+/g, '-')}`,
        label,
        source: 'structured',
        kind: 'npc',
        target: npc,
        check: null,
        priority: recent ? 65 : 15,
        isFallback: false,
      })
    }
  } else {
    for (const npc of npcs) {
      if (!knownNpcs.some(k => k.toLowerCase() === npc.toLowerCase())) continue
      const npcState = inferred.npcStates?.[npc]
      if (npcState === 'dead' || npcState === 'fled') continue
      if (activeNpcId && activeNpcId.toLowerCase() === npc.toLowerCase()) continue
      const label = `Mit ${npc} sprechen`
      const recent = wasRecentlyActedOn(label, npc, recentActions)
      choices.push({
        id: `npc-${npc.toLowerCase().replace(/\s+/g, '-')}`,
        label,
        source: 'structured',
        kind: 'npc',
        target: npc,
        check: null,
        priority: recent ? 65 : 15,
        isFallback: false,
      })
    }
  }

  // ── Interaction-based choices (runtime module format) ──
  // If section has explicit interactions[], use those instead of interactiveObjects.
  const sectionInteractions = section.interactions || []
  const plotFlags = sceneState?.gmState?.plotFlags || {}
  const runtimeObjects = sceneState?.gmState?.runtimeObjects || {}
  const runtimeInteractions = sceneState?.gmState?.runtimeInteractions || {}
  const currentSectionId = sceneState?.gmState?.currentSectionId
  const usedInteractionIds = new Set()

  if (sectionInteractions.length) {
    if (isRuntimeModule) {
      const allowedInteractions = getAllowedRuntimeInteractions(section, sceneState)
      for (let i = 0; i < allowedInteractions.length; i++) {
        const intr = allowedInteractions[i]
        const recent = wasRecentlyActedOn(intr.label, intr.target, recentActions)
        if (recent) continue
        usedInteractionIds.add(intr.id)
        choices.push({
          id: `intr-${intr.id}`,
          label: intr.label,
          source: 'structured',
          kind: intr.kind || 'action',
          target: intr.target || null,
          interactionId: intr.id,
          check: intr.check ? { skillOrAbility: intr.check.skill, dc: intr.check.dc, advantage: null } : null,
          priority: intr.source === 'runtime' ? 5 : 8 + i,
          isFallback: false,
        })
      }
    } else {
      // Section interactions (static, from adventure data)
      for (let i = 0; i < sectionInteractions.length; i++) {
        const intr = sectionInteractions[i]
        if (!intr.id || !intr.label) continue
        // Flag gates: requires + blocks
        if (intr.requiresFlags?.length && !intr.requiresFlags.every(f => plotFlags[f])) continue
        if (intr.blocksIfFlags?.length && intr.blocksIfFlags.some(f => plotFlags[f])) continue
        // Availability: visible or runtimeObjectVisible
        if (!intr.availability?.visible) {
          const objId = intr.availability?.runtimeObjectVisible
          if (!objId || !runtimeObjects[objId]?.visible) continue
        }
        const recent = wasRecentlyActedOn(intr.label, intr.target, recentActions)
        if (recent) continue
        usedInteractionIds.add(intr.id)
        choices.push({
          id: `intr-${intr.id}`,
          label: intr.label,
          source: 'structured',
          kind: intr.kind || 'action',
          target: intr.target || null,
          interactionId: intr.id,
          check: intr.check ? { skillOrAbility: intr.check.skill, dc: intr.check.dc, advantage: null } : null,
          priority: 8 + i,
          isFallback: false,
        })
      }

      // Runtime interactions (dynamically revealed, not already in section)
      for (const [intrId, intr] of Object.entries(runtimeInteractions)) {
        if (!intr.visible || usedInteractionIds.has(intrId)) continue
        if (intr.sectionId && intr.sectionId !== currentSectionId) continue
        const objId = intr.availability?.runtimeObjectVisible
        if (objId && !runtimeObjects[objId]?.visible) continue
        if (intr.requiresFlags?.length && !intr.requiresFlags.every(f => plotFlags[f])) continue
        if (intr.blocksIfFlags?.length && intr.blocksIfFlags.some(f => plotFlags[f])) continue
        const recent = wasRecentlyActedOn(intr.label, intr.target, recentActions)
        if (recent) continue
        choices.push({
          id: `intr-${intrId}`,
          label: intr.label,
          source: 'structured',
          kind: intr.kind || 'action',
          target: intr.target || null,
          interactionId: intrId,
          check: intr.check ? { skillOrAbility: intr.check.skill, dc: intr.check.dc, advantage: null } : null,
          priority: 5,
          isFallback: false,
        })
      }
    }
  } else {
    // Legacy: interactiveObjects + runtimeDiscoveries
    const objects = section.interactiveObjects || []
    for (const obj of objects) {
      const objState = inferred.objectStates?.[obj]
      if (objState === 'destroyed') continue
      const label = `${obj} untersuchen`
      const recent = wasRecentlyActedOn(label, obj, recentActions)
      if (recent) continue
      choices.push({
        id: `obj-${obj.toLowerCase().replace(/\s+/g, '-')}`,
        label,
        source: 'structured',
        kind: 'object',
        target: obj,
        check: inferCheckFromLabel(label),
        priority: 18,
        isFallback: false,
      })
    }

    const discoveries = (sceneState?.gmState?.runtimeDiscoveries || []).filter(d => d.visible)
    for (const disc of discoveries) {
      const revealDef = (section.reveals || []).find(r => r.id === disc.revealId)
      const actions = revealDef?.actions || []
      if (actions.length) {
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i]
          const recent = wasRecentlyActedOn(action.label, disc.label, recentActions)
          if (recent) continue
          choices.push({
            id: `reveal-${disc.revealId}-${i}`,
            label: action.label,
            source: 'structured',
            kind: disc.kind || 'object',
            target: disc.label,
            check: action.check ? { skillOrAbility: action.check.skill, dc: action.check.dc, advantage: null } : inferCheckFromLabel(action.label),
            priority: 5 + i,
            isFallback: false,
          })
        }
      } else {
        const label = `${disc.label} untersuchen`
        const recent = wasRecentlyActedOn(label, disc.label, recentActions)
        if (!recent) {
          choices.push({
            id: `reveal-${disc.revealId}`,
            label,
            source: 'structured',
            kind: disc.kind || 'object',
            target: disc.label,
            check: inferCheckFromLabel(label),
            priority: 5,
            isFallback: false,
          })
        }
      }
    }
  }

  // Suggested actions from adventure data (deprioritize recently used)
  const suggested = section.suggestedActions || []
  for (let i = 0; i < suggested.length; i++) {
    const recent = wasRecentlyActedOn(suggested[i], null, recentActions)
    choices.push({
      id: `suggested-${i}`,
      label: suggested[i],
      source: 'structured',
      kind: 'action',
      target: null,
      check: inferCheckFromLabel(suggested[i]),
      priority: recent ? 60 + i : 12 + i,
      isFallback: false,
    })
  }

  return choices
}

// ─── Contextual Fallback Choices ────────────────────────────────────────────

function buildFallbackChoices(section, sceneState) {
  const choices = []
  const activeNpcId = sceneState?.dialogueState?.activeNpcId || null
  const objective = sceneState?.currentObjective || null

  // If in dialogue, offer conversation actions
  if (activeNpcId) {
    choices.push({
      id: 'fallback-ask',
      label: `${activeNpcId} nach Informationen fragen`,
      source: 'fallback',
      kind: 'npc',
      target: activeNpcId,
      check: null,
      priority: 30,
      isFallback: true,
    })
  }

  // Explore the environment
  if (section?.visibleFeatures?.length || section?.interactiveObjects?.length) {
    choices.push({
      id: 'fallback-explore',
      label: 'Die Umgebung genauer untersuchen',
      source: 'fallback',
      kind: 'explore',
      target: null,
      check: { skillOrAbility: 'perception', dc: 12, advantage: null },
      priority: 32,
      isFallback: true,
    })
  }

  // Pursue current objective
  if (objective && objective.length > 10) {
    const short = objective.length > 60 ? objective.slice(0, 57) + '...' : objective
    choices.push({
      id: 'fallback-objective',
      label: short,
      source: 'fallback',
      kind: 'action',
      target: null,
      check: null,
      priority: 31,
      isFallback: true,
    })
  }

  // Cautious approach
  choices.push({
    id: 'fallback-careful',
    label: 'Vorsichtig vorgehen und die Lage prüfen',
    source: 'fallback',
    kind: 'explore',
    target: null,
    check: { skillOrAbility: 'perception', dc: 12, advantage: null },
    priority: 35,
    isFallback: true,
  })

  return choices
}

// ─── Semantic Deduplication ──────────────────────────────────────────────────
// Merges choices that target the same thing with similar intent.
// Prefers the variant with probe info, then structured source, then lower priority.

const ACTION_STOP_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem',
  'mit', 'nach', 'und', 'oder', 'von', 'vom', 'zum', 'zur',
  'untersuchen', 'ansehen', 'betrachten', 'anschauen', 'prüfen', 'inspizieren',
  'sprechen', 'reden', 'fragen', 'gehen', 'öffnen', 'nehmen',
  'genauer', 'vorsichtig', 'genau', 'näher',
])

function extractContentWords(label) {
  return label.toLowerCase().split(/\s+/).filter(w => w.length >= 3 && !ACTION_STOP_WORDS.has(w))
}

function areSemanticallyDuplicate(a, b) {
  if (a.kind === 'free' || b.kind === 'free') return false
  // Exit vs non-exit are fundamentally different intents (movement vs interaction)
  if ((a.kind === 'exit') !== (b.kind === 'exit')) return false

  const sameExplicitTarget = Boolean(
    a.target &&
    b.target &&
    a.target.toLowerCase() === b.target.toLowerCase()
  )
  const sameTargetViaLabel = Boolean(
    (a.target && a.target.length >= 3 && b.label.toLowerCase().includes(a.target.toLowerCase())) ||
    (b.target && b.target.length >= 3 && a.label.toLowerCase().includes(b.target.toLowerCase()))
  )

  // Same target but different explicit skills = different approach, keep both
  if ((sameExplicitTarget || sameTargetViaLabel) &&
      a.check?.skillOrAbility &&
      b.check?.skillOrAbility &&
      a.check.skillOrAbility !== b.check.skillOrAbility) {
    return false
  }

  // Same explicit target
  if (sameExplicitTarget) return true

  // One has a target that appears in the other's label
  if (sameTargetViaLabel) return true

  // Significant content-word overlap (>= 50% of the shorter set)
  const aWords = extractContentWords(a.label)
  const bWords = extractContentWords(b.label)
  if (!aWords.length || !bWords.length) return false
  const overlap = aWords.filter(w => bWords.some(bw => bw === w || bw.includes(w) || w.includes(bw)))
  const minLen = Math.min(aWords.length, bWords.length)
  return overlap.length >= Math.max(1, Math.ceil(minLen * 0.5))
}

function pickBetterChoice(a, b) {
  // Prefer the one with probe info (more precise)
  if (a.check && !b.check) return a
  if (b.check && !a.check) return b
  // Prefer structured > ai > fallback
  const sourceRank = { structured: 0, ai: 1, fallback: 2 }
  const ra = sourceRank[a.source] ?? 2
  const rb = sourceRank[b.source] ?? 2
  if (ra !== rb) return ra < rb ? a : b
  // Prefer lower priority (= higher importance)
  return a.priority <= b.priority ? a : b
}

function deduplicateSemantic(choices) {
  const result = []
  const consumed = new Set()
  for (let i = 0; i < choices.length; i++) {
    if (consumed.has(i)) continue
    let best = choices[i]
    for (let j = i + 1; j < choices.length; j++) {
      if (consumed.has(j)) continue
      if (areSemanticallyDuplicate(best, choices[j])) {
        consumed.add(j)
        best = pickBetterChoice(best, choices[j])
      }
    }
    result.push(best)
  }
  return result
}

// ─── Retry Filter ───────────────────────────────────────────────────────────
// Suppresses choices matching previously failed interactions unless sufficient
// context change has occurred. Enforcement lives HERE in the Choice Layer —
// not in AI prompting — so behaviour is deterministic.
//
// Interaction records are written by GamePage.handleCheckResult (authoritative
// check flow) and stored in sceneState.interactionHistory.
//
// Rules:
//   • Same target + same skill (or choice has no check) → suppress
//   • Same target + different skill               → allow (new approach)
//   • Weak label match + same skill               → soft deprioritize (+40)
//   • Context change detected                     → allow everything
//
// Context change signals:
//   • Section transition since failure
//   • New clues discovered
//   • New NPCs met
//   • New items acquired
//   • ≥5 turns elapsed (fallback)

function findMatchingFailure(choice, failedInteractions) {
  for (const interaction of failedInteractions) {
    // Strong: same explicit target ID
    if (choice.target && interaction.targetId &&
        choice.target.toLowerCase() === interaction.targetId.toLowerCase()) {
      return { interaction, strength: 'strong' }
    }

    // Weak: interaction target mentioned in choice label
    if (interaction.targetId && interaction.targetId.length >= 3 &&
        choice.label.toLowerCase().includes(interaction.targetId.toLowerCase())) {
      return { interaction, strength: 'weak' }
    }

    // Weak: choice target mentioned in interaction label
    if (choice.target && choice.target.length >= 3 &&
        interaction.label && interaction.label.toLowerCase().includes(choice.target.toLowerCase())) {
      return { interaction, strength: 'weak' }
    }

    // Weak: significant content-word overlap + same skill
    if (interaction.label && choice.check?.skillOrAbility === interaction.skill) {
      const cWords = extractContentWords(choice.label)
      const iWords = extractContentWords(interaction.label)
      if (cWords.length && iWords.length) {
        const overlap = cWords.filter(w =>
          iWords.some(iw => iw === w || iw.includes(w) || w.includes(iw))
        )
        const minLen = Math.min(cWords.length, iWords.length)
        if (overlap.length >= Math.max(1, Math.ceil(minLen * 0.5))) {
          return { interaction, strength: 'weak' }
        }
      }
    }
  }
  return null
}

function hasContextChanged(interaction, sceneState) {
  if (!sceneState) return true

  // Section transition since failure
  if (sceneState.gmState?.currentSectionId !== interaction.sectionId) return true

  // Fallback: ≥5 turns elapsed
  const turnDelta = (sceneState.turnCount || 0) - (interaction.turn || 0)
  if (turnDelta >= 5) return true

  const ctx = interaction.contextSnapshot || {}

  // New clues discovered (new information)
  if ((sceneState.playerKnowledge?.discoveredClues?.length || 0) > (ctx.clueCount || 0)) return true

  // New NPCs met (new information)
  if ((sceneState.playerKnowledge?.knownNpcs?.length || 0) > (ctx.npcCount || 0)) return true

  // New items acquired (new tool / Werkzeug)
  if (ctx.itemCount != null && sceneState._currentItemCount != null &&
      sceneState._currentItemCount > ctx.itemCount) return true

  return false
}

function applyRetryFilter(choices, sceneState) {
  const history = sceneState?.interactionHistory
  if (!history?.length) return choices

  const failed = history.filter(i => i.outcome === 'failure')
  if (!failed.length) return choices

  const result = []
  for (const choice of choices) {
    // Free-form always passes
    if (choice.kind === 'free') { result.push(choice); continue }

    const match = findMatchingFailure(choice, failed)
    if (!match) { result.push(choice); continue }

    const { interaction, strength } = match

    // Different skill = new approach → allow fully
    if (choice.check?.skillOrAbility &&
        choice.check.skillOrAbility !== interaction.skill) {
      result.push(choice)
      continue
    }

    // Context has changed → allow
    if (hasContextChanged(interaction, sceneState)) {
      result.push(choice)
      continue
    }

    // Strong match + same/no skill + no context change → suppress entirely
    if (strength === 'strong') continue

    // Weak match + no context change → soft deprioritize
    result.push({ ...choice, priority: choice.priority + 40 })
  }

  return result
}

// ─── Main Generator ─────────────────────────────────────────────────────────

const MAX_CHOICES = 6

/**
 * Build normalized, prioritized choices from all available sources.
 *
 * @param {object} params
 * @param {string} params.aiResponse      — raw AI assistant text
 * @param {object} params.section         — current adventure section (from findSectionById)
 * @param {object} params.sceneState      — current scene state
 * @param {boolean} params.combatActive   — suppress choices during combat
 * @returns {Choice[]} normalized choices, sorted by priority, capped
 */
export function buildAvailableChoices({ aiResponse = '', section = null, sceneState = null, combatActive = false, isRuntimeModule = false } = {}) {
  if (combatActive) return []

  const structuredChoices = buildStructuredChoices(section, sceneState, isRuntimeModule)
  const fallbackChoices = buildFallbackChoices(section, sceneState)

  // Runtime modules: engine-only choices, AI has no say
  // Legacy/prose: AI choices supplement structured choices
  const aiChoices = isRuntimeModule ? [] : parseAiChoices(aiResponse)

  let merged = []
  const usedLabels = new Set()

  const addUnique = (choice) => {
    const key = choice.label.toLowerCase()
    if (usedLabels.has(key)) return false
    usedLabels.add(key)
    merged.push(choice)
    return true
  }

  // Engine-first: structured choices always take priority
  for (const c of structuredChoices) addUnique(c)

  // AI choices only supplement (never for runtime modules)
  for (const c of aiChoices) {
    if (merged.length >= MAX_CHOICES - 1) break
    addUnique(c)
  }

  // Fallbacks if not enough choices
  if (merged.length < 2) {
    for (const c of fallbackChoices) {
      if (merged.length >= MAX_CHOICES - 1) break
      addUnique(c)
    }
  }

  // Semantic deduplication: merge choices about the same target/intent
  merged = deduplicateSemantic(merged)

  // Retry filter: suppress/deprioritize choices matching failed interactions
  merged = applyRetryFilter(merged, sceneState)

  // Always offer free-form input as last option
  if (!merged.some(c => c.kind === 'free')) {
    merged.push({
      id: 'free-input',
      label: 'Etwas anderes tun',
      source: 'fallback',
      kind: 'free',
      target: null,
      check: null,
      priority: 99,
      isFallback: true,
    })
  }

  // Sort by priority, cap total
  merged.sort((a, b) => a.priority - b.priority)
  return merged.slice(0, MAX_CHOICES)
}
