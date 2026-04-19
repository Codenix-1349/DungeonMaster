export const ARENA_MECHANICS_DEMO_TEXT = `# DUNGEONS & DAGGERS - MECHANIKDEMO
# MODUL: Die Messingarena
# ZWECK: Kurzer Runtime-Test fuer Buttons, Probe, Kampf und automatische Erholung

MODULE_ID: mechanics_demo_arena
MODULE_VERSION: 0.3
SYSTEM: DND5E
START_SECTION_ID: brass_arena
PRIMARY_OBJECTIVE: Teste Buttons, Probe, Kampf und automatische Erholung.
PLAYER_PRIMARY_OBJECTIVE: Teste Buttons, Probe, Kampf und automatische Erholung.
SECONDARY_OBJECTIVE: Sprich mit dem Arenameister und starte den Trainingskampf.
TONE: knapp, technisch, demonstrativ

RUNTIME_RULES:
  - Dieses Modul dient nur dem schnellen Test vorhandener Spielmechaniken.
  - Zeige nur sichtbare Elemente und die freigeschalteten Interaktionen als Buttons an.
  - Halte jede Antwort in diesem Modul extrem kurz: 1 bis 2 kurze Saetze genuegen.
  - Nenne niemals Handlungsoptionen im Fliesstext und schreibe niemals "Waehle eine Aktion".
  - Der Trainingskampf startet nur, wenn der Spieler den Arenameister darum bittet.
  - Nach dem Sieg stellt die Arena den Helden wieder vollstaendig her.
  - Bei einer Niederlage hebt der Arenameister den Helden wieder auf die Beine.

PLOT_FLAGS:
  - RULES_READ
  - MASTER_BRIEFED
  - ALTAR_BLESSED

NPC_REGISTRY:
  arena_master:
    name: Arenameister Rennald
    firstSeen: brass_arena
    currentlyVisible: true
    relationship: helpful
    suspicion: none
    knownFacts: []
    secretsUnlocked: []
    lastTopic: null
    promisesMade: []

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
  ancient_tome:
    type: book
    portable: false
  healing_rune:
    type: rune
    portable: false

SECTIONS:
  - id: brass_arena
    location: Messingarena
    objective: Sprich mit dem Arenameister und starte den Trainingskampf.
    playerObjective: Sprich mit dem Arenameister und starte den Trainingskampf.
    introText: |
      Eine kleine Messingarena summt leise unter blauen Runen. An ihrem Rand steht Arenameister Rennald in hellgrauer Uebungskluft und hebt gruessend die Hand, als du die Schwelle ueberschreitest.

      Rennald:
      „Willkommen in der Messingarena, {heroName}. Hier trainiert es sich sicher — Altar, altes Buch und Erholungsrune stehen bereit. Frag mich, wenn du soweit bist."

      Neben ihm warten eine Regeltafel, ein niedriger Messingaltar, ein aufgeschlagenes altes Buch auf einem Pult und eine gruene Erholungsrune fuer einen sicheren Testlauf.
    visibleFeatures:
      - runder Ring aus Messingplatten
      - niedriger Messingaltar
      - altes aufgeschlagenes Buch auf einem Pult
      - gruene Erholungsrune
      - Tafel mit Testregeln
    visibleNpcs:
      - arena_master
    interactions:
      - id: talk_to_arena_master
        label: Mit dem Arenameister sprechen
        aliases: [rede mit Rennald, sprich mit Arenameister, frag Rennald]
        kind: talk
        target: arena_master
        checkPolicy: none
        availability:
          visible: true
        results:
          success:
            setFlags: [MASTER_BRIEFED]
        aiNarrationHint: |
          Rennald nickt knapp.

          Rennald:
          „Der Altar gibt dir einen Segen, wenn du ihn beruehrst — das ist optional. Das alte Buch wuerde dir dieselbe Gunst gewaehren, wenn du seine Worte richtig deutest. Die Erholungsrune heilt dich automatisch nach dem Sieg. Der Kampf beginnt erst, wenn du mir Bescheid gibst. Und faellst du, hebe ich dich wieder auf die Beine, {heroName}."

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
        label: Den Messingaltar beruehren (Arkane Kunde)
        aliases: [Altar beruehren, Altar pruefen, Altar aktivieren]
        kind: inspect
        target: blessing_altar
        availability:
          visible: true
        blocksIfFlags: [ALTAR_BLESSED]
        check:
          skill: arcana
          dc: 10
          onFail: Das Licht kippt ins Kalte und der Altar verweigert dir seinen Segen.
        results:
          success:
            setFlags: [ALTAR_BLESSED]
        aiNarrationHint: Der Altar legt warmes Licht um deine Schultern und laesst einen sanften Segen in dich einsinken.

      - id: study_ancient_tome
        label: Im alten Buch nachschlagen (Nachforschen)
        aliases: [Buch lesen, Buch durchblaettern, Pult durchsuchen]
        kind: inspect
        target: ancient_tome
        availability:
          visible: true
        blocksIfFlags: [ALTAR_BLESSED]
        check:
          skill: investigation
          dc: 10
          onFail: Die Zeichen bleiben wirr, die Passage schliesst sich vor dir.
        results:
          success:
            setFlags: [ALTAR_BLESSED]
        aiNarrationHint: Eine alte Ritualformel im Buch leuchtet kurz auf — ihr Segen legt sich warm um deine Schultern.

      - id: begin_trial_blessed
        label: Rennald bitten, den Trainingskampf zu starten
        aliases: [Kampf starten, Trainingskampf beginnen, Pruefung starten]
        kind: talk
        target: arena_master
        checkPolicy: none
        availability:
          visible: true
        requiresFlags: [ALTAR_BLESSED]
        results:
          success:
            startCombat:
              consequenceText: |
                Rennald hebt die Hand.

                Rennald:
                „Dann beginnen wir, {heroName}. Messingrunen, antwortet!"

                Eine Bodenklappe springt auf und der bronzene Trainingswaechter tritt mit dem Segen des Altars in die Arena.
              playerBuffs:
                label: Segen des Messingaltars
                attackBonus: 1
                armorClassBonus: 1
                initiativeBonus: 2
                damageBonus: 1
                spellAttackBonus: 1
                spellSaveDcBonus: 1
              restorePlayerAfterVictory: true
              revivePlayerOnDefeat: true
              defeatRevivalText: |
                Rennald hebt die Hand und die Messingrunen lodern auf. Warmes Licht zieht dich zurueck auf die Beine — du stehst wieder voll aufrecht.

                Rennald:
                „Noch einmal, wenn du willst, {heroName}."
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
        aiNarrationHint: |
          Rennald nickt knapp.

          Rennald:
          „Mit dem Segen des Altars, {heroName} — der Trainingswaechter erwartet dich."

      - id: begin_trial_plain
        label: Rennald bitten, den Trainingskampf zu starten
        aliases: [Kampf starten, Trainingskampf beginnen, Pruefung starten]
        kind: talk
        target: arena_master
        checkPolicy: none
        availability:
          visible: true
        blocksIfFlags: [ALTAR_BLESSED]
        results:
          success:
            startCombat:
              consequenceText: |
                Rennald hebt die Hand.

                Rennald:
                „Ohne Segen, {heroName}? Auch gut. Messingrunen, antwortet!"

                Eine Bodenklappe springt auf und der bronzene Trainingswaechter tritt ohne Segen in die Arena.
              restorePlayerAfterVictory: true
              revivePlayerOnDefeat: true
              defeatRevivalText: |
                Rennald hebt die Hand und die Messingrunen lodern auf. Warmes Licht zieht dich zurueck auf die Beine — du stehst wieder voll aufrecht.

                Rennald:
                „Noch einmal, wenn du willst, {heroName}."
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
        aiNarrationHint: |
          Rennald nickt knapp.

          Rennald:
          „Ohne Segen, {heroName} — der Trainingswaechter erwartet dich trotzdem."
`
