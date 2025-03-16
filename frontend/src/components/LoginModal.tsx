import Modal from './Modal.tsx'
import { useState, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gql, useMutation } from '@apollo/client'

type Inputs = {
  email: string
  password: string
}

type LoginModalProps = {
  isOpen: boolean
  onClose: () => void
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const [loginFailed, setLoginFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { register, handleSubmit } = useForm<Inputs>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [processedErrorParam, setProcessedErrorParam] = useState(false)

  // Process error parameter if present
  useEffect(() => {
    if (!processedErrorParam && searchParams.has('error')) {
      // Get the error message
      const error = searchParams.get('error')
      setErrorMessage(error)
      setLoginFailed(true)

      // Mark as processed
      setProcessedErrorParam(true)

      // Remove the parameter from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      navigate({ pathname: url.pathname, search: url.search }, { replace: true })
    }
  }, [searchParams, navigate, processedErrorParam])

  const [login] = useMutation(
    gql`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          id
          email
          fullName
        }
      }
    `,
    {
      onCompleted: (data) => {
        if (data.login) {
          window.location.reload()
        } else {
          setLoginFailed(true)
        }
      },
      onError: () => {
        setLoginFailed(true)
      },
    },
  )

  const forumLogin = () => {
    window.location.href = '/auth/forum'
  }

  const loginHandler: SubmitHandler<Inputs> = async (inputs) => {
    const { email, password } = inputs
    await login({ variables: { email, password } })
  }

  const forgotPassword = async () => {
    navigate('/requestPasswordReset')
    onClose()
  }

  return (
    <Modal title="Login" isOpen={isOpen} onClose={onClose}>
      <form
        onSubmit={handleSubmit(loginHandler)}
        onChange={() => {
          setLoginFailed(false)
          setErrorMessage(null)
        }}>
        <label>
          Email-Adresse: <input type="email" {...register('email', { required: true })} />
        </label>
        <label>
          Passwort: <input type="password" {...register('password', { required: true })} />
        </label>
        <p className="login-failed">
          {loginFailed && (errorMessage || 'Unbekannte Email-Adresse oder falsches Passwort')}
        </p>
        <button type="submit">Login</button>
        <button type="submit" className="outline" onClick={forgotPassword}>
          Passwort vergessen
        </button>
        <button type="submit" className="secondary" onClick={forumLogin}>
          Über das VzEkC-Forum anmelden
        </button>
      </form>
    </Modal>
  )
}

export default LoginModal
