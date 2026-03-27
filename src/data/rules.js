// ─── SRD Rule Blocks & Resolution (D&D 5e SRD) ─────────────────────────────

export const SRD_QUICK_RULES = [
  {
    title: 'Initiative',
    text: 'Jede beteiligte Kreatur würfelt d20 + DEX-Modifikator. Höher gewinnt und handelt zuerst.',
  },
  {
    title: 'Angriff',
    text: 'Angriffswurf = d20 + Attributsmodifikator + Übungsbonus. Trifft, wenn das Ergebnis mindestens die Rüstungsklasse des Ziels erreicht.',
  },
  {
    title: 'Zauber & Rettungswurf',
    text: 'Zauber-SG = 8 + Übungsbonus + Zauberattribut. Spell Attack = Übungsbonus + Zauberattribut.',
  },
]

export const SRD_CORE_PROMPT_RULES = `
## D&D SRD 5.2.1 Grundprinzipien
- Nutze die sechs Attribute Stärke, Geschicklichkeit, Konstitution, Intelligenz, Weisheit und Charisma.
- Attributsmodifikator = floor((Attribut - 10) / 2).
- Trefferpunkte, AC, Angriff, Initiative und Zauberwerte aus dem App-Kontext sind maßgeblich.
- Wenn Regeln unklar sind, entscheide fair, simpel und konsistent im Geist des SRD statt seltene Sonderregeln zu erfinden.
`

export const SRD_RULE_BLOCKS = {
  core: {
    title: 'Allgemeine SRD-Basis',
    text: `
- Nutze SRD-5e-artige Logik statt Hausregeln zu erfinden.
- Erzähle stimmungsvoll, aber trenne Erzählung und Mechanik sauber.
- Wenn die App bereits Werte oder Würfelergebnisse liefert, behandle diese als verbindlich.
- Verlange nur dann einen Wurf, wenn die Handlung unsicher, riskant oder regelrelevant ist.
`,
  },
  combat: {
    title: 'Kampf',
    text: `
- Initiative: d20 + DEX-Modifikator. Höhere Initiative handelt zuerst.
- Angriff: d20 + passender Attributsmodifikator + Übungsbonus gegen die AC des Ziels.
- Nahkampf nutzt meist Stärke, Fernkampf meist Geschicklichkeit.
- Schaden wird mit dem passenden Schadenswürfel gewürfelt; beschreibe das Ergebnis erzählerisch.
- Wenn ein Kampf startet, nutze das Format **KAMPF BEGINNT**. Nach dem Ende: **KAMPF VORBEI**.
`,
  },
  spellcasting: {
    title: 'Zauberwirken',
    text: `
- Zauber-SG = 8 + Übungsbonus + Zauberattribut.
- Zauberangriffsbonus = Übungsbonus + Zauberattribut.
- Wenn ein Zauber einen Rettungswurf verlangt, nenne klar Art des Rettungswurfs und die SG.
- Wenn ein Zauber ein Angriffswurf ist, nutze den Zauberangriffsbonus aus dem Kontext.
- Erfinde keine Zauberwirkungen, die nicht plausibel zum genannten Zauber passen.
`,
  },
  abilityChecks: {
    title: 'Attributsproben & Fertigkeitsartige Situationen',
    text: `
- Nutze Attributsproben für Schleichen, Wahrnehmung, Nachforschen, Klettern, Einschüchtern, Überreden und ähnliche Aktionen.
- Nenne bei Bedarf das passende Attribut und den Grund für den Wurf.
- Verlange keine Probe für triviale Handlungen ohne Risiko.
- Gute Ideen dürfen Vorteile, leichtere SG oder automatische Teilerfolge rechtfertigen.
`,
  },
  social: {
    title: 'Soziale Szenen',
    text: `
- Soziale Interaktionen leben zuerst von Gespräch und Reaktion, nicht sofort von Würfen.
- Nutze Charisma-bezogene Proben nur dann, wenn der Ausgang unsicher und relevant ist.
- NSCs sollen nachvollziehbar reagieren und ihre Interessen behalten.
`,
  },
  exploration: {
    title: 'Erkundung',
    text: `
- Betone Umgebung, Hinweise, Risiken und Entscheidungsmöglichkeiten.
- Bei Suchen, Schleichen, Lauschen oder Fallenverdacht kombiniere Erzählung mit passenden Attributsproben.
- Gib konkrete beobachtbare Details statt vager Meta-Hinweise.
`,
  },
  equipment: {
    title: 'Ausrüstung & Gegenstände',
    text: `
- Der Charakter hat drei Ausrüstungsplätze: Waffe, Rüstung, Schild. Ausgerüstete Gegenstände beeinflussen AC, Angriff und Schaden mechanisch.
- Nutze Inventar und Ausrüstung aus dem App-Kontext als verbindliche Grundlage.
- Wenn der Spieler Beute findet, markiere sie mit [BEUTE:Gegenstandsname].
- Wenn der Spieler Gold erhält, markiere es mit [GM:+Betrag].
- Wenn ein Gegenstand verloren geht, markiere ihn mit [VERLOREN:Gegenstandsname].
- Wenn ein Gegenstand kreativ verwendet wird, bewerte das fair und pragmatisch.
- Heiltränke, Werkzeuge, Seile, Lichtquellen und ähnliche Gegenstände dürfen klare praktische Effekte haben.
- Biete Heilung (Heiltränke, Rasten etc.) NIEMALS als Auswahlmöglichkeit an, wenn der Charakter bereits volle HP hat (currentHP == maxHP).
- Beachte die Tragkraft des Charakters — übermäßig schwere Beute ist unrealistisch.
`,
  },
  conditions: {
    title: 'Zustände & Folgen',
    text: `
- Wenn eine Figur leidet, beschreibe den Zustand klar und mit spielrelevanten Folgen.
- Übliche Folgen sind eingeschränkte Bewegung, Nachteil, Kontrollverlust, Angst oder Bewusstlosigkeit.
- Übertreibe nicht mit Sonderzuständen, wenn eine einfache Folge genügt.
`,
  },
  restHealing: {
    title: 'Rast & Heilung',
    text: `
- Bei kurzer oder langer Rast beschreibe Zeit, Sicherheit, Unterbrechungen und Erholung.
- Heilung und Ressourcenerholung sollen plausibel zur Situation passen.
- In gefährlicher Umgebung ist eine Rast nicht automatisch sicher.
`,
  },
  deathSaves: {
    title: 'Todesrettungswürfe',
    text: `
- Todesrettungswurf: d20; 10 oder höher = Erfolg, 9 oder niedriger = Fehlschlag.
- Natürliche 20 kann die Figur stabilisieren oder kurz aufrichten; natürliche 1 zählt als zwei Fehlschläge.
- Wenn die Figur am Boden ist, behandle die Situation ernst, knapp und klar.
`,
  },
}

