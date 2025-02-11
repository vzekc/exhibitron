import { getExhibitions } from './apiClient.ts'
import { useEffect, useState } from 'react'
import { Exhibition } from '../../backend/src/routes/api.ts'
import { Link } from 'react-router-dom'

const renderTableNumbers = (numbers: number[]): string => {
  if (numbers.length === 0) return ''

  numbers.sort((a, b) => a - b)

  const result: string[] = []
  let start = numbers[0]
  let end = start

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === end + 1) {
      end = numbers[i]
    } else {
      result.push(start === end ? `${start}` : `${start}-${end}`)
      start = numbers[i]
      end = start
    }
  }

  result.push(start === end ? `${start}` : `${start}-${end}`)

  return result.join(', ')
}

const Exhibitions = () => {
  const [exhibitions, setExhibitions] = useState([] as Exhibition[])

  useEffect(() => {
    getExhibitions().then(e => setExhibitions(e))
  }, [])

  return <table>
    <thead>
    <tr>
      <td>Titel</td>
      <td>Aussteller</td>
      <td>Tisch(e)</td>
    </tr>
    </thead>
    <tbody>
    {
      exhibitions.map(({ id, username, title, table_numbers }) =>
        <tr>
          <td><Link to={`/exhibition/${id}`}>{title}</Link></td>
          <td>{username}</td>
          <td>{renderTableNumbers(table_numbers)}</td>
        </tr>
      )
    }
    </tbody>
  </table>
}

export default Exhibitions
