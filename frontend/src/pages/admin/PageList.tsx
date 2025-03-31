import { useQuery, gql } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { KeyValueTable, TableRow, TableCell } from '@components/Table'
import Card from '@components/Card.tsx'
import PageHeading from '@components/PageHeading.tsx'
import LoadInProgress from '@components/LoadInProgress'

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

  if (loading) return <LoadInProgress />
  if (error) return <div>Error: {error.message}</div>

  const pages: Page[] = data.getCurrentExhibition.pages

  return (
    <>
      <PageHeading>Editierbare Seiten</PageHeading>
      <Card>
        <KeyValueTable headers={['Name', 'Titel']}>
          {pages.map((page) => (
            <TableRow key={page.key} onClick={() => navigate(`/admin/page/${page.key}`)}>
              <TableCell>{page.key}</TableCell>
              <TableCell>{page.title}</TableCell>
            </TableRow>
          ))}
        </KeyValueTable>
      </Card>
    </>
  )
}

export default PageList
