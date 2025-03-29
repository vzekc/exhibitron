import { useState, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'
import { graphql } from 'gql.tada'
import PageHeading from '../components/PageHeading'
import '../styles/auth.css'
import { ExhibitorProvider } from '@contexts/ExhibitorProvider.tsx'

type Inputs = {
  email: string
  password: string
}

const IS_FORUM_USER = graphql(`
  query IsForumUser($email: String!) {
    isForumUser(email: $email)
  }
`)

type State = 'forumLogin' | 'waitingForPassword' | 'passwordEntered'

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const isValidEmail = (email: string) => emailPattern.test(email)

const Login = () => {
  const [loginFailed, setLoginFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { register, handleSubmit, watch } = useForm<Inputs>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [processedErrorParam, setProcessedErrorParam] = useState(false)
  const [processedRedirectParam, setProcessedRedirectParam] = useState(false)
  const [state, setState] = useState<State>('forumLogin')
  const apolloClient = useApolloClient()
  const { exhibitor, reloadExhibitor } = useExhibitor()
  const email = watch('email')
  const password = watch('password')
  const [isForumUser] = useLazyQuery(IS_FORUM_USER)
  const [login, { loading: loggingIn }] = useMutation(
    graphql(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          id
          email
          fullName
        }
      }
    `),
    {
      onCompleted: async (data) => {
        if (data.login) {
          await apolloClient.clearStore()
          await reloadExhibitor()
          // Redirect will happen in the useEffect above
        } else {
          setLoginFailed(true)
        }
      },
      onError: (error) => {
        console.log('Login error:', error)
        setLoginFailed(true)
      },
    },
  )

  // Get redirectUrl from query parameter or session storage
  const redirectUrl =
    searchParams.get('redirectUrl') || sessionStorage.getItem('redirectUrl') || '/'

  // Store redirectUrl in session storage and remove it from URL if it's in the query parameters
  useEffect(() => {
    if (!processedRedirectParam && searchParams.get('redirectUrl')) {
      // Store in session storage
      sessionStorage.setItem('redirectUrl', searchParams.get('redirectUrl')!)

      // Remove from URL
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('redirectUrl')
      setSearchParams(newSearchParams, { replace: true })

      setProcessedRedirectParam(true)
    }
  }, [searchParams, setSearchParams, processedRedirectParam])

  useEffect(() => {
    const checkState = async () => {
      setLoginFailed(false)
      if (email !== '') {
        if (isValidEmail(email)) {
          const { data } = await isForumUser({ variables: { email } })
          if (data?.isForumUser && !password) {
            setState('forumLogin')
          } else {
            setState('passwordEntered')
          }
        } else {
          setState('passwordEntered')
        }
      } else {
        setState('forumLogin')
      }
    }

    void checkState()
  }, [email, password, isForumUser])

  // If user is already logged in, redirect to the redirectUrl
  useEffect(() => {
    if (exhibitor) {
      // Clear the redirectUrl from session storage
      sessionStorage.removeItem('redirectUrl')
      navigate(redirectUrl, { replace: true })
    }
  }, [exhibitor, navigate, redirectUrl])

  // Process error parameter if present
  useEffect(() => {
    if (!processedErrorParam && searchParams.has('error')) {
      const error = searchParams.get('error')
      setErrorMessage(error)
      setLoginFailed(true)

      // Remove error from URL
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('error')
      setSearchParams(newSearchParams, { replace: true })

      setProcessedErrorParam(true)
    }
  }, [searchParams, setSearchParams, processedErrorParam])

  const forumLogin = () => {
    // Add redirect parameter to forum login
    const redirectParam = redirectUrl
      ? `?redirectUrl=${encodeURIComponent(window.location.origin + redirectUrl)}`
      : ''
    window.location.href = `/auth/forum${redirectParam}`
  }

  const loginHandler: SubmitHandler<Inputs> = async (inputs) => {
    const { email, password } = inputs
    setLoginFailed(false)
    await login({ variables: { email, password } })
  }

  const forgotPassword = () => {
    navigate('/requestPasswordReset')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="auth-container">
        <article>
          <header className="mb-8">
            <PageHeading>Login</PageHeading>
          </header>
          <form
            className="auth-form"
            onSubmit={handleSubmit(loginHandler)}
            onChange={() => {
              setLoginFailed(false)
              setErrorMessage(null)
            }}>
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">
                Email-Adresse
                <input
                  id="email"
                  type="email"
                  className="auth-input"
                  {...register('email', { required: true })}
                />
              </label>
            </div>
            <div className={`auth-form-group ${email === '' ? 'password-input-hidden' : ''}`}>
              <label htmlFor="password" className="auth-label">
                Passwort
                <input
                  id="password"
                  type="password"
                  className="auth-input"
                  {...register('password', { required: true })}
                />
              </label>
            </div>
            {/* Error message area */}
            <div className="min-h-[24px]">
              {loginFailed && (
                <div className="auth-error">{errorMessage || 'Ungültige Login-Informationen'}</div>
              )}
            </div>
            {state === 'forumLogin' ? (
              <button type="button" className="auth-button" onClick={forumLogin}>
                Über das VzEkC-Forum anmelden
              </button>
            ) : (
              <button
                type="submit"
                className="auth-button"
                disabled={state !== 'passwordEntered' || loggingIn}>
                Login
              </button>
            )}
            <button type="button" className="auth-button-secondary" onClick={forgotPassword}>
              Passwort vergessen
            </button>
          </form>
        </article>
      </div>
    </div>
  )
}

export default function LoginWithProvider() {
  return (
    <ExhibitorProvider>
      <Login />
    </ExhibitorProvider>
  )
}
