import { getExhibitionById } from './apiClient.ts'
import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { type Exhibition } from '../../backend/src/routes/api.ts'

const Exhibition = () => {
  const [exhibition, setExhibition] = useState<Exhibition>()
  const { id } = useParams()

  useEffect(() => {
    if (id) {
      getExhibitionById(id).then(e => setExhibition(e))
    }
  }, [])

  if (exhibition) {
    const { title, username, description } = exhibition
    return <div>
      <h1>{title}</h1>
      <h2>{username}</h2>
      <p>{description}</p>
    </div>
  } else {
    return <div>loading</div>
  }
}

export default Exhibition
