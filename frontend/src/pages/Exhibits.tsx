import ExhibitList from '../components/ExhibitList.tsx'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_EXHIBITION = graphql(`
  query GetExhibits {
    getExhibits {
      id
      title
      exhibitor {
        id
        user {
          id
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
        <ExhibitList exhibits={data.getExhibits} />
      </article>
    )
  }
}

export default Exhibits
