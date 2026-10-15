function toast (message, type = 'info') {
  let box = document.getElementById('toasts')
  if (!box) {
    box = document.createElement('div')
    box.id = 'toasts'
    document.body.appendChild(box)
  }
  const item = document.createElement('div')
  item.className = `toast ${type}`
  item.textContent = message
  box.appendChild(item)
  setTimeout(() => item.remove(), 3800)
}

function escapeHtml (value = '') {
  return String(value).replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c])
  )
}

function currency (value) {
  return `RM ${Number(value || 0).toFixed(2)}`
}

function formatDate (value) {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
}

function formatTime (value) {
  if (!value) return '—'
  return String(value).slice(0, 5)
}

function toApiTime (value) {
  if (!value) return ''
  return value.length === 5 ? `${value}:00` : value
}

function badge (status = '') {
  const s = String(status).toUpperCase()
  const cls =
    s === 'ACTIVE' || s === 'CONFIRMED' || s === 'COMPLETED'
      ? 'success'
      : s === 'PENDING'
      ? 'warning'
      : s === 'CANCELLED' || s === 'INACTIVE'
      ? 'danger'
      : 'neutral'
  return `<span class="badge ${cls}">${escapeHtml(s || '—')}</span>`
}

function setError (input, message = '') {
  input.classList.toggle('invalid', Boolean(message))
  const field = input.closest('.field')
  if (field) {
    const target = field.querySelector('.field-error')
    if (target) target.textContent = message
  }
  return !message
}

function togglePw (button) {
  const input = button.previousElementSibling
  const reveal = input.type === 'password'
  input.type = reveal ? 'text' : 'password'
  button.textContent = reveal ? 'Hide' : 'Show'
}

function setButtonLoading (button, loading, normalText) {
  if (!button) return
  if (!button.dataset.normalText)
    button.dataset.normalText = normalText || button.textContent
  button.disabled = loading
  button.textContent = loading ? 'Please wait...' : button.dataset.normalText
}

function emptyRow (colspan, message) {
  return `<tr><td colspan="${colspan}" class="empty-state">${escapeHtml(
    message
  )}</td></tr>`
}

function setCurrentUserLabel () {
  const user = getCurrentUser()
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user?.name || 'User'
  })
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = user?.role || ''
  })
}

function logoutAndGo () {
  logout()
}
