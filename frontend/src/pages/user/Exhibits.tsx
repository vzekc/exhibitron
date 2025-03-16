import ExhibitList, { ExhibitDisplayListItem } from '../../components/ExhibitList.tsx'
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
        attributes {
          name
          value
        }
      }
    }
  }
`)

const UserExhibits = () => {
  const { data } = useQuery(GET_MY_EXHIBITS)
  const navigate = useNavigate()

  if (data?.getCurrentExhibitor?.exhibits) {
    const exhibits = data.getCurrentExhibitor.exhibits.map((exhibit) => {
      const { attributes, ...rest } = exhibit
      return {
        ...rest,
        attributes: Array.isArray(attributes) ? attributes : [],
      }
    }) as ExhibitDisplayListItem[]

    return (
      <article>
        <h2>Deine Exponate</h2>
        <ExhibitList exhibits={exhibits} onClick={(id) => navigate(`/user/exhibit/${id}`)} />
        <Link to="/user/exhibit/new">
          <button>Neues Exponat</button>
        </Link>
      </article>
    )
  }
}

export default UserExhibits
