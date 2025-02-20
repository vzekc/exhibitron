import { useParams } from 'react-router-dom'
import { use } from 'react'
import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import './ExhibitList.css'
import Cached from './Cached.ts'

backendClient.setConfig({
  baseURL: '/api',
})

const fetchExhibit = new Cached((id: number) =>
  backend.getExhibitById({ path: { id } }),
)

const Exhibit = () => {
  const { id } = useParams<{ id: string }>()
  const response = use(fetchExhibit.get(Number(id)))
  const exhibit = response.data

  if (!exhibit) {
    return <p>Ausstellung nicht gefunden ({response.status})</p>
  }

  return (
    <article>
      <h2>{exhibit.title}</h2>
      <p>Aussteller: {exhibit.exhibitor.fullName}</p>
      {exhibit.table ? <p>Tisch: {exhibit.table || 'N/A'}</p> : <div></div>}
      {exhibit.text ? <p>Beschreibung: {exhibit.text}</p> : <div></div>}
    </article>
  )
}

export default Exhibit
