import React from 'react'
import { useNavigate } from 'react-router-dom'
import './SeatingPlan.css'

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
    {
      number: 10,
      topLeft: { x: 254, y: 192 },
      bottomRight: { x: 285, y: 205 },
    },
    {
      number: 11,
      topLeft: { x: 287, y: 192 },
      bottomRight: { x: 319, y: 205 },
    },
    {
      number: 12,
      topLeft: { x: 321, y: 192 },
      bottomRight: { x: 351, y: 205 },
    },
    {
      number: 13,
      topLeft: { x: 354, y: 192 },
      bottomRight: { x: 385, y: 205 },
    },
    {
      number: 14,
      topLeft: { x: 387, y: 192 },
      bottomRight: { x: 418, y: 205 },
    },
    {
      number: 15,
      topLeft: { x: 422, y: 192 },
      bottomRight: { x: 452, y: 205 },
    },
    {
      number: 16,
      topLeft: { x: 454, y: 192 },
      bottomRight: { x: 485, y: 205 },
    },
    {
      number: 17,
      topLeft: { x: 487, y: 192 },
      bottomRight: { x: 518, y: 205 },
    },
    {
      number: 18,
      topLeft: { x: 202, y: 233 },
      bottomRight: { x: 217, y: 248 },
    },
    {
      number: 19,
      topLeft: { x: 237, y: 233 },
      bottomRight: { x: 252, y: 248 },
    },
    {
      number: 20,
      topLeft: { x: 272, y: 233 },
      bottomRight: { x: 287, y: 248 },
    },
    {
      number: 21,
      topLeft: { x: 307, y: 233 },
      bottomRight: { x: 322, y: 248 },
    },
    {
      number: 22,
      topLeft: { x: 342, y: 233 },
      bottomRight: { x: 357, y: 248 },
    },
    {
      number: 23,
      topLeft: { x: 377, y: 233 },
      bottomRight: { x: 392, y: 248 },
    },
    {
      number: 24,
      topLeft: { x: 412, y: 233 },
      bottomRight: { x: 427, y: 248 },
    },
    {
      number: 25,
      topLeft: { x: 447, y: 233 },
      bottomRight: { x: 462, y: 248 },
    },
    {
      number: 26,
      topLeft: { x: 482, y: 233 },
      bottomRight: { x: 497, y: 248 },
    },
    {
      number: 27,
      topLeft: { x: 517, y: 233 },
      bottomRight: { x: 532, y: 248 },
    },
    {
      number: 28,
      topLeft: { x: 202, y: 399 },
      bottomRight: { x: 217, y: 414 },
    },
    {
      number: 29,
      topLeft: { x: 237, y: 399 },
      bottomRight: { x: 252, y: 414 },
    },
    {
      number: 30,
      topLeft: { x: 272, y: 399 },
      bottomRight: { x: 287, y: 414 },
    },
    {
      number: 31,
      topLeft: { x: 307, y: 399 },
      bottomRight: { x: 322, y: 414 },
    },
    {
      number: 32,
      topLeft: { x: 342, y: 399 },
      bottomRight: { x: 357, y: 414 },
    },
    {
      number: 33,
      topLeft: { x: 377, y: 399 },
      bottomRight: { x: 392, y: 414 },
    },
    {
      number: 34,
      topLeft: { x: 412, y: 399 },
      bottomRight: { x: 427, y: 414 },
    },
    {
      number: 35,
      topLeft: { x: 447, y: 399 },
      bottomRight: { x: 462, y: 414 },
    },
    {
      number: 36,
      topLeft: { x: 482, y: 399 },
      bottomRight: { x: 497, y: 414 },
    },
    {
      number: 37,
      topLeft: { x: 517, y: 399 },
      bottomRight: { x: 532, y: 414 },
    },
    {
      number: 38,
      topLeft: { x: 552, y: 399 },
      bottomRight: { x: 567, y: 414 },
    },
    {
      number: 39,
      topLeft: { x: 587, y: 399 },
      bottomRight: { x: 602, y: 414 },
    },
    {
      number: 40,
      topLeft: { x: 202, y: 434 },
      bottomRight: { x: 217, y: 449 },
    },
    {
      number: 41,
      topLeft: { x: 237, y: 434 },
      bottomRight: { x: 252, y: 449 },
    },
    {
      number: 42,
      topLeft: { x: 272, y: 434 },
      bottomRight: { x: 287, y: 449 },
    },
    {
      number: 43,
      topLeft: { x: 307, y: 434 },
      bottomRight: { x: 322, y: 449 },
    },
    {
      number: 44,
      topLeft: { x: 342, y: 434 },
      bottomRight: { x: 357, y: 449 },
    },
    {
      number: 45,
      topLeft: { x: 377, y: 434 },
      bottomRight: { x: 392, y: 449 },
    },
    {
      number: 46,
      topLeft: { x: 412, y: 434 },
      bottomRight: { x: 427, y: 449 },
    },
    {
      number: 47,
      topLeft: { x: 447, y: 434 },
      bottomRight: { x: 462, y: 449 },
    },
    {
      number: 48,
      topLeft: { x: 482, y: 434 },
      bottomRight: { x: 497, y: 449 },
    },
    {
      number: 49,
      topLeft: { x: 517, y: 434 },
      bottomRight: { x: 532, y: 449 },
    },
    {
      number: 50,
      topLeft: { x: 552, y: 434 },
      bottomRight: { x: 567, y: 449 },
    },
    {
      number: 51,
      topLeft: { x: 587, y: 434 },
      bottomRight: { x: 602, y: 449 },
    },
    {
      number: 52,
      topLeft: { x: 202, y: 649 },
      bottomRight: { x: 217, y: 664 },
    },
    {
      number: 53,
      topLeft: { x: 237, y: 649 },
      bottomRight: { x: 252, y: 664 },
    },
    {
      number: 54,
      topLeft: { x: 272, y: 649 },
      bottomRight: { x: 287, y: 664 },
    },
    {
      number: 55,
      topLeft: { x: 307, y: 649 },
      bottomRight: { x: 322, y: 664 },
    },
    {
      number: 56,
      topLeft: { x: 342, y: 649 },
      bottomRight: { x: 357, y: 664 },
    },
    {
      number: 57,
      topLeft: { x: 377, y: 649 },
      bottomRight: { x: 392, y: 664 },
    },
    {
      number: 58,
      topLeft: { x: 412, y: 649 },
      bottomRight: { x: 427, y: 664 },
    },
    {
      number: 59,
      topLeft: { x: 447, y: 649 },
      bottomRight: { x: 462, y: 664 },
    },
    {
      number: 60,
      topLeft: { x: 482, y: 649 },
      bottomRight: { x: 497, y: 664 },
    },
    {
      number: 61,
      topLeft: { x: 517, y: 649 },
      bottomRight: { x: 532, y: 664 },
    },
    {
      number: 62,
      topLeft: { x: 552, y: 649 },
      bottomRight: { x: 567, y: 664 },
    },
    {
      number: 63,
      topLeft: { x: 587, y: 649 },
      bottomRight: { x: 602, y: 664 },
    },
    {
      number: 64,
      topLeft: { x: 202, y: 684 },
      bottomRight: { x: 217, y: 699 },
    },
    {
      number: 65,
      topLeft: { x: 237, y: 684 },
      bottomRight: { x: 252, y: 699 },
    },
    {
      number: 66,
      topLeft: { x: 272, y: 684 },
      bottomRight: { x: 287, y: 699 },
    },
    {
      number: 67,
      topLeft: { x: 307, y: 684 },
      bottomRight: { x: 322, y: 699 },
    },
    {
      number: 68,
      topLeft: { x: 342, y: 684 },
      bottomRight: { x: 357, y: 699 },
    },
    {
      number: 69,
      topLeft: { x: 377, y: 684 },
      bottomRight: { x: 392, y: 699 },
    },
    {
      number: 70,
      topLeft: { x: 412, y: 684 },
      bottomRight: { x: 427, y: 699 },
    },
    {
      number: 71,
      topLeft: { x: 447, y: 684 },
      bottomRight: { x: 462, y: 699 },
    },
    {
      number: 72,
      topLeft: { x: 482, y: 684 },
      bottomRight: { x: 497, y: 699 },
    },
    {
      number: 73,
      topLeft: { x: 517, y: 684 },
      bottomRight: { x: 532, y: 699 },
    },
    {
      number: 74,
      topLeft: { x: 552, y: 684 },
      bottomRight: { x: 567, y: 699 },
    },
    {
      number: 75,
      topLeft: { x: 587, y: 684 },
      bottomRight: { x: 602, y: 699 },
    },
    {
      number: 76,
      topLeft: { x: 307, y: 819 },
      bottomRight: { x: 322, y: 834 },
    },
    {
      number: 77,
      topLeft: { x: 342, y: 819 },
      bottomRight: { x: 357, y: 834 },
    },
    {
      number: 78,
      topLeft: { x: 377, y: 819 },
      bottomRight: { x: 392, y: 834 },
    },
    {
      number: 79,
      topLeft: { x: 412, y: 819 },
      bottomRight: { x: 427, y: 834 },
    },
    {
      number: 80,
      topLeft: { x: 447, y: 819 },
      bottomRight: { x: 462, y: 834 },
    },
    {
      number: 81,
      topLeft: { x: 482, y: 819 },
      bottomRight: { x: 497, y: 834 },
    },
    {
      number: 82,
      topLeft: { x: 517, y: 819 },
      bottomRight: { x: 532, y: 834 },
    },
    {
      number: 83,
      topLeft: { x: 552, y: 819 },
      bottomRight: { x: 567, y: 834 },
    },
    {
      number: 84,
      topLeft: { x: 587, y: 819 },
      bottomRight: { x: 602, y: 834 },
    },
    {
      number: 85,
      topLeft: { x: 622, y: 819 },
      bottomRight: { x: 637, y: 834 },
    },
    {
      number: 86,
      topLeft: { x: 657, y: 819 },
      bottomRight: { x: 672, y: 834 },
    },
    {
      number: 87,
      topLeft: { x: 692, y: 819 },
      bottomRight: { x: 707, y: 834 },
    },
    {
      number: 88,
      topLeft: { x: 727, y: 128 },
      bottomRight: { x: 742, y: 143 },
    },
    {
      number: 89,
      topLeft: { x: 727, y: 163 },
      bottomRight: { x: 742, y: 178 },
    },
    {
      number: 90,
      topLeft: { x: 727, y: 198 },
      bottomRight: { x: 742, y: 213 },
    },
    {
      number: 91,
      topLeft: { x: 727, y: 233 },
      bottomRight: { x: 742, y: 248 },
    },
    {
      number: 92,
      topLeft: { x: 727, y: 268 },
      bottomRight: { x: 742, y: 283 },
    },
    {
      number: 93,
      topLeft: { x: 727, y: 303 },
      bottomRight: { x: 742, y: 318 },
    },
    {
      number: 94,
      topLeft: { x: 727, y: 338 },
      bottomRight: { x: 742, y: 353 },
    },
    {
      number: 95,
      topLeft: { x: 727, y: 373 },
      bottomRight: { x: 742, y: 388 },
    },
    {
      number: 96,
      topLeft: { x: 727, y: 408 },
      bottomRight: { x: 742, y: 423 },
    },
    {
      number: 97,
      topLeft: { x: 727, y: 443 },
      bottomRight: { x: 742, y: 458 },
    },
    {
      number: 98,
      topLeft: { x: 727, y: 478 },
      bottomRight: { x: 742, y: 493 },
    },
    {
      number: 99,
      topLeft: { x: 727, y: 513 },
      bottomRight: { x: 742, y: 528 },
    },
    {
      number: 100,
      topLeft: { x: 727, y: 548 },
      bottomRight: { x: 742, y: 563 },
    },
    {
      number: 101,
      topLeft: { x: 727, y: 583 },
      bottomRight: { x: 742, y: 598 },
    },
    {
      number: 102,
      topLeft: { x: 727, y: 618 },
      bottomRight: { x: 742, y: 633 },
    },
    {
      number: 103,
      topLeft: { x: 727, y: 653 },
      bottomRight: { x: 742, y: 668 },
    },
    {
      number: 104,
      topLeft: { x: 727, y: 688 },
      bottomRight: { x: 742, y: 703 },
    },
    {
      number: 105,
      topLeft: { x: 727, y: 723 },
      bottomRight: { x: 742, y: 738 },
    },
    {
      number: 106,
      topLeft: { x: 727, y: 758 },
      bottomRight: { x: 742, y: 773 },
    },
    {
      number: 107,
      topLeft: { x: 727, y: 793 },
      bottomRight: { x: 742, y: 808 },
    },
  ],
}

