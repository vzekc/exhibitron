import React, { useState, useMemo } from 'react'
import FormInput from './FormInput'
import ChipContainer from './ChipContainer'
import Icon from './Icon'
import { Exhibitor } from '../types/exhibitor'

interface RemovableExhibitorChipProps {
  exhibitor: Exhibitor
  onRemove: () => void
}

const RemovableExhibitorChip: React.FC<RemovableExhibitorChipProps> = ({ exhibitor, onRemove }) => {
  const { user } = exhibitor
  const { fullName, nickname } = user
  const displayName = nickname || fullName

  return (
    <div className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
      <span>{displayName}</span>
      <button
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200">
        <Icon name="x" className="h-3 w-3" />
      </button>
    </div>
  )
}

interface MultipleExhibitorSelectorProps {
  exhibitors: Exhibitor[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

const MultipleExhibitorSelector: React.FC<MultipleExhibitorSelectorProps> = ({
  exhibitors,
  selectedIds,
  onChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const sortedAndFilteredExhibitors = useMemo(() => {
    return exhibitors
      .slice()
      .sort((a, b) => a.user.fullName.localeCompare(b.user.fullName))
      .filter((exhibitor) => {
        const displayName = exhibitor.user.nickname || exhibitor.user.fullName
        return displayName.toLowerCase().includes(searchQuery.toLowerCase())
      })
      .filter((exhibitor) => !selectedIds.includes(exhibitor.id.toString()))
  }, [exhibitors, searchQuery, selectedIds])

  const selectedExhibitors = useMemo(() => {
    return exhibitors.filter((exhibitor) => selectedIds.includes(exhibitor.id.toString()))
  }, [exhibitors, selectedIds])

  const handleRemoveExhibitor = (exhibitorId: string) => {
    onChange(selectedIds.filter((id) => id !== exhibitorId))
  }

  const handleAddExhibitor = (exhibitorId: string) => {
    onChange([...selectedIds, exhibitorId])
    setSearchQuery('')
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <FormInput
          type="text"
          placeholder="Nach Aussteller suchen..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsSearching(true)
          }}
          onFocus={() => setIsSearching(true)}
          onBlur={() => {
            // Delay hiding results to allow click events to fire
            setTimeout(() => setIsSearching(false), 200)
          }}
          className="mb-2"
        />
        {isSearching && searchQuery && sortedAndFilteredExhibitors.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
            {sortedAndFilteredExhibitors.map((exhibitor) => {
              const displayName = exhibitor.user.nickname || exhibitor.user.fullName
              return (
                <button
                  key={exhibitor.id}
                  className="w-full cursor-pointer px-4 py-2 text-left hover:bg-gray-100"
                  onClick={() => handleAddExhibitor(exhibitor.id.toString())}>
                  {displayName}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {selectedExhibitors.length > 0 && (
        <ChipContainer>
          {selectedExhibitors.map((exhibitor) => (
            <RemovableExhibitorChip
              key={exhibitor.id}
              exhibitor={exhibitor}
              onRemove={() => handleRemoveExhibitor(exhibitor.id.toString())}
            />
          ))}
        </ChipContainer>
      )}
    </div>
  )
}

export default MultipleExhibitorSelector
