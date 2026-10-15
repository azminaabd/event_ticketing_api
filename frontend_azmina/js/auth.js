function normalizeRole (role = '') {
  const value = String(role).trim().toUpperCase()
  if (value === 'ORGANIZER' || value === 'STAFF') return 'ORGANISER'
  return value
}

function saveSession (payload, fallbackEmail = '') {
  const source = payload?.data ?? payload
  const user = source?.user ?? payload?.user ?? source
  const token = payload?.token ?? source?.token ?? ''

  const normalizedUser = {
    user_id: Number(user?.user_id ?? user?.id ?? 0),
    name: user?.name ?? '',
    email: user?.email ?? fallbackEmail ?? '',
    role: normalizeRole(user?.role)
  }

  localStorage.setItem('eventra_user', JSON.stringify(normalizedUser))
  if (token) localStorage.setItem('eventra_token', token)
  return normalizedUser
}

function getCurrentUser () {
  try {
    const user = JSON.parse(localStorage.getItem('eventra_user') || 'null')
    if (user) user.role = normalizeRole(user.role)
    return user
  } catch {
    return null
  }
}

function logout () {
  localStorage.removeItem('eventra_user')
  localStorage.removeItem('eventra_token')
  const nested = /\/(admin|organiser|customer)\//.test(location.pathname)
  location.href = nested ? '../index.html' : 'index.html'
}

function requireRole (...roles) {
  const user = getCurrentUser()
  const allowed = roles.map(normalizeRole)

  if (!user || !user.user_id) {
    location.href = '../index.html'
    return null
  }

  if (!allowed.includes(user.role)) {
    toast('You do not have permission to open this page.', 'error')
    setTimeout(() => redirectByRole(user.role, true), 500)
    return null
  }

  return user
}

function redirectByRole (role, fromNested = false) {
  const prefix = fromNested ? '../' : ''
  const routes = {
    ADMIN: `${prefix}admin/dashboard.html`,
    ORGANISER: `${prefix}organiser/dashboard.html`,
    CUSTOMER: `${prefix}customer/dashboard.html`
  }
  location.href = routes[normalizeRole(role)] || `${prefix}index.html`
}
