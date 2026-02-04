import { useForm, SubmitHandler } from 'react-hook-form'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import { useEffect, useState, useRef } from 'react'
import { graphql } from 'gql.tada'
import { useApolloClient, useMutation, useQuery, useLazyQuery } from '@apollo/client'
import Modal from '@components/Modal.tsx'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import PageHeading from '@components/PageHeading.tsx'
import {
  FormSection,
  FormFieldGroup,
  FormLabel,
  SectionLabel,
  Input,
  TextArea,
} from '@components/Form.tsx'
import ImageUploader from '@components/ImageUploader.tsx'

type Inputs = {
  fullName: string
  nickname: string
  topic: string
  bio: string
  email: string
  mastodon: string
  phone: string
  website: string
  youtube: string
  allowEmailContact: boolean
}

type YouTubeChannel = {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  channelUrl: string
}

type LookupYouTubeChannelsResult = {
  lookupYouTubeChannels: YouTubeChannel[]
}

const GET_USER_PROFILE = graphql(`
  query GetUserProfile {
    getCurrentExhibition {
      title
    }
    getCurrentExhibitor {
      id
      topic
      user {
        id
        fullName
        nickname
        bio
        allowEmailContact
        contacts {
          email
          mastodon
          phone
          website
          youtube
        }
        profileImage
      }
    }
  }
`)

const UPDATE_USER_PROFILE = graphql(`
  mutation UpdateUserProfile($input: UpdateUserProfileInput!, $exhibitorId: Int!, $topic: String) {
    updateUserProfile(input: $input) {
      id
      fullName
      nickname
      bio
      allowEmailContact
      contacts {
        email
        mastodon
        phone
        website
        youtube
      }
    }
    updateExhibitor(id: $exhibitorId, topic: $topic) {
      id
    }
  }
`)

const LOOKUP_YOUTUBE_CHANNELS = graphql(`
  query LookupYouTubeChannels($query: String!) {
    lookupYouTubeChannels(query: $query) {
      id
      title
      description
      thumbnailUrl
      channelUrl
    }
  }
`)

