import { bootstrap } from './app.js'

try {
  const { url } = await bootstrap({
    host: '::',
    /* 3001 is what the proxy in front of this expects; PORT is for a second
       one beside it, such as the startup check in CI. */
    port: Number(process.env.PORT ?? 3001),
    migrate: false,
    logLevel: process.env.LOG_LEVEL ?? 'INFO',
  })
  console.log(`server started at ${url}`)
} catch (e) {
  /* Whoever started this — a container, a service manager, the check in CI —
     learns from the exit code that there is no server here. */
  console.error(e)
  process.exit(1)
}
