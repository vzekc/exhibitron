import client from '../apolloClient'
import { graphql } from 'gql.tada'

export const fetchExhibitionData = async () => {
  const { data } = await client.query({
    query: graphql(`
        query GetAllData {
            getTables {
                number
                exhibitor {
                    id
                }
                exhibits {
                    id
                }
            }
            getExhibitors {
                id
                user {
                    fullName
                }
                exhibits {
                    id
                }
                tables {
                    number
                }
            }
            getExhibits {
                id
                title
                exhibitor {
                    id
                }
                table {
                    number
                }
            }
        }
    `)
  })
  const { getTables, getExhibitors, getExhibits } = data
  const exhibitors = new Map(getExhibitors!.map((exhibitor) => ([exhibitor.id, exhibitor])))
  const tables = new Map(getTables!.map((table) => ([table.number, table])))
  const exhibits = new Map(getExhibits!.map((exhibit) => ([exhibit.id, exhibit])))
  getTables!.forEach((table) => {
    if (table.exhibitor) {
      const exhibitor = exhibitors.get(table.exhibitor.id)
      if (!exhibitor) {
        console.error(`Exhibitor with ID ${table.exhibitor.id} not found`)
        return
      }
      table.exhibitor = exhibitor
    }
    if (table.exhibits) {
      table.exhibits = table.exhibits.map((exhibit) => {
        const e = exhibits.get(exhibit.id)
        if (!e) {
          console.error(`Exhibit with ID ${exhibit.id} not found`)
          return exhibit
        }
        return e
      })
    }
  })
  getExhibitors!.forEach((exhibitor) => {
    if (exhibitor.tables) {
      exhibitor.tables = exhibitor.tables.map((table) => {
        const t = tables.get(table.number)
        if (!t) {
          console.error(`Table with number ${table.number} not found`)
          return table
        }
        return t
      })
    }
    if (exhibitor.exhibits) {
      exhibitor.exhibits = exhibitor.exhibits.map((exhibit) => {
        const e = exhibits.get(exhibit.id)
        if (!e) {
          console.error(`Exhibit with ID ${exhibit.id} not found`)
          return exhibit
        }
        return e
      })
    }
  })
  return {
    tables: getTables || [],
    exhibitors: getExhibitors || [],
    exhibits: getExhibits || []
  }
}

export type ExhibitionData = Awaited<ReturnType<typeof fetchExhibitionData>>
