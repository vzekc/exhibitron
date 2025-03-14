import React from 'react'
import { useNavigate } from 'react-router-dom'
import './SeatingPlan.css'
import { graphql } from 'gql.tada'
import { useQuery } from '@apollo/client'

const table_coordinates = {
  tables: [
    { number: 1, topLeft: { x: 320, y: 9 }, bottomRight: { x: 345, y: 21 } },
    { number: 2, topLeft: { x: 355, y: 9 }, bottomRight: { x: 380, y: 21 } },
    { number: 3, topLeft: { x: 385, y: 9 }, bottomRight: { x: 415, y: 21 } },
    { number: 4, topLeft: { x: 420, y: 9 }, bottomRight: { x: 445, y: 21 } },
    { number: 5, topLeft: { x: 450, y: 9 }, bottomRight: { x: 480, y: 21 } },
    { number: 6, topLeft: { x: 485, y: 9 }, bottomRight: { x: 510, y: 21 } },
    { number: 7, topLeft: { x: 520, y: 9 }, bottomRight: { x: 545, y: 21 } },

    { number: 8, topLeft: { x: 190, y: 192 }, bottomRight: { x: 217, y: 205 } },
    { number: 9, topLeft: { x: 221, y: 192 }, bottomRight: { x: 252, y: 205 } },
    { number: 10, topLeft: { x: 254, y: 192 }, bottomRight: { x: 285, y: 205 } },
    { number: 11, topLeft: { x: 287, y: 192 }, bottomRight: { x: 319, y: 205 } },
    { number: 12, topLeft: { x: 321, y: 192 }, bottomRight: { x: 351, y: 205 } },
    { number: 13, topLeft: { x: 354, y: 192 }, bottomRight: { x: 385, y: 205 } },
    { number: 14, topLeft: { x: 387, y: 192 }, bottomRight: { x: 418, y: 205 } },
    { number: 15, topLeft: { x: 422, y: 192 }, bottomRight: { x: 452, y: 205 } },
    { number: 16, topLeft: { x: 454, y: 192 }, bottomRight: { x: 485, y: 205 } },
    { number: 17, topLeft: { x: 487, y: 192 }, bottomRight: { x: 518, y: 205 } },

    { number: 18, topLeft: { x: 190, y: 223 }, bottomRight: { x: 217, y: 237 } },
    { number: 19, topLeft: { x: 221, y: 223 }, bottomRight: { x: 252, y: 237 } },
    { number: 20, topLeft: { x: 254, y: 223 }, bottomRight: { x: 285, y: 237 } },
    { number: 21, topLeft: { x: 287, y: 223 }, bottomRight: { x: 319, y: 237 } },
    { number: 22, topLeft: { x: 321, y: 223 }, bottomRight: { x: 351, y: 237 } },
    { number: 23, topLeft: { x: 354, y: 223 }, bottomRight: { x: 385, y: 237 } },
    { number: 24, topLeft: { x: 387, y: 223 }, bottomRight: { x: 418, y: 237 } },
    { number: 25, topLeft: { x: 422, y: 223 }, bottomRight: { x: 452, y: 237 } },
    { number: 26, topLeft: { x: 454, y: 223 }, bottomRight: { x: 485, y: 237 } },
    { number: 27, topLeft: { x: 487, y: 223 }, bottomRight: { x: 518, y: 237 } },

    { number: 28, topLeft: { x: 191, y: 396 }, bottomRight: { x: 222, y: 410 } },
    { number: 29, topLeft: { x: 224, y: 396 }, bottomRight: { x: 255, y: 410 } },
    { number: 30, topLeft: { x: 257, y: 396 }, bottomRight: { x: 287, y: 410 } },
    { number: 31, topLeft: { x: 290, y: 396 }, bottomRight: { x: 322, y: 410 } },
    { number: 32, topLeft: { x: 325, y: 396 }, bottomRight: { x: 355, y: 410 } },
    { number: 33, topLeft: { x: 358, y: 396 }, bottomRight: { x: 388, y: 410 } },
    { number: 34, topLeft: { x: 390, y: 396 }, bottomRight: { x: 422, y: 410 } },
    { number: 35, topLeft: { x: 424, y: 396 }, bottomRight: { x: 455, y: 410 } },
    { number: 36, topLeft: { x: 457, y: 396 }, bottomRight: { x: 488, y: 410 } },
    { number: 37, topLeft: { x: 490, y: 396 }, bottomRight: { x: 521, y: 410 } },
    { number: 38, topLeft: { x: 523, y: 396 }, bottomRight: { x: 555, y: 410 } },
    { number: 39, topLeft: { x: 557, y: 396 }, bottomRight: { x: 588, y: 410 } },

    { number: 40, topLeft: { x: 191, y: 428 }, bottomRight: { x: 222, y: 442 } },
    { number: 41, topLeft: { x: 224, y: 428 }, bottomRight: { x: 255, y: 442 } },
    { number: 42, topLeft: { x: 257, y: 428 }, bottomRight: { x: 287, y: 442 } },
    { number: 43, topLeft: { x: 290, y: 428 }, bottomRight: { x: 322, y: 442 } },
    { number: 44, topLeft: { x: 325, y: 428 }, bottomRight: { x: 355, y: 442 } },
    { number: 45, topLeft: { x: 358, y: 428 }, bottomRight: { x: 388, y: 442 } },
    { number: 46, topLeft: { x: 390, y: 428 }, bottomRight: { x: 422, y: 442 } },
    { number: 47, topLeft: { x: 424, y: 428 }, bottomRight: { x: 455, y: 442 } },
    { number: 48, topLeft: { x: 457, y: 428 }, bottomRight: { x: 488, y: 442 } },
    { number: 49, topLeft: { x: 490, y: 428 }, bottomRight: { x: 521, y: 442 } },
    { number: 50, topLeft: { x: 523, y: 428 }, bottomRight: { x: 555, y: 442 } },
    { number: 51, topLeft: { x: 557, y: 428 }, bottomRight: { x: 588, y: 442 } },

    { number: 52, topLeft: { x: 191, y: 644 }, bottomRight: { x: 222, y: 658 } },
    { number: 53, topLeft: { x: 224, y: 644 }, bottomRight: { x: 255, y: 658 } },
    { number: 54, topLeft: { x: 257, y: 644 }, bottomRight: { x: 287, y: 658 } },
    { number: 55, topLeft: { x: 290, y: 644 }, bottomRight: { x: 322, y: 658 } },
    { number: 56, topLeft: { x: 325, y: 644 }, bottomRight: { x: 355, y: 658 } },
    { number: 57, topLeft: { x: 358, y: 644 }, bottomRight: { x: 388, y: 658 } },
    { number: 58, topLeft: { x: 390, y: 644 }, bottomRight: { x: 422, y: 658 } },
    { number: 59, topLeft: { x: 424, y: 644 }, bottomRight: { x: 455, y: 658 } },
    { number: 60, topLeft: { x: 457, y: 644 }, bottomRight: { x: 488, y: 658 } },
    { number: 61, topLeft: { x: 490, y: 644 }, bottomRight: { x: 521, y: 658 } },
    { number: 62, topLeft: { x: 523, y: 644 }, bottomRight: { x: 555, y: 658 } },
    { number: 63, topLeft: { x: 557, y: 644 }, bottomRight: { x: 588, y: 658 } },

    { number: 64, topLeft: { x: 191, y: 676 }, bottomRight: { x: 222, y: 691 } },
    { number: 65, topLeft: { x: 224, y: 676 }, bottomRight: { x: 255, y: 691 } },
    { number: 66, topLeft: { x: 257, y: 676 }, bottomRight: { x: 287, y: 691 } },
    { number: 67, topLeft: { x: 290, y: 676 }, bottomRight: { x: 322, y: 691 } },
    { number: 68, topLeft: { x: 325, y: 676 }, bottomRight: { x: 355, y: 691 } },
    { number: 69, topLeft: { x: 358, y: 676 }, bottomRight: { x: 388, y: 691 } },
    { number: 70, topLeft: { x: 390, y: 676 }, bottomRight: { x: 422, y: 691 } },
    { number: 71, topLeft: { x: 424, y: 676 }, bottomRight: { x: 455, y: 691 } },
    { number: 72, topLeft: { x: 457, y: 676 }, bottomRight: { x: 488, y: 691 } },
    { number: 73, topLeft: { x: 490, y: 676 }, bottomRight: { x: 521, y: 691 } },
    { number: 74, topLeft: { x: 523, y: 676 }, bottomRight: { x: 555, y: 691 } },
    { number: 75, topLeft: { x: 557, y: 676 }, bottomRight: { x: 588, y: 691 } },

    { number: 76, topLeft: { x: 290, y: 817 }, bottomRight: { x: 320, y: 831 } },
    { number: 77, topLeft: { x: 322, y: 817 }, bottomRight: { x: 353, y: 831 } },
    { number: 78, topLeft: { x: 356, y: 817 }, bottomRight: { x: 387, y: 831 } },
    { number: 79, topLeft: { x: 390, y: 817 }, bottomRight: { x: 421, y: 831 } },
    { number: 80, topLeft: { x: 424, y: 817 }, bottomRight: { x: 454, y: 831 } },
    { number: 81, topLeft: { x: 457, y: 817 }, bottomRight: { x: 487, y: 831 } },
    { number: 82, topLeft: { x: 490, y: 817 }, bottomRight: { x: 520, y: 831 } },
    { number: 83, topLeft: { x: 523, y: 817 }, bottomRight: { x: 553, y: 831 } },
    { number: 84, topLeft: { x: 555, y: 817 }, bottomRight: { x: 587, y: 831 } },
    { number: 85, topLeft: { x: 590, y: 817 }, bottomRight: { x: 620, y: 831 } },
    { number: 86, topLeft: { x: 622, y: 817 }, bottomRight: { x: 653, y: 831 } },
    { number: 87, topLeft: { x: 656, y: 817 }, bottomRight: { x: 687, y: 831 } },

    { number: 88, topLeft: { x: 720, y: 120 }, bottomRight: { x: 733, y: 150 } },
    { number: 89, topLeft: { x: 720, y: 153 }, bottomRight: { x: 733, y: 184 } },
    { number: 90, topLeft: { x: 720, y: 187 }, bottomRight: { x: 733, y: 217 } },
    { number: 91, topLeft: { x: 720, y: 220 }, bottomRight: { x: 733, y: 250 } },
    { number: 92, topLeft: { x: 720, y: 252 }, bottomRight: { x: 733, y: 283 } },

    { number: 93, topLeft: { x: 720, y: 298 }, bottomRight: { x: 733, y: 329 } },
    { number: 94, topLeft: { x: 720, y: 331 }, bottomRight: { x: 733, y: 362 } },
    { number: 95, topLeft: { x: 720, y: 364 }, bottomRight: { x: 733, y: 395 } },
    { number: 96, topLeft: { x: 720, y: 397 }, bottomRight: { x: 733, y: 428 } },
    { number: 97, topLeft: { x: 720, y: 431 }, bottomRight: { x: 733, y: 462 } },

    { number: 98, topLeft: { x: 720, y: 474 }, bottomRight: { x: 733, y: 505 } },
    { number: 99, topLeft: { x: 720, y: 507 }, bottomRight: { x: 733, y: 538 } },
    { number: 100, topLeft: { x: 720, y: 540 }, bottomRight: { x: 733, y: 572 } },
    { number: 101, topLeft: { x: 720, y: 574 }, bottomRight: { x: 733, y: 605 } },
    { number: 102, topLeft: { x: 720, y: 607 }, bottomRight: { x: 733, y: 638 } },

    { number: 103, topLeft: { x: 720, y: 650 }, bottomRight: { x: 733, y: 682 } },
    { number: 104, topLeft: { x: 720, y: 684 }, bottomRight: { x: 733, y: 715 } },
    { number: 105, topLeft: { x: 720, y: 717 }, bottomRight: { x: 733, y: 748 } },
    { number: 106, topLeft: { x: 720, y: 750 }, bottomRight: { x: 733, y: 781 } },
    { number: 107, topLeft: { x: 720, y: 783 }, bottomRight: { x: 733, y: 815 } },
  ],
}

