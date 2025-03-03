import { getExhibit } from '../api'
import { Exhibit } from '../types.ts'

export const fetchExhibitionData = async () => {
  const response = await getExhibit({
    validateStatus: (status) => status == 200,
  })
  if (response.status === 200 && response.data && response.data.items) {
    const { freeTables, items: exhibits } = response.data
    return {
      tables: exhibits.reduce((acc, exhibit) => {
        if (exhibit.table) {
          acc[exhibit.table] = {
            exhibits: [...(acc[exhibit.table]?.exhibits || []), exhibit],
          }
        }
        return acc
      }, {} as Record<number, { exhibits: Exhibit[] }>),
      freeTables,
      exhibitors: User[]
      exhibits: Exhibit[]
    }
  }
}
