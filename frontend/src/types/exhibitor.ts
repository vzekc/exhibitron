export interface Exhibitor {
  id: number
  topic: string | null
  user: {
    id: number
    fullName: string
    nickname: string | null
    profileImage: number | null
  }
}
