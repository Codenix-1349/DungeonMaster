import { describe, expect, it } from 'vitest'
import { hasPendingAuthLinkAction } from '../utils/authLinkParams'

describe('hasPendingAuthLinkAction', () => {
  it('detects password reset links', () => {
    expect(hasPendingAuthLinkAction('?reset=abc123')).toBe(true)
  })

  it('detects email verification links', () => {
    expect(hasPendingAuthLinkAction('?verify=abc123')).toBe(true)
  })

  it('ignores unrelated query params', () => {
    expect(hasPendingAuthLinkAction('?foo=bar')).toBe(false)
  })

  it('returns false without query params', () => {
    expect(hasPendingAuthLinkAction('')).toBe(false)
  })
})
