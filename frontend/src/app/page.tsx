'use client'

import React, { useEffect, useState } from 'react'
import * as backend from '../api/index'
import { client as backendClient } from '../api/client.gen'
import { GetExhibitResponse } from '@/api'

backendClient.setConfig({
  baseURL: '/api',
})

type Exhibit = NonNullable<GetExhibitResponse['items']>[number]

export default function Home() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([])

  useEffect(() => {
    async function fetchExhibits() {
      const response = await backend.getExhibit()
      setExhibits(response.data?.items || [])
    }

    fetchExhibits().catch((error) =>
      console.error('Error in useEffect:', error),
    )
  }, [])

  return (
    <div>
      <h1>Exhibits</h1>
      <ul>
        {exhibits.map((exhibit) => (
          <li key={exhibit.id}>
            {exhibit.title} ({exhibit.exhibitorName})
          </li>
        ))}
      </ul>
    </div>
  )
}
