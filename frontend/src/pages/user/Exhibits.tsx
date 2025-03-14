import ExhibitList from '../../components/ExhibitList.tsx'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { Link, useNavigate } from 'react-router-dom'

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
        <h2>Deine Exponate</h2>
        <ExhibitList
          exhibits={data.getCurrentExhibitor.exhibits}
          onClick={(id) => navigate(`/user/exhibit/${id}`)}
        />
        <Link to="/user/exhibit/new">
          <button>Neues Exponat</button>
        </Link>
      </article>
    )
  }
}

export default UserExhibits
