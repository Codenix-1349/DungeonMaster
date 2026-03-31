// ─── Combat / Skill Check Resolution Tests ─────────────────────────────────
// Tests resolveSkillCheck for correctness: modifiers, advantage, proficiency.

import { describe, it, expect, vi } from 'vitest'
import { resolveSkillCheck, calcSkillBonus } from '../data/srd.js'

// ── Helpers ──

function makeCharacter(overrides = {}) {
  return {
    level: 3,
    attributes: { str: 16, dex: 14, con: 12, int: 10, wis: 13, cha: 8 },
    skillProficiencies: ['athletics', 'perception'],
    ...overrides,
  }
}

// ── calcSkillBonus ──

describe('calcSkillBonus', () => {
  it('calculates ability modifier correctly (STR 16 → +3)', () => {
    expect(calcSkillBonus(16, 1, false)).toBe(3)
  })

  it('adds proficiency bonus when proficient (level 3 → +2)', () => {
    expect(calcSkillBonus(16, 3, true)).toBe(5) // +3 mod + 2 prof
  })

  it('handles score 10 (modifier 0)', () => {
    expect(calcSkillBonus(10, 1, false)).toBe(0)
  })

  it('handles low score (8 → -1)', () => {
    expect(calcSkillBonus(8, 1, false)).toBe(-1)
  })
})

// ── resolveSkillCheck ──

describe('resolveSkillCheck — basic resolution', () => {
  it('returns a valid result object', () => {
    const result = resolveSkillCheck({
      skillOrAbility: 'athletics',
      dc: 12,
      character: makeCharacter(),
    })

    expect(result).not.toBeNull()
    expect(result.skillOrAbility).toBe('athletics')
    expect(result.dc).toBe(12)
    expect(result.isSkill).toBe(true)
    expect(result.isProficient).toBe(true)
    expect(result.modifier).toBe(5) // STR 16 (+3) + prof (+2)
    expect(result.d20Result).toBeGreaterThanOrEqual(1)
    expect(result.d20Result).toBeLessThanOrEqual(20)
    expect(result.total).toBe(result.d20Result + result.modifier)
    expect(result.success).toBe(result.total >= result.dc)
  })

  it('uses correct ability for skill (perception → wis)', () => {
    const result = resolveSkillCheck({
      skillOrAbility: 'perception',
      dc: 10,
      character: makeCharacter(),
    })

    // WIS 13 → +1, proficient → +2 = modifier 3
    expect(result.abilityKey).toBe('wis')
    expect(result.modifier).toBe(3)
  })

  it('handles raw ability checks (str, dex, etc.)', () => {
    const result = resolveSkillCheck({
      skillOrAbility: 'str',
      dc: 15,
      character: makeCharacter(),
    })

    expect(result).not.toBeNull()
    expect(result.isSkill).toBe(false)
    expect(result.isProficient).toBe(false)
    expect(result.modifier).toBe(3) // STR 16 → +3, no prof
  })

  it('returns null for invalid ability key', () => {
    const result = resolveSkillCheck({
      skillOrAbility: 'nonsense',
      dc: 10,
      character: makeCharacter(),
    })

    expect(result).toBeNull()
  })
})

describe('resolveSkillCheck — advantage / disadvantage', () => {
  it('rolls two dice with advantage and picks higher', () => {
    // Seed Math.random to control rolls
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.25) // roll1: floor(0.25*20)+1 = 6
      .mockReturnValueOnce(0.85) // roll2: floor(0.85*20)+1 = 18

    const result = resolveSkillCheck({
      skillOrAbility: 'athletics',
      dc: 12,
      advantage: 'advantage',
      character: makeCharacter(),
    })

    expect(result.roll1).toBe(6)
    expect(result.roll2).toBe(18)
    expect(result.d20Result).toBe(18) // higher of 6, 18
    expect(result.advantage).toBe('advantage')

    mockRandom.mockRestore()
  })

  it('rolls two dice with disadvantage and picks lower', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom
      .mockReturnValueOnce(0.85) // roll1: 18
      .mockReturnValueOnce(0.25) // roll2: 6

    const result = resolveSkillCheck({
      skillOrAbility: 'athletics',
      dc: 12,
      advantage: 'disadvantage',
      character: makeCharacter(),
    })

    expect(result.roll1).toBe(18)
    expect(result.roll2).toBe(6)
    expect(result.d20Result).toBe(6) // lower of 18, 6
    expect(result.advantage).toBe('disadvantage')

    mockRandom.mockRestore()
  })

  it('rolls only one die without advantage/disadvantage', () => {
    const result = resolveSkillCheck({
      skillOrAbility: 'athletics',
      dc: 12,
      character: makeCharacter(),
    })

    expect(result.roll2).toBeNull()
    expect(result.d20Result).toBe(result.roll1)
  })
})

describe('resolveSkillCheck — success / failure threshold', () => {
  it('succeeds when total equals DC exactly', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // Athletics modifier = 5 (STR 16 +3, prof +2). DC 12 → need d20 ≥ 7
    mockRandom.mockReturnValueOnce(6 / 20) // roll = floor(0.3*20)+1 = 7

    const result = resolveSkillCheck({
      skillOrAbility: 'athletics',
      dc: 12,
      character: makeCharacter(),
    })

    expect(result.total).toBe(12) // 7 + 5
    expect(result.success).toBe(true)

    mockRandom.mockRestore()
  })

  it('fails when total is one below DC', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    // Need d20 = 6 → total = 6+5 = 11 < 12
    mockRandom.mockReturnValueOnce(5 / 20) // roll = floor(0.25*20)+1 = 6

    const result = resolveSkillCheck({
      skillOrAbility: 'athletics',
      dc: 12,
      character: makeCharacter(),
    })

    expect(result.total).toBe(11) // 6 + 5
    expect(result.success).toBe(false)

    mockRandom.mockRestore()
  })
})
