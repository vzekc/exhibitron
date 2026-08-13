/*
 * Ask the browser whether a new version has been deployed.
 *
 * The registration script that vite-plugin-pwa injects registers the service
 * worker once and never asks again, and a browser of its own accord only looks
 * for a new worker when a page is loaded — a tab that stays open all weekend is
 * never told that anything changed. Asking the registration on a timer, and
 * whenever the page comes back to the foreground, makes the browser fetch the
 * worker; a newly deployed one then reloads the page (see public/sw-reload.js).
 */

const UPDATE_CHECK_INTERVAL = 60 * 1000

export const watchForUpdates = () => {
  if (!('serviceWorker' in navigator)) {
    return
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'app-updated') {
      window.location.reload()
    }
  })

  navigator.serviceWorker.ready.then((registration) => {
    const checkForUpdate = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      // A check that does not get through — a phone out of range of the
      // exhibition network — is answered by the next one.
      registration.update().catch(() => {})
    }
    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL)
    document.addEventListener('visibilitychange', checkForUpdate)
  })
}
