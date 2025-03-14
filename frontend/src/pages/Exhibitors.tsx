import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

const GET_EXHIBITORS = graphql(`
  query GetExhibitors {
    getCurrentExhibition {
      id
      exhibitors {
        id
        user {
          id
          fullName
        }
      }
    }
  }
`)

const Exhibitors = () => {
  const { data } = useQuery(GET_EXHIBITORS)
  if (data?.getCurrentExhibition) {
    const exhibitors = [...data!.getCurrentExhibition!.exhibitors!]
      .map(({ id, user }) => ({
        id,
        fullName: user.fullName,
      }))
      .sort(({ fullName: a }, { fullName: b }) => a.localeCompare(b))
    return (
      <article>
        <h2>Aussteller</h2>
        <div className="container">
          <div className="grid">
            {exhibitors.map((exhibitor) => (
              <div className="col" key={exhibitor.id}>
                <Link to={`/exhibitor/${exhibitor.id}`}>
                  {exhibitor.fullName}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </article>
    )
  }
}

export default Exhibitors
