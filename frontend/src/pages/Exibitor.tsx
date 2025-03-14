import { useLocation, useParams } from 'react-router-dom'
import { useBreadcrumb } from '../contexts/BreadcrumbContext.ts'
import ExhibitorDetails from '../components/ExhibitorDetails.tsx'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ExhibitList from '../components/ExhibitList.tsx'
import { useEffect } from 'react'

const GET_EXHIBITOR = graphql(`
  query GetExhibitor($id: Int!) {
    getExhibitor(id: $id) {
      id
      user {
        id
        fullName
      }
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

const Exhibitor = () => {
  const { id } = useParams<{ id: string }>()
  const { data } = useQuery(GET_EXHIBITOR, {
    variables: { id: +id! },
  })
  const { setDetailName } = useBreadcrumb()
  const location = useLocation()
  useEffect(() => {
    const name = data?.getExhibitor?.user.fullName
    if (name) {
      setDetailName(location.pathname, name)
    }
  }, [location.pathname, data, setDetailName])

  if (!data || !id) return null

  const exhibitor = data!.getExhibitor!

  return (
    <>
      <ExhibitorDetails id={+id} />
      <ExhibitList exhibits={exhibitor.exhibits || []} />
    </>
  )
}

export default Exhibitor
