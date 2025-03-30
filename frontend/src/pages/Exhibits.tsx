import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'
import ChipContainer from '@components/ChipContainer.tsx'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ToggleButton from '@components/ToggleButton.tsx'
import { DataTable, TableRow, TableCell } from '@components/Table.tsx'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const GET_EXHIBITION = graphql(
  `
    query GetExhibits {
      getExhibits {
        ...ExhibitCard
      }
    }
  `,
  [ExhibitChip.fragment],
)

const LAYOUT_STORAGE_KEY = 'exhibits_layout_preference'

const Exhibits = () => {
  const { data } = useQuery(GET_EXHIBITION)
  const [layout, setLayout] = useState<'kacheln' | 'tabelle'>(() => {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY)
    return (savedLayout as 'kacheln' | 'tabelle') || 'kacheln'
  })
  const navigate = useNavigate()
  type Exhibits = NonNullable<typeof data>['getExhibits']
  const [exhibits, setExhibits] = useState<Exhibits | null>(null)

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout)
  }, [layout])

  if (!data?.getExhibits) {
    return <p>loading...</p>
  }

  const tableHeaders = [
    { key: 'title', content: 'Titel', sortable: true },
    { key: 'exhibitor', content: 'Aussteller', sortable: true },
    { key: 'table', content: 'Tisch', sortable: true },
  ]

  const handleRowClick = (exhibitId: number) => {
    navigate(`/exhibit/${exhibitId}`)
  }

  const handleSort = (sorter: (data: NonNullable<Exhibits>) => NonNullable<Exhibits>) => {
    if (data?.getExhibits) {
      setExhibits(sorter(data?.getExhibits))
    }
  }

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
          {data?.getExhibits?.map((exhibit, index: number) => (
            <ExhibitChip key={index} exhibit={exhibit} />
          ))}
        </ChipContainer>
      ) : (
        <DataTable headers={tableHeaders} onSort={handleSort} defaultSortKey="title">
          {exhibits?.map((exhibit, index) => (
            <TableRow key={exhibit.id} index={index} onClick={() => handleRowClick(exhibit.id)}>
              <TableCell>{exhibit.title}</TableCell>
              <TableCell>{exhibit.exhibitor.user.fullName}</TableCell>
              <TableCell>{exhibit.table?.number || '-'}</TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </article>
  )
}

export default Exhibits
