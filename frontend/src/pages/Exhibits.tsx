import { use } from 'react'
import exhibitListService from '../services/exhibitListService.ts'
import ExhibitList from '../components/ExhibitList.tsx'
import '../components/ExhibitList.css'

const dataPromise = exhibitListService.fetchExhibits()

const Exhibits = () => {
  const exhibits = use(dataPromise) // Suspense will handle loading state

  const sortedExhibits = exhibits.sort((a, b) => {
    const titleA = a.title?.toLowerCase() || ''
    const titleB = b.title?.toLowerCase() || ''
    return titleA.localeCompare(titleB)
  })

  return (
    <article>
      <h2>Liste der Ausstellungen</h2>
      <ExhibitList exhibits={sortedExhibits} />
    </article>
  )
}

export default Exhibits
