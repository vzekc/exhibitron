import { createHash, randomBytes } from 'crypto'

/*
 * The token the command-line client carries, and the arithmetic around it.
 *
 * It is shown once and stored as a hash, so what is kept here can identify a
 * token in a list and authorise nothing.
 */

const PREFIX = 'fx_'

/* Long enough to cover the months of preparation, short enough to expire. */
export const LIFETIME_DAYS = 90

export const MAX_TOKENS_PER_EXHIBITOR = 5

export const MAX_LABEL_LENGTH = 100

export function mint() {
  const token = PREFIX + randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: hash(token),
    /* Enough of it to be recognised in a list, and useless on its own. */
    prefix: token.slice(0, PREFIX.length + 8),
    expiresAt: new Date(Date.now() + LIFETIME_DAYS * 24 * 60 * 60 * 1000),
  }
}

export function hash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function looksLikeToken(value: string) {
  return value.startsWith(PREFIX) && value.length > PREFIX.length + 16
}

export function bearerOf(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header
  if (!value || !value.startsWith('Bearer ')) return ''
  return value.slice('Bearer '.length).trim()
}
