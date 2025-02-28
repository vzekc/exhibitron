import { useNavigate, useParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { ExhibitListItem } from '../types'
import ExhibitList from './ExhibitList.tsx'
import { useUser } from '../contexts/UserContext.ts'
import { client as backendClient } from '../api/client.gen'
import * as backend from '../api/index'

backendClient.setConfig({
  baseURL: '/api',
})

const TableSearchResult = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useUser()
  const [exhibits, setExhibits] = useState<ExhibitListItem[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const res = await backend.getExhibit()
      setExhibits(res.data?.items || [])
    }
    void load()
  }, [])

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
