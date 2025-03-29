import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import { requestPasswordReset } from '@utils/requestPasswordReset.ts'
import { useState, useEffect } from 'react'
import Confirm from '@components/Confirm.tsx'
import PageHeading from '@components/PageHeading.tsx'
import { FormSection, FormFieldGroup, FormLabel, SectionLabel } from '@components/Form.tsx'
import Button from '@components/Button.tsx'

const Account = () => {
  const { exhibitor } = useExhibitor()
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

  if (!exhibitor) {
    return <div>Loading...</div>
  }

  const handlePasswordResetRequest = async () => {
    setPasswordResetRequested(true)
    setShowResetMessage(true)
    await requestPasswordReset(exhibitor.user.email)
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
      <article className="space-y-6">
        <header>
          <PageHeading>Account-Einstellungen</PageHeading>
          <p className="mt-2 text-base text-gray-700">
            Hier kannst Du Deine Account-Einstellungen verwalten und Dein Konto löschen.
          </p>
        </header>

        <FormSection>
          <SectionLabel>Kontoinformationen</SectionLabel>
          <FormFieldGroup>
            <FormLabel>Email-Adresse</FormLabel>
            <div className="mt-1 text-gray-900">{exhibitor.user.email}</div>
          </FormFieldGroup>
        </FormSection>

        <FormSection>
          <SectionLabel>Kennwort</SectionLabel>
          <FormFieldGroup>
            {!showResetMessage ? (
              <Button onClick={handlePasswordResetRequest} disabled={passwordResetRequested}>
                Kennwort zurücksetzen
              </Button>
            ) : (
              <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
                Du erhältst gleich eine Email mit einem Link zum Zurücksetzen Deines Kennworts.
              </div>
            )}
          </FormFieldGroup>
        </FormSection>

        {!exhibitor.user.nickname && (
          <FormSection>
            <SectionLabel>Forum-Account</SectionLabel>
            <FormFieldGroup>
              <Button onClick={handleConnectForumAccount}>Forum-Account verbinden</Button>
            </FormFieldGroup>
          </FormSection>
        )}

        <FormSection>
          <SectionLabel>Konto löschen</SectionLabel>
          <FormFieldGroup>
            <Button onClick={handleDeleteAccount} variant="danger">
              Konto löschen
            </Button>
          </FormFieldGroup>
        </FormSection>
      </article>
    </>
  )
}

export default Account
