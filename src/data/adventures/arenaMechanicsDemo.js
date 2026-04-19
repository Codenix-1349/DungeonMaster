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
  - Halte jede Antwort in diesem Modul extrem kurz: 1 bis 2 kurze Sätze genügen.
  - Nenne niemals Handlungsoptionen im Fließtext und schreibe niemals "Wähle eine Aktion".
  - Der Trainingskampf startet nur, wenn der Spieler den Arenameister darum bittet.
  - Nach dem Sieg stellt die Arena den Helden wieder vollständig her.
  - Bei einer Niederlage hebt der Arenameister den Helden wieder auf die Beine.

PLOT_FLAGS:
  - MASTER_BRIEFED
  - ALTAR_BLESSED
  - BLESSING_SOURCE_CHOSEN

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
      Eine kleine Messingarena summt leise unter blauen Runen. An ihrem Rand steht Arenameister Rennald in hellgrauer Übungskluft und hebt grüßend die Hand, als du die Arena betrittst.

      Rennald:
      „Seid gegrüßt in der Trainingsarena, {heroName}. Viele haben hier schon ihr Können erprobt. Nur wenige sind siegreich geblieben. Wenn du dich beweisen willst oder etwas wissen musst, dann komm zu mir."
    visibleFeatures:
      - runder Ring aus Messingplatten
      - niedriger Messingaltar
      - altes aufgeschlagenes Buch auf einem Pult
      - grüne Erholungsrune
      - Tafel mit Testregeln
    visibleNpcs:
      - arena_master
    interactions:
      - id: talk_to_arena_master
        label: Mit dem Arenameister sprechen
        aliases: [rede mit Rennald, sprich mit Arenameister, frag Rennald]
        kind: talk
        target: arena_master
        repeatable: true
        checkPolicy: none
        availability:
          visible: true
        results:
          success:
            setFlags: [MASTER_BRIEFED]
        aiNarrationHint: |
          Rennald nickt knapp.

          Rennald:
          „Der Kampf beginnt erst, wenn du mir Bescheid gibst. Fällst du im Ring, hebe ich dich wieder auf die Beine. Willst du mit einem Vorteil antreten, nimm dir vorher entweder den Altar oder das Buch vor. Beide gewähren dieselbe Gunst, doch pro Durchgang nimmt dich nur eine der beiden Quellen an."

      - id: attune_blessing_altar
        label: Den Messingaltar berühren (Arkane Kunde)
        aliases: [Altar berühren, Altar prüfen, Altar aktivieren]
        kind: inspect
        target: blessing_altar
        repeatable: true
        availability:
          visible: true
        blocksIfFlags: [BLESSING_SOURCE_CHOSEN]
        check:
          skill: arcana
          dc: 10
          onFail: Das Licht kippt ins Kalte und der Altar verweigert dir seinen Segen.
        results:
          success:
            setFlags: [ALTAR_BLESSED, BLESSING_SOURCE_CHOSEN]
          failure:
            setFlags: [BLESSING_SOURCE_CHOSEN]
        aiNarrationHint: Der Altar legt warmes Licht um deine Schultern und lässt einen sanften Segen in dich einsinken.

      - id: study_ancient_tome
        label: Im alten Buch nachschlagen (Nachforschen)
        aliases: [Buch lesen, Buch durchblättern, Pult durchsuchen]
        kind: inspect
        target: ancient_tome
        repeatable: true
        availability:
          visible: true
        blocksIfFlags: [BLESSING_SOURCE_CHOSEN]
        check:
          skill: investigation
          dc: 10
          onFail: Die Zeichen bleiben wirr, die Passage schließt sich vor dir.
        results:
          success:
            setFlags: [ALTAR_BLESSED, BLESSING_SOURCE_CHOSEN]
          failure:
            setFlags: [BLESSING_SOURCE_CHOSEN]
        aiNarrationHint: Eine alte Ritualformel im Buch leuchtet kurz auf — ihr Segen legt sich warm um deine Schultern.

      - id: begin_trial_blessed
        label: Rennald bitten, den Trainingskampf zu starten
        aliases: [Kampf starten, Trainingskampf beginnen, Prüfung starten]
        kind: talk
        target: arena_master
        repeatable: true
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

                Eine Bodenklappe springt auf und der bronzene Trainingswächter tritt mit dem Segen des Altars in die Arena.
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
              victoryRecoveryText: |
                Der Trainingswächter sackt scheppernd in sich zusammen. Rennald tritt an den Rand des Rings, hebt die Hand, und warmes Licht schließt deine Wunden, bis du wieder fest auf den Beinen stehst.

                Rennald:
                „Sauber gekämpft, {heroName}. Wenn du noch einen Durchgang willst, holen wir dir erst wieder den Segen."
              defeatRevivalText: |
                Rennald hebt die Hand und die Messingrunen lodern auf. Warmes Licht zieht dich zurück auf die Beine — du stehst wieder voll aufrecht.

                Rennald:
                „Noch einmal, wenn du willst, {heroName}."
              enemies:
                - id: bronze-training-guardian
                  name: Bronzener Trainingswächter
                  profile:
                    hp: 6
                    ac: 10
                    attackBonus: 1
                    damageDice: 1d3
                    damageBonus: 0
                    maxDamagePerHit: 2
                    xp: 25
        aiNarrationHint: |
          Rennald nickt knapp.

          Rennald:
          „Mit dem Segen des Altars, {heroName} — der Trainingswächter erwartet dich."

      - id: begin_trial_plain
        label: Rennald bitten, den Trainingskampf zu starten
        aliases: [Kampf starten, Trainingskampf beginnen, Prüfung starten]
        kind: talk
        target: arena_master
        repeatable: true
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

                Eine Bodenklappe springt auf und der bronzene Trainingswächter tritt ohne Segen in die Arena.
              restorePlayerAfterVictory: true
              revivePlayerOnDefeat: true
              victoryRecoveryText: |
                Der Trainingswächter sackt scheppernd in sich zusammen. Rennald tritt an den Rand des Rings, hebt die Hand, und warmes Licht schließt deine Wunden, bis du wieder fest auf den Beinen stehst.

                Rennald:
                „Sauber gekämpft, {heroName}. Wenn du noch einen Durchgang willst, hol dir erst einen neuen Segen oder gib mir einfach Bescheid."
              defeatRevivalText: |
                Rennald hebt die Hand und die Messingrunen lodern auf. Warmes Licht zieht dich zurück auf die Beine — du stehst wieder voll aufrecht.

                Rennald:
                „Noch einmal, wenn du willst, {heroName}."
              enemies:
                - id: bronze-training-guardian
                  name: Bronzener Trainingswächter
                  profile:
                    hp: 6
                    ac: 10
                    attackBonus: 1
                    damageDice: 1d3
                    damageBonus: 0
                    maxDamagePerHit: 2
                    xp: 25
        aiNarrationHint: |
          Rennald nickt knapp.

          Rennald:
          „Ohne Segen, {heroName} — der Trainingswächter erwartet dich trotzdem."
`
