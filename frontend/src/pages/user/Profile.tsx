import { useForm, SubmitHandler } from 'react-hook-form'
import { useUser } from '../../contexts/UserContext.ts'
import { useEffect, useState, useRef } from 'react'
import { graphql } from 'gql.tada'
import { useApolloClient, useMutation, useQuery } from '@apollo/client'
import Modal from '../../components/Modal.tsx'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
  const {
    register,
    handleSubmit,
    formState: { isDirty, errors },
    setValue,
    watch,
    reset,
  } = useForm<Inputs>({
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  })

  const { data, refetch } = useQuery(GET_USER_PROFILE)
  const [updateUserProfile] = useMutation(UPDATE_USER_PROFILE)
  const apolloClient = useApolloClient()
  const [searchParams] = useSearchParams()
  const [welcome, setWelcome] = useState(searchParams.has('welcome'))
  const navigate = useNavigate()

  const websiteValue = watch('website')
  const websiteFocusedRef = useRef(false)

  useEffect(() => {
    navigate(window.location.pathname, { replace: true })
  }, [navigate])

  const updateProfile: SubmitHandler<Inputs> = async (inputs) => {
    const { fullName, bio, ...contacts } = inputs
    await updateUserProfile({
      variables: { input: { fullName, bio, contacts } },
    })
    await reloadUser()
    reset(inputs)
    await apolloClient.resetStore()
    await refetch()
  }

  useEffect(() => {
    if (data) {
      const newUser = data.getCurrentUser
      reset({
        fullName: newUser?.fullName || '',
        bio: newUser?.bio || '',
        email: newUser?.contacts?.email || '',
        mastodon: newUser?.contacts?.mastodon || '',
        phone: newUser?.contacts?.phone || '',
        website: newUser?.contacts?.website || '',
      })
    }
  }, [data, reset])

  return (
    data && (
      <>
        <Modal
          isOpen={welcome}
          onClose={() => setWelcome(false)}
          title="Willkommen als Aussteller bei der CC2025!">
          <p>
            Du bist jetzt als Aussteller registriert. Bitte vervollständige dein Profil, wenn Du
            möchtest, daß Besucher dich kontaktieren können.
          </p>
          <p>
            Im Backstage-Menü kannst Du deine Exponate bearbeiten. Dort findest Du auch weitere
            Informationen und Funktionen für Aussteller. Viel Spaß!
          </p>
        </Modal>
        <article>
          <h2>Aussteller-Profil</h2>
          <p>
            Hier kannst du dein Profil bearbeiten. Alle Informationen, die Du hier eingibst, sind
            öffentlich sichtbar.
          </p>
          <form onSubmit={handleSubmit(updateProfile)}>
            <fieldset>
              <label>
                Angezeigter Name:
                <input type="string" {...register('fullName', { required: true })} />
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
                <input
                  type="email"
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Ungültige E-Mail-Adresse',
                    },
                  })}
                />
                {errors.email && <div className="validation-message">{errors.email.message}</div>}
              </label>
              <label>
                Mastodon:
                <input
                  type="text"
                  {...register('mastodon', {
                    pattern: {
                      value: /^@[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Mastodon sollte im Format @nutzername@server.domain sein',
                    },
                  })}
                />
                {errors.mastodon && (
                  <div className="validation-message">{errors.mastodon.message}</div>
                )}
              </label>
              <label>
                Webseite:
                <input
                  type="url"
                  {...register('website', {
                    pattern: {
                      value: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/,
                      message: 'Bitte gib eine gültige URL ein',
                    },
                  })}
                  onFocus={() => {
                    if (!websiteFocusedRef.current && !websiteValue) {
                      setValue('website', 'https://', { shouldDirty: true })
                      websiteFocusedRef.current = true
                    }
                  }}
                />
                {errors.website && (
                  <div className="validation-message">{errors.website.message}</div>
                )}
              </label>
              <label>
                Telefon:
                <input
                  type="tel"
                  {...register('phone', {
                    pattern: {
                      value: /^(\+)?[\d\s()-]{5,20}$/,
                      message: 'Bitte gib eine gültige Telefonnummer ein',
                    },
                  })}
                />
                {errors.phone && <div className="validation-message">{errors.phone.message}</div>}
              </label>
            </fieldset>
            <button type="submit" disabled={!isDirty || Object.keys(errors).length > 0}>
              Speichern
            </button>
          </form>
        </article>
      </>
    )
  )
}

export default Profile
