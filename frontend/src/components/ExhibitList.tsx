import { useNavigate } from 'react-router-dom'
import { use } from 'react'
import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import './ExhibitList.css'

backendClient.setConfig({
  baseURL: '/api',
})

// Fetch function wrapped in a Promise for Suspense
const fetchData = async () => {
  const res = await backend.getExhibit()
  return res.data?.items
}
const dataPromise = fetchData()

const ExhibitList = () => {
  const navigate = useNavigate()
  const exhibits = use(dataPromise) // Suspense will handle loading state

  const handleRowClick = (id: number) => {
    navigate(`/exhibit/${id}`)
  }

  return (
    <article>
      <h2>Liste der Ausstellungen</h2>
      <table>
        <thead>
          <tr>
            <th>Titel</th>
            <th>Aussteller</th>
            <th>Tisch</th>
          </tr>
        </thead>
        <tbody>
          {exhibits?.map((exhibit, index: number) => (
            <tr
              key={index}
              onClick={() => handleRowClick(exhibit.id)}
              className="clickable-row">
              <td>{exhibit.title}</td>
              <td>{exhibit.exhibitorName}</td>
              <td>{exhibit.table || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default ExhibitList
