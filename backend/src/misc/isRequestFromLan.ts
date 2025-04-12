import { FastifyRequest } from 'fastify'

const PRIVATE_IP_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^::1$/,
]

export const isRequestFromLan = (request: FastifyRequest): boolean =>
  PRIVATE_IP_RANGES.some((regex) => regex.test(request.ip))
