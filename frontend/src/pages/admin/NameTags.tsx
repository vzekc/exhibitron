import { FormEvent, useState } from 'react'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import Card from '@components/Card'
import Button from '@components/Button'
import { Checkbox } from '@components/Form.tsx'
import MultipleExhibitorSelector from '@components/MultipleExhibitorSelector'
import NameTagPreview from '@components/NameTagPreview.tsx'
import { generateAndDownloadNameTagSheet } from '@components/NameTagPDF.tsx'
import { NAME_TAG, getNameTagName } from '@components/nameTag.ts'
import { getDisplayName } from '@utils/displayName'
import { showMessage } from '@components/MessageModalUtil.tsx'

const GET_NAME_TAG_EXHIBITORS = graphql(`
  query GetNameTagExhibitors {
    getCurrentExhibition {
      id
      title
      venue
      exhibitors {
        id
        nameTagName
        nameTagShowNickname
        topic
        user {
          id
          fullName
          nickname
          profileImage
        }
      }
    }
  }
`)

const NameTags = () => {
  const { data } = useQuery(GET_NAME_TAG_EXHIBITORS)
  const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([])
  const [allExhibitors, setAllExhibitors] = useState(true)
  const [isPrinting, setIsPrinting] = useState(false)

  const exhibition = data?.getCurrentExhibition
  const exhibitors = exhibition?.exhibitors ?? []

  const selected = (
    allExhibitors
      ? exhibitors
      : exhibitors.filter((exhibitor) => selectedExhibitorIds.includes(exhibitor.id.toString()))
  )
    .slice()
    .sort((a, b) => getNameTagName(a).localeCompare(getNameTagName(b)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsPrinting(true)
    try {
      await generateAndDownloadNameTagSheet({ exhibitors: selected, exhibition: exhibition! })
    } catch (error) {
      await showMessage(
        'Fehler',
        error instanceof Error ? error.message : 'Die Namensschilder konnten nicht erzeugt werden',
        'OK',
      )
    } finally {
      setIsPrinting(false)
    }
  }

  if (!exhibition) return null

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Namensschilder drucken</h1>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Mitwirkende auswählen</h2>
              <Checkbox
                label="Alle Mitwirkenden"
                checked={allExhibitors}
                onChange={(e) => setAllExhibitors(e.target.checked)}
                disabled={isPrinting}
              />
              {!allExhibitors && (
                <div className="mt-4">
                  <MultipleExhibitorSelector
                    exhibitors={exhibitors}
                    selectedIds={selectedExhibitorIds}
                    onChange={setSelectedExhibitorIds}
                    disabled={isPrinting}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={isPrinting || selected.length === 0}>
                Namensschilder erzeugen
              </Button>
              <span className="text-sm text-gray-600">
                {selected.length} Namensschild{selected.length === 1 ? '' : 'er'}
              </span>
            </div>
          </div>
        </Card>
      </form>

      {selected.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Vorschau</h2>
          <div className="flex flex-wrap gap-4">
            {selected.map((exhibitor) => (
              // Pin the cell to the card's width: without it the caption, which can be
              // much wider than the card, stretches the flex item and skews the grid.
              <div
                key={exhibitor.id}
                className="space-y-1"
                style={{ width: `${NAME_TAG.width}mm` }}>
                <NameTagPreview exhibitor={exhibitor} exhibition={exhibition} />
                <p className="text-xs break-words text-gray-500">
                  {getDisplayName(exhibitor.user)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default NameTags
