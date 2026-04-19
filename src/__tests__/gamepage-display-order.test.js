import { describe, expect, it } from 'vitest'
import {
  buildDisplayGameLog,
  getDeferredCombatRoundMessage,
} from '../pages/GamePage.jsx'

describe('game page combat display order', () => {
  it('renders completed combat narration before the combat round summary', () => {
    const earlierMessage = { id: 'm1', role: 'assistant', content: 'Frueherer Text.' }
    const combatRoundMessage = { id: 'm2', role: 'user', content: '[Kampfrunde] Treffer! 16 vs AC 10' }
    const narrationMessage = { id: 'm3', role: 'assistant', content: 'Der Waechter taumelt zurueck.' }

    const ordered = buildDisplayGameLog([
      earlierMessage,
      combatRoundMessage,
      narrationMessage,
    ])

    expect(ordered.map(message => message.id)).toEqual(['m1', 'm3', 'm2'])
  })

  it('defers the latest combat round summary while its narration is still streaming', () => {
    const combatRoundMessage = { id: 'm2', role: 'user', content: '[Kampfrunde] Treffer! 16 vs AC 10' }

    expect(getDeferredCombatRoundMessage({
      gameLog: [combatRoundMessage],
      streaming: true,
    })).toBe(combatRoundMessage)

    expect(getDeferredCombatRoundMessage({
      gameLog: [combatRoundMessage],
      streamingText: 'Der Waechter taumelt zurueck.',
    })).toBe(combatRoundMessage)

    expect(getDeferredCombatRoundMessage({
      gameLog: [combatRoundMessage],
      streaming: false,
      streamingText: '',
    })).toBeNull()
  })
})
