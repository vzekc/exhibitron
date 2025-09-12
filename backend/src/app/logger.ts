import { pino } from 'pino'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Ensure logs directory exists
const logsDir = 'logs'
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true })
}

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production'

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

  return {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      targets,
    },
    base: {
      service: 'exhibitron-backend',
      logger: name,
    },
  }
}

// Create different loggers for different purposes
export const createAppLogger = () => pino(createLoggerConfig('app'))
export const createMutationLogger = () => pino(createLoggerConfig('mutation', 'mutations.json'))

// Create a request-scoped logger that includes request ID
export const createRequestLogger = (requestId: string) => {
  const baseLogger = createAppLogger()
  return baseLogger.child({ requestId })
}

// Default logger for general use
export const logger = createAppLogger()

// Export individual loggers for specific use cases
export const mutationLogger = createMutationLogger()
