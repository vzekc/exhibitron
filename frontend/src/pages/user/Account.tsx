import { useUser } from '../../contexts/UserContext.ts'
import { requestPasswordReset } from '../../utils/requestPasswordReset.ts'
import { useState, useEffect } from 'react'
import Confirm from '../../components/Confirm.tsx'
import './Account.css'

const Account = () => {
  const { user } = useUser()
  const [passwordResetRequested, setPasswordResetRequested] = useState(false)
  const [showResetMessage, setShowResetMessage] = useState(false)
  const [deleteAccountRequested, setDeleteAccountRequested] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    if (showResetMessage) {
      timer = window.setTimeout(() => {
        setShowResetMessage(false)
      }, 5000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [showResetMessage])

  if (!user) {
    return <div>Loading...</div>
  }

  const handlePasswordResetRequest = async () => {
    setPasswordResetRequested(true)
    setShowResetMessage(true)
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
      <article className="account-settings">
        <label>
          Email-Adresse: <span>{user.email}</span>
        </label>
        <div>
          {!showResetMessage ? (
            <button onClick={handlePasswordResetRequest} disabled={passwordResetRequested}>
              Kennwort zurücksetzen
            </button>
          ) : (
            <span className="reset-message">
              Du erhältst gleich eine Email mit einem Link zum Zurücksetzen Deines Kennworts.
            </span>
          )}
          {!user.nickname && (
            <button style={{ display: 'none' }} onClick={handleConnectForumAccount}>
              Forum-Account verbinden
            </button>
          )}
          <button style={{ display: 'none' }} className="danger" onClick={handleDeleteAccount}>
            Konto löschen
          </button>
        </div>
      </article>
    </>
  )
}

export default Account
