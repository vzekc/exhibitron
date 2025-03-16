import { useUser } from '../../contexts/UserContext.ts'
import { requestPasswordReset } from '../../utils/requestPasswordReset.ts'
import { useState } from 'react'
import Confirm from '../../components/Confirm.tsx'

const Account = () => {
  const { user } = useUser()
  const [passwordResetRequested, setPasswordResetRequested] = useState(false)
  const [deleteAccountRequested, setDeleteAccountRequested] = useState(false)
  if (!user) {
    return <div>Loading...</div>
  }

  const handlePasswordResetRequest = async () => {
    setPasswordResetRequested(true)
    await requestPasswordReset(user.email)
  }

  const handleConnectForumAccount = () => {
    console.log('Connecting account...')
  }
  const handleDeleteAccount = async () => {
    setDeleteAccountRequested(true)
  }
  const deleteAccount = async () => {
    console.log('deleteAccount')
  }

  return (
    <>
      <Confirm
        title="Account löschen?"
        message="Möchtest Du Deinen Account und alle Deine Exponate löschen?  Die Operation kann nicht rückgängig gemacht werden."
        confirm="Löschen"
        cancel="Abbrechen"
        onConfirm={deleteAccount}
        onClose={() => setDeleteAccountRequested(false)}
        isOpen={deleteAccountRequested}
      />
      <article>
        <label>
          Email-Adresse: <span>{user.email}</span>
        </label>
        <button onClick={handlePasswordResetRequest} disabled={passwordResetRequested}>
          Kennwort zurücksetzen
        </button>
        {!user.nickname && (
          <button onClick={handleConnectForumAccount}>Forum-Account verbinden</button>
        )}
        <button onClick={handleDeleteAccount}>Konto löschen</button>
      </article>
    </>
  )
}

export default Account
