export interface Session {
  id: string
  title: string
  startTime: number
  endTime: number
  roomId: string
  presenter: string
  exhibitorIds: string[]
  description?: string
}

export interface Room {
  id: string
  name: string
}

export interface TimeSlot {
  time: string
  timestamp: number
  minutes: number
  isHourStart: boolean
}
