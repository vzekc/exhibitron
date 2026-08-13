import { useNavigate, useParams } from 'react-router-dom'
import React, { useEffect, useState } from 'react'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import { FragmentOf, graphql } from 'gql.tada'
import { useApolloClient, useMutation, useQuery } from '@apollo/client'
import ExhibitorCard from '@components/ExhibitorCard.tsx'
import ExhibitCard from '@components/ExhibitCard.tsx'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import ExhibitChip from '@components/ExhibitChip.tsx'
import ChipContainer from '@components/ChipContainer.tsx'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import Confirm from '@components/Confirm.tsx'
import { getDisplayName } from '@utils/displayName'
import { showMessage } from '@components/MessageModalUtil.tsx'

const GET_TABLE = graphql(
  `
    query GetTable($number: Int!) {
      getTable(number: $number) {
        id
        showsVisitorPhotos
        exhibitor {
          id
          ...ExhibitorDetails
          exhibits {
            ...ExhibitCard
          }
        }
        exhibits {
          ...ExhibitCard
        }
      }
    }
  `,
  [ExhibitChip.fragment, ExhibitorCard.fragment],
)

const CLAIM_TABLE = graphql(`
  mutation ClaimTable($number: Int!) {
    claimTable(number: $number) {
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

const RELEASE_TABLE = graphql(`
  mutation ReleaseTable($number: Int!) {
    releaseTable(number: $number) {
      id
    }
  }
`)

type ExhibitCardItem = FragmentOf<typeof ExhibitChip.fragment>

const Table = () => {
  const { number } = useParams<{ number: string }>()
  const { data } = useQuery(GET_TABLE, { variables: { number: +number! } })
  const apolloClient = useApolloClient()
  const [claimTable] = useMutation(CLAIM_TABLE)
  const [releaseTable] = useMutation(RELEASE_TABLE)
  const [updateTable] = useMutation(UPDATE_TABLE)
  const navigate = useNavigate()
  const { exhibitor: currentUser } = useExhibitor()
  const { setDetailName } = useBreadcrumb()
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)

  useEffect(() => {
    setDetailName(location.pathname, 'Tisch ' + number)
  }, [number, setDetailName])

  if (!data) return null

  const handleClaimTable = async (tableId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const result = await claimTable({ variables: { number: tableId } })
    if (result.errors?.length) {
      await showMessage(
        'Tisch konnte nicht reserviert werden',
        result.errors[0]?.message || 'Unbekannter Fehler',
        'OK',
      )
      return
    }
    await apolloClient.resetStore()
    navigate(`/table/${tableId}`)
  }

  const handleReleaseTable = async (tableId: number) => {
    setShowReleaseConfirm(false)
    const result = await releaseTable({ variables: { number: tableId } })
    if (result.errors?.length) {
      await showMessage(
        'Tisch konnte nicht freigegeben werden',
        result.errors[0]?.message || 'Unbekannter Fehler',
        'OK',
      )
      return
    }
    await apolloClient.resetStore()
    navigate(`/table/${tableId}`)
  }

  const tableNumber = Number(number)
  const { exhibits: onThisTableExhibits, exhibitor, showsVisitorPhotos } = data?.getTable || {}

  const handleVisitorPhotos = async (shows: boolean) => {
    const result = await updateTable({
      variables: { number: tableNumber, showsVisitorPhotos: shows },
      refetchQueries: [GET_TABLE],
    })
    if (result.errors?.length) {
      await showMessage(
        'Konnte nicht gespeichert werden',
        result.errors[0]?.message || 'Unbekannter Fehler',
        'OK',
      )
    }
  }
  const { exhibits: exhibitorExhibits } = exhibitor || {}
  const otherExhibitorExhibits = exhibitorExhibits?.filter(
    (exhibit) => exhibit.table?.number !== tableNumber,
  )
  const noTableExhibits = exhibitorExhibits?.filter((exhibit) => !exhibit.table)
  const onAnyTableExhibits = exhibitorExhibits?.filter((exhibit) => exhibit.table)

  const OneOrMoreExhibits = ({ exhibits }: { exhibits: ExhibitCardItem[] | undefined }) => {
    switch (exhibits?.length) {
      case undefined:
      case 0:
        return <></>
      case 1:
        return <ExhibitCard {...exhibits[0]} />
      default:
        return (
          <ChipContainer>
            {exhibits?.map((exhibit) => (
              <ExhibitChip exhibit={exhibit} key={exhibit.id} noExhibitor noTable />
            ))}
          </ChipContainer>
        )
    }
  }

  const OtherExhibits = ({
    exhibits,
    title,
  }: {
    exhibits: ExhibitCardItem[] | undefined
    title: string
  }) => {
    switch (exhibits?.length) {
      case undefined:
      case 0:
        return <></>
      default:
        return (
          <section className="mb-3 mt-6">
            <h3 className="mb-3 text-xl">{title}</h3>
            <ChipContainer>
              {exhibits?.map((exhibit, index: number) => (
                <ExhibitChip key={index} exhibit={exhibit} noExhibitor />
              ))}
            </ChipContainer>
          </section>
        )
    }
  }

  /*
   * Whoever holds the table says whether a machine on it can show a visitor's
   * photo from the photo booth. Participating tables carry an F on the floor
   * plan and are printed on the slips visitors take away with them.
   */
  const VisitorPhotos = () => {
    if (!currentUser || !exhibitor) return <></>
    if (currentUser.id !== exhibitor.id && !currentUser.user.isAdministrator) return <></>

    return (
      <section className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300"
            defaultChecked={!!showsVisitorPhotos}
            onChange={(e) => handleVisitorPhotos(e.target.checked)}
          />
          <span>An diesem Tisch können Besucherfotos gezeigt werden</span>
        </label>
        <p className="m-0 ml-6 mt-1 text-sm text-gray-500">
          Der Tisch wird dann auf dem Tischplan mit einem F markiert und steht auf den Laufzetteln,
          die Besucher am Fotoautomaten bekommen.
        </p>
      </section>
    )
  }

  /*
   * Giving the table up lives here rather than on the floor-plan panel, so that
   * it stands apart from the photo-booth checkbox and the confirmation can say
   * what it costs.
   *
   * Called as a function so that the confirmation keeps its place in the tree
   * across renders: the <dialog> behind it has to be shown again when it
   * remounts.
   */
  const Actions = () => {
    if (!currentUser) {
      return <></>
    } else if (!exhibitor) {
      return (
        <ActionBar>
          <Button onClick={handleClaimTable.bind(null, tableNumber)}>
            Tisch {tableNumber} belegen
          </Button>
        </ActionBar>
      )
    } else if (currentUser.id === exhibitor.id || currentUser.user.isAdministrator) {
      return (
        <>
          <ActionBar>
            <Button variant="danger" onClick={() => setShowReleaseConfirm(true)}>
              Tisch {tableNumber} freigeben
            </Button>
          </ActionBar>
          <Confirm
            isOpen={showReleaseConfirm}
            title={`Tisch ${tableNumber} freigeben`}
            message={
              `Der Tisch ${tableNumber} wird danach als frei angezeigt und kann von anderen ` +
              'Ausstellern belegt werden. Exponate, die auf diesem Tisch stehen, verlieren dabei ' +
              'ihre Tischzuordnung. Um den Tisch für das Fotoprojekt anzubieten, genügt das ' +
              'Häkchen bei „An diesem Tisch können Besucherfotos gezeigt werden“.'
            }
            confirm={`Tisch ${tableNumber} freigeben`}
            cancel="Abbrechen"
            onConfirm={() => void handleReleaseTable(tableNumber)}
            onClose={() => setShowReleaseConfirm(false)}
          />
        </>
      )
    } else {
      return <></>
    }
  }

  if (!exhibitor) {
    return (
      <article>
        <h2>Der Tisch {number} ist nicht belegt.</h2>
        {Actions()}
      </article>
    )
  }

  if (!onThisTableExhibits?.length && !onAnyTableExhibits?.length) {
    return (
      <article>
        <VisitorPhotos />
        <ExhibitorCard exhibitor={exhibitor} />
        <OtherExhibits
          exhibits={otherExhibitorExhibits}
          title={`Exponate von ${getDisplayName(exhibitor.user)}`}
        />
        {Actions()}
      </article>
    )
  }

  if (onThisTableExhibits?.length) {
    return (
      <article>
        <VisitorPhotos />
        <OneOrMoreExhibits exhibits={onThisTableExhibits} />
        <OtherExhibits
          exhibits={otherExhibitorExhibits}
          title={`Weitere Exponate von ${getDisplayName(exhibitor.user)}`}
        />
        {Actions()}
      </article>
    )
  }
  return (
    <article>
      <VisitorPhotos />
      <OneOrMoreExhibits exhibits={noTableExhibits} />
      <OtherExhibits
        exhibits={onAnyTableExhibits}
        title={`Exponate von ${getDisplayName(exhibitor.user)} auf anderen Tischen`}
      />
      {Actions()}
    </article>
  )
}

export default Table
