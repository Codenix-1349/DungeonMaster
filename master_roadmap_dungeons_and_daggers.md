# Dungeons & Daggers – Master-Roadmap

Last updated: 2026-04-13 (v2)

## Zweck dieser Datei

Diese Datei ist die strategische Master-Roadmap des Projekts.
Sie beantwortet drei Fragen:
- Welche Phase hat gerade Vorrang?
- Welche Voraussetzungen blockieren die nächste Phase?
- Welche Dokumente sind strategisch, operativ oder rein historisch?

Die operative Ausführung für den aktuellen Schwerpunkt liegt in:
- `docs/runtime-authority-roadmap.md` für die Runtime-Härtung
- `docs/ai-next-steps.md` als kurzer Wiedereinstiegspunkt
- `docs/ai-progress.md` als Verlaufslog, nicht als Planungsquelle

---

## Leitprinzip

**Zuerst eine stabile App bauen, dann exakt darauf zugeschnittene Abenteuer.**
Nicht umgekehrt. Abenteuer werden auf die fertige Engine-Logik zugeschnitten — die App wird nicht um Abenteuer-Inhalte herumgebaut.

**Engine kontrolliert die Spielwahrheit.**
Die KI liefert Sprache, Atmosphäre, Dialog und natürliche Formulierung.

Kanonische Wahrheit kommt aus genau zwei Quellen:
1. **Die App (Engine)** — Proben, Kampf, Inventar, State, Transitions, Choices
2. **Das Abenteuer (authored module)** — NPCs, Clues, Szenen, Flags, Reveals

Die KI ist **keine Wahrheitsquelle**. Sie erzählt, beschreibt, formuliert — aber generiert keine kanonischen Fakten.

### Harte Entscheidungsregel
Jede Änderung bleibt nur im Plan, wenn sie mindestens eines davon klar verbessert:
- Spielfluss
- Spoilerkontrolle
- Runtime-/Truth-Autorität der App
- Regel- und Systemkonsistenz
- Tokeneffizienz
- Zukunftsfähigkeit / Erweiterbarkeit

Alles andere ist nachrangig.

---

## Endziel

Ziel ist ein stabiles, spoilerarmes, tokeneffizientes AI-Dungeon-Master-System mit diesen Eigenschaften:
- strukturierte, kontrollierte Runtime statt Abenteuertext-Raten
- keine KI-generierte Wahrheit
- konsistente NPC-, Clue-, Objekt- und Plot-Zustände
- engine-first Choice-, Reveal- und Check-Logik
- engine-seitiger Kampf, Proben, Inventar, Ressourcen und Klassenmechanik
- später: Authoring-Tools für maßgeschneiderte Abenteuer

---

## Dokumentrollen

### Strategisch
- `master_roadmap_dungeons_and_daggers.md`
  Priorisierung, Phasenlogik, Abhängigkeiten, Exit-Gates.

### Operativ
- `docs/runtime-authority-roadmap.md`
  Konkreter Umsetzungsplan für den aktuellen Runtime-Schwerpunkt.
- `docs/ai-next-steps.md`
  Kurzer Startpunkt für die nächste Arbeitssitzung.

### Historisch
- `docs/ai-progress.md`
  Verlauf, bereits erledigte Pakete, frühere Teststände.

Wenn diese Dokumente sich widersprechen, gilt die Reihenfolge:
1. `master_roadmap_dungeons_and_daggers.md`
2. `docs/runtime-authority-roadmap.md`
3. `docs/ai-next-steps.md`
4. `docs/ai-progress.md`

---

## Aktuelle Gesamteinordnung

Der aktuelle Schwerpunkt bleibt **Phase 3**.

Der Runtime-Kern ist bereits weit vorangekommen:
- Runtime-Module als echter Hauptpfad
- authored interactions / reveals / checks
- player-facing vs internal text
- AI-Choices im Runtime-Modus entfernt
- zwei Referenzabenteuer als Architekturfläche
- Intent-/Identity-Pfad gehärtet (aliases, actionKey, interactionId)
- Player-facing Validation und Acceptance Invariants
- State Ownership und Choice Visibility über choiceEngine

### Realistischer Status
- Phase 3: **sehr weit, 3.1–3.4 abgeschlossen, 3.5 offen**
- Größter Restblock: **Doku-Kanonisierung (3.5)**

