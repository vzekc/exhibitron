import React from 'react'

interface Room {
  id: string
  name: string
}

interface RoomSelectorProps {
  rooms: Room[]
  selectedId: string
  onChange: (id: string) => void
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ rooms, selectedId, onChange }) => {
  const sortedRooms = rooms.slice().sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        {sortedRooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => onChange(room.id)}
            className={`rounded-md border px-4 py-3 text-left ${
              selectedId === room.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}>
            {room.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default RoomSelector
