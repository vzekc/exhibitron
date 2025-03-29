import { useQuery, gql } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Table, TableRow, TableCell } from '@components/Table'
import Card from '@components/Card.tsx'
import PageHeading from '@components/PageHeading.tsx'

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
    <>
      <PageHeading>Editierbare Seiten</PageHeading>
      <Card>
        <Table headers={['Name', 'Titel']} variant="keyValue">
          {pages.map((page) => (
            <TableRow key={page.key} onClick={() => navigate(`/admin/page/${page.key}`)}>
              <TableCell>{page.key}</TableCell>
              <TableCell>{page.title}</TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </>
  )
}

export default PageList
