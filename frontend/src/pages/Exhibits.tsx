import ExhibitList from '../components/ExhibitList.tsx'
import '../components/ExhibitList.css'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_EXHIBITION = graphql(`
    query GetExhibits {
        getExhibits {
            id
            title
            exhibitor {
                user {
                    fullName
                }
            }
            table {
                number
            }
        }
    }
`)

const Exhibits = () => {
  const { data } = useQuery(GET_EXHIBITION)
  if (data?.getExhibits) {
    return (
      <article>
        <h2>Liste der Ausstellungen</h2>
        <ExhibitList exhibits={data.getExhibits} />
      </article>
    )
  }
}

export default Exhibits
