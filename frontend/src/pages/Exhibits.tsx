import ExhibitList from '../components/ExhibitList.tsx'
import '../components/ExhibitList.css'
import { useExhibitionData } from '../contexts/ExhibitionDataContext.ts'

const Exhibits = () => {
  const { exhibitionData } = useExhibitionData()

  if (exhibitionData) {
    return (
      <article>
        <h2>Liste der Ausstellungen</h2>
        <ExhibitList exhibits={
          exhibitionData.exhibits.map(data => ({
            ...data,
            exhibitorName: 'foo',
            table: data.table?.number})
          )}
        />
      </article>
    )
  }
}

export default Exhibits
