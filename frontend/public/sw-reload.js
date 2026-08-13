/*
 * Bring every open page onto a new deployment.
 *
 * The service worker precaches the app shell and answers navigations from that
 * cache, so a browser that has visited the site keeps the JavaScript it was
 * loaded with until it is loaded again — a visitor can sit on a version that is
 * weeks behind and has no way of knowing. By the time this worker activates it
 * has precached the shell of the version it belongs to, so navigating each open
 * window to its own URL puts it on that version.
 *
 * The generated service worker imports this file (see workbox.importScripts in
 * vite.config.ts) so that the caching configuration stays in one place. It is
 * also what reaches browsers that are still running an older frontend: they
 * fetch the new worker on their own, and this runs there.
 */

const UPDATE_MARKER_CACHE = 'sw-update-marker'
const UPDATE_MARKER_URL = '/__replaces-earlier-version'

const reloadOpenWindows = async () => {
  const windows = await self.clients.matchAll({ type: 'window' })
  for (const openWindow of windows) {
    // The message reaches pages running a frontend that listens for it; the
    // navigation reaches the rest, and browsers without WindowClient.navigate
    // are covered by the message.
    openWindow.postMessage({ type: 'app-updated' })
    if (openWindow.navigate) {
      // A page that cannot be navigated (one the browser has already discarded,
      // say) must not stop the others from being reloaded.
      openWindow.navigate(openWindow.url).catch(() => {})
    }
  }
}

self.addEventListener('install', (event) => {
  // registration.active is the worker this one replaces. On the first ever
  // install there is none and the open pages already run this version. The
  // answer is recorded in a cache because the worker may be stopped between
  // installing and activating, which loses anything held in a variable.
  if (!self.registration.active) {
    return
  }
  event.waitUntil(
    caches
      .open(UPDATE_MARKER_CACHE)
      .then((cache) => cache.put(UPDATE_MARKER_URL, new Response(''))),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(UPDATE_MARKER_CACHE)
      const replacesEarlierVersion = Boolean(await cache.match(UPDATE_MARKER_URL))
      await cache.delete(UPDATE_MARKER_URL)
      if (!replacesEarlierVersion) {
        return
      }
      // navigate() only works on pages this worker controls.
      await self.clients.claim()
      // Deliberately not awaited: the navigations it starts are answered by
      // this worker, which does not answer anything until the activate event
      // has settled.
      reloadOpenWindows()
    })(),
  )
})
