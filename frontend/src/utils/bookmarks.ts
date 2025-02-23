import type { Exhibit } from '../types.ts'

export const getBookmarks = (): Exhibit[] => {
  const bookmarks = localStorage.getItem('bookmarks')
  return bookmarks ? JSON.parse(bookmarks) : []
}

export const addBookmark = (exhibit: Exhibit) => {
  const bookmarks = getBookmarks()
  if (!bookmarks.some((b) => b.id === exhibit.id)) {
    bookmarks.push(exhibit)
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
    window.dispatchEvent(new Event('bookmarksUpdated'))
  }
}

export const removeBookmark = (id: number) => {
  let bookmarks = getBookmarks()
  bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id)
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  window.dispatchEvent(new Event('bookmarksUpdated'))
}

export const isBookmarked = (id: number): boolean => {
  const bookmarks = getBookmarks()
  return bookmarks.some((bookmark) => bookmark.id === id)
}
