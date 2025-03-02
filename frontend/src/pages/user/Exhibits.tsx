import ExhibitList from '../../components/ExhibitList.tsx'
import '../../components/ExhibitList.css'
import { useExhibitionData } from '../../contexts/ExhibitionDataContext.ts'
import { useUser } from '../../contexts/UserContext.ts'

const UserExhibits = () => {
  const { user } = useUser()
  const { exhibitList } = useExhibitionData()

  if (exhibitList && user) {
    return (
      <article>
        <h2>Liste der Ausstellungen</h2>
        <ExhibitList
          exhibits={exhibitList.filter(
            (exhibit) => exhibit.exhibitorId === user.id,
          )}
        />
      </article>
    )
  }
}

export default UserExhibits
