import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// Add request interceptor for better loading states
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response:`, response.status)
    return response
  },
  (error) => {
    if (!error.response) {
      // Network error or server not responding
      console.error('[API] Network error:', error)
      throw new Error('Unable to connect to server. Please check if the backend is running.')
    } else {
      console.error('[API] Error response:', error.response)
      if (error.response.status === 404) {
        throw new Error('Resource not found')
      } else if (error.response.status === 400) {
        throw new Error(error.response.data?.detail || 'Bad request')
      } else if (error.response.status === 500) {
        throw new Error('Internal server error. Please try again later.')
      }
      throw error
    }
  }
)
