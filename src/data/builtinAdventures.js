import { ARENA_MECHANICS_DEMO_TEXT } from './adventures/arenaMechanicsDemo.js'

const BUILTIN_ADVENTURE_DATE = '2026-04-14T00:00:00.000Z'

export const BUILTIN_ADVENTURES = [
  {
    id: 'builtin-arena-mechanics-demo',
    title: 'Mechanikdemo: Messingarena',
    filename: 'arena-mechanics-demo',
    text: ARENA_MECHANICS_DEMO_TEXT,
    addedAt: BUILTIN_ADVENTURE_DATE,
    pages: 'DEMO',
    charCount: ARENA_MECHANICS_DEMO_TEXT.length,
    builtin: true,
  },
]

export function mergeBuiltinAdventures(adventures = []) {
  const customAdventures = Array.isArray(adventures)
    ? adventures.filter(adventure => adventure && !BUILTIN_ADVENTURES.some(builtin => builtin.id === adventure.id))
    : []

  return [
    ...BUILTIN_ADVENTURES.map(adventure => ({ ...adventure })),
    ...customAdventures,
  ]
}

export function getUserCreatedAdventures(adventures = []) {
  return Array.isArray(adventures)
    ? adventures.filter(adventure => adventure && adventure.builtin !== true)
    : []
}
