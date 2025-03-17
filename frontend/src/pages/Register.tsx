import { useForm, SubmitHandler } from 'react-hook-form'
import { useState } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'

import './Register.css'
import { useSearchParams } from 'react-router-dom'
import Modal from '../components/Modal.tsx'

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
  tables: number
  tableNextTo: string
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
  } = useForm<Inputs>({
    mode: 'onBlur',
    defaultValues: {
      friday: true,
      saturday: true,
      sunday: true,
    },
  })

  const [searchParams] = useSearchParams()
  const [state, setState] = useState<'entering' | 'sending' | 'done'>('entering')
  const [registerMutation] = useMutation(REGISTER_MUTATION)
  const [checkIsRegistered] = useLazyQuery(IS_REGISTERED_QUERY)
  const [notYetRegisteredPopup, setNotYetRegisteredPopup] = useState(
    searchParams.has('forumMemberNotYetRegistered'),
  )

  const topic = watch('topic')

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
    switch (state) {
      case 'sending':
        return <p>Die Anmeldung wird gesendet...</p>
      case 'done':
        return (
          <>
            <h2>Vielen Dank für deine Anmeldung!</h2>
            <p>Wir melden uns in den nächsten Tagen bei Dir!</p>
          </>
        )
      default:
        return (
          <>
            {notYetRegisteredPopup && (
              <Modal isOpen={notYetRegisteredPopup} onClose={() => setNotYetRegisteredPopup(false)}>
                <h2>Du bist noch nicht registriert</h2>
                <p>
                  Du hast Dich über das Forum angemeldet, bist aber noch nicht als Aussteller
                  registriert.
                </p>
                <p>Bitte fülle das Formular aus, wenn Du Dich als Aussteller anmelden möchtest.</p>
              </Modal>
            )}
            <p className="intro">
              Hier kannst Du Dich für die{' '}
              <a
                href="https://www.classic-computing.de/cc2025/"
                target="_blank"
                rel="noreferrer nofollow">
                Classic Computing 2025
              </a>
              , die vom 12. bis zum 14. September 2025 in der Freiheitshalle in Hof stattfindet, als
              Aussteller anmelden. Die Daten, die Du in dieses Formular eingibst, werden für die
              Planung der Ausstellung verwendet und nach der Veranstaltung gelöscht. Deine
              Email-Adresse wird nur für die Kommunikation mit Dir im Zusammenhang mit der
              Ausstellung verwendet. Wir geben Deine Daten nicht an Dritte weiter.
            </p>
            <p className="intro">
              Nach Absendung des Formulars erhältst Du eine automatisch generierte Email mit einer
              Bestätigung Deiner Anmeldung. Bitte überprüfe auch Deinen Spam-Ordner, falls Du diese
              Email nicht nach einigen Minuten erhältst. Sobald wir Deine Anmeldung bearbeitet
              haben, melden wir uns persönlich mit einer Bestätigung bei Dir.
            </p>
            <form className="exhibitor-registration" onSubmit={handleSubmit(onSubmit)}>
              <fieldset>
                <label>
                  Name
                  <input
                    type="text"
                    autoComplete="name"
                    {...register('name', { required: true })}
                  />
                  {errors.name && <div className="validation-message">Ein Name wird benötigt</div>}
                </label>
                <label>
                  <input type="checkbox" {...register('vzekcMember')} />
                  Ich bin Mitglied im VzEkC e.V
                </label>
                <p />
                <label>
                  E-Mail Adresse
                  <input
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
                  {errors.email && <div className="validation-message">{errors.email.message}</div>}
                </label>
                <label>
                  Nickname (Benutzername) im Forum
                  <input type="text" autoComplete="nickname" {...register('nickname')} />
                </label>
                <label>
                  Registriert im Forum
                  <select {...register('forum')}>
                    <option>forum.classic-computing.de</option>
                    <option>www.a1k.org</option>
                    <option>forum.atari-home.de</option>
                    <option>forum64.de</option>
                    <option>anderes Forum</option>
                    <option>(kein Forum)</option>
                  </select>
                </label>
              </fieldset>
              <fieldset>
                <label>
                  Hauptthema meiner Ausstellung
                  <select {...register('topic', { required: true })}>
                    <option></option>
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
                  </select>
                </label>
                {errors.topic && (
                  <div className="validation-message">
                    Bitte wähle aus, was du ausstellen möchtest
                  </div>
                )}
                {topic?.includes('*') && (
                  <label>
                    Weitere Angaben
                    <input
                      type="text"
                      {...register('topicExtras', { required: true })}
                      disabled={!topic?.includes('*')}
                    />
                    {errors.topicExtras && (
                      <div className="validation-message">
                        Bitte erläutere, was du ausstellen möchtest
                      </div>
                    )}
                  </label>
                )}
              </fieldset>
              <fieldset>
                <label>
                  Teilnahme an folgenden Tagen:
                  <p />
                  <label>
                    <input type="checkbox" {...register('friday')} />
                    Freitag (12. September, nur Aussteller und persönliche Gäste)
                  </label>
                  <label>
                    <input type="checkbox" {...register('saturday')} />
                    Samstag (Publikumstag)
                  </label>
                  <label>
                    <input type="checkbox" {...register('sunday')} />
                    Sonntag (Publikumstag)
                  </label>
                </label>
              </fieldset>
              <fieldset>
                <label>
                  <input type="checkbox" {...register('setupHelper')} />
                  Ich unterstütze beim Aufbau der CC 2024 am Donnerstag
                </label>
                <label>
                  <input type="checkbox" {...register('gameCornerSupporter')} />
                  Ich unterstütze die Spiele-Ecke mit eigener Hardware
                </label>
                <label>
                  <input type="checkbox" {...register('dailyLunch')} />
                  Ich wünsche mir ein tägliches Mittagessen in der Halle (Möglichkeiten werden noch
                  geprüft)
                </label>
                <label>
                  <input type="checkbox" {...register('talk')} />
                  Ich plane einen Vortrag
                </label>
              </fieldset>
              <fieldset>
                <label>
                  Gewünschte Anzahl Tische (je 165cm x 80cm)
                  <select {...register('tables', { required: true })}>
                    <option></option>
                    <option value={0}>kein Tisch</option>
                    <option value={1}>1</option>
                    <option value={2}>2 (wenn verfügbar)</option>
                  </select>
                  {errors.name && (
                    <div className="validation-message">
                      Bitte wähle aus, wie viele Tische Deine Ausstellung belegen wird
                    </div>
                  )}
                </label>
                <label>
                  Ich wünsche mir einen Tisch neben:
                  <input type="text" {...register('tableNextTo')} />
                </label>
              </fieldset>
              <fieldset>
                <label>
                  Mitteilung ans Orga-Team:
                  <textarea rows={5} {...register('message')}></textarea>
                </label>
              </fieldset>
              <button type="submit">Anmeldung absenden</button>
            </form>
          </>
        )
    }
  }

  return (
    <div className="register-page">
      <div className="register-header">
        <h1>Classic Computing 2025</h1>
        <img src="/vzekc-logo-transparent-border.png" alt="VzEkC Logo" />
      </div>
      {content()}
      <footer>
        <p>
          <span>
            Die Classic Computing 2025 ist eine Veranstaltung des{' '}
            <a href="https://vzekc.de" target="_blank" rel="noreferrer nofollow">
              VzEkC e.V.
            </a>
          </span>
          <span className="footer-links">
            <a
              href="https://classic-computing.de/impressum"
              target="_blank"
              rel="noreferrer nofollow">
              Impressum
            </a>{' '}
            |{' '}
            <a
              href="https://forum.classic-computing.de/index.php?datenschutzerklaerung/"
              target="_blank"
              rel="noreferrer nofollow">
              Datenschutz
            </a>
          </span>
        </p>
      </footer>
    </div>
  )
}

export default Register
