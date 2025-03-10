import client from '../apolloClient'
import { graphql } from 'gql.tada'

export const fetchExhibitionData = async () => {
  const { data } = await client.query({
    query: graphql(`
        query GetAllData {
            getTables {
                id
                number
                exhibitor {
                    id
                }
                exhibits {
                    id
                    title
                }
            }
            getExhibitors {
                id
                user {
                    fullName
                }
                exhibits {
                    id
                    title
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
  return {
      tables: getTables || [],
      exhibitors: getExhibitors || [],
      exhibits: getExhibits || []
  }
}

export type ExhibitionData = Awaited<ReturnType<typeof fetchExhibitionData>>
