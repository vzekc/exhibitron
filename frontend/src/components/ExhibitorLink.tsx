import { Link } from 'react-router-dom'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import './ExhibitorLink.css'

const GET_EXHIBITOR = graphql(`
  query GetExhibitorForLink($id: Int!) {
    getExhibitor(id: $id) {
      id
      user {
        id
        fullName
      }
    }
  }
`)

interface ExhibitorLinkProps {
  id: number
}

const ExhibitorLink = ({ id }: ExhibitorLinkProps) => {
  const { data, loading } = useQuery(GET_EXHIBITOR, {
    variables: { id },
  })

  if (loading || !data?.getExhibitor) {
    return null
  }

  const { fullName } = data.getExhibitor.user

  return (
    <Link to={`/exhibitor/${id}`} className="exhibitor-link-card">
      <img src="/user.svg" alt="User" className="exhibitor-link-icon" />
      <span className="exhibitor-link-name">{fullName}</span>
    </Link>
  )
}

export default ExhibitorLink