interface TableArea {
  id: number
  coords: number[]
}

const tables: TableArea[] = table_coordinates.tables.map((table) => ({
  id: table.number,
  coords: [
    table.topLeft.x,
    table.topLeft.y,
    table.bottomRight.x,
    table.bottomRight.y,
  ],
}))

export const SeatingPlan: React.FC = () => {
  const navigate = useNavigate()
  const [scale, setScale] = React.useState(1)
  const imageRef = React.useRef<HTMLImageElement>(null)

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

  return (
    <div className="seating-plan">
      <div className="seating-plan-container">
        <img
          ref={imageRef}
          src="cc2025-tischplan.png"
          alt="Exhibition Floor Plan"
          useMap="#seating-map"
        />
        <map name="seating-map">
          {tables.map((table) => (
            <area
              key={table.id}
              shape="rect"
              coords={getScaledCoords(table.coords).join(',')}
              alt={`Table ${table.id}`}
              onClick={() => handleTableClick(table.id)}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </map>
        <div className="table-overlays">
          {tables.map((table) => {
            const scaledCoords = getScaledCoords(table.coords)
            return (
              <div
                key={table.id}
                className="table-number"
                style={{
                  left: scaledCoords[0] + 'px',
                  top: scaledCoords[1] + 'px',
                  width: scaledCoords[2] - scaledCoords[0] + 'px',
                  height: scaledCoords[3] - scaledCoords[1] + 'px',
                }}
                onClick={() => handleTableClick(table.id)}>
                {table.id}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SeatingPlan
