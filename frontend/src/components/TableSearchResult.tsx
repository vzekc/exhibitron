import { useNavigate, useParams } from 'react-router-dom'
import React from 'react'
import ExhibitList from './ExhibitList.tsx'
import { useUser } from '../contexts/UserContext.ts'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const GET_TABLE = graphql(`
  query GetTable($number: Int!) {
    getTable(number: $number) {
      exhibitor {
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
        text
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

  const handleClaimTable = async (
    tableId: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault()
    // fixme implement claim and release table
    navigate(`/table/${tableId}`)
  }

  const tableNumber = Number(number)
  const exhibits = data?.getTable?.exhibits
  const exhibitor = data?.getTable?.exhibitor
  const otherExhibits = data?.getTable?.exhibitor?.exhibits?.filter(
    (exhibit) => exhibit.table?.number !== tableNumber,
  )

  if (!exhibitor) {
    if (user) {
      return (
        <p>
          Der Tisch {tableNumber} ist nicht belegt
          <button
            onClick={handleClaimTable.bind(null, tableNumber)}
            type="submit">
            Tisch {tableNumber} belegen
          </button>
        </p>
      )
    } else {
      return <p>Dieser Tisch ist nicht belegt.</p>
    }
  }

  return (
    <article>
      <h2>Benutzer: {exhibitor.user.fullName}</h2>
      {exhibits && exhibits.length > 0 && (
        <section>
          <h3>Ausstellungen auf Tisch {tableNumber}</h3>
          <ExhibitList exhibits={exhibits} />
        </section>
      )}
      {otherExhibits && otherExhibits.length > 0 && (
        <section>
          <h3>Andere Ausstellungen des Benutzers</h3>
          <ExhibitList exhibits={otherExhibits} />
        </section>
      )}
    </article>
  )
}

export default TableSearchResult
