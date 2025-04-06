import { FastifyRequest } from 'fastify'

export const isModernBrowser = (request: FastifyRequest) => {
  const userAgent = request.headers['user-agent'] || ''
  const accept = request.headers.accept

  if (!userAgent) {
    console.log('No User-Agent provided, assuming basic browser')
    return false
  }

  const modernEngines = [
    /Chrome\/[6-9]\d/,
    /Chrome\/[1-9]\d{2}/,
    /Firefox\/[6-9]\d/,
    /Firefox\/[1-9]\d{2}/,
    /Version\/1[1-9]/,
    /Version\/[2-9]\d/,
    /Edg\//,
    /OPR\//,
    /iOS\/1[3-9]/,
    /iOS\/[2-9]\d/,
  ]

  const matchesModern = modernEngines.find((pattern) => pattern.test(userAgent))
  if (matchesModern) {
    console.log(`Detected known modern browser engine ${userAgent} ${matchesModern}`)
    return true
  }

  const hasHtmlSupport = !accept || request.accepts().type(['text/html', '*/*'])
  if (!hasHtmlSupport) {
    console.log(`No HTML support detected in Accept header "${accept || 'not set'}"`)
    return false
  }

  const basicBrowserPatterns = [
    'Lynx',
    'Links',
    'w3m',
    'Wget',
    'curl',
    'Googlebot',
    'bingbot',
    'Baiduspider',
    'YandexBot',
    'DuckDuckBot',
    'Konqueror',
    'NetSurf',
    'MSIE',
    'Trident/',
    'Mozilla/[1-4]',
  ]

  const isBasicBrowser = basicBrowserPatterns.some((pattern) =>
    new RegExp(pattern, 'i').test(userAgent),
  )

  if (isBasicBrowser) {
    console.log('Detected basic browser')
    return false
  }

  return 'unknown'
}

export const isLegacyBrowser = (userAgent: string): boolean => {
  const legacyBrowserPattern =
    /^(NCSA_Mosaic|Cello|MacWeb|SlipKnot|IBM-WebExplorer|ViolaWWW|Arena)[/\s]/
  return legacyBrowserPattern.test(userAgent)
}
