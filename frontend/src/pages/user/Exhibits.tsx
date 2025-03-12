import ExhibitList from '../../components/ExhibitList.tsx'
import '../../components/ExhibitList.css'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_MY_EXHIBITS = graphql(`
  query GetMyExhibits {
    getCurrentExhibitor {
      exhibits {
        id
        title
        table {
          number
        }
      }
    }
  }
`)

const UserExhibits = () => {
  const { data } = useQuery(GET_MY_EXHIBITS)

  if (data?.getCurrentExhibitor?.exhibits) {
    return (
      <article>
        <h2>Liste Deiner Ausstellungen</h2>
        <ExhibitList exhibits={data.getCurrentExhibitor.exhibits} />
      </article>
    )
  }
}

export default UserExhibits
