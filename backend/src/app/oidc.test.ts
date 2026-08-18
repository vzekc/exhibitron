import { describe, expect, test } from 'vitest'
import { resolveRedirect } from './oidc.js'

const here = 'https://2026.classic-computing.de'

describe('where the forum login returns to', () => {
  test('a bare path is read against this site', () => {
    expect(resolveRedirect('/mitmachen', here).toString()).toBe(`${here}/mitmachen`)
  })

  test('an address of this site is kept, query and all', () => {
    expect(resolveRedirect(`${here}/user/profile?welcome`, here).toString()).toBe(
      `${here}/user/profile?welcome`,
    )
  })

  test('somewhere else is refused and lands on the front page', () => {
    expect(resolveRedirect('https://example.com/phish', here).toString()).toBe(`${here}/`)
  })

  test('nothing at all is the front page', () => {
    expect(resolveRedirect(undefined, here).toString()).toBe(`${here}/`)
  })
})
