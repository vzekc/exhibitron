import ExhibitList from '../components/ExhibitList.tsx'
import '../components/ExhibitList.css'
import { useExhibitionData } from '../contexts/ExhibitionDataContext.ts'

const Exhibits = () => {
  const { exhibitList } = useExhibitionData()

  if (exhibitList) {
    return (
      <article>
        <h2>Liste der Ausstellungen</h2>
        <ExhibitList exhibits={exhibitList} />
      </article>
    )
  }
}

export default Exhibits
