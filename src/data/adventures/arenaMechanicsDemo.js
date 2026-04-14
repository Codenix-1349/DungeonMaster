export const ARENA_MECHANICS_DEMO_TEXT = `# DUNGEONS & DAGGERS - MECHANIKDEMO
# MODUL: Die Messingarena
# ZWECK: Kurzer Runtime-Test fuer Buttons, Probe, Kampf und automatische Erholung

MODULE_ID: mechanics_demo_arena
MODULE_VERSION: 0.1
SYSTEM: DND5E
START_SECTION_ID: brass_arena
PRIMARY_OBJECTIVE: Teste Buttons, Probe, Kampf und automatische Erholung.
PLAYER_PRIMARY_OBJECTIVE: Teste Buttons, Probe, Kampf und automatische Erholung.
SECONDARY_OBJECTIVE: Lies die Regeln der Arena und aktiviere den Trainingswaechter.
TONE: knapp, technisch, demonstrativ

RUNTIME_RULES:
  - Dieses Modul dient nur dem schnellen Test vorhandener Spielmechaniken.
  - Zeige nur sichtbare Elemente und die freigeschalteten Interaktionen als Buttons an.
  - Halte jede Antwort in diesem Modul extrem kurz: 1 bis 2 kurze Saetze genuegen.
  - Nenne niemals Handlungsoptionen im Fliesstext und schreibe niemals "Waehle eine Aktion".
  - Wenn der Trainingswaechter startet, soll der Kampf sofort beginnen.
  - Nach dem Sieg stellt die Arena den Helden wieder vollstaendig her.

PLOT_FLAGS:
  - RULES_READ
  - ALTAR_BLESSED

CLUE_REGISTRY:
  arena_recovers_victors:
    sourceSectionId: brass_arena
    revealConditions:
      - interactionId: read_trial_rules
        result: success
    isRevealed: false
    isPlayerKnown: false
    text: Die Arena heilt Sieger nach dem Test sofort vollstaendig.

OBJECT_REGISTRY:
  rule_plaque:
    type: plaque
    portable: false
  blessing_altar:
    type: altar
    portable: false
  healing_rune:
    type: rune
    portable: false

SECTIONS:
  - id: brass_arena
    location: Messingarena
    objective: Beruehre den Altar und starte den Trainingskampf.
    playerObjective: Beruehre den Altar und starte den Trainingskampf.
    introText: Eine kleine Messingarena summt leise unter blauen Runen. Vor dir stehen nur eine Regeltafel, ein niedriger Messingaltar und eine gruene Erholungsrune fuer einen sicheren Testlauf.
    visibleFeatures:
      - runder Ring aus Messingplatten
      - niedriger Messingaltar
      - gruene Erholungsrune
      - Tafel mit Testregeln
    interactions:
      - id: read_trial_rules
        label: Die Testregeln kurz lesen
        aliases: [Tafel lesen, Regeln lesen, Testregeln lesen]
        kind: inspect
        target: rule_plaque
        checkPolicy: none
        availability:
          visible: true
        blocksIfFlags: [RULES_READ]
        results:
          success:
            setFlags: [RULES_READ]
            revealClues:
              - arena_recovers_victors
        aiNarrationHint: Die Tafel sagt knapp, dass dies ein kurzer Testlauf mit automatischer Erholung nach dem Sieg ist.

      - id: attune_blessing_altar
        label: Den Messingaltar beruehren
        aliases: [Altar beruehren, Altar pruefen, Altar aktivieren]
        kind: inspect
        target: blessing_altar
        availability:
          visible: true
        check:
          skill: arcana
          dc: 10
          onFail: Das Licht kippt ins Kalte und der Altar verweigert dir seinen Segen.
        results:
          success:
            setFlags: [ALTAR_BLESSED]
            startCombat:
              consequenceText: Der Messingaltar legt warmes Licht um deine Schultern. Im selben Moment springt hinter ihm eine Bodenklappe auf und der bronzene Trainingswaechter tritt in die Arena.
              playerBuffs:
                label: Segen des Messingaltars
                attackBonus: 1
                armorClassBonus: 1
                initiativeBonus: 2
                damageBonus: 1
                spellAttackBonus: 1
                spellSaveDcBonus: 1
              restorePlayerAfterVictory: true
              enemies:
                - id: bronze-training-guardian
                  name: Bronzener Trainingswaechter
                  profile:
                    hp: 8
                    ac: 11
                    attackBonus: 2
                    damageDice: 1d4
                    damageBonus: 0
                    xp: 25
          failure:
            startCombat:
              consequenceText: Der Altar bleibt dunkel. Noch bevor du die Hand zurueckziehst, springt hinter ihm eine Bodenklappe auf und der bronzene Trainingswaechter tritt ohne Segen in die Arena.
              restorePlayerAfterVictory: true
              enemies:
                - id: bronze-training-guardian
                  name: Bronzener Trainingswaechter
                  profile:
                    hp: 8
                    ac: 11
                    attackBonus: 2
                    damageDice: 1d4
                    damageBonus: 0
                    xp: 25
        aiNarrationHint: Der Altar reagiert und ruft sofort den bronzenen Trainingswaechter in die Arena.
`
