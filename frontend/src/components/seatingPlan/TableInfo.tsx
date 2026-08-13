import React, { useState } from 'react'
import Button from '../Button'
import ExhibitorSelector from '../ExhibitorSelector'
import ChipContainer from '../ChipContainer'
import ExhibitorChip from '../ExhibitorChip'
import ExhibitChip from '../ExhibitChip'
import { FragmentOf } from 'gql.tada'
import { graphql } from 'gql.tada'
import { useMutation } from '@apollo/client'
import { Link } from 'react-router-dom'
import TableChip from '@components/TableChip.tsx'
import { showMessage } from '@components/MessageModalUtil.tsx'

const GET_TABLES = graphql(
  `
    query GetTables {
      getCurrentExhibition {
        id
        tables {
          id
          number
          showsVisitorPhotos
          exhibitor {
            ...ExhibitorChip
            exhibits {
              ...ExhibitCard
            }
          }
        }
      }
    }
  `,
  [ExhibitorChip.fragment, ExhibitChip.fragment],
)

const CLAIM_TABLE = graphql(`
  mutation ClaimTable($number: Int!) {
    claimTable(number: $number) {
      id
    }
  }
`)

const ASSIGN_TABLE = graphql(`
  mutation AssignTable($number: Int!, $exhibitorId: Int!) {
    assignTable(number: $number, exhibitorId: $exhibitorId) {
      id
    }
  }
`)

const UPDATE_TABLE = graphql(`
  mutation UpdateTable($number: Int!, $showsVisitorPhotos: Boolean) {
    updateTable(number: $number, showsVisitorPhotos: $showsVisitorPhotos) {
      id
      showsVisitorPhotos
    }
  }
`)

type TableInfo = {
  showsVisitorPhotos: boolean
  exhibitor: FragmentOf<typeof ExhibitorChip.fragment>
  exhibits: Array<FragmentOf<typeof ExhibitChip.fragment>>
}

// Add configurable variable for number of exhibit chips to show
const MAX_EXHIBIT_CHIPS = 3

interface User {
  fullName: string
  nickname: string | null
}

interface TableInfoPanelProps {
  selectedTable: number
  tableInfo: TableInfo | undefined
  onClose: () => void
  position: { top: number; left?: number; right?: number; placement: 'left' | 'right' }
  measureRef?: React.RefObject<HTMLDivElement | null>
  isAdmin?: boolean
  exhibitors?: Array<{ id: number; user: User }>
  currentExhibitorId?: number
  exhibitionId: string
}

