import { use } from 'react'
import axios from 'axios'

// Fetch function wrapped in a Promise for Suspense
const fetchData = async () => {
  const res = await axios.get('/api/exhibit')
  return res.data.items
}
const dataPromise = fetchData()

const ExhibitList = () => {
  const exhibits = use(dataPromise) // Suspense will handle loading state
  return (
    <article>
      <h2>Exhibit List</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Exhibitor Name</th>
          </tr>
        </thead>
        <tbody>
          {exhibits.map(
            (
              exhibit: { title: string; exhibitorName: string },
              index: number,
            ) => (
              <tr key={index}>
                <td>{exhibit.title}</td>
                <td>{exhibit.exhibitorName}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </article>
  )
}

export default ExhibitList
