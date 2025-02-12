import { PoolClient } from 'pg'
import { ParameterizedContext } from 'koa'

interface User {
  name: string
  id: string
  is_administrator: boolean
}

interface State {
  db: PoolClient
}

interface AuthenticatedState extends State {
  user: User
}

export type Context = ParameterizedContext<State>
export type AuthenticatedContext = ParameterizedContext<AuthenticatedState>