const TableInfoPanel: React.FC<TableInfoPanelProps> = ({
  selectedTable,
  tableInfo,
  onClose,
  position,
  measureRef,
  isAdmin,
  exhibitors,
  currentExhibitorId,
}) => {
  const [selectedExhibitorId, setSelectedExhibitorId] = useState<number | null>(null)
  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${position.top}px`,
    zIndex: 40,
    overflow: 'visible',
  }

  // Apply either left or right positioning based on the placement
  if (position.placement === 'right' && position.left !== undefined) {
    style.left = `${position.left}px`
  } else if (position.placement === 'left' && position.right !== undefined) {
    style.right = `${position.right}px`
  }

  const isTableOwner = currentExhibitorId && tableInfo?.exhibitor.id === currentExhibitorId
  const canManageTable = isAdmin || isTableOwner

  const [claimTable] = useMutation(CLAIM_TABLE, {
    refetchQueries: [GET_TABLES],
  })

  const [assignTable] = useMutation(ASSIGN_TABLE, {
    refetchQueries: [GET_TABLES],
  })

  const [updateTable] = useMutation(UPDATE_TABLE, {
    refetchQueries: [GET_TABLES],
  })

  const handleVisitorPhotos = async (shows: boolean) => {
    const result = await updateTable({
      variables: { number: selectedTable, showsVisitorPhotos: shows },
    })
    if (result.errors?.length) {
      await showMessage(
        'Konnte nicht gespeichert werden',
        result.errors[0]?.message || 'Unbekannter Fehler',
      )
    }
  }

  const handleClaimTable = async () => {
    const result = await claimTable({
      variables: { number: selectedTable },
    })
    const { errors } = result
    if (errors && errors.length) {
      const error = errors[0]
      await showMessage(
        'Tisch konnte nicht reserviert werden',
        error.extensions?.code === 'FORBIDDEN'
          ? 'Du kannst maximal zwei Tische selbst reservieren.  Wenn Du mehr Platz brauchst, wende Dich bitte an die Organisatoren.'
          : error.message,
      )
    }
    onClose()
  }

  const handleAssignTable = async () => {
    if (selectedExhibitorId) {
      const result = await assignTable({
        variables: { number: selectedTable, exhibitorId: selectedExhibitorId },
      })
      if (result.errors?.length) {
        await showMessage(
          'Tisch konnte nicht zugewiesen werden',
          result.errors[0]?.message || 'Unbekannter Fehler',
        )
        return
      }
      onClose()
    }
  }

  return (
    <div
      className="table-info-panel fixed z-50 max-w-[400px] overflow-hidden rounded-t-xl bg-gray-100 shadow-lg md:relative md:rounded-lg"
      style={style}
      ref={measureRef}>
      <div className="overflow-y-auto p-4">
        <TableChip number={selectedTable} />
        {tableInfo ? (
          <div className="space-y-4">
            <ExhibitorChip exhibitor={tableInfo.exhibitor} />
            {tableInfo.exhibits.length > 0 && (
              <>
                <hr />
                <div className="space-y-2">
                  <ChipContainer>
                    {tableInfo.exhibits.slice(0, MAX_EXHIBIT_CHIPS).map((exhibit, idx) => (
                      <ExhibitChip key={idx} exhibit={exhibit} noExhibitor noTable />
                    ))}
                  </ChipContainer>
                  {tableInfo.exhibits.length > MAX_EXHIBIT_CHIPS && (
                    <p className="text-sm text-gray-500">und weitere...</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="m-0 mb-4 text-gray-600">Tisch {selectedTable} ist nicht belegt</p>
        )}
      </div>

      {(isAdmin || isTableOwner) && (
        <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3">
          {!tableInfo && isAdmin && (
            <div className="space-y-4">
              <Button onClick={handleClaimTable}>Reservieren</Button>
              <div className="space-y-2">
                <div style={{ position: 'relative' }}>
                  <ExhibitorSelector
                    options={exhibitors || []}
                    onSelect={(exhibitorId) => setSelectedExhibitorId(exhibitorId)}
                  />
                </div>
                <Button disabled={!selectedExhibitorId} onClick={handleAssignTable}>
                  Zuweisen
                </Button>
              </div>
            </div>
          )}

          {/*
           * The photo-booth flag is the one setting the panel offers, because it
           * is read off the floor plan: whoever looks at the plan is asking which
           * tables carry the badge. Everything else about the table lives on the
           * table's own page, which the chip above links to.
           */}
          {tableInfo && canManageTable && (
            <div className="space-y-1">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="text-primary-600 focus:ring-primary-500 mt-0.5 h-4 w-4 rounded border-gray-300"
                  defaultChecked={tableInfo.showsVisitorPhotos}
                  onChange={(e) => handleVisitorPhotos(e.target.checked)}
                />
                <span>An diesem Tisch können Besucherfotos gezeigt werden</span>
              </label>
              <p className="text-xs m-0 text-gray-500">
                Der Tisch steht dann auf den Laufzetteln, die Besucher am Fotoautomaten bekommen.
                Die Einstellung wird sofort gespeichert.
              </p>
              <p className="text-xs m-0 pt-1 text-gray-500">
                <Link className="underline" to={`/table/${selectedTable}`}>
                  Tisch {selectedTable} verwalten
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TableInfoPanel
