import { describe, expect, it } from 'vitest'
import { applyInteractionSuccess, createInitialSceneState, findInteractionDef, resolveInteractionOutcome } from '../data/srd.js'
import {
  collectRuntimeSurfaces,
  expectRuntimeAcceptanceInvariants,
  loadRuntimeModuleFixture,
} from './runtimeAcceptanceHarness.js'

function makeSectionState(adventure, sectionId, plotFlags = {}) {
  const base = createInitialSceneState(adventure)
  return {
    ...base,
    gmState: {
      ...base.gmState,
      currentSectionId: sectionId,
      plotFlags: { ...(base.gmState?.plotFlags || {}), ...plotFlags },
    },
  }
}

describe('runtime acceptance invariants', () => {
  describe('Birkenhain minimal runtime module', () => {
    const adventure = loadRuntimeModuleFixture(
      'birkenhain_minimal_runtime_module.txt',
      'birkenhain-acceptance-invariants',
      'Birkenhain Minimal'
    )
    const structure = adventure.structure

    it('keeps the start scene on the app-side runtime contract', () => {
      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: createInitialSceneState(adventure),
      })
    })

    it('keeps the Mara unlock state aligned across choices, context, and prompt', () => {
      const nextState = applyInteractionSuccess(
        createInitialSceneState(adventure),
        findInteractionDef(structure, 'ask_mara_about_tomas'),
        structure.module
      )

      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: nextState,
      })
    })

    it('keeps revealed brewery state aligned after the parchment clue is read', () => {
      const breweryState = makeSectionState(adventure, 'old_brewery', {
        HAS_CELLAR_KEY: true,
        CELLAR_UNLOCKED: true,
      })
      const afterInspect = applyInteractionSuccess(
        breweryState,
        findInteractionDef(structure, 'inspect_counter'),
        structure.module
      )
      const afterOpen = applyInteractionSuccess(
        afterInspect,
        findInteractionDef(structure, 'open_hidden_plate'),
        structure.module
      )
      const afterRead = resolveInteractionOutcome(
        afterOpen,
        findInteractionDef(structure, 'read_parchment_note'),
        structure.module,
        'success'
      ).sceneState

      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: afterRead,
      })
    })
  })

  describe('Graufurt reference runtime module', () => {
    const adventure = loadRuntimeModuleFixture(
      'graufurt_reference_runtime_module.txt',
      'graufurt-acceptance-invariants',
      'Graufurt Referenz'
    )
    const structure = adventure.structure

    it('keeps the two-NPC start scene on the app-side runtime contract', () => {
      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: createInitialSceneState(adventure),
      })
    })

    it('keeps revealed stack evidence aligned after the service map is read', () => {
      const stacksState = makeSectionState(adventure, 'sealed_stacks', {
        STACKS_OPEN: true,
      })
      const afterInspect = applyInteractionSuccess(
        stacksState,
        findInteractionDef(structure, 'inspect_clerk_desk'),
        structure.module
      )
      const afterOpen = applyInteractionSuccess(
        afterInspect,
        findInteractionDef(structure, 'open_service_drawer'),
        structure.module
      )
      const afterRead = resolveInteractionOutcome(
        afterOpen,
        findInteractionDef(structure, 'read_service_map'),
        structure.module,
        'success'
      ).sceneState

      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: afterRead,
      })
    })

    it('keeps retry suppression and tool-based reopening aligned across choices, context, and prompt', () => {
      const galleryState = makeSectionState(adventure, 'collapsed_gallery')
      const afterInspectRack = applyInteractionSuccess(
        galleryState,
        findInteractionDef(structure, 'inspect_maintenance_rack'),
        structure.module
      )
      const crossCatwalk = findInteractionDef(structure, 'cross_broken_catwalk')
      const failedOutcome = resolveInteractionOutcome(
        afterInspectRack,
        crossCatwalk,
        structure.module,
        'failure'
      ).sceneState

      const failedState = {
        ...failedOutcome,
        interactionHistory: [{
          id: 'fail-catwalk',
          sectionId: 'collapsed_gallery',
          targetId: 'catwalk',
          skill: 'athletics',
          outcome: 'failure',
          turn: failedOutcome.turnCount || 0,
          label: crossCatwalk.label,
          kind: 'move',
          contextSnapshot: {
            clueCount: failedOutcome.playerKnowledge?.discoveredClues?.length || 0,
            npcCount: failedOutcome.playerKnowledge?.knownNpcs?.length || 0,
            itemCount: 0,
          },
        }],
        _currentItemCount: 0,
      }

      expect(collectRuntimeSurfaces(adventure, failedState).choiceLabels).not.toContain(crossCatwalk.label)
      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: failedState,
      })

      const reopenedState = {
        ...resolveInteractionOutcome(
          failedState,
          findInteractionDef(structure, 'take_grappling_hook'),
          structure.module,
          'success'
        ).sceneState,
        _currentItemCount: 1,
      }

      expect(collectRuntimeSurfaces(adventure, reopenedState).choiceLabels).toContain(crossCatwalk.label)
      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: reopenedState,
      })
    })

    it('keeps unlocked final chamber actions aligned with authored runtime truth', () => {
      const finalState = makeSectionState(adventure, 'bell_scriptorium', {
        MIRA_ESCORTING: true,
        MIRA_TRUSTS: true,
        BELL_MECHANISM_UNDERSTOOD: true,
        SEAL_TAKEN: true,
      })

      expectRuntimeAcceptanceInvariants({
        adventure,
        sceneState: finalState,
      })
    })
  })
})
