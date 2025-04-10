import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { graphql, ResultOf } from 'gql.tada'
import { useNavigate } from 'react-router-dom'
import PageHeading from '@components/PageHeading.tsx'
import { DataTable, TableRow, TableCell } from '@components/Table.tsx'
import Card from '@components/Card.tsx'
import LoadInProgress from '@components/LoadInProgress'
import ChipContainer from '@components/ChipContainer.tsx'

const GET_HOSTS = graphql(`
  query GetHosts {
    getCurrentExhibition {
      id
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

  return (
    <Card>
      <header className="mb-3">
        <PageHeading>LAN-Übersicht</PageHeading>
        <p className="mt-2 text-base text-gray-700">
          Hier findest Du eine Übersicht aller angemeldeten Hosts im LAN. Du kannst sie sortieren
          und nach IP-Adressen filtern.
        </p>
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
                  host.exhibitor?.user.nickname || host.exhibitor?.user.fullName
                ) : column === 'exhibit' ? (
                  host.exhibit?.title
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
