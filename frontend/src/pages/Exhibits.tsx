import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import ExhibitList from '../components/ExhibitList.tsx'
import { useEffect, useState } from 'react'
import { type ExhibitListItem } from '../types.ts'
import '../components/ExhibitList.css'

backendClient.setConfig({
  baseURL: '/api',
})

const Exhibits = () => {
  const [exhibits, setExhibits] = useState<ExhibitListItem[]>([])

  useEffect(() => {
    const load = async () => {
      const res = await backend.getExhibit()
      setExhibits(res.data?.items || [])
    }
    void load()
  }, [])

  return (
    <article>
      <h2>Liste der Ausstellungen</h2>
      <ExhibitList exhibits={exhibits} />
    </article>
  )
}

export default Exhibits
