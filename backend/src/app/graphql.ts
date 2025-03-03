import { FastifyInstance } from 'fastify'
import { ApolloServer } from '@apollo/server'
import resolvers from '../resolvers.js'
import { readFileSync } from 'node:fs'
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from '@as-integrations/fastify'

const typeDefs = readFileSync('../schema.graphql', { encoding: 'utf-8' })

export const register = async (app: FastifyInstance) => {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers: resolvers(),
    plugins: [fastifyApolloDrainPlugin(app)],
  })

  await apolloServer.start()
  app.register(fastifyApollo(apolloServer))
}
