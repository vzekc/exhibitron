import { useForm, SubmitHandler } from 'react-hook-form'
import { useUser } from '../contexts/UserContext.ts'
import ExhibitList from '../components/ExhibitList.tsx'
import * as backend from '../api/index'
import { useExhibitionData } from '../contexts/ExhibitionDataContext.ts'
import { useEffect, useState } from 'react'
import { User } from '../types.ts'

type Inputs = {
  fullName: string
  bio: string
  email: string
  mastodon: string
  phone: string
  website: string
}

const Profile = () => {
  const { reloadUser } = useUser()
  const { reloadExhibitList } = useExhibitionData()
  const [user, setUser] = useState<User | undefined>()
  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
  } = useForm<Inputs>()

  const updateProfile: SubmitHandler<Inputs> = async (inputs) => {
    console.log('Update profile', inputs)
    const { fullName, bio, ...contacts } = inputs
    await backend.patchUserProfile({ body: { fullName, bio, contacts } })
    await reloadUser()
    await reloadExhibitList()
    reset(inputs)
  }

  useEffect(() => {
    const load = async () => {
      const response = await backend.getUserProfile()
      const newUser = response.data
      setUser(newUser)
      reset({
        fullName: newUser?.fullName || '',
        bio: newUser?.bio || '',
        email: newUser?.contacts?.email || '',
        mastodon: newUser?.contacts?.mastodon || '',
        phone: newUser?.contacts?.phone || '',
        website: newUser?.contacts?.website || '',
      })
    }
    void load()
  }, [setUser, reset])

  return (
    user && (
      <article>
        <h2>Aussteller-Profil</h2>
        <p>
          Hier kannst du dein Profil bearbeiten. Alle Informationen, die Du hier
          eingibst, sind öffentlich sichtbar.
        </p>
        <form onSubmit={handleSubmit(updateProfile)}>
          <fieldset>
            <label>
              Angezeigter Name:
              <input
                type="string"
                {...register('fullName', { required: true })}
              />
            </label>
            <label>
              Über mich:
              <textarea {...register('bio')} />
            </label>
          </fieldset>
          <fieldset>
            <legend>Kontaktinformationen</legend>
            <label>
              E-Mail-Adresse:
              <input type="email" {...register('email')} />
            </label>
            <label>
              Mastodon:
              <input type="mastodon" {...register('mastodon')} />
            </label>
            <label>
              Webseite:
              <input type="url" {...register('website')} />
            </label>
            <label>
              Telefon:
              <input type="phone" {...register('phone')} />
            </label>
          </fieldset>
          <button type="submit" disabled={!isDirty}>
            Profil aktualisieren
          </button>
        </form>
        <h2>Ausstellungen</h2>
        {!user.exhibits ? (
          'Du hast noch keine Ausstellungen eingetragen.'
        ) : (
          <ExhibitList exhibits={user.exhibits} />
        )}
        <button onClick={() => console.log('Add exhibit')}>
          Ausstellung hinzufügen
        </button>
      </article>
    )
  )
}

export default Profile
