import apolloClient from '../apolloClient.ts'
import { graphql } from 'gql.tada'

const REQUEST_PASSWORD_RESET = graphql(`
  mutation RequestPasswordReset($email: String!, $resetUrl: String!) {
    requestPasswordReset(email: $email, resetUrl: $resetUrl)
  }
`)

const makeResetUrl = () =>
  `${window.location.protocol}//${window.location.host}/resetPassword?token=`

export const requestPasswordReset = async (email: string) => {
  const resetUrl = makeResetUrl()
  await apolloClient.mutate({
    mutation: REQUEST_PASSWORD_RESET,
    variables: { email, resetUrl },
  })
}
