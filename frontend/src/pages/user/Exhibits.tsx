import ExhibitList from '../../components/ExhibitList.tsx'
import '../../components/ExhibitList.css'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()

  if (data?.getCurrentExhibitor?.exhibits) {
    return (
      <article>
        <h2>Liste Deiner Ausstellungen</h2>
        <ExhibitList
          exhibits={data.getCurrentExhibitor.exhibits}
          onClick={(id) => navigate(`/user/exhibit/${id}`)}
        />
      </article>
    )
  }
}

export default UserExhibits
