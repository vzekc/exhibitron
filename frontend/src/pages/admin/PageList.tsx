import { useQuery, gql } from '@apollo/client'
import { useNavigate } from 'react-router-dom'

const GET_CURRENT_EXHIBITION = gql`
  query GetCurrentExhibition {
    getCurrentExhibition {
      id
      pages {
        key
        title
      }
    }
  }
`

interface Page {
  key: string
  title: string
}

const PageList = () => {
  const { loading, error, data } = useQuery(GET_CURRENT_EXHIBITION)
  const navigate = useNavigate()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const pages: Page[] = data.getCurrentExhibition.pages

  return (
    <article>
      <h2>Editierbare Seiten</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr
              key={page.key}
              onClick={() => navigate(`/admin/page/${page.key}`)}
              className="clickable-row">
              <td>{page.key}</td>
              <td>{page.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default PageList
