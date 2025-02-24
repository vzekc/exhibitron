import Modal from './Modal.tsx'
import { useState } from 'react'
import * as backend from '../api/index'
import { useForm, SubmitHandler } from 'react-hook-form'

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
  const { register, handleSubmit } = useForm<Inputs>()

  const forumLogin = () => {
    window.location.href = '/auth/forum'
  }

  const login: SubmitHandler<Inputs> = async (inputs) => {
    const { email, password } = inputs
    const response = await backend.postUserLogin({
      body: { email, password },
      validateStatus: (status) => status == 200 || status == 401,
    })
    if (response.status == 401) {
      setLoginFailed(true)
    } else {
      window.location.reload()
    }
  }

  const forgotPassword = async () => {
    console.log('forgot password not implemented')
  }

  return (
    <Modal title="Login" isOpen={isOpen} onClose={onClose}>
      <form
        onSubmit={handleSubmit(login)}
        onChange={() => setLoginFailed(false)}>
        <label>
          Email-Adresse:{' '}
          <input type="email" {...register('email', { required: true })} />
        </label>
        <label>
          Password:{' '}
          <input
            type="password"
            {...register('password', { required: true })}
          />
        </label>
        <p className="login-failed">
          {loginFailed && 'Unbekannte Email-Adresse oder falsches Passwort'}
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
