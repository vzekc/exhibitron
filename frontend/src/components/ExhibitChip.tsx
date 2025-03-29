import Card from '@components/Card.tsx'
import { FragmentOf, graphql } from 'gql.tada'

const EXHIBIT_FRAGMENT = graphql(`
  fragment ExhibitCard on Exhibit @_unmask {
    id
    title
    mainImage
    table {
      id
      number
    }
    exhibitor {
      id
      user {
        id
        nickname
        fullName
      }
    }
  }
`)

type ExhibitCardProps = {
  exhibit: FragmentOf<typeof EXHIBIT_FRAGMENT>
  noTable?: boolean
  noExhibitor?: boolean
  url?: string
}

const ExhibitChip = ({ exhibit, noTable, noExhibitor, url = '/exhibit' }: ExhibitCardProps) => {
  const user = exhibit.exhibitor.user

  return (
    <Card to={`${url}/${exhibit.id}`} className="w-80">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {exhibit.mainImage ? (
            <img
              src={`/api/exhibit/${exhibit.id}/image/thumbnail`}
              alt={exhibit.title}
              className="h-[100px] w-[100px] rounded-md object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-[100px] w-[100px] rounded-md bg-gray-100" />
          )}
        </div>
        <div className="flex flex-grow flex-col">
          <div className="font-medium">{exhibit.title}</div>
          <div className="mt-auto flex justify-between text-sm text-gray-600">
            {!noExhibitor && <div>{user.nickname || user.fullName}</div>}
            {exhibit.table && !noTable && <div>Tisch {exhibit.table.number}</div>}
          </div>
        </div>
      </div>
    </Card>
  )
}

ExhibitChip.fragment = EXHIBIT_FRAGMENT

export default ExhibitChip
