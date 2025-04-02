export const isModernBrowser = (userAgent: string, accept: string | undefined): boolean => {
  // If no User-Agent is provided, assume it's a basic browser/crawler
  if (!userAgent) {
    return false
  }

  // Check for common modern browser engines
  const modernEngines = [
    // Modern Chromium-based browsers
    'Chrome/[6-9]\\d',
    'Chrome/[1-9]\\d{2}',
    // Modern Firefox
    'Firefox/[6-9]\\d',
    'Firefox/[1-9]\\d{2}',
    // Modern Safari
    'Version/1[1-9]',
    'Version/[2-9]\\d',
    // Modern Edge (Chromium-based)
    'Edg/',
    // Modern Opera
    'OPR/',
    // iOS/iPadOS
    'iOS/1[3-9]',
    'iOS/[2-9]\\d',
  ]

  // Check if it's a known modern browser
  const isKnownModern = modernEngines.some((pattern) => new RegExp(pattern).test(userAgent))
  if (isKnownModern) {
    return true
  }

  // Check Accept header for HTML support
  const hasHtmlSupport = accept?.includes('text/html')
  if (!hasHtmlSupport) {
    return false
  }

  // Check for features that indicate a text-based or basic browser
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
    return false
  }

  // For unknown browsers, check for modern features in User-Agent
  const hasModernFeatures = [
    // ES6+ support indicators
    'Chrome',
    'Firefox',
    'Safari',
    // Modern mobile browsers
    'Mobile Safari',
    'Android',
    // Modern rendering engines
    'Gecko/20100101',
    'AppleWebKit/[5-9]\\d{2}',
    'Chromium',
  ].some((pattern) => new RegExp(pattern).test(userAgent))

  return hasModernFeatures
}
