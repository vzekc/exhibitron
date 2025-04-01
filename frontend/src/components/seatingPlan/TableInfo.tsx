import React, { useState } from 'react'
import Button from '../Button'
import { ExhibitorSelector } from '../ExhibitorSelector'
import ChipContainer from '../ChipContainer'
import ExhibitorChip from '../ExhibitorChip'
import ExhibitChip from '../ExhibitChip'
import { FragmentOf } from 'gql.tada'
import { graphql } from 'gql.tada'
import { useMutation } from '@apollo/client'
import TableChip from '@components/TableChip.tsx'

const GET_TABLES = graphql(
  `
    query GetTables {
      getCurrentExhibition {
        id
        tables {
          id
          number
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

const RELEASE_TABLE = graphql(`
  mutation ReleaseTable($number: Int!) {
    releaseTable(number: $number) {
      id
    }
  }
`)

type TableInfo = {
  exhibitor: FragmentOf<typeof ExhibitorChip.fragment>
  exhibits: Array<FragmentOf<typeof ExhibitChip.fragment>>
}

// Add configurable variable for number of exhibit chips to show
const MAX_EXHIBIT_CHIPS = 3

interface TableInfoPanelProps {
  selectedTable: number
  tableInfo: TableInfo | undefined
  onClose: () => void
  position: { top: number; left?: number; right?: number; placement: 'left' | 'right' }
  measureRef?: React.RefObject<HTMLDivElement | null>
  isAdmin?: boolean
  exhibitors?: Array<{ id: number; user: { fullName: string; nickname?: string } }>
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
  const [showReleaseConfirmation, setShowReleaseConfirmation] = useState(false)
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
  const canReleaseTable = isAdmin || isTableOwner

  const [claimTable] = useMutation(CLAIM_TABLE, {
    update(cache) {
      // Update the GetTables query cache
      const existingTables = cache.readQuery({ query: GET_TABLES })
      if (existingTables?.getCurrentExhibition?.tables && currentExhibitorId) {
        cache.writeQuery({
          query: GET_TABLES,
          data: {
            getCurrentExhibition: {
              id: existingTables.getCurrentExhibition.id,
              tables: existingTables.getCurrentExhibition.tables.map((table) => {
                if (table.number === selectedTable) {
                  return {
                    ...table,
                    exhibitor: {
                      id: currentExhibitorId,
                      topic: null,
                      user: {
                        id: currentExhibitorId,
                        fullName:
                          exhibitors?.find((e) => e.id === currentExhibitorId)?.user.fullName || '',
                        nickname:
                          exhibitors?.find((e) => e.id === currentExhibitorId)?.user.nickname ||
                          null,
                        profileImage: null,
                      },
                      exhibits: [],
                    },
                  }
                }
                return table
              }),
            },
          },
        })
      }
    },
  })

  const [assignTable] = useMutation(ASSIGN_TABLE, {
    update(cache, _, { variables }) {
      // Update the GetTables query cache
      const existingTables = cache.readQuery({ query: GET_TABLES })
      if (existingTables?.getCurrentExhibition?.tables && variables?.exhibitorId) {
        const selectedExhibitor = exhibitors?.find((e) => e.id === variables.exhibitorId)
        if (selectedExhibitor) {
          cache.writeQuery({
            query: GET_TABLES,
            data: {
              getCurrentExhibition: {
                id: existingTables.getCurrentExhibition.id,
                tables: existingTables.getCurrentExhibition.tables.map((table) => {
                  if (table.number === variables.number) {
                    return {
                      ...table,
                      exhibitor: {
                        id: selectedExhibitor.id,
                        topic: null,
                        user: {
                          id: selectedExhibitor.id,
                          fullName: selectedExhibitor.user.fullName,
                          nickname: selectedExhibitor.user.nickname || null,
                          profileImage: null,
                        },
                        exhibits: [],
                      },
                    }
                  }
                  return table
                }),
              },
            },
          })
        }
      }
    },
  })

  const [releaseTable] = useMutation(RELEASE_TABLE, {
    update(cache, _, { variables }) {
      // Update the GetTables query cache
      const existingTables = cache.readQuery({ query: GET_TABLES })
      if (existingTables?.getCurrentExhibition?.tables && variables?.number) {
        cache.writeQuery({
          query: GET_TABLES,
          data: {
            getCurrentExhibition: {
              id: existingTables.getCurrentExhibition.id,
              tables: existingTables.getCurrentExhibition.tables.map((table) => {
                if (table.number === variables.number) {
                  return {
                    ...table,
                    exhibitor: null,
                  }
                }
                return table
              }),
            },
          },
        })
      }
    },
  })

  const handleClaimTable = async () => {
    try {
      await claimTable({
        variables: { number: selectedTable },
        refetchQueries: [GET_TABLES],
      })
      onClose()
    } catch (error) {
      console.error('Failed to claim table:', error)
    }
  }

  const handleAssignTable = async () => {
    if (!selectedExhibitorId) return
    try {
      await assignTable({
        variables: { number: selectedTable, exhibitorId: selectedExhibitorId },
        refetchQueries: [GET_TABLES],
      })
      onClose()
    } catch (error) {
      console.error('Failed to assign table:', error)
    }
  }

  const handleReleaseTable = async () => {
    try {
      await releaseTable({
        variables: { number: selectedTable },
        refetchQueries: [GET_TABLES],
      })
      setShowReleaseConfirmation(false)
      onClose()
    } catch (error) {
      console.error('Failed to release table:', error)
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

          {tableInfo && canReleaseTable && (
            <Button variant="danger" onClick={() => setShowReleaseConfirmation(true)}>
              Tisch freigeben
            </Button>
          )}
        </div>
      )}

      {showReleaseConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium">Tisch {selectedTable} freigeben</h3>
            <p className="mb-4 text-gray-600">
              Bist Du sicher, dass Du den Tisch {selectedTable} freigeben möchtest?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowReleaseConfirmation(false)}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={handleReleaseTable}>
                Freigeben
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TableInfoPanel
