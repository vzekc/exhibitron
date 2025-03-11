import ExhibitList from '../../components/ExhibitList.tsx'
import '../../components/ExhibitList.css'
import { useExhibitionData } from '../../contexts/ExhibitionDataContext.ts'
import { useUser } from '../../contexts/UserContext.ts'

const UserExhibits = () => {
  const { user } = useUser()
  const { exhibitionData } = useExhibitionData()

  if (exhibitionData && user) {
    return (
      <article>
        <h2>Liste der Ausstellungen</h2>
        <ExhibitList
          exhibits={exhibitionData.exhibits.filter(
            (exhibit) => exhibit.exhibitor.user.id === user.id,
          )}
        />
      </article>
    )
  }
}

export default UserExhibits
