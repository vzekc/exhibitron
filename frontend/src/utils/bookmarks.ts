type Item = {
  id: number
}

type Bookmarks = {
  exhibits: Item[]
  exhibitors: Item[]
}

export const getBookmarks = (): Bookmarks => {
  const bookmarksString = localStorage.getItem('bookmarks')
  if (bookmarksString) {
    const bookmarks = JSON.parse(bookmarksString)
    if (bookmarks.exhibits && bookmarks.exhibitors) {
      return bookmarks
    }
  }
  return {
    exhibits: [],
    exhibitors: [],
  }
}

type BookmarkType = 'exhibits' | 'exhibitors'

export const addBookmark = (type: BookmarkType, item: Item) => {
  const bookmarks = getBookmarks()
  const old = bookmarks[type]

  const newBookmarks = old.filter((b) => b.id !== item.id)
  bookmarks[type] = [item, ...newBookmarks]
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  window.dispatchEvent(new Event('bookmarksUpdated'))
}

export const removeBookmark = (type: BookmarkType, item: { id: number }) => {
  const bookmarks = getBookmarks()
  const old = bookmarks[type]

  bookmarks[type] = old.filter((b) => b.id !== item.id)
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  window.dispatchEvent(new Event('bookmarksUpdated'))
}

export const isBookmarked = (
  type: BookmarkType,
  item: { id: number },
): boolean => {
  const bookmarks = getBookmarks()
  return bookmarks[type].some((bookmark) => bookmark.id === item.id)
}
