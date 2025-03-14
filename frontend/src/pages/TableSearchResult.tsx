import { useNavigate, useParams } from 'react-router-dom'
import React from 'react'
import ExhibitList, {
  ExhibitDisplayListItem,
} from '../components/ExhibitList.tsx'
import { useUser } from '../contexts/UserContext.ts'
import { graphql } from 'gql.tada'
import { useApolloClient, useMutation, useQuery } from '@apollo/client'
import ExhibitorDetails from '../components/ExhibitorDetails.tsx'
import ExhibitDetails from '../components/ExhibitDetails.tsx'

const GET_TABLE = graphql(`
  query GetTable($number: Int!) {
    getTable(number: $number) {
      exhibitor {
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

const CLAIM_TABLE = graphql(`
  mutation ClaimTable($number: Int!) {
    claimTable(number: $number) {
      id
    }
  }
`)

const RELEASE_TABLE = graphql(`
  mutation ClaimTable($number: Int!) {
    releaseTable(number: $number) {
      id
    }
  }
`)

const TableSearchResult = () => {
  const { number } = useParams<{ number: string }>()
  const { data } = useQuery(GET_TABLE, { variables: { number: +number! } })
  const apolloClient = useApolloClient()
  const [claimTable] = useMutation(CLAIM_TABLE)
  const [releaseTable] = useMutation(RELEASE_TABLE)
  const navigate = useNavigate()
  const { user: currentUser } = useUser()

  if (!data) return null

  const handleClaimTable = async (
    tableId: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault()
    await claimTable({ variables: { number: tableId } })
    await apolloClient.resetStore()
    navigate(`/table/${tableId}`)
  }

  const handleReleaseTable = async (
    tableId: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault()
    await releaseTable({ variables: { number: tableId } })
    await apolloClient.resetStore()
    navigate(`/table/${tableId}`)
  }

  const tableNumber = Number(number)
  const { exhibits: onThisTableExhibits, exhibitor } = data?.getTable || {}
  const { exhibits: exhibitorExhibits } = exhibitor || {}
  const otherExhibitorExhibits = exhibitorExhibits?.filter(
    (exhibit) => exhibit.table?.number !== tableNumber,
  )
  const noTableExhibits = exhibitorExhibits?.filter((exhibit) => !exhibit.table)
  const onAnyTableExhibits = exhibitorExhibits?.filter(
    (exhibit) => exhibit.table,
  )

  const OneOrMoreExhibits = ({
    exhibits,
  }: {
    exhibits: ExhibitDisplayListItem[] | undefined
  }) => {
    switch (exhibits?.length) {
      case undefined:
      case 0:
        return <></>
      case 1:
        return <ExhibitDetails {...exhibits[0]} />
      default:
        return (
          <section>
            <ExhibitList exhibits={exhibits!} />
          </section>
        )
    }
  }

  const OtherExhibits = ({
    exhibits,
    title,
  }: {
    exhibits: ExhibitDisplayListItem[] | undefined
    title: string
  }) => {
    switch (exhibits?.length) {
      case undefined:
      case 0:
        return <></>
      default:
        return (
          <section>
            <h3>{title}</h3>
            <ExhibitList exhibits={exhibits!} />
          </section>
        )
    }
  }

  const Actions = () => {
    if (!currentUser) {
      return <></>
    } else if (!exhibitor) {
      return (
        <button
          onClick={handleClaimTable.bind(null, tableNumber)}
          type="submit">
          Tisch {tableNumber} belegen
        </button>
      )
    } else if (
      !onThisTableExhibits?.length &&
      (currentUser.id === exhibitor.user.id || currentUser.isAdministrator)
    ) {
      return (
        <button
          onClick={handleReleaseTable.bind(null, tableNumber)}
          type="submit">
          Tisch {tableNumber} freigeben
        </button>
      )
    } else {
      return <></>
    }
  }
  if (!exhibitor) {
    return (
      <article>
        <h2>Dieser Tisch ist nicht belegt.</h2>
        <Actions />
      </article>
    )
  } else {
    return (
      <article>
        {onThisTableExhibits?.length ? (
          <>
            <OneOrMoreExhibits exhibits={onThisTableExhibits} />
            <OtherExhibits
              exhibits={otherExhibitorExhibits}
              title={`Andere Exponate von ${exhibitor.user.fullName}`}
            />
          </>
        ) : (
          <>
            <OneOrMoreExhibits exhibits={noTableExhibits} />
            <OtherExhibits
              exhibits={onAnyTableExhibits}
              title={`Exponate von ${exhibitor.user.fullName} auf anderen Tischen`}
            />
          </>
        )}
        <ExhibitorDetails id={exhibitor.id} />
        <Actions />
      </article>
    )
  }
}

export default TableSearchResult