### Warum Phase 4 noch nicht starten sollte
- Eine Backend-Zentralisierung würde dieselben offenen Runtime-Unschärfen nur verlagern.
- Ohne kanonisierte Doku fehlt der klare Startpunkt für das nächste Team/die nächste Session.

---

# Now – Phase 3 sauber abschließen

## Ziel
Structured runtime modules müssen der klare, verlässliche Kernpfad sein.
Die KI darf nur den aktuell erlaubten Runtime-Ausschnitt sehen und beschreiben, aber keine Spielwahrheit erzeugen.

## 3.1 Runtime-Identity und Intent final härten ✅

### Fokus
Freitext, Buttons und Wiederholungen sollen deterministisch auf dieselbe autorisierte Interaction-Identität laufen.

### Umsetzung
- Freitext im Runtime-Modus primär über authored `aliases`, `interactionId`, `actionKey`, später optional `intentKey`
- Semantisches Label-Matching nur noch Bridge/Fallback
- Retry/Dedupe vollständig auf `actionKey` / `interactionId`
- gleiches Zielverhalten für Button-Flow und typed input
- mehrdeutige Interaktionen bei mehreren NPCs/Objekten explizit entschärfen

### Exit-Signal
- gleiche Absicht landet reproduzierbar auf derselben authored Interaction ✅
- Dedupe/Retry hängt nicht mehr primär am sichtbaren Label ✅

## 3.2 Player-facing Validation ausbauen ✅

### Fokus
Spoilerhafte sichtbare Modultexte früh erkennen statt zur Laufzeit kosmetisch zu kaschieren.

### Umsetzung
Warnungen/Checks für:
- unrevealed NPCs in `PLAYER_PRIMARY_OBJECTIVE`, `playerObjective`, `introText`
- unrevealed Clues/Objekte in sichtbaren Labels/Threads
- Reveal-/Registry-Referenzen auf unbekannte IDs
- sichtbare Runtime-Elemente ohne saubere authored Herkunft

### Exit-Signal
- spoilrige player-facing Texte schlagen früh an ✅
- keine Laufzeit-Umschreibung als Scheinlösung ✅

## 3.3 Acceptance Shield mit den 2 Referenzabenteuern festziehen ✅

### Fokus
Die Architektur muss mit echten Modulen beweisen, dass sichtbare Optionen, Prompt-Wahrheit und Runtime-Wahrheit zusammenpassen.

### Referenzmodule
- `src/data/adventures/birkenhain_minimal_runtime_module.txt`
- `src/data/adventures/graufurt_reference_runtime_module.txt`

### Umsetzung
Beide Module als verbindliche Akzeptanzfläche ausbauen für:
- visible choice layer = runtime truth = prompt truth
- hidden object reveal chains
- check + non-check actions
- mehrere NPCs in derselben Szene
- authored talk + typed follow-up
- retry / backtracking / remount / tab return
- spoilerfreie player-facing Intros

### Exit-Signal
- beide Module prüfen bewusst die Kernarchitektur statt nur Content ✅
- neue Regressionen werden früh sichtbar ✅

## 3.4 Probe-/Check-Flow end-to-end härten ✅

### Fokus
Authored Checks müssen im echten UI-Fluss klar, sichtbar und verlässlich funktionieren.
**Abgrenzung zu Phase 6:** Hier geht es darum, dass authored checks überhaupt E2E funktionieren. Phase 6 vertieft das System danach (passive checks, partial success, fail forward, Klassenfeatures).

### Umsetzung
- authored check -> pendingCheck -> SkillCheckPanel -> Roll -> Result -> Runtime-State
- klare UI-Sichtbarkeit für checkbasierte Aktionen
- Success/Fail-End-to-End-Tests
- keine Runtime-Checks mehr aus Freitext-Inferenz

### Status
- authored Check-Flow ist jetzt end-to-end verifiziert
- authored `interaction.check` -> `pendingCheck` -> `SkillCheckPanel` -> Roll -> Runtime-State
- Success und Failure mutieren Runtime-State autoritativ
- Runtime-Checks werden nicht mehr aus Freitext-Inferenz oder AI-Tags gezogen

### Exit-Signal
- eine blaue Option bedeutet eindeutig authored check ✅
- der Check-Flow läuft sichtbar und reproduzierbar durch ✅

## 3.5 Doku kanonisieren ← aktueller Fokus

