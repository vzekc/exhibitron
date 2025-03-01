import { useForm, SubmitHandler } from 'react-hook-form'
import { useUser } from '../contexts/UserContext.ts'
import ExhibitList from '../components/ExhibitList.tsx'

type Inputs = {
  fullName: string
}

const Profile = () => {
  const { user } = useUser()
  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<Inputs>({ defaultValues: user })

  const updateProfile: SubmitHandler<Inputs> = async (inputs) => {
    console.log('Update profile', inputs)
  }

  return (
    user && (
      <article>
        <h2>Aussteller-Profil</h2>
        <form onSubmit={handleSubmit(updateProfile)}>
          <fieldset>
            <label>
              Öffentlich angezeigter Name:
              <input
                type="string"
                {...register('fullName', { required: true })}
              />
            </label>
            <label>
              E-Mail: <p>{user.email}</p>
            </label>
          </fieldset>
          <button type="submit" disabled={!isDirty}>
            Profil aktualisieren
          </button>
        </form>
        <h2>Ausstellungen</h2>
        <p>
          {!user.exhibits ? (
            'Du hast noch keine Ausstellungen eingetragen.'
          ) : (
            <ExhibitList exhibits={user.exhibits} />
          )}
        </p>
        <button onClick={() => console.log('Add exhibit')}>
          Ausstellung hinzufügen
        </button>
      </article>
    )
  )
}

export default Profile
