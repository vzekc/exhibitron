import { graphql } from 'gql.tada'
import { useMutation, useQuery } from '@apollo/client'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeading from '@components/PageHeading.tsx'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import LoadInProgress from '@components/LoadInProgress'
import RandomComputer from '@components/RandomComputer.tsx'

const GET_MY_EXHIBITS_FROM_OTHER_EXHIBITIONS = graphql(`
  query GetMyExhibitsFromOtherExhibitions {
    getMyExhibitsFromOtherExhibitions {
      id
      title
      touchMe
      description
      mainImage
      exhibitionTitle
      exhibitionKey
    }
  }
`)

const COPY_EXHIBITS = graphql(`
  mutation CopyExhibitsToCurrentExhibition($exhibitIds: [Int!]!) {
    copyExhibitsToCurrentExhibition(exhibitIds: $exhibitIds) {
      id
      title
    }
  }
`)

const ImportExhibits = () => {
  const navigate = useNavigate()
  const { data, loading } = useQuery(GET_MY_EXHIBITS_FROM_OTHER_EXHIBITIONS)
  const [copyExhibits, { loading: copying }] = useMutation(COPY_EXHIBITS)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (data?.getMyExhibitsFromOtherExhibitions) {
      setSelectedIds(new Set(data.getMyExhibitsFromOtherExhibitions.map((e) => e.id)))
    }
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) return

    try {
      await copyExhibits({
        variables: { exhibitIds: Array.from(selectedIds) },
        refetchQueries: ['GetMyExhibits'],
      })
      navigate('/user/exhibit')
    } catch (error) {
      console.error('Failed to import exhibits:', error)
    }
  }

  if (loading) {
    return <LoadInProgress />
  }

  const exhibits = data?.getMyExhibitsFromOtherExhibitions ?? []

  // Group exhibits by exhibition
  const exhibitsByExhibition = exhibits.reduce(
    (acc, exhibit) => {
      const key = exhibit.exhibitionKey
      if (!acc[key]) {
        acc[key] = {
          title: exhibit.exhibitionTitle,
          exhibits: [],
        }
      }
      acc[key].exhibits.push(exhibit)
      return acc
    },
    {} as Record<string, { title: string; exhibits: typeof exhibits }>,
  )

  return (
    <article className="space-y-6">
      <header>
        <PageHeading>Exponate importieren</PageHeading>
        <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
          Hier kannst Du Exponate aus früheren Ausstellungen in die aktuelle Ausstellung übernehmen.
          Die Exponate werden kopiert, so dass Du sie unabhängig bearbeiten kannst.
        </p>
      </header>

      {exhibits.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-600 dark:text-gray-400">
            Du hast keine Exponate aus früheren Ausstellungen, die importiert werden könnten.
          </p>
          <Link to="/user/exhibit" className="mt-4 inline-block text-blue-600 hover:underline">
            Zurück zu Deinen Exponaten
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-4">
            <Button onClick={handleSelectAll} disabled={copying}>
              Alle auswählen
            </Button>
            <Button onClick={handleDeselectAll} disabled={copying}>
              Alle abwählen
            </Button>
          </div>

          {Object.entries(exhibitsByExhibition).map(([key, { title, exhibits: groupExhibits }]) => (
            <section key={key} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupExhibits.map((exhibit) => (
                  <label
                    key={exhibit.id}
                    className={`flex cursor-pointer gap-4 rounded-lg border p-4 transition-colors ${
                      selectedIds.has(exhibit.id)
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                    }`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(exhibit.id)}
                      onChange={() => handleToggle(exhibit.id)}
                      disabled={copying}
                      className="mt-1 h-5 w-5 rounded border-gray-300"
                    />
                    <div className="flex flex-1 gap-3">
                      {exhibit.mainImage ? (
                        <img
                          src={`/api/exhibit/${exhibit.id}/image/thumbnail`}
                          alt={exhibit.title}
                          className="h-16 w-16 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-100 dark:bg-gray-700">
                          <RandomComputer className="h-8 w-8" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {exhibit.title}
                        </div>
                        {exhibit.touchMe && (
                          <span className="text-sm text-green-600 dark:text-green-400">
                            Anfassen erlaubt
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          ))}

          <ActionBar>
            <Link to="/user/exhibit">
              <Button disabled={copying}>Abbrechen</Button>
            </Link>
            <Button onClick={handleImport} disabled={selectedIds.size === 0 || copying}>
              {copying
                ? 'Importiere...'
                : `${selectedIds.size} Exponat${selectedIds.size !== 1 ? 'e' : ''} importieren`}
            </Button>
          </ActionBar>
        </>
      )}
    </article>
  )
}

export default ImportExhibits
