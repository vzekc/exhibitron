import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import '../components/Card.css'

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
        exhibits {
          title
        }
      }
    }
  }
`)

const Exhibitors = () => {
  const { data } = useQuery(GET_EXHIBITORS)
  if (data?.getCurrentExhibition) {
    const exhibitors = [...data!.getCurrentExhibition!.exhibitors!]
      .map(({ id, user, exhibits }) => ({
        id,
        fullName: user.fullName,
        exhibits: ((exhibits as Array<{ title: string }>) || []).map(
          (e) => e.title,
        ),
      }))
      .sort(({ fullName: a }, { fullName: b }) => a.localeCompare(b))
    return (
      <article className="exhibitors-page">
        <h2>Aussteller</h2>
        <div className="container">
          <div className="cards-grid">
            {exhibitors.map((exhibitor) => (
              <Link
                to={`/exhibitor/${exhibitor.id}`}
                className="card clickable"
                key={exhibitor.id}>
                <div className="card-title">{exhibitor.fullName}</div>
                <div className="card-content">
                  {exhibitor.exhibits.join(', ')}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </article>
    )
  }
}

export default Exhibitors
