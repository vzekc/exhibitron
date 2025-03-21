import { useState, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApolloClient, useLazyQuery, useMutation } from '@apollo/client'
import { useUser } from '../contexts/UserContext'
import { graphql } from 'gql.tada'

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
  const { user, reloadUser } = useUser()
  const email = watch('email')
  const password = watch('password')
  const [isForumUser] = useLazyQuery(IS_FORUM_USER)

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
      console.log('check state')
      if (password !== '') {
        setState('passwordEntered')
      } else if (email !== '') {
        setState('waitingForPassword')
        if (isValidEmail(email)) {
          const { data } = await isForumUser({ variables: { email } })
          if (data?.isForumUser) {
            setState('forumLogin')
          }
        }
      } else {
        setState('forumLogin')
      }
    }

    void checkState()
  }, [email, password, isForumUser])

  // If user is already logged in, redirect to the redirectUrl
  useEffect(() => {
    if (user) {
      // Clear the redirectUrl from session storage
      sessionStorage.removeItem('redirectUrl')
      navigate(redirectUrl, { replace: true })
    }
  }, [user, navigate, redirectUrl])

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

  const [login] = useMutation(
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
          await reloadUser()
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

  const forumLogin = () => {
    // Add redirect parameter to forum login
    const redirectParam = redirectUrl
      ? `?redirectUrl=${encodeURIComponent(window.location.origin + redirectUrl)}`
      : ''
    window.location.href = `/auth/forum${redirectParam}`
  }

  const loginHandler: SubmitHandler<Inputs> = async (inputs) => {
    const { email, password } = inputs
    await login({ variables: { email, password } })
  }

  const forgotPassword = () => {
    navigate('/requestPasswordReset')
  }

  // Button style to make them full width
  const buttonStyle = {
    width: '100%',
    marginBottom: '0.75rem',
  }

  return (
    <div className="container">
      <div className="grid">
        <div></div>
        <article>
          <header>
            <h1>Login</h1>
          </header>
          <form
            onSubmit={handleSubmit(loginHandler)}
            onChange={() => {
              setLoginFailed(false)
              setErrorMessage(null)
            }}>
            <div>
              <label htmlFor="email">
                Email-Adresse
                <input id="email" type="email" {...register('email', { required: true })} />
              </label>
            </div>
            <div>
              <label htmlFor="password">
                Passwort
                <input
                  id="password"
                  type="password"
                  {...register('password', { required: true })}
                />
              </label>
            </div>
            {/* Error message area - always takes up space */}
            <div style={{ minHeight: '1.5rem', marginBottom: '1rem' }}>
              {loginFailed && (
                <small style={{ color: 'var(--del-color)' }}>
                  {errorMessage || 'Unbekannte Email-Adresse oder falsches Passwort'}
                </small>
              )}
            </div>
            {state === 'forumLogin' ? (
              <button type="button" className="secondary" style={buttonStyle} onClick={forumLogin}>
                Über das VzEkC-Forum anmelden
              </button>
            ) : (
              <button
                type="submit"
                className="primary"
                style={buttonStyle}
                disabled={state !== 'passwordEntered'}>
                Login
              </button>
            )}
            <button type="button" className="outline" style={buttonStyle} onClick={forgotPassword}>
              Passwort vergessen
            </button>
          </form>
        </article>
        <div></div>
      </div>
    </div>
  )
}

export default Login
