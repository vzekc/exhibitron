import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitorChip from '@components/ExhibitorChip.tsx'
import ToggleButton from '@components/ToggleButton.tsx'
import { useEffect, useState } from 'react'
import { DataTable, TableCell, TableRow } from '@components/Table.tsx'
import { useNavigate } from 'react-router-dom'

const GET_EXHIBITORS = graphql(
  `
    query GetExhibitors {
      getCurrentExhibition {
        id
        exhibitors {
          ...ExhibitorChip
        }
      }
    }
  `,
  [ExhibitorChip.fragment],
)

const LAYOUT_STORAGE_KEY = 'exhibitors_layout_preference'

const Exhibitors = () => {
  const navigate = useNavigate()
  const { data } = useQuery(GET_EXHIBITORS)
  const [layout, setLayout] = useState<'kacheln' | 'tabelle'>(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
    return (savedLayout as 'kacheln' | 'tabelle') || 'kacheln'
  })
  type Exhibitors = NonNullable<NonNullable<typeof data>['getCurrentExhibition']>['exhibitors']
  const [exhibitors, setExhibitors] = useState<Exhibitors | null>([])

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout)
  }, [layout])

  const tableHeaders = [
    { key: 'name', content: 'Name', sortable: true },
    { key: 'topic', content: 'Thema', sortable: true },
  ]

  const handleSort = (sorter: (data: NonNullable<Exhibitors>) => NonNullable<Exhibitors>) => {
    if (data?.getCurrentExhibition?.exhibitors) {
      setExhibitors(sorter(data?.getCurrentExhibition?.exhibitors))
    }
  }

  useEffect(() => {
    if (data?.getCurrentExhibition?.exhibitors) {
      setExhibitors(
        [...data.getCurrentExhibition.exhibitors].sort((a, b) => {
          return a.user.fullName.localeCompare(b.user.fullName)
        }),
      )
    }
  }, [data?.getCurrentExhibition?.exhibitors])

  const handleRowClick = (exhibitId: number) => {
    navigate(`/exhibitor/${exhibitId}`)
  }

  if (data?.getCurrentExhibition) {
    return (
      <article>
        <div className="flex justify-end pb-3">
          <ToggleButton
            option1="Kacheln"
            option2="Tabelle"
            defaultOption={layout === 'kacheln' ? 'Kacheln' : 'Tabelle'}
            onChange={(value) => setLayout(value.toLowerCase() as 'kacheln' | 'tabelle')}
          />
        </div>
        {layout === 'kacheln' ? (
          <ChipContainer>
            {exhibitors?.map((exhibitor) => (
              <ExhibitorChip key={exhibitor.id} exhibitor={exhibitor} />
            ))}
          </ChipContainer>
        ) : (
          <DataTable headers={tableHeaders} onSort={handleSort} defaultSortKey="title">
            {exhibitors?.map((exhibitor, index) => (
              <TableRow
                key={exhibitor.id}
                index={index}
                onClick={() => handleRowClick(exhibitor.id)}>
                <TableCell>{exhibitor.user.fullName}</TableCell>
                <TableCell>{exhibitor.topic}</TableCell>
              </TableRow>
            ))}
          </DataTable>
        )}
      </article>
    )
  }
}

export default Exhibitors
