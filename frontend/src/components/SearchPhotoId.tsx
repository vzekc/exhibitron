import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

/*
 * Die Foto-ID vom Laufzettel, oben rechts neben der Tischnummer.
 *
 * Ein Besucher nennt am Tisch seine sechs Zeichen, der Aussteller tippt sie
 * hier ein und landet auf der Fotoseite. Das Alphabet ist dasselbe, das der
 * Automat vergibt: A-Z und 2-9, ohne I und O, damit niemand raten muss, ob
 * eine Eins oder ein L gemeint war.
 */

const ID_CHARACTERS = /[^A-HJ-NP-Z2-9]/g
const ID_LENGTH = 6

const SearchPhotoId = () => {
  const [photoId, setPhotoId] = useState('')
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoId(e.target.value.toUpperCase().replace(ID_CHARACTERS, '').slice(0, ID_LENGTH))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (photoId.length !== ID_LENGTH) return
    setPhotoId('')
    navigate(`/foto/${photoId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 shrink-0">
      <input
        type="text"
        value={photoId}
        onChange={handleChange}
        placeholder="Foto ID"
        maxLength={ID_LENGTH}
        autoComplete="off"
        spellCheck={false}
        aria-label="Foto-ID vom Laufzettel"
        className="w-24 min-w-0 shrink border border-gray-300 bg-white px-2 py-1 font-mono text-gray-900 placeholder-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
      />
      <button
        type="submit"
        aria-label="Foto anzeigen"
        className="shrink-0 border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600">
        <Icon name="photo-id" alt="Foto anzeigen" />
      </button>
    </form>
  )
}

export default SearchPhotoId
