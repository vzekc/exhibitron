import { pino } from 'pino'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Ensure logs directory exists
const logsDir = 'logs'
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true })
}

// Determine if we're in production or testing
const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

// Create a base logger configuration
const createLoggerConfig = (name: string, customLogFile?: string) => {
  const targets = []

  // Console output - systemd friendly in production, pretty in development
  if (isProduction) {
    targets.push({
      target: 'pino/file',
      level: 'info',
      options: { destination: 1 }, // stdout
    })
  } else {
    targets.push({
      target: 'pino-pretty',
      level: 'info',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    })
  }

  // JSON file output - use custom file if provided, otherwise default to app.json
  const logFileName = customLogFile || 'app.json'
  targets.push({
    target: 'pino/file',
    level: 'info',
    options: {
      destination: join(logsDir, logFileName),
      mkdir: true,
    },
  })

  // Determine log level based on environment
  let logLevel = process.env.LOG_LEVEL || 'info'

  if (isTest) {
    // In test environment, use fatal level unless overridden by TEST_LOG_LEVEL
    logLevel = process.env.TEST_LOG_LEVEL || 'fatal'
  }

  return {
    level: logLevel,
    transport: {
      targets,
    },
    base: {
      service: 'exhibitron-backend',
      logger: name,
    },
  }
}

/*
 * A pino logger with transports owns a worker thread and a shared buffer for each
 * target, which live until the logger is garbage collected. The process holds one
 * logger per destination for its lifetime, and a request logs through a child of the
 * app logger, which shares its transports and adds the request id to every line.
 */
export const logger = pino(createLoggerConfig('app'))
export const mutationLogger = pino(createLoggerConfig('mutation', 'mutations.json'))

export const createRequestLogger = (requestId: string) => logger.child({ requestId })
