import { client as backendClient } from './api/client.gen'

backendClient.setConfig({
  baseURL: '/api',
})

backendClient.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config
      localStorage.setItem('originalUrl', originalRequest.url)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
