import { useSyncExternalStore } from 'react'

// Pictures are served under a URL that stays the same when the picture is replaced. The
// version is appended to those URLs and bumped after every upload, so that every <img> on
// the page fetches the new picture rather than showing the one the browser already holds.
let version = 0
const listeners = new Set<() => void>()

export const bumpImageVersion = () => {
  version += 1
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useImageVersion = () => useSyncExternalStore(subscribe, () => version)

export const versionedImageUrl = (url: string, version: number) =>
  version ? `${url}?v=${version}` : url
