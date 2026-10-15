function inferApiBase () {
  const parts = location.pathname.split('/').filter(Boolean)
  const projectFolder = parts.find(part => part.startsWith('event_ticketing_api'))
  return projectFolder
    ? `${location.origin}/${projectFolder}`
    : 'http://localhost/event_ticketing_api'
}

const API_BASE = inferApiBase()

const ENDPOINTS = {
  login: '/auth/login.php',
  register: '/users',
  users: '/users',
  events: '/events',
  venues: '/venues',
  bookings: '/bookings'
}

function endpoint (name, id = null) {
  const base = ENDPOINTS[name]
  if (!base) throw new Error(`Unknown endpoint: ${name}`)
  return id == null ? base : `${base}/${id}`
}

function unwrapData (payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return payload?.data ?? payload
}

async function apiFetch (path, options = {}) {
  const { silent = false, ...fetchOptions } = options
  const token = localStorage.getItem('eventra_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {})
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers })
  } catch (error) {
    if (!silent) toast('Cannot reach the API. Make sure Apache is running.', 'error')
    throw error
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload.error || payload.message || `Request failed (${response.status})`
    if (!silent) toast(message, 'error')
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

async function getCollection (name) {
  const payload = await apiFetch(endpoint(name))
  const data = unwrapData(payload)
  return Array.isArray(data) ? data : []
}

async function safeCollection (name) {
  try {
    const payload = await apiFetch(endpoint(name), { silent: true })
    const data = unwrapData(payload)
    return Array.isArray(data) ? data : []
  } catch (error) {
    return []
  }
}
