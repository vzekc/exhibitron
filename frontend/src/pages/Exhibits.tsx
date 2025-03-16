import ExhibitList, { ExhibitDisplayListItem } from '../components/ExhibitList.tsx'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_EXHIBITION = graphql(`
  query GetExhibits {
    getExhibits {
      id
      title
      exhibitor {
        id
        user {
          id
          fullName
        }
      }
      table {
        number
      }
      attributes {
        name
        value
      }
    }
  }
`)

const Exhibits = () => {
  const { data } = useQuery(GET_EXHIBITION)
  if (data?.getExhibits) {
    const exhibits = data.getExhibits.map((exhibit) => {
      const { attributes, ...rest } = exhibit
      return {
        ...rest,
        attributes: Array.isArray(attributes) ? attributes : [],
      }
    }) as ExhibitDisplayListItem[]

    return (
      <article>
        <ExhibitList exhibits={exhibits} />
      </article>
    )
  }
}

export default Exhibits
