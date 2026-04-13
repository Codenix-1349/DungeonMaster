# Dungeons & Daggers – Master-Roadmap

Last updated: 2026-04-13

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

**Engine kontrolliert die Spielwahrheit.**
Die KI liefert Sprache, Atmosphäre, Dialog und natürliche Formulierung.

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
- später: engine-seitiger Kampf, Proben, Inventar, Ressourcen und Klassenmechanik

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

Trotzdem ist Phase 3 noch nicht vollständig abgeschlossen.

### Realistischer Status
- Phase 3: **sehr weit, aber noch nicht final dicht**
- Größter Restblock: **Intent-/Identity-Härtung, Validation, Acceptance Shield, Check-Flow E2E**
- Aktuell fehlt weniger Vision als saubere Verifikation und Kanonisierung

### Warum Phase 4 noch nicht starten sollte
- Eine Backend-Zentralisierung würde dieselben offenen Runtime-Unschärfen nur verlagern.
- Ohne stabile Interaction-Identity bleibt Prompt-Autorität indirekt fragil.
- Ohne Acceptance Shield fehlt der belastbare Nachweis, dass die Architektur unter echten Modulen hält.

---

# Now – Phase 3 sauber abschließen

## Ziel
Structured runtime modules müssen der klare, verlässliche Kernpfad sein.
Die KI darf nur den aktuell erlaubten Runtime-Ausschnitt sehen und beschreiben, aber keine Spielwahrheit erzeugen.

## 3.1 Runtime-Identity und Intent final härten

### Fokus
Freitext, Buttons und Wiederholungen sollen deterministisch auf dieselbe autorisierte Interaction-Identität laufen.

### Umsetzung
- Freitext im Runtime-Modus primär über authored `aliases`, `interactionId`, `actionKey`, später optional `intentKey`
- Semantisches Label-Matching nur noch Bridge/Fallback
- Retry/Dedupe vollständig auf `actionKey` / `interactionId`
- gleiches Zielverhalten für Button-Flow und typed input
- mehrdeutige Interaktionen bei mehreren NPCs/Objekten explizit entschärfen

### Exit-Signal
- gleiche Absicht landet reproduzierbar auf derselben authored Interaction
- Dedupe/Retry hängt nicht mehr primär am sichtbaren Label

## 3.2 Player-facing Validation ausbauen

### Fokus
Spoilerhafte sichtbare Modultexte früh erkennen statt zur Laufzeit kosmetisch zu kaschieren.

### Umsetzung
Warnungen/Checks für:
- unrevealed NPCs in `PLAYER_PRIMARY_OBJECTIVE`, `playerObjective`, `introText`
- unrevealed Clues/Objekte in sichtbaren Labels/Threads
- Reveal-/Registry-Referenzen auf unbekannte IDs
- sichtbare Runtime-Elemente ohne saubere authored Herkunft

### Exit-Signal
- spoilrige player-facing Texte schlagen früh an
- keine Laufzeit-Umschreibung als Scheinlösung

## 3.3 Acceptance Shield mit den 2 Referenzabenteuern festziehen

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
- beide Module prüfen bewusst die Kernarchitektur statt nur Content
- neue Regressionen werden früh sichtbar

## 3.4 Probe-/Check-Flow end-to-end härten

### Fokus
Authored Checks müssen im echten UI-Fluss klar, sichtbar und verlässlich funktionieren.

### Umsetzung
- authored check -> pendingCheck -> SkillCheckPanel -> Roll -> Result -> Runtime-State
- klare UI-Sichtbarkeit für checkbasierte Aktionen
- Success/Fail-End-to-End-Tests
- keine Runtime-Checks mehr aus Freitext-Inferenz

### Exit-Signal
- eine blaue Option bedeutet eindeutig authored check
- der Check-Flow läuft sichtbar und reproduzierbar durch

## 3.5 Doku kanonisieren

### Fokus
Ein klarer wahrer Stand ohne widersprüchliche interne Anweisungen.

### Umsetzung
- `docs/runtime-authority-roadmap.md` als operative Phase-3-Quelle festziehen
- `docs/ai-next-steps.md` auf denselben Startpunkt ausrichten
- `docs/ai-progress.md` klar als historisches Log markieren
- veraltete Testzahlen, Branch-Hinweise und konkurrierende Priorisierungen entfernen

### Exit-Signal
- ein klarer Startpunkt
- keine widersprüchlichen Aussagen zum aktuellen Stand

## Phase-3-Abschlusskriterium

Phase 3 ist erst dann wirklich fertig, wenn:
- Runtime-Truth engine-owned ist
- Intent-/Identity-Pfad stabil genug ist
- player-facing Leaks durch Validation früh auffallen
- beide Referenzabenteuer die Architektur sauber beweisen
- Check + non-check + reveal chains end-to-end funktionieren
- Prompt, Choice-Layer und UI aus derselben autoritativen Runtime-Wahrheit ziehen

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

### Done
- Promptlogik zentralisiert
- Frontend trägt weniger Wahrheitslast
- Tokenfluss ist nachvollziehbarer

---

# Later – Systemtiefe und Stabilisierung

## Phase 5 – Kampf zu echter Engine-Mechanik ausbauen

### Ziel
Kampf darf nicht halb narrativ, halb mechanisch bleiben. Engine entscheidet, KI beschreibt.

### Schwerpunkt
- Condition Engine einführen
- Konzentration und Dauer systemisch tracken
- Kernzustände systemisch modellieren
- wichtige Zaubereffekte systemisch auflösen
- Encounter-Autorität von der KI wegnehmen
- Rewards nur engine-seitig vergeben

### Done
- Kampf ist merklich engine-seitig und testbar
- KI ist Erzähler, nicht Kampfrichter

## Phase 6 – Probensystem und Klassenfeatures vertiefen

### Ziel
Proben weniger KI-abhängig machen und Klassen mechanisch echter abbilden.

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
Inventar und Ausrüstung sollen systemisch relevant werden.

### Schwerpunkt
- item IDs statt fuzzy label handling
- Verbrauchsgüter, Munition, Questitems sauber trennen
- Werkzeuge und Ressourcen systemisch nutzbar machen
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

---

## Harte Priorisierung ab jetzt

1. **Phase 3 sauber abschließen**
2. **Phase 4** – Backend-/Prompt-Autorität
3. **Phase 5** – Kampfsystem
4. **Phase 6** – Proben + Klassenfeatures
5. **Phase 7** – Inventar/Ressourcen
6. **Phase 8** – Token-/Qualitätsnetz

---

## Was wir ausdrücklich nicht tun

- kein großer Content-Schub vor sauberem Abschluss von Phase 3
- keine Backend-Zentralisierung vor stabilem Runtime-Kern
- kein Kampfsystem auf halbweicher Truth-Firewall
- keine Heuristikmagie, um schlechte Moduldaten zu kaschieren
- keine Feature-Orgie ohne klaren Beitrag zum Endziel

---

## Schlussformel

Die richtige Reihenfolge bleibt:

**Phase 3 sauber dicht machen**
→ **Phase 4 Autorität zentralisieren**
→ **Phase 5 Kampf engine-seitig**
→ **Phase 6 Proben + Klassen**
→ **Phase 7 Inventar + Ressourcen**
→ **Phase 8 Token + Qualitätsnetz**

Das ist die Roadmap, die am saubersten auf das Endziel einzahlt:
**ein stabiles, spoilerarmes, tokeneffizientes AI-Dungeon-Master-System mit app-gesteuerter Wahrheit.**
