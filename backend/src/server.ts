import { bootstrap } from './app.js'

try {
  const { url } = await bootstrap({
    port: 3001,
    migrate: false,
    logLevel: process.env.LOG_LEVEL ?? 'INFO',
  })
  console.log(`server started at ${url}`)
} catch (e) {
  console.error(e)
}
