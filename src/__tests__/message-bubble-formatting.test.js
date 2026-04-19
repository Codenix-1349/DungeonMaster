import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { renderMessageTextContent } from '../components/game/MessageBubble.jsx'

describe('message bubble formatting', () => {
  it('highlights arena npc, enemy, and hero names in the brass arena adventure', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        'p',
        null,
        renderMessageTextContent(
          'Rennald nickt Elira zu. Der Bronzener Trainingswächter wartet bereits in der Arena.',
          {
            adventure: {
              id: 'builtin-arena-mechanics-demo',
              title: 'Mechanikdemo: Messingarena',
              structure: { module: { moduleId: 'mechanics_demo_arena' } },
            },
            heroName: 'Elira',
          }
        )
      )
    )

    expect(markup).toContain('<strong class="font-heading font-semibold">Rennald</strong>')
    expect(markup).toContain('<strong class="font-heading font-semibold">Elira</strong>')
    expect(markup).toContain('<strong class="font-heading font-semibold">Bronzener Trainingswächter</strong>')
  })

  it('does not highlight names outside the brass arena adventure', () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        'p',
        null,
        renderMessageTextContent('Rennald wartet auf Elira.', {
          adventure: { id: 'other-adventure', title: 'Andere Szene' },
          heroName: 'Elira',
        })
      )
    )

    expect(markup).not.toContain('<strong')
  })
})
