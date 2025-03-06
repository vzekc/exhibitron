import { FastifyInstance, HookHandlerDoneFunction } from 'fastify'
import { ApolloServer } from '@apollo/server'
import resolvers from '../resolvers.js'
import { readFileSync } from 'node:fs'
import fastifyApollo from '@as-integrations/fastify'
import * as path from 'node:path'
import { createContext, destroyContext } from './context.js'

const typeDefs = readFileSync(path.join(__dirname, '../schema.graphql'), {
  encoding: 'utf-8',
})

const createServer = async () =>
  new ApolloServer({
    typeDefs,
    resolvers,
  })

export const register = async (app: FastifyInstance) => {
  const server = await createServer()
  app.register(fastifyApollo(server))

  app.addHook('onRequest', async (request, reply) => {
    request.apolloContext = await createContext(request, reply)
  })

  app.addHook('onResponse', async (request) => {
    await destroyContext(request.apolloContext)
  })

  await server.start()
}

export const createTestServer = async () => {
  const server = await createServer()
  await server.start()
  return server
}
