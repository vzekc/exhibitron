import { useNavigate, useParams } from 'react-router-dom'
import React, { useEffect } from 'react'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import { FragmentOf, graphql } from 'gql.tada'
import { useApolloClient, useMutation, useQuery } from '@apollo/client'
import ExhibitorCard from '@components/ExhibitorCard.tsx'
import ExhibitCard from '@components/ExhibitCard.tsx'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ChipContainer from '@components/ChipContainer.tsx'

const GET_TABLE = graphql(
  `
    query GetTable($number: Int!) {
      getTable(number: $number) {
        exhibitor {
          ...ExhibitorDetails
          exhibits {
            ...ExhibitCard
          }
        }
        exhibits {
          ...ExhibitCard
        }
      }
    }
  `,
  [ExhibitChip.fragment, ExhibitorCard.fragment],
)

const CLAIM_TABLE = graphql(`
  mutation ClaimTable($number: Int!) {
    claimTable(number: $number) {
      id
    }
  }
`)

const RELEASE_TABLE = graphql(`
  mutation ReleaseTable($number: Int!) {
    releaseTable(number: $number) {
      id
    }
  }
`)

type ExhibitCardItem = FragmentOf<typeof ExhibitChip.fragment>

const Table = () => {
  const { number } = useParams<{ number: string }>()
  const { data } = useQuery(GET_TABLE, { variables: { number: +number! } })
  const apolloClient = useApolloClient()
  const [claimTable] = useMutation(CLAIM_TABLE)
  const [releaseTable] = useMutation(RELEASE_TABLE)
  const navigate = useNavigate()
  const { exhibitor: currentUser } = useExhibitor()
  const { setDetailName } = useBreadcrumb()

  useEffect(() => {
    setDetailName(location.pathname, 'Tisch ' + number)
  }, [number, setDetailName])

  if (!data) return null

  const handleClaimTable = async (tableId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    await claimTable({ variables: { number: tableId } })
    await apolloClient.resetStore()
    navigate(`/table/${tableId}`)
  }

  const handleReleaseTable = async (tableId: number, e: React.MouseEvent<HTMLButtonElement>) => {
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
  const onAnyTableExhibits = exhibitorExhibits?.filter((exhibit) => exhibit.table)

  const OneOrMoreExhibits = ({ exhibits }: { exhibits: ExhibitCardItem[] | undefined }) => {
    switch (exhibits?.length) {
      case undefined:
      case 0:
        return <></>
      case 1:
        return <ExhibitCard {...exhibits[0]} />
      default:
        return (
          <ChipContainer>
            {exhibits?.map((exhibit) => (
              <ExhibitChip exhibit={exhibit} key={exhibit.id} noExhibitor noTable />
            ))}
          </ChipContainer>
        )
    }
  }

  const OtherExhibits = ({
    exhibits,
    title,
  }: {
    exhibits: ExhibitCardItem[] | undefined
    title: string
  }) => {
    switch (exhibits?.length) {
      case undefined:
      case 0:
        return <></>
      default:
        return (
          <section className="mb-3 mt-6">
            <h3 className="mb-3 text-xl">{title}</h3>
            <ChipContainer>
              {exhibits?.map((exhibit, index: number) => (
                <ExhibitChip key={index} exhibit={exhibit} noExhibitor />
              ))}
            </ChipContainer>
          </section>
        )
    }
  }

  const Actions = () => {
    if (!currentUser) {
      return <></>
    } else if (!exhibitor) {
      return (
        <button onClick={handleClaimTable.bind(null, tableNumber)} type="submit">
          Tisch {tableNumber} belegen
        </button>
      )
    } else if (
      !onThisTableExhibits?.length &&
      (currentUser.id === exhibitor.user.id || currentUser.user.isAdministrator)
    ) {
      return (
        <button onClick={handleReleaseTable.bind(null, tableNumber)} type="submit">
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
        <Actions />
      </article>
    )
  }
}

export default Table