interface TableArea {
  number: number
  coords: number[]
}

const tables: TableArea[] = table_coordinates.tables.map((table) => ({
  number: table.number,
  coords: [table.topLeft.x, table.topLeft.y, table.bottomRight.x, table.bottomRight.y],
}))

const GET_TABLES = graphql(`
  query GetTables {
    getCurrentExhibition {
      tables {
        id
        number
        exhibitor {
          id
          user {
            id
            fullName
          }
          exhibits {
            id
            title
          }
        }
      }
    }
  }
`)

export const SeatingPlan: React.FC = () => {
  const navigate = useNavigate()
  const [scale, setScale] = React.useState(1)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const { data } = useQuery(GET_TABLES)

  React.useEffect(() => {
    const updateScale = () => {
      if (imageRef.current) {
        const naturalWidth = imageRef.current.naturalWidth
        const displayWidth = imageRef.current.clientWidth
        setScale(displayWidth / naturalWidth)
      }
    }

    const image = imageRef.current
    if (image) {
      if (image.complete) {
        updateScale()
      } else {
        image.addEventListener('load', updateScale)
      }
    }

    window.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      if (image) {
        image.removeEventListener('load', updateScale)
      }
    }
  }, [])

  const handleTableClick = (tableId: number) => {
    navigate(`/table/${tableId}`)
  }

  const getScaledCoords = (coords: number[]): number[] => {
    return coords.map((coord) => Math.round(coord * scale))
  }

  if (!data) {
    return <div>Loading...</div>
  }

  const { tables: fetchedTables } = data.getCurrentExhibition!
  const occupiedTablesMap = new Map(
    fetchedTables
      ?.filter((table) => table.exhibitor)
      .map((table) => [
        table.number,
        {
          exhibitorName: table.exhibitor?.user.fullName ?? 'Unknown',
          exhibits: table.exhibitor?.exhibits?.map((exhibit) => exhibit.title) ?? [],
        },
      ]),
  )

  return (
    <div className="seating-plan">
      <div className="seating-plan-container">
        <img ref={imageRef} src="cc2025-tischplan.png" alt="Exhibition Floor Plan" />
        <div className="table-overlays">
          {tables.map((table) => {
            const scaledCoords = getScaledCoords(table.coords)
            const isRotated = table.number > 87

            // Calculate dimensions
            const width = scaledCoords[2] - scaledCoords[0]
            const height = scaledCoords[3] - scaledCoords[1]

            // For rotated tables, we need to adjust the position to account for the rotation
            let left = scaledCoords[0]
            let top = scaledCoords[1]

            if (isRotated) {
              // Adjust position to maintain the same visual center after rotation
              left = left + (width - height) / 2
              top = top + (height - width) / 2
            }

            const tableInfo = occupiedTablesMap.get(table.number)
            const tooltip = tableInfo
              ? `${tableInfo.exhibitorName} (${tableInfo.exhibits.join(', ')})`
              : 'Nicht belegt'

            return (
              <div
                key={table.number}
                className={`table-number ${isRotated ? 'table-rotated' : ''} ${tableInfo ? 'occupied' : ''}`}
                style={{
                  left: left + 'px',
                  top: top + 'px',
                  width: isRotated ? height : width + 'px',
                  height: isRotated ? width : height + 'px',
                }}
                onClick={() => handleTableClick(table.number)}
                title={tooltip}>
                {table.number}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SeatingPlan
