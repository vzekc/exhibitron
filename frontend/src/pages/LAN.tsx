import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { graphql, ResultOf } from 'gql.tada'
import { useNavigate, Link } from 'react-router-dom'
import PageHeading from '@components/PageHeading.tsx'
import { DataTable, TableRow, TableCell } from '@components/Table.tsx'
import Card from '@components/Card.tsx'
import LoadInProgress from '@components/LoadInProgress'
import ChipContainer from '@components/ChipContainer.tsx'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const GET_HOSTS = graphql(`
  query GetHosts {
    getCurrentExhibition {
      id
      dnsZone
      isClientInLan
      hosts {
        id
        name
        ipAddress
        exhibitor {
          id
          user {
            id
            fullName
            nickname
          }
        }
        exhibit {
          id
          title
        }
        services
      }
    }
  }
`)

type Host = NonNullable<
  NonNullable<ResultOf<typeof GET_HOSTS>['getCurrentExhibition']>['hosts']
>[number]

const tableColumns = ['name', 'ipAddress', 'exhibitor', 'exhibit', 'services'] as const
type TableColumn = (typeof tableColumns)[number]

const getColumnHeader = (column: TableColumn) => {
  switch (column) {
    case 'name':
      return 'Name'
    case 'ipAddress':
      return 'IP-Adresse'
    case 'exhibitor':
      return 'Aussteller'
    case 'exhibit':
      return 'Exponat'
    case 'services':
      return 'Dienste'
    default:
      return column
  }
}

const ServiceChip = ({ service }: { service: string }) => {
  return (
    <span className="text-xs inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-800">
      {service}
    </span>
  )
}

const LAN = () => {
  const { data } = useQuery(GET_HOSTS)
  const [sortedHosts, setSortedHosts] = useState<Host[] | null>(null)
  const navigate = useNavigate()
  const { exhibitor } = useExhibitor()

  const handleSort = (sorter: (data: Host[]) => Host[]) => {
    if (data?.getCurrentExhibition?.hosts) {
      setSortedHosts(sorter(data.getCurrentExhibition.hosts))
    }
  }

  if (!data?.getCurrentExhibition?.hosts) {
    return <LoadInProgress />
  }

  const tableHeaders = tableColumns.map((column) => ({
    key: column,
    content: getColumnHeader(column),
    sortable: true,
    sortKey: column,
  }))

  const getBrowserProtocol = (services: string[] | null | undefined) => {
    if (!services) return null
    return services.some((service) => service.toLowerCase() === 'https')
      ? 'https'
      : services.some((service) => service.toLowerCase() === 'http')
        ? 'http'
        : null
  }

  return (
    <Card>
      <header className="mb-3">
        <PageHeading>LAN-Übersicht</PageHeading>
        <p className="mt-2 text-base text-gray-700">
          Hier findest Du eine Übersicht aller Hostnamen, die im Konferenz-LAN registriert wurden.
        </p>
        {exhibitor && (
          <p className="mt-2 text-base text-gray-700">
            Wenn Du selbst einen Hostnamen für Dein Exponat benötigst, kannst Du diesen im
            Exponat-Editor anlegen und dort auch auswählen, welche Dienste Du für Deinen Host
            registrieren möchtest. Die Dienste werden dann automatisch in die Übersicht übernommen.
            Wenn "http" oder "https" ausgewählt ist, wird der Hostname als Link angezeigt und
            Besucher im Konferenz-LAN können direkt darauf zugreifen.
          </p>
        )}
      </header>

      <DataTable
        headers={tableHeaders}
        onSort={handleSort}
        defaultSortKey="name"
        defaultSortDirection="asc">
        {sortedHosts?.map((host: Host, index: number) => (
          <TableRow
            key={host.id}
            onClick={() => host.exhibit && navigate('/exhibit/' + host.exhibit.id)}
            index={index}>
            {tableColumns.map((column) => (
              <TableCell key={column}>
                {column === 'services' ? (
                  <ChipContainer>
                    {host.services?.map((service: string, idx: number) => (
                      <ServiceChip key={idx} service={service} />
                    ))}
                  </ChipContainer>
                ) : column === 'exhibitor' ? (
                  host.exhibitor && (
                    <Link
                      to={`/exhibitor/${host.exhibitor.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800">
                      {host.exhibitor.user.nickname || host.exhibitor.user.fullName}
                    </Link>
                  )
                ) : column === 'exhibit' ? (
                  host.exhibit && (
                    <Link
                      to={`/exhibit/${host.exhibit.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800">
                      {host.exhibit.title}
                    </Link>
                  )
                ) : column === 'name' ? (
                  (() => {
                    const protocol = getBrowserProtocol(host.services)
                    if (
                      data.getCurrentExhibition?.isClientInLan &&
                      protocol &&
                      data.getCurrentExhibition?.dnsZone
                    ) {
                      return (
                        <a
                          href={`${protocol}://${host.name}.${data.getCurrentExhibition.dnsZone}`}
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800">
                          {host.name}
                        </a>
                      )
                    }
                    return host.name
                  })()
                ) : (
                  host[column]
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </DataTable>
    </Card>
  )
}

export default LAN
