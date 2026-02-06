import { useForm, SubmitHandler } from 'react-hook-form'
import { useState } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'

import { Link, useSearchParams } from 'react-router-dom'
import Modal from '@components/Modal.tsx'
import RetroHeader from '@components/RetroHeader'
import FormField from '@components/FormField'
import FormFieldset from '@components/FormFieldset'
import FormInput from '@components/FormInput'
import FormSelect from '@components/FormSelect'
import FormTextarea from '@components/FormTextarea'
import DurationSelector from '@components/DurationSelector'
import Footer from '@components/Footer'
import { useExhibition } from '@contexts/ExhibitionContext.ts'

type Inputs = {
  name: string
  vzekcMember: boolean
  email: string
  nickname: string
  forum: string
  topic: string
  topicExtras: string
  friday: boolean
  saturday: boolean
  sunday: boolean
  setupHelper: boolean
  gameCornerSupporter: boolean
  dailyLunch: boolean
  talk: boolean
  talkTitle: string
  talkSummary: string
  talkDuration: number
  tables: number
  tableNextTo: string
  ethernet: boolean
  message: string
}

const REGISTER_MUTATION = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      id
      status
    }
  }
`)

const IS_REGISTERED_QUERY = graphql(`
  query IsRegistered($email: String!) {
    isRegistered(email: $email)
  }
