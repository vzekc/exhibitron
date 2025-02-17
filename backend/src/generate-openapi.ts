import { createApp } from './app.js'
import * as fs from 'node:fs'

const app = await createApp()
await app.ready()
const openapiSpec = app.swagger()

const specPath = 'dist/openapi.json'
fs.writeFileSync(specPath, JSON.stringify(openapiSpec, null, 2))

console.log('✅ OpenAPI spec generated:', specPath)
