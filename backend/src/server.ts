import { bootstrap } from './app.js'

try {
  const { url } = await bootstrap({ port: 3000, migrate: true })
  console.log(`server started at ${url}`)
} catch (e) {
  console.error(e)
}