`)

const Register = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<Inputs>({
    mode: 'onBlur',
    defaultValues: {
      friday: true,
      saturday: true,
      sunday: true,
      talk: false,
      talkDuration: 30,
      tables: 1,
    },
  })

  const [searchParams] = useSearchParams()
  const [state, setState] = useState<'entering' | 'sending' | 'done'>('entering')
  const [registerMutation] = useMutation(REGISTER_MUTATION)
  const [checkIsRegistered] = useLazyQuery(IS_REGISTERED_QUERY)
  const { exhibition } = useExhibition()
  const [notYetRegisteredPopup, setNotYetRegisteredPopup] = useState(
    searchParams.has('forumMemberNotYetRegistered'),
  )

  const isFrozen = exhibition?.frozen ?? false
  const exhibitionTitle = exhibition?.title ?? 'Classic Computing'
  const exhibitionKey = exhibition?.key ?? 'cc'

  // Format dates for display
  const formatDateShort = (dateValue: unknown) => {
    if (!dateValue) return ''
    const date = new Date(String(dateValue))
    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
  }

  const getDateRange = () => {
    if (!exhibition?.startDate || !exhibition?.endDate) return ''
    const start = new Date(String(exhibition.startDate))
    const end = new Date(String(exhibition.endDate))
    const startDay = start.getDate()
    const endDay = end.getDate()
    const month = start.toLocaleDateString('de-DE', { month: 'long' })
    const year = start.getFullYear()
    return `${startDay}. bis zum ${endDay}. ${month} ${year}`
  }

  const getFridayDate = () => {
    if (!exhibition?.startDate) return 'Freitag'
    return formatDateShort(exhibition.startDate)
  }

  const topic = watch('topic')
  const talk = watch('talk')

  const isNewEmail = async (email: string) => {
    const isRegistered = await checkIsRegistered({
      variables: { email },
    })
    if (isRegistered.data?.isRegistered) {
      return 'Jemand hat sich bereits mit dieser Email-Adresse angemeldet! Nimm mit uns Kontakt auf, falls Du bisher keine Antwort auf Deine Anmeldung bekommen hast. Die Bearbeitung von Anmeldungen kann einige Zeit dauern'
    }
    return true
  }

  const onSubmit: SubmitHandler<Inputs> = async (inputs) => {
    const { name, email, nickname, message, topic, topicExtras, ...data } = inputs
    // Set tables to 0 if "Keine Ausstellung" is selected
    if (topic === 'Keine Ausstellung') {
      data.tables = 0
    }
    setState('sending')
    await registerMutation({
      variables: {
        input: {
          name,
          email,
          nickname,
          topic: topicExtras ? topic.replace('*', topicExtras) : topic,
          message,
          data,
        },
      },
    })
    setState('done')
  }

  const content = () => {
    if (isFrozen) {
      return (
        <div className="py-8 text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Die Anmeldung ist geschlossen</h2>
          <p className="mb-4 text-lg text-gray-700">
            Die Anmeldung für {exhibitionTitle} ist leider nicht mehr möglich.
          </p>
          <p className="text-gray-600">
            <Link to="/" className="text-blue-600 hover:underline">
              Zur Startseite
            </Link>
          </p>
        </div>
      )
    }

    switch (state) {
      case 'sending':
        return (
          <div className="py-8 text-center">
            <p className="text-lg text-gray-700">Die Anmeldung wird gesendet...</p>
          </div>
        )
      case 'done':
        return (
          <div className="py-8 text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Vielen Dank für deine Anmeldung!
            </h2>
            <p className="text-lg text-gray-700">Wir melden uns in den nächsten Tagen bei Dir!</p>
          </div>
        )
      default:
        return (
          <>
            {notYetRegisteredPopup && (
              <Modal isOpen={notYetRegisteredPopup} onClose={() => setNotYetRegisteredPopup(false)}>
                <h2 className="mb-4 text-xl font-bold text-gray-900">
                  Du bist noch nicht registriert
                </h2>
                <p className="mb-4 text-gray-700">
                  Du hast Dich über das Forum angemeldet, bist aber noch nicht als Aussteller
                  registriert.
                </p>
                <p className="text-gray-700">
                  Bitte fülle das Formular aus, wenn Du Dich als Aussteller anmelden möchtest.
                </p>
              </Modal>
            )}
            <div className="prose mb-8 max-w-none">
              <p>
                Hier kannst Du Dich für die{' '}
                <a
                  href={`https://www.classic-computing.de/${exhibitionKey}/`}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="text-blue-600 hover:text-blue-800">
                  {exhibitionTitle}
                </a>
                , die vom {getDateRange()} {exhibition?.location} stattfindet, als Aussteller
                anmelden. Die Daten, die Du in dieses Formular eingibst, werden für die Planung der
                Ausstellung verwendet und nach der Veranstaltung gelöscht. Deine Email-Adresse wird
                nur für die Kommunikation mit Dir im Zusammenhang mit der Ausstellung verwendet. Wir
                geben Deine Daten nicht an Dritte weiter.
              </p>
              <p>
                Nach Absendung des Formulars erhältst Du eine automatisch generierte Email mit einer
                Bestätigung Deiner Anmeldung. Bitte überprüfe auch Deinen Spam-Ordner, falls Du
                diese Email nicht nach einigen Minuten erhältst. Sobald wir Deine Anmeldung
                bearbeitet haben, melden wir uns persönlich mit einer weiteren Email bei Dir.
              </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <FormFieldset legend="Persönliche Informationen">
                <FormField label="Name" error={errors.name?.message}>
                  <FormInput
                    type="text"
                    autoComplete="name"
                    {...register('name', { required: 'Ein Name wird benötigt' })}
                  />
                </FormField>
                <FormField>
                  <div className="flex items-center">
                    <FormInput
                      type="checkbox"
                      id="vzekcMember"
                      {...register('vzekcMember')}
                      className="mr-2"
                    />
                    <label htmlFor="vzekcMember" className="cursor-pointer">
                      Ich bin Mitglied im VzEkC e.V
                    </label>
                  </div>
                </FormField>
                <FormField label="E-Mail Adresse" error={errors.email?.message}>
                  <FormInput
                    type="email"
                    autoComplete="email"
                    {...register('email', {
                      required:
                        'Eine Email-Adresse wird benötigt, damit wir Kontakt aufnehmen können',
                      pattern: {
                        value: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/i,
                        message: 'Bitte gib eine gültige Email-Adresse ein',
                      },
                      validate: isNewEmail,
                    })}
                  />
                </FormField>
                <FormField label="Nickname (Benutzername) im Forum">
                  <FormInput type="text" autoComplete="nickname" {...register('nickname')} />
                </FormField>
                <FormField label="Registriert im Forum">
                  <FormSelect {...register('forum')}>
                    <option>forum.classic-computing.de</option>
                    <option>www.a1k.org</option>
                    <option>forum.atari-home.de</option>
                    <option>forum64.de</option>
                    <option>anderes Forum</option>
                    <option>(kein Forum)</option>
                  </FormSelect>
                </FormField>
              </FormFieldset>

              <FormFieldset legend="Ausstellung">
                <FormField label="Hauptthema meiner Ausstellung" error={errors.topic?.message}>
                  <FormSelect
                    {...register('topic', {
                      required: 'Bitte wähle aus, was du ausstellen möchtest',
                    })}>
                    <option></option>
                    <option>Keine Ausstellung</option>
                    <option>Atari 8-Bit und ST/TT/Falcon</option>
                    <option>Apple 8-Bit und Macintosh</option>
                    <option>Commodore CBM</option>
                    <option>Commodore VC20, C64, AMIGA und andere</option>
                    <option>Sinclair</option>
                    <option>Amstrad/Schneider</option>
                    <option>CP/M Rechner</option>
                    <option>IBM PC und kompatible</option>
                    <option>MSX Computer</option>
                    <option>Workstations (*)</option>
                    <option>Konsolen (*)</option>
                    <option>Etwas anderes (*)</option>
                  </FormSelect>
                </FormField>
                {topic?.includes('*') && (
                  <FormField label="Weitere Angaben" error={errors.topicExtras?.message}>
                    <FormInput
                      type="text"
                      {...register('topicExtras', {
                        required: 'Bitte erläutere, was du ausstellen möchtest',
                      })}
                      disabled={!topic?.includes('*')}
                    />
                  </FormField>
                )}
                {topic && topic !== 'Keine Ausstellung' && (
                  <>
                    <FormField
                      label="Gewünschte Anzahl Tische (je 165cm x 80cm)"
                      error={errors.tables?.message}>
                      <FormSelect
                        {...register('tables', {
                          required:
                            topic !== 'Keine Ausstellung'
                              ? 'Bitte wähle aus, wie viele Tische Deine Ausstellung belegen wird'
                              : false,
                        })}>
                        <option value={1}>1</option>
                        <option value={2}>2 (wenn verfügbar)</option>
                      </FormSelect>
                    </FormField>
                    <FormField>
                      <div className="flex items-center">
                        <FormInput
                          type="checkbox"
                          id="ethernet"
                          {...register('ethernet')}
                          className="mr-2"
                        />
                        <label htmlFor="ethernet" className="cursor-pointer">
                          Für meine Ausstellung benötige ich einen Internet-Zugang über Ethernet
                        </label>
                      </div>
                    </FormField>
                    <FormField label="Ich wünsche mir einen Tisch neben:">
                      <FormInput type="text" {...register('tableNextTo')} />
                    </FormField>
                  </>
                )}
              </FormFieldset>

              <FormFieldset legend="Vortrag">
                <FormField>
                  <div className="flex items-center">
                    <FormInput type="checkbox" id="talk" {...register('talk')} className="mr-2" />
                    <label htmlFor="talk" className="cursor-pointer">
                      Ich plane einen Vortrag
                    </label>
                  </div>
                </FormField>
                {talk && (
                  <>
                    <FormField label="Titel des Vortrags" error={errors.talkTitle?.message}>
                      <FormInput
                        type="text"
                        {...register('talkTitle', {
                          required: talk ? 'Bitte gib einen Titel für deinen Vortrag ein' : false,
                        })}
                      />
                    </FormField>
                    <FormField
                      label="Kurzbeschreibung des Vortrags"
                      error={errors.talkSummary?.message}>
                      <FormTextarea
                        rows={4}
                        {...register('talkSummary', {
                          required: talk
                            ? 'Bitte gib eine kurze Beschreibung deines Vortrags ein'
                            : false,
                        })}
                        placeholder="Beschreibe kurz, worum es in deinem Vortrag geht..."
                      />
                    </FormField>
                    <FormField label="Dauer">
                      <DurationSelector
                        selectedDuration={watch('talkDuration')}
                        onChange={(duration) => setValue('talkDuration', duration)}
                      />
                    </FormField>
                  </>
                )}
              </FormFieldset>

              <FormFieldset legend="Teilnahme">
                <FormField>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center">
                      <FormInput type="checkbox" {...register('friday')} className="mr-2" />
                      <span>Freitag ({getFridayDate()}, nur Aussteller und persönliche Gäste)</span>
                    </label>
                    <label className="flex cursor-pointer items-center">
                      <FormInput type="checkbox" {...register('saturday')} className="mr-2" />
                      <span>Samstag (Publikumstag)</span>
                    </label>
                    <label className="flex cursor-pointer items-center">
                      <FormInput type="checkbox" {...register('sunday')} className="mr-2" />
                      <span>Sonntag (Publikumstag)</span>
                    </label>
                  </div>
                </FormField>
              </FormFieldset>

              <FormFieldset legend="Unterstützung">
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center">
                    <FormInput type="checkbox" {...register('setupHelper')} className="mr-2" />
                    <span>Ich unterstütze beim Aufbau am Donnerstag</span>
                  </label>
                  <label className="flex cursor-pointer items-center">
                    <FormInput
                      type="checkbox"
                      {...register('gameCornerSupporter')}
                      className="mr-2"
                    />
                    <span>Ich unterstütze die Spiele-Ecke mit eigener Hardware</span>
                  </label>
                  <label className="flex cursor-pointer items-center">
                    <FormInput type="checkbox" {...register('dailyLunch')} className="mr-2" />
                    <span>
                      Ich wünsche mir ein tägliches Mittagessen in der Halle (Möglichkeiten werden
                      noch geprüft)
                    </span>
                  </label>
                </div>
              </FormFieldset>

              <FormFieldset legend="Mitteilungen">
                <FormField label="Mitteilung ans Orga-Team:">
                  <FormTextarea rows={5} {...register('message')} />
                </FormField>
              </FormFieldset>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Anmeldung absenden
                </button>
              </div>
            </form>
          </>
        )
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <RetroHeader />
      {content()}
      <Footer />
    </div>
  )
}

export default Register
