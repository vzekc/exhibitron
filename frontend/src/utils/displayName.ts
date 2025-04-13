interface User {
  fullName: string
  nickname: string | null
}

export const getDisplayName = (user: User): string => {
  if (!user) return ''
  return user.nickname ? `${user.fullName} (${user.nickname})` : user.fullName
}
