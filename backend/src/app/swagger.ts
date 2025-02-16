import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { FastifyInstance } from 'fastify'

export const register = async (app: FastifyInstance) => {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'CC-Katalog API',
        description: 'API Server for the CC-Katalog Application',
        version: '0.1.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
    },
  })

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  })
};
