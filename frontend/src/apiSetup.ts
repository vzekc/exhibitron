import { client as backendClient } from './api/client.gen'

backendClient.setConfig({
  baseURL: '/api',
})

backendClient.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event('showLoginModal'))
    }
    return Promise.reject(error)
  },
)
