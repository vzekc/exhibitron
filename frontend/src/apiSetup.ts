import { client as backendClient } from './api/client.gen'

backendClient.setConfig({
  baseURL: '/api',
})
