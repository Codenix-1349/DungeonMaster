import { describe, expect, it } from 'vitest'
import {
  PROXY_HISTORY_MESSAGE_LIMIT,
  applyServerMemoryToSceneState,
  buildAuthoritativeChatMessages,
  buildServerMemorySummary,
} from '../../server/src/services/sessionMemory.js'

describe('server session memory authority', () => {
  it('builds a compact summary only from transcript turns older than the proxy tail', () => {
    const gameLog = []
    for (let index = 1; index <= PROXY_HISTORY_MESSAGE_LIMIT / 2 + 1; index += 1) {
      gameLog.push({ role: 'user', content: `Aktion ${index}` })
      gameLog.push({ role: 'assistant', content: `Reaktion ${index}` })
    }

    const summary = buildServerMemorySummary({
      gameLog,
      sceneState: { currentSectionTitle: 'Messingarena' },
    })

    expect(summary).toContain('Bis Messingarena')
    expect(summary).toContain('Aktion 1')
    expect(summary).toContain('Reaktion 1')
    expect(summary).not.toContain(`Aktion ${PROXY_HISTORY_MESSAGE_LIMIT / 2 + 1}`)
  })

  it('prefers authoritative server game log messages over fallback request messages', () => {
    const messages = buildAuthoritativeChatMessages({
      gameLog: [
        { role: 'user', content: 'Server-Historie' },
        { role: 'assistant', content: 'Server-Antwort' },
      ],
      fallbackMessages: [
        { role: 'user', content: 'Client-Spoof' },
        { role: 'assistant', content: 'Client-Spoof Antwort' },
      ],
    })

    expect(messages).toEqual([
      { role: 'user', content: 'Server-Historie' },
      { role: 'assistant', content: 'Server-Antwort' },
    ])
  })

  it('overwrites client memorySummary with the server-owned value', () => {
    const sceneState = applyServerMemoryToSceneState(
      {
        currentSectionTitle: 'Messingarena',
        memorySummary: 'Client-Seite',
      },
      'Server-Seite'
    )

    expect(sceneState).toEqual({
      currentSectionTitle: 'Messingarena',
      memorySummary: 'Server-Seite',
    })
  })
})