### Fokus
Ein klarer wahrer Stand ohne widersprüchliche interne Anweisungen.

### Umsetzung
- `docs/runtime-authority-roadmap.md` als operative Phase-3-Quelle festziehen
- `docs/ai-next-steps.md` auf denselben Startpunkt ausrichten
- `docs/ai-progress.md` klar als historisches Log markieren
- `master_roadmap_dungeons_and_daggers.md` auf denselben echten Phase-3-Stand ziehen
- veraltete Testzahlen, Branch-Hinweise und konkurrierende Priorisierungen entfernen

### Exit-Signal
- ein klarer Startpunkt
- keine widersprüchlichen Aussagen zum aktuellen Stand

## Phase-3-Abschlusskriterium

Phase 3 ist erst dann wirklich fertig, wenn:
- Runtime-Truth engine-owned ist ✅
- Intent-/Identity-Pfad stabil genug ist ✅
- player-facing Leaks durch Validation früh auffallen ✅
- beide Referenzabenteuer die Architektur sauber beweisen ✅
- Check + non-check + reveal chains end-to-end funktionieren ✅ (3.4)
- Prompt, Choice-Layer und UI aus derselben autoritativen Runtime-Wahrheit ziehen ✅
- Doku kanonisiert und widerspruchsfrei ❌ (3.5)

Erst dann beginnt Phase 4.

---

# Next – Phase 4 Autorität zentralisieren

## Ziel
Backend wird mittelfristig Single Source of Truth für Prompt-Logik und State-Übergänge.

### 4.1 Prompt-Building ins Backend verschieben
- Frontend baut nicht mehr die finale Prompt-Wahrheit
- Server lädt State, baut Prompt, orchestriert AI-Call

### 4.2 Session-Memory serverseitig verdichten
- raw history reduzieren
- strukturierte Summary pflegen
- doppelte Prompt-Infos vermeiden

### 4.3 Persistenz sauberer machen
- Session-Patches bündeln/debouncen
- Fire-and-forget-Write-Flut reduzieren

### 4.4 Streaming bis zur UX durchziehen
- echte Delta-Ausgabe
- keine nur technische Streaming-Existenz
- Hinweis: gehört thematisch eher zur UX, wird aber hier erledigt weil beim Backend-Umbau Streaming ohnehin angefasst werden muss

### Done
- Promptlogik zentralisiert
- Frontend trägt weniger Wahrheitslast
- Tokenfluss ist nachvollziehbarer

---

# Later – Systemtiefe und Stabilisierung

## Phase 5 – Kampf zu echter Engine-Mechanik ausbauen

### Ziel
Kampf darf nicht halb narrativ, halb mechanisch bleiben. Engine entscheidet, KI beschreibt.

### 5.1 Encounter-Autorität und Kampfablauf
- Encounter-Start/-Ende engine-gesteuert, nicht KI-initiiert
- Initiative, Rundenstruktur und Zugreihenfolge systemisch
- Reward-Vergabe (XP, Loot) nur engine-seitig
- Exit-Signal: Kampf startet und endet deterministisch, KI kann keinen Kampf erfinden oder beenden

### 5.2 Condition Engine und Zustandseffekte
- Condition Engine einführen (poisoned, stunned, prone, etc.)
- Konzentration und Dauer systemisch tracken
- Kernzustände modellieren statt narrativ beschreiben
- Exit-Signal: Zustände wirken sich mechanisch aus und verfallen regelkonform

### 5.3 Zauber und Effekt-Resolution
- Wichtige Zaubereffekte systemisch auflösen (Schaden, Heilung, Buffs, Debuffs)
- Spell Slots engine-seitig verwalten
- Exit-Signal: Kernzauber funktionieren mechanisch korrekt, nicht nur narrativ

### Done
- Kampf ist merklich engine-seitig und testbar
- KI ist Erzähler, nicht Kampfrichter
- Conditions, Zauber und Rewards laufen über die Engine

## Phase 6 – Probensystem und Klassenfeatures vertiefen

### Ziel
Proben weniger KI-abhängig machen und Klassen mechanisch echter abbilden.
**Abgrenzung zu Phase 3.4:** Phase 3.4 stellt sicher, dass authored checks E2E funktionieren. Phase 6 baut darauf auf und vertieft das System.