// ─── Rule Resolution ─────────────────────────────────────────────────────────

function containsAny(text, parts) {
  return parts.some(part => text.includes(part))
}

export function resolveRelevantRuleBlockKeys({ character, combat, userText = '' } = {}) {
  const text = String(userText || '').toLowerCase()
  const activeCombat = Boolean(combat?.active) || containsAny(text, [
    '[kampfaktion]', 'kampf', 'angriff', 'greife', 'greif',
    'initiative', 'schaden', 'rüstungsklasse', 'ac ', 'gegner', 'attacke', 'attackiere',
  ])

  const wantsSpellcasting = containsAny(text, [
    'zauber', 'cantrip', 'wirke', 'wirken', 'magie', 'magisch',
    'heilendes wort', 'magisches geschoss', 'segen', 'shield', 'spell',
  ])

  const wantsChecks = containsAny(text, [
    'untersuche', 'suche', 'schleiche', 'schleich', 'lausche',
    'klettere', 'kletter', 'erkenne', 'wahrnehm', 'spur', 'falle',
    'heimlich', 'nachforsch', 'überprüfe', '[würfelwurf]',
  ])

  const wantsSocial = containsAny(text, [
    'spreche', 'rede', 'frage', 'überrede', 'täusche',
    'einschüchtere', 'verhandle', 'überzeugen', 'drohe', 'bitte',
  ])

  const wantsExploration = containsAny(text, [
    'umgebung', 'raum', 'erkunde', 'erkund', 'gehe weiter',
    'tür', 'pfad', 'gang', 'truhe', 'hinein', 'vorsichtig',
  ])

  const wantsEquipment = containsAny(text, [
    'inventar', 'gegenstand', 'heiltrank', 'trank', 'seil', 'fackel',
    'schild', 'waffe', 'bogen', 'benutze', 'nutze', 'ausrüstung',
  ])

  const wantsRest = containsAny(text, [
    'rast', 'ruhe', 'schlaf', 'pause', 'short rest',
    'long rest', 'ausruhen', 'lagern',
  ])

  const wantsDeathSaves = (character?.currentHP ?? 1) <= 0 || containsAny(text, [
    'todesrettung', 'death save', 'sterbe', 'bewusstlos', 'verblute', 'am boden',
  ])

  // Detect spellcaster via computed spell save DC (avoids circular import with srd.js)
  const isSpellcaster = character?.spellSaveDC != null

  const keys = ['core']

  if (activeCombat) keys.push('combat', 'conditions')
  if (wantsDeathSaves || ((character?.currentHP ?? 1) <= 0 && activeCombat)) keys.push('deathSaves')
  if (wantsSpellcasting || (isSpellcaster && containsAny(text, ['wirke', 'zauber', 'magie', 'heile']))) keys.push('spellcasting')
  if (wantsChecks) keys.push('abilityChecks')
  if (wantsSocial) keys.push('social')
  if (wantsExploration) keys.push('exploration')
  if (wantsEquipment) keys.push('equipment')
  if (wantsRest) keys.push('restHealing')

  return [...new Set(keys)]
}

export function buildRelevantRulesContext({ character, combat, userText = '' } = {}) {
  const keys = resolveRelevantRuleBlockKeys({ character, combat, userText })

  const sections = keys
    .map(key => {
      const block = SRD_RULE_BLOCKS[key]
      if (!block) return null
      return `### ${block.title}\n${block.text.trim()}`
    })
    .filter(Boolean)

  return {
    keys,
    text: sections.join('\n\n').trim(),
  }
}
