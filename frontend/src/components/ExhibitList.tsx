import { use } from 'react'
import exhibitListService from '../services/exhibitListService'
import ExhibitTable from './ExhibitTable'
import './ExhibitList.css'

const dataPromise = exhibitListService.fetchExhibits()

const ExhibitList = () => {
  const exhibits = use(dataPromise) // Suspense will handle loading state

  return (
    <article>
      <h2>Liste der Ausstellungen</h2>
      <ExhibitTable exhibits={exhibits} />
    </article>
  )
}

export default ExhibitList