### Schwerpunkt
- passive Werte, partial success, fail forward, Retry-Kontrolle
- Engine entscheidet in structured adventures, wann eine Probe nötig ist
- Hook-/Effect-System für wiederverwendbare Mechanik
- erste echte Klassenfeatures systemisch modellieren

### Done
- Probensystem ist engine-first genug
- Klassenfeatures leben nicht nur im Erzähltext

## Phase 7 – Inventar, Ressourcen und Exploration vertiefen

### Ziel
Das bestehende SRD-Inventarsystem (Items, Münzen, Equipment-Slots, Auto-Loot) systemisch vertiefen, damit Inventar und Ausrüstung spielmechanisch relevant werden.

### Was bereits existiert
- Strukturiertes Inventar mit item IDs (itemKey), Typen, Gewicht, Stacking
- Münzwallet (km/sm/em/gm/pm), Equipment-Slots, Tragkapazitätsbalken
- SRD-Itemkatalog (~150 Items), Loot-Tabellen, Auto-Loot nach Kampf
- AC-Berechnung aus ausgerüsteter Rüstung/Schild

### Schwerpunkt (Vertiefung)
- Verbrauchsgüter und Munition mechanisch nutzbar machen (nicht nur Zähler)
- Quest-Items sauber von normalem Inventar trennen
- Werkzeuge und Ressourcen in Proben/Exploration systemisch einbinden
- Encumbrance-Enforcement (aktuell nur visuell, nicht blockierend)
- finaler Besitz nur über Engine

### Done
- Inventar ist mehr als Liste
- Exploration profitiert mechanisch von Ausrüstung

## Phase 8 – Tokenoptimierung und Qualitätsstabilisierung

### Ziel
Geringere Kosten, stabilere Langzeitsessions, weniger Kontextmüll.

### Schwerpunkt
- Prompt kompakter machen
- Session-Summary kontrolliert verdichten
- Hybrid-Choice-System bewusst bewerten
- zusätzliche Qualitätsprüfungen ergänzen

### Done
- Kontext ist kontrollierbarer
- Langzeitsessions bleiben stabiler

## Phase 9 – Abenteuer-Authoring

### Ziel
Effiziente Erstellung maßgeschneiderter Abenteuer für die fertige Engine.

### Schwerpunkt
- Authoring-Format und Validierung für Runtime-Module
- Editor oder Tooling zur Abenteuer-Erstellung
- Modul-Validierung gegen Engine-Capabilities (nutzt das Modul nur Features die die App unterstützt?)
- Template-System für wiederkehrende Patterns (NPC-Intro, Check-Gate, Reveal-Chain)

### Done
- Abenteuer können effizient und fehlerfrei erstellt werden
- Module nutzen die Engine-Mechaniken voll aus

---

## Harte Priorisierung ab jetzt

1. **Phase 3 sauber abschließen** (3.5)
2. **Phase 4** – Backend-/Prompt-Autorität
3. **Phase 5** – Kampfsystem (3 Sub-Phasen)
4. **Phase 6** – Proben + Klassenfeatures
5. **Phase 7** – Inventar/Ressourcen vertiefen
6. **Phase 8** – Token-/Qualitätsnetz
7. **Phase 9** – Abenteuer-Authoring

---

## Was wir ausdrücklich nicht tun

- kein großer Content-Schub vor sauberem Abschluss von Phase 3
- keine Backend-Zentralisierung vor stabilem Runtime-Kern
- kein Kampfsystem auf halbweicher Truth-Firewall
- keine Heuristikmagie, um schlechte Moduldaten zu kaschieren
- keine Feature-Orgie ohne klaren Beitrag zum Endziel
- keine Abenteuer-Produktion vor stabiler Engine-Mechanik

---

## Schlussformel

Die richtige Reihenfolge bleibt:

**Phase 3 sauber dicht machen**
→ **Phase 4 Autorität zentralisieren**
→ **Phase 5 Kampf engine-seitig** (Encounter → Conditions → Zauber)
→ **Phase 6 Proben + Klassen**
→ **Phase 7 Inventar + Ressourcen vertiefen**
→ **Phase 8 Token + Qualitätsnetz**
→ **Phase 9 Abenteuer-Authoring**

Das ist die Roadmap, die am saubersten auf das Endziel einzahlt:
**ein stabiles, spoilerarmes, tokeneffizientes AI-Dungeon-Master-System mit app-gesteuerter Wahrheit — und darauf zugeschnittenen Abenteuern.**