const Profile = () => {
  const { reloadExhibitor, exhibitor } = useExhibitor()
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
  const [lookupYouTubeChannels] = useLazyQuery<LookupYouTubeChannelsResult>(LOOKUP_YOUTUBE_CHANNELS)
  const apolloClient = useApolloClient()
  const [searchParams] = useSearchParams()
  const [welcome, setWelcome] = useState(searchParams.has('welcome'))
  const navigate = useNavigate()
  const [profileImage, setProfileImage] = useState<number | null>(null)
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('')
  const [youtubeSearchResults, setYoutubeSearchResults] = useState<YouTubeChannel[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const websiteValue = watch('website')
  const websiteFocusedRef = useRef(false)

  useEffect(() => {
    navigate(window.location.pathname, { replace: true })
  }, [navigate])

  const handleYoutubeSearch = async (query: string) => {
    if (!query.trim()) {
      setYoutubeSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const { data } = await lookupYouTubeChannels({ variables: { query } })
      if (data?.lookupYouTubeChannels) {
        setYoutubeSearchResults(data.lookupYouTubeChannels)
      }
    } catch (error) {
      console.error('Error searching YouTube channels:', error)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      handleYoutubeSearch(youtubeSearchQuery)
    }, 500)

    return () => clearTimeout(debounceTimeout)
  }, [youtubeSearchQuery])

  const selectYoutubeChannel = (channel: YouTubeChannel) => {
    setValue('youtube', channel.channelUrl, { shouldDirty: true })
    setYoutubeSearchQuery('')
    setYoutubeSearchResults([])
  }

  const updateProfile: SubmitHandler<Inputs> = async (inputs) => {
    const { fullName, nickname, bio, topic, allowEmailContact, ...contacts } = inputs
    await updateUserProfile({
      variables: {
        input: { fullName, nickname, bio, contacts, allowEmailContact },
        exhibitorId: exhibitor!.id,
        topic,
      },
    })
    await reloadExhibitor()
    reset(inputs)
    await apolloClient.resetStore()
    await refetch()
  }

  useEffect(() => {
    if (data) {
      const newUser = data.getCurrentExhibitor!.user
      reset({
        fullName: newUser?.fullName || '',
        nickname: newUser?.nickname || '',
        topic: data.getCurrentExhibitor?.topic || '',
        bio: newUser?.bio || '',
        email: newUser?.contacts?.email || '',
        mastodon: newUser?.contacts?.mastodon || '',
        phone: newUser?.contacts?.phone || '',
        website: newUser?.contacts?.website || '',
        youtube: newUser?.contacts?.youtube || '',
        allowEmailContact: newUser?.allowEmailContact || false,
      })
      setProfileImage(newUser?.profileImage as number | null)
    }
  }, [data, reset])

  return (
    data?.getCurrentExhibitor && (
      <>
        <Modal
          isOpen={welcome}
          onClose={() => setWelcome(false)}
          title={`Willkommen als Aussteller bei der ${data?.getCurrentExhibition?.title ?? 'Ausstellung'}!`}>
          <p>
            Du bist jetzt als Aussteller registriert. Bitte vervollständige dein Profil, wenn Du
            möchtest, daß Besucher dich kontaktieren können.
          </p>
          <p>
            Im Backstage-Menü kannst Du deine Exponate bearbeiten. Dort findest Du auch weitere
            Informationen und Funktionen für Aussteller. Viel Spaß!
          </p>
        </Modal>

        <article className="space-y-6">
          <header>
            <PageHeading>Profil</PageHeading>
            <p className="mt-2 text-base text-gray-700">
              Hier kannst du dein Profil bearbeiten. Alle Informationen, die Du hier eingibst, sind
              öffentlich sichtbar.
            </p>
          </header>

          <form onSubmit={handleSubmit(updateProfile)} className="space-y-6">
            <div className="flex flex-col gap-6 md:flex-row">
              <FormSection className="md:w-1/3">
                <SectionLabel>Profilbild</SectionLabel>
                <ImageUploader
                  imageId={profileImage}
                  imageUrl={`/api/user/${data.getCurrentExhibitor.user.id}/image/profile`}
                  onImageChange={(newImageId) => {
                    setProfileImage(newImageId)
                    apolloClient.refetchQueries({
                      include: [GET_USER_PROFILE],
                    })
                  }}
                  title=""
                  alt="Profilbild"
                  enableCropping={true}
                />
              </FormSection>

              <div className="flex-1 space-y-6 md:w-2/3">
                <FormSection>
                  <SectionLabel>Persönliche Informationen</SectionLabel>
                  <FormFieldGroup>
                    <FormLabel>Nickname</FormLabel>
                    <Input
                      type="text"
                      {...register('nickname', { required: true })}
                      error={errors.nickname?.message}
                    />
                    <FormLabel>Name</FormLabel>
                    <Input
                      type="text"
                      {...register('fullName', { required: false })}
                      error={errors.fullName?.message}
                    />
                    <FormLabel>Thema meiner Ausstellung</FormLabel>
                    <Input
                      type="text"
                      {...register('topic', { required: false })}
                      error={errors.topic?.message}
                    />

                    <FormLabel>Über mich</FormLabel>
                    <TextArea rows={4} {...register('bio')} error={errors.bio?.message} />
                  </FormFieldGroup>
                </FormSection>

                <FormSection>
                  <SectionLabel>Kontakt über Website</SectionLabel>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowEmailContact"
                      {...register('allowEmailContact')}
                      className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                    />
                    <FormLabel htmlFor="allowEmailContact">Kontaktformular aktivieren</FormLabel>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Wenn Du das Kontaktformular aktivierst, können Besucher Dich über die Website
                    kontaktieren. Eingegebene Nachrichten werden an Deine hinterlegte Email-Adresse
                    gesendet, ohne dass Du sie auf der Website veröffentlichen musst.
                  </p>
                </FormSection>

                <FormSection>
                  <SectionLabel>Kontaktinformationen</SectionLabel>
                  <FormFieldGroup>
                    <FormLabel>E-Mail-Adresse</FormLabel>
                    <Input
                      type="email"
                      {...register('email', {
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Ungültige E-Mail-Adresse',
                        },
                      })}
                      error={errors.email?.message}
                    />

                    <FormLabel>Mastodon</FormLabel>
                    <Input
                      type="text"
                      {...register('mastodon', {
                        pattern: {
                          value: /^@[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: 'Mastodon sollte im Format @nutzername@server.domain sein',
                        },
                      })}
                      error={errors.mastodon?.message}
                    />

                    <FormLabel>Webseite</FormLabel>
                    <Input
                      type="url"
                      {...register('website', {
                        pattern: {
                          value: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/,
                          message: 'Bitte gib eine gültige URL ein',
                        },
                      })}
                      error={errors.website?.message}
                      onFocus={() => {
                        if (!websiteFocusedRef.current && !websiteValue) {
                          setValue('website', 'https://', { shouldDirty: true })
                          websiteFocusedRef.current = true
                        }
                      }}
                    />

                    <FormLabel>Telefon</FormLabel>
                    <Input
                      type="tel"
                      {...register('phone', {
                        pattern: {
                          value: /^(\+)?[\d\s()-]{5,20}$/,
                          message: 'Bitte gib eine gültige Telefonnummer ein',
                        },
                      })}
                      error={errors.phone?.message}
                    />

                    <FormLabel>YouTube</FormLabel>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="YouTube-Kanal suchen..."
                        value={youtubeSearchQuery}
                        onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                      {isSearching && <div className="text-sm text-gray-500">Suche...</div>}
                      {youtubeSearchResults.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {youtubeSearchResults.map((channel) => (
                            <button
                              key={channel.id}
                              type="button"
                              onClick={() => selectYoutubeChannel(channel)}
                              className="flex w-full items-center gap-2 rounded-lg border border-gray-200 p-2 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                              <div className="relative h-12 w-12 flex-shrink-0">
                                <img
                                  src={channel.thumbnailUrl}
                                  alt={channel.title}
                                  className="h-12 w-12 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{channel.title}</div>
                                <div className="truncate text-sm text-gray-500">
                                  {channel.description}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <Input
                        type="text"
                        {...register('youtube')}
                        readOnly
                        className="mt-2 bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                  </FormFieldGroup>
                </FormSection>
              </div>
            </div>

            <ActionBar>
              <Button type="submit" disabled={!isDirty || Object.keys(errors).length > 0}>
                Speichern
              </Button>
            </ActionBar>
          </form>
        </article>
      </>
    )
  )
}

export default Profile
