import { useNavigate, useParams } from 'react-router-dom'
import React from 'react'
import ExhibitList from '../components/ExhibitList.tsx'
import { useUser } from '../contexts/UserContext.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ExhibitorDetails from '../components/ExhibitorDetails.tsx'
import ExhibitDetails from '../components/ExhibitDetails.tsx'

const GET_TABLE = graphql(`
  query GetTable($number: Int!) {
    getTable(number: $number) {
      exhibitor {
        id
        user {
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

const TableSearchResult = () => {
  const { number } = useParams<{ number: string }>()
  const { data } = useQuery(GET_TABLE, { variables: { number: +number! } })
  const navigate = useNavigate()
  const user = useUser()

  if (!data) return null

  const handleClaimTable = async (
    tableId: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault()
    // fixme implement claim and release table
    navigate(`/table/${tableId}`)
  }

  const tableNumber = Number(number)
  const { exhibits: exhibitsOnTable, exhibitor } = data?.getTable || {}
  const { exhibits: exhibitorExhibits } = exhibitor || {}
  const otherExhibits = exhibitorExhibits?.filter(
    (exhibit) => exhibit.table?.number !== tableNumber,
  )

  if (!exhibitor) {
    return user ? (
      <p>
        Der Tisch {tableNumber} ist nicht belegt
        <button
          onClick={handleClaimTable.bind(null, tableNumber)}
          type="submit">
          Tisch {tableNumber} belegen
        </button>
      </p>
    ) : (
      <p>Dieser Tisch ist nicht belegt.</p>
    )
  }

  const OnTableExhibits = () => {
    switch (exhibitsOnTable?.length) {
      case undefined:
      case 0:
        return <></>
      case 1:
        return <ExhibitDetails {...exhibitsOnTable[0]} />
      default:
        return (
          <section>
            <h3>Exponate auf Tisch {tableNumber}</h3>
            <ExhibitList exhibits={exhibitsOnTable!} />
          </section>
        )
    }
  }
  const OtherExhibitorExhibits = () => {
    switch (otherExhibits?.length) {
      case undefined:
      case 0:
        return <></>
      // @ts-expect-error ts(7029)
      case 1:
        if (!exhibitsOnTable?.length) {
          return <ExhibitDetails {...otherExhibits[0]} />
        }
      // fall through
      default:
        return (
          <section>
            <h3>Andere Exponate von {exhibitor.user.fullName}</h3>
            <ExhibitList exhibits={otherExhibits!} />
          </section>
        )
    }
  }
  return (
    <article>
      <OnTableExhibits />
      <OtherExhibitorExhibits />
      <ExhibitorDetails id={exhibitor.id} />
    </article>
  )
}

export default TableSearchResult
