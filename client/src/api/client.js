// Use environment variable or default to proxy
const API_BASE = import.meta.env.VITE_API_URL || ''

// Token management
export function getToken() {
  return localStorage.getItem('hubhacks_token')
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('hubhacks_token', token)
  } else {
    localStorage.removeItem('hubhacks_token')
  }
}

// Auth state change listeners (for 401 redirect)
const authListeners = []
export function onAuthChange(listener) {
  authListeners.push(listener)
  return () => {
    const idx = authListeners.indexOf(listener)
    if (idx >= 0) authListeners.splice(idx, 1)
  }
}

function notifyAuthChange() {
  authListeners.forEach(fn => fn())
}

// Request timeout in ms
const REQUEST_TIMEOUT = 30000

// API client with auth headers
export const api = {
  async request(method, path, data = null) {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json'
    }

    // Only send ngrok header in development
    if (import.meta.env.DEV) {
      headers['ngrok-skip-browser-warning'] = 'true'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Create AbortController for request timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    const options = {
      method,
      headers,
      signal: controller.signal
    }

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data)
    }

    const url = `${API_BASE}${path}`

    try {
      const response = await fetch(url, options)

      if (response.status === 401) {
        setToken(null)
        notifyAuthChange()
        throw new Error('Unauthorized')
      }

      // Handle non-JSON responses safely
      let json
      try {
        json = await response.json()
      } catch {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        json = {}
      }

      if (!response.ok) {
        throw new Error(json.error || `Request failed with status ${response.status}`)
      }

      return { data: json, status: response.status }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  },

  get(path) {
    return this.request('GET', path)
  },

  post(path, data) {
    return this.request('POST', path, data)
  },

  put(path, data) {
    return this.request('PUT', path, data)
  },

  delete(path) {
    return this.request('DELETE', path)
  }
}

// Snippets API
export const snippetsApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString()
    return api.get(`/v1/snippets${query ? `?${query}` : ''}`)
  },

  get(id) {
    return api.get(`/v1/snippets/${id}`)
  },

  create(data) {
    return api.post('/v1/snippets', data)
  },

  update(id, data) {
    return api.put(`/v1/snippets/${id}`, data)
  },

  delete(id) {
    return api.delete(`/v1/snippets/${id}`)
  },

  test(id, inputs) {
    return api.post(`/v1/snippets/${id}/test`, { inputs })
  }
}

// Secrets API
export const secretsApi = {
  list() {
    return api.get('/v1/secrets')
  },

  create(data) {
    return api.post('/v1/secrets', data)
  },

  update(name, data) {
    return api.put(`/v1/secrets/${name}`, data)
  },

  delete(name) {
    return api.delete(`/v1/secrets/${name}`)
  },

  verify(name) {
    return api.post(`/v1/secrets/${name}/verify`)
  }
}

// Logs API
export const logsApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString()
    return api.get(`/v1/logs${query ? `?${query}` : ''}`)
  },

  get(id) {
    return api.get(`/v1/logs/${id}`)
  },

  getStats(days = 7) {
    return api.get(`/v1/logs/stats/summary?days=${days}`)
  },

  getDailyStats(days = 7) {
    return api.get(`/v1/logs/stats/daily?days=${days}`)
  },

  getRecentErrors(limit = 10) {
    return api.get(`/v1/logs/errors/recent?limit=${limit}`)
  }
}

// Usage API
export const usageApi = {
  get(days = 30) {
    return api.get(`/v1/usage?days=${days}`)
  },

  getResources() {
    return api.get('/v1/usage/resources')
  },

  getTopSnippets() {
    return api.get('/v1/usage/top-snippets')
  },

  getWorkflows(days = 30) {
    return api.get(`/v1/usage/workflows?days=${days}`)
  },

  getHourly(days = 7) {
    return api.get(`/v1/usage/hourly?days=${days}`)
  }
}

// Templates API
export const templatesApi = {
  list() {
    return api.get('/v1/templates')
  }
}
