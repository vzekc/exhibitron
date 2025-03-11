import { useForm, SubmitHandler } from 'react-hook-form'
import { User, useUser } from '../../contexts/UserContext.ts'
import ExhibitList from '../../components/ExhibitList.tsx'
import { useEffect, useState } from 'react'
import { graphql } from 'gql.tada'
import { useMutation, useQuery } from '@apollo/client'

type Inputs = {
  fullName: string
  bio: string
  email: string
  mastodon: string
  phone: string
  website: string
}

const GET_USER_PROFILE = graphql(`
    query GetUserProfile {
        getCurrentUser {
            id
            fullName
            bio
            contacts {
                email
                mastodon
                phone
                website
            }
        }
    }
`)

const UPDATE_USER_PROFILE = graphql(`
    mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
        updateUserProfile(input: $input) {
            id
            fullName
            bio
            contacts {
                email
                mastodon
                phone
                website
            }
        }
    }
`)

const Profile = () => {
  const { reloadUser } = useUser()
  const [user, setUser] = useState<User | undefined>()
  const { register, handleSubmit, formState: { isDirty }, reset } = useForm<Inputs>()

  const { data, refetch } = useQuery(GET_USER_PROFILE)
  const [updateUserProfile] = useMutation(UPDATE_USER_PROFILE)

  const updateProfile: SubmitHandler<Inputs> = async (inputs) => {
    const { fullName, bio, ...contacts } = inputs
    await updateUserProfile({ variables: { input: { fullName, bio, contacts } } })
    await reloadUser()
    reset(inputs)
    await refetch()
  }

  useEffect(() => {
    if (data) {
      const newUser = data.getCurrentUser
      setUser(newUser)
      reset({
        fullName: newUser?.fullName || '',
        bio: newUser?.bio || '',
        email: newUser?.contacts?.email || '',
        mastodon: newUser?.contacts?.mastodon || '',
        phone: newUser?.contacts?.phone || '',
        website: newUser?.contacts?.website || ''
      })
    }
  }, [data, reset])

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
          <p>Du hast noch keine Ausstellungen eingetragen.</p>
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
