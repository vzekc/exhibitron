/*
 * Pictures are served under a URL per user or exhibit, and the service worker keeps such a
 * URL's response for a week. Every upload makes a picture with a new id, and the id in the
 * URL is what makes a replaced picture a new URL that no cache has seen.
 */
export const pictureUrl = (url: string, pictureId: number | null | undefined) =>
  pictureId ? `${url}?v=${pictureId}` : url
