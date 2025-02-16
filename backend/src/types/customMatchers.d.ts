import {  } from 'fastify'

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveStatus(expectedStatusCode: number): Promise<R>
    }
  }
}
