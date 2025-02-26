import { useForm, SubmitHandler } from 'react-hook-form'
import * as backend from '../api/index'

import './Register.css'
import { useState } from 'react'

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
  tableWidth: number
  tableNextTo: string
  message: string
}

const Register = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<Inputs>({
    defaultValues: {
      friday: true,
      saturday: true,
      sunday: true,
    },
  })

  const [state, setState] = useState<'entering' | 'sending' | 'done'>(
    'entering',
  )

  const topic = watch('topic')

  const onSubmit: SubmitHandler<Inputs> = async (inputs) => {
    const { name, email, nickname, message, topic, topicExtras, ...data } =
      inputs
    setState('sending')
    const result = await backend.postRegistrationByEventId({
      path: { eventId: 'cc2025' },
      body: {
        name,
        email,
        nickname,
        topic: topicExtras ? topic.replace('*', topicExtras) : topic,
        message,
        data,
      },
      validateStatus: (status) => status == 204 || status == 409,
    })
    if (result.status === 409) {
      alert(
        'Die Email-Adresse ist bereits angemeldet! Nimm mit uns Kontakt auf, falls Du bisher keine Antwort auf Deine Anmeldung bekommen hast. Die Bearbeitung von Anmeldungen kann einige Zeit dauern',
      )
      setState('entering')
      return
    }
    console.log('posted', result.status)
    setState('done')
  }

  const content = () => {
    switch (state) {
      case 'sending':
        return <p>Die Anmeldung wird gesendet...</p>
      case 'done':
        return <p>Vielen Dank für deine Anmeldung!</p>
      default:
        return (
          <form
            className="exhibitor-registration"
            onSubmit={handleSubmit(onSubmit)}>
            <fieldset>
              <label>
                Nachname, Vorname
                <input
                  type="text"
                  autoComplete="name"
                  {...register('name', { required: true })}
                />
                {errors.name && (
                  <div className="validation-message">
                    Ein Name wird benötigt
                  </div>
                )}
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
                  {...register('email', { required: true })}
                />
                {errors.email && (
                  <div className="validation-message">
                    Eine Email-Adresse wird benötigt, damit wir Kontakt
                    aufnehmen können
                  </div>
                )}
              </label>
              <label>
                Nickname (Benutzername) im Forum
                <input
                  type="text"
                  autoComplete="nickname"
                  {...register('nickname')}
                />
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
                  Freitag
                </label>
                <label>
                  <input type="checkbox" {...register('saturday')} />
                  Samstag
                </label>
                <label>
                  <input type="checkbox" {...register('sunday')} />
                  Sonntag
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
                Ich wünsche mir ein tägliches Mittagessen in der Halle
                (Möglichkeiten werden noch geprüft)
              </label>
              <label>
                <input type="checkbox" {...register('talk')} />
                Ich plane einen Vortrag
              </label>
            </fieldset>
            <fieldset>
              <label>
                Gewünschte Anzahl Tische (je 165cm x 80cm)
                <select {...register('tableWidth', { required: true })}>
                  <option></option>
                  <option value={0}>kein Tisch</option>
                  <option value={1}>1</option>
                  <option value={2}>2 (wenn verfügbar)</option>
                </select>
                {errors.name && (
                  <div className="validation-message">
                    Bitte wähle aus, wie viele Tische Deine Ausstellung belegen
                    wird
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
        )
    }
  }
  return (
    <article>
      <h1>Aussteller-Registrierung</h1>
      {content()}
    </article>
  )
}

export default Register
