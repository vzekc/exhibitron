import { useNavigate, useParams } from 'react-router-dom'
import React, { use } from 'react'
import exhibitListService from '../services/exhibitListService'
import { ExhibitListItem } from '../types'
import ExhibitList from './ExhibitList.tsx'
import { useUser } from '../contexts/userUtils.ts'
import { client as backendClient } from '../api/client.gen'
import * as backend from '../api/index'

backendClient.setConfig({
  baseURL: '/api',
})

const dataPromise = exhibitListService.fetchExhibits()

const TableSearchResult = () => {
  const { id } = useParams<{ id: string }>()
  const exhibits = use(dataPromise) as ExhibitListItem[]
  const { user } = useUser()
  const navigate = useNavigate()

  const handleClaimTable = async (
    tableId: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault()
    await backend.postTableByNumberClaim({ path: { number: tableId } })
    navigate(`/table/${tableId}`)
  }

  const tableId = Number(id)

  const tableExhibits = exhibits.filter((exhibit) => exhibit.table === tableId)
  const userExhibits = exhibits.filter(
    (exhibit) =>
      exhibit.exhibitorName === tableExhibits[0]?.exhibitorName &&
      exhibit.table !== tableId,
  )

  if (!tableExhibits.length) {
    if (user) {
      return (
        <p>
          Der Tisch {tableId} ist nicht belegt
          <button onClick={handleClaimTable.bind(null, tableId)} type="submit">
            Tisch {tableId} belegen
          </button>
        </p>
      )
    } else {
      return <p>Keine Ausstellung für diesen Tisch gefunden</p>
    }
  }

  return (
    <article>
      <h2>Benutzer: {tableExhibits[0].exhibitorName}</h2>
      {tableExhibits.length && (
        <section>
          <h3>Ausstellungen auf Tisch {tableId}</h3>
          <ExhibitList exhibits={tableExhibits} />
        </section>
      )}
      {userExhibits.length && (
        <section>
          <h3>Andere Ausstellungen des Benutzers</h3>
          <ExhibitList exhibits={userExhibits} />
        </section>
      )}
    </article>
  )
}

export default TableSearchResult
