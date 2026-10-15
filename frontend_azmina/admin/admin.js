/* =========================================================
   GLOBAL DATA
   ========================================================= */

let adminUsers = []
let adminVenues = []
let adminBookings = []

/* =========================================================
   PAGINATION
   ========================================================= */

let adminUserPage = 1
let adminVenuePage = 1
let adminBookingPage = 1

const adminUserLimit = 5
const adminVenueLimit = 5
const adminBookingLimit = 5

function getTotalPages (items, limit) {
  return Math.max(1, Math.ceil(items.length / limit))
}

function getPageItems (items, page, limit) {
  const start = (page - 1) * limit

  return items.slice(start, start + limit)
}

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

async function initAdminDashboard () {
  requireRole('ADMIN')

  setCurrentUserLabel()

  const [users, events, venues, bookings] = await Promise.all([
    safeCollection('users'),
    safeCollection('events'),
    safeCollection('venues'),
    safeCollection('bookings')
  ])

  document.getElementById('statUsers').textContent = users.length || '—'

  document.getElementById('statEvents').textContent = events.length

  document.getElementById('statVenues').textContent = venues.length

  document.getElementById('statBookings').textContent = bookings.length || '—'

  const rows = events
    .slice(-5)
    .reverse()
    .map(
      event => `
          <tr>

            <td>
              <strong>
                ${escapeHtml(event.event_name)}
              </strong>
            </td>

            <td>
              ${formatDate(event.event_date)}
            </td>

            <td>
              ${escapeHtml(event.available_tickets ?? event.ticket_quantity)}
            </td>

            <td>
              ${badge(event.status)}
            </td>

          </tr>
        `
    )
    .join('')

  document.getElementById('recentEvents').innerHTML =
    rows || emptyRow(4, 'No events found.')
}

/* =========================================================
   USERS PAGE
   ========================================================= */

async function initUsersPage () {
  requireRole('ADMIN')

  setCurrentUserLabel()

  const form = document.getElementById('userForm')

  if (form) {
    form.addEventListener('submit', createUserAccount)
  }

  await loadUsers()
}

/* =========================================================
   LOAD USERS
   ========================================================= */

async function loadUsers () {
  adminUsers = await getCollection('users')

  renderUsers()
}

/* =========================================================
   RENDER USERS
   ========================================================= */

function renderUsers () {
  const totalPages = getTotalPages(adminUsers, adminUserLimit)

  if (adminUserPage > totalPages) {
    adminUserPage = totalPages
  }

  const pageUsers = getPageItems(adminUsers, adminUserPage, adminUserLimit)

  document.getElementById('userRows').innerHTML =
    pageUsers

      .map(user => {
        const id = Number(user.user_id ?? user.id)

        const role = normalizeRole(user.role)

        let actionButtons = ''

        /* ADMIN */

        if (role === 'ADMIN') {
          actionButtons = `
              <button
                class="table-btn"
                type="button"
                onclick="viewUser(${id})"
              >
                View
              </button>
            `
        } else if (role === 'ORGANISER') {

        /* ORGANISER */
          actionButtons = `
              <button
                class="table-btn"
                type="button"
                onclick="viewUser(${id})"
              >
                View
              </button>

              <button
                class="table-btn"
                type="button"
                onclick="editUser(${id})"
              >
                Edit
              </button>
            `
        } else {

        /* CUSTOMER */
          actionButtons = `
              <button
                class="table-btn"
                type="button"
                onclick="viewUser(${id})"
              >
                View
              </button>

              <button
                class="table-btn"
                type="button"
                onclick="editUser(${id})"
              >
                Edit
              </button>

              <button
                class="table-btn danger"
                type="button"
                onclick="deleteUser(${id})"
              >
                Delete
              </button>
            `
        }

        return `
            <tr>

              <td>
                ${escapeHtml(id)}
              </td>

              <td>
                <strong>
                  ${escapeHtml(user.name)}
                </strong>
              </td>

              <td>
                ${badge(user.role)}
              </td>

              <td>
                ${escapeHtml(user.created_at || '—')}
              </td>

              <td class="actions">
                ${actionButtons}
              </td>

            </tr>
          `
      })

      .join('') || emptyRow(5, 'No users found.')

  const pageInfo = document.getElementById('userPageInfo')

  if (pageInfo) {
    pageInfo.textContent = `Page ${adminUserPage} of ${totalPages}`
  }

  const prev = document.getElementById('userPrevBtn')

  if (prev) {
    prev.disabled = adminUserPage <= 1
  }

  const next = document.getElementById('userNextBtn')

  if (next) {
    next.disabled = adminUserPage >= totalPages
  }
}

/* =========================================================
   USER PAGINATION
   ========================================================= */

function previousUserPage () {
  if (adminUserPage <= 1) {
    return
  }

  adminUserPage--

  renderUsers()
}

function nextUserPage () {
  const totalPages = getTotalPages(adminUsers, adminUserLimit)

  if (adminUserPage >= totalPages) {
    return
  }

  adminUserPage++

  renderUsers()
}

/* =========================================================
   RESET USER FORM
   ========================================================= */

function resetUserForm () {
  const form = document.getElementById('userForm')

  if (form) {
    form.reset()
  }

  const role = document.getElementById('userRole')

  if (role) {
    role.value = 'CUSTOMER'
  }
}

/* =========================================================
   CREATE USER
   ========================================================= */

async function createUserAccount (event) {
  event.preventDefault()

  const name = document.getElementById('userName').value.trim()

  const email = document.getElementById('userEmail').value.trim()

  const password = document.getElementById('userPassword').value

  const role = document.getElementById('userRole').value

  if (!name) {
    toast('Enter the user name.', 'error')

    return
  }

  if (!email) {
    toast('Enter the email address.', 'error')

    return
  }

  if (password.length < 8) {
    toast('Password must contain at least 8 characters.', 'error')

    return
  }

  if (!['CUSTOMER', 'ORGANISER'].includes(role)) {
    toast('Select a valid account role.', 'error')

    return
  }

  await apiFetch(endpoint('users'), {
    method: 'POST',

    body: JSON.stringify({
      name,
      email,
      password,
      role
    })
  })

  toast(
    `${role === 'ORGANISER' ? 'Organiser' : 'Customer'} account created.`,
    'success'
  )

  resetUserForm()

  await loadUsers()

  adminUserPage = getTotalPages(adminUsers, adminUserLimit)

  renderUsers()
}

/* =========================================================
   VIEW USER
   ========================================================= */

function viewUser (id) {
  const user = adminUsers.find(
    item => Number(item.user_id ?? item.id) === Number(id)
  )

  if (!user) {
    toast('User not found.', 'error')

    return
  }

  document.getElementById('viewUserId').value = user.user_id ?? user.id ?? ''

  document.getElementById('viewUserName').value = user.name ?? ''

  document.getElementById('viewUserRole').value = user.role ?? ''

  document.getElementById('viewUserCreated').value = user.created_at ?? '—'

  document.getElementById('viewUserDialog').showModal()
}

function closeViewUser () {
  const dialog = document.getElementById('viewUserDialog')

  if (dialog && dialog.open) {
    dialog.close()
  }
}

/* =========================================================
   EDIT USER
   ========================================================= */

function editUser (id) {
  const user = adminUsers.find(
    item => Number(item.user_id ?? item.id) === Number(id)
  )

  if (!user) {
    toast('User not found.', 'error')

    return
  }

  const role = normalizeRole(user.role)

  if (role === 'ADMIN') {
    toast('Administrator role cannot be edited.', 'error')

    return
  }

  document.getElementById('editUserId').value = user.user_id ?? user.id

  document.getElementById('editUserName').value = user.name ?? ''

  document.getElementById('editUserRole').value = role

  document.getElementById('editUserDialog').showModal()
}

function closeEditUser () {
  const dialog = document.getElementById('editUserDialog')

  if (dialog && dialog.open) {
    dialog.close()
  }
}

/* =========================================================
   UPDATE USER ROLE
   ========================================================= */

async function updateUserRole () {
  const id = Number(document.getElementById('editUserId').value)

  const role = document.getElementById('editUserRole').value

  if (!id) {
    toast('Invalid user.', 'error')

    return
  }

  if (!['CUSTOMER', 'ORGANISER'].includes(role)) {
    toast('Role must be Customer or Organiser.', 'error')

    return
  }

  await apiFetch(endpoint('users', id), {
    method: 'PATCH',

    body: JSON.stringify({
      role
    })
  })

  toast(`User role updated to ${role}.`, 'success')

  closeEditUser()

  await loadUsers()
}

/* =========================================================
   DELETE USER
   ========================================================= */

async function deleteUser (id) {
  const user = adminUsers.find(
    item => Number(item.user_id ?? item.id) === Number(id)
  )

  if (!user) {
    toast('User not found.', 'error')

    return
  }

  if (normalizeRole(user.role) !== 'CUSTOMER') {
    toast('Only customer accounts can be deleted.', 'error')

    return
  }

  if (!confirm(`Delete customer account "${user.name}"?`)) {
    return
  }

  await apiFetch(endpoint('users', id), {
    method: 'DELETE'
  })

  toast('Customer account deleted.', 'success')

  await loadUsers()
}

/* =========================================================
   VENUES PAGE
   ========================================================= */

async function initVenuesPage () {
  requireRole('ADMIN')

  setCurrentUserLabel()

  const form = document.getElementById('venueForm')

  if (form) {
    form.addEventListener('submit', saveVenue)
  }

  await loadVenues()
}

/* =========================================================
   LOAD VENUES
   ========================================================= */

async function loadVenues () {
  adminVenues = await getCollection('venues')

  renderVenues()
}

/* =========================================================
   RENDER VENUES
   ========================================================= */

function renderVenues () {
  const totalPages = getTotalPages(adminVenues, adminVenueLimit)

  if (adminVenuePage > totalPages) {
    adminVenuePage = totalPages
  }

  const pageVenues = getPageItems(adminVenues, adminVenuePage, adminVenueLimit)

  document.getElementById('venueRows').innerHTML =
    pageVenues

      .map(
        venue => `
          <tr>

            <td>
              ${escapeHtml(venue.venue_id)}
            </td>

            <td>
              <strong>
                ${escapeHtml(venue.venue_name)}
              </strong>
            </td>

            <td>
              ${escapeHtml(venue.location)}
            </td>

            <td>
              ${escapeHtml(venue.capacity)}
            </td>

            <td>
              ${badge(venue.status)}
            </td>

            <td class="actions">

              <button
                class="table-btn"
                type="button"
                onclick="editVenue(${Number(venue.venue_id)})"
              >
                Edit
              </button>

              <button
                class="table-btn danger"
                type="button"
                onclick="deleteVenue(${Number(venue.venue_id)})"
              >
                Delete
              </button>

            </td>

          </tr>
        `
      )

      .join('') || emptyRow(6, 'No venues found.')

  const pageInfo = document.getElementById('venuePageInfo')

  if (pageInfo) {
    pageInfo.textContent = `Page ${adminVenuePage} of ${totalPages}`
  }

  const prev = document.getElementById('venuePrevBtn')

  if (prev) {
    prev.disabled = adminVenuePage <= 1
  }

  const next = document.getElementById('venueNextBtn')

  if (next) {
    next.disabled = adminVenuePage >= totalPages
  }
}

/* =========================================================
   VENUE PAGINATION
   ========================================================= */

function previousVenuePage () {
  if (adminVenuePage <= 1) {
    return
  }

  adminVenuePage--

  renderVenues()
}

function nextVenuePage () {
  const totalPages = getTotalPages(adminVenues, adminVenueLimit)

  if (adminVenuePage >= totalPages) {
    return
  }

  adminVenuePage++

  renderVenues()
}

/* =========================================================
   EDIT VENUE
   ========================================================= */

function editVenue (id) {
  const venue = adminVenues.find(item => Number(item.venue_id) === Number(id))

  if (!venue) {
    toast('Venue not found.', 'error')

    return
  }

  document.getElementById('venueId').value = venue.venue_id

  document.getElementById('venueName').value = venue.venue_name || ''

  document.getElementById('venueLocation').value = venue.location || ''

  document.getElementById('venueCapacity').value = venue.capacity || ''

  document.getElementById('venueStatus').value = venue.status || 'ACTIVE'

  const title = document.getElementById('venueFormTitle')

  if (title) {
    title.textContent = 'Update Venue'
  }

  const description = document.getElementById('venueFormDescription')

  if (description) {
    description.textContent = 'Update the selected venue information.'
  }

  const submit = document.getElementById('venueSubmitBtn')

  if (submit) {
    submit.textContent = 'Update Venue'
  }

  const clear = document.getElementById('venueClearBtn')

  if (clear) {
    clear.textContent = 'Cancel'
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

/* =========================================================
   RESET VENUE
   ========================================================= */

function resetVenueForm () {
  const form = document.getElementById('venueForm')

  if (form) {
    form.reset()
  }

  document.getElementById('venueId').value = ''

  document.getElementById('venueStatus').value = 'ACTIVE'

  const title = document.getElementById('venueFormTitle')

  if (title) {
    title.textContent = 'Create New Venue'
  }

  const description = document.getElementById('venueFormDescription')

  if (description) {
    description.textContent = 'Add a new venue to the system.'
  }

  const submit = document.getElementById('venueSubmitBtn')

  if (submit) {
    submit.textContent = 'Create Venue'
  }

  const clear = document.getElementById('venueClearBtn')

  if (clear) {
    clear.textContent = 'Clear'
  }
}

/* =========================================================
   SAVE VENUE
   ========================================================= */

async function saveVenue (event) {
  event.preventDefault()

  const id = document.getElementById('venueId').value

  const venueName = document.getElementById('venueName').value.trim()

  const location = document.getElementById('venueLocation').value.trim()

  const capacity = Number(document.getElementById('venueCapacity').value)

  const status = document.getElementById('venueStatus').value

  if (!venueName) {
    toast('Enter the venue name.', 'error')

    return
  }

  if (!location) {
    toast('Enter the venue location.', 'error')

    return
  }

  if (!Number.isInteger(capacity) || capacity < 1) {
    toast('Capacity must be at least 1.', 'error')

    return
  }

  const body = {
    venue_name: venueName,

    location,

    capacity,

    status
  }

  if (id) {
    await apiFetch(endpoint('venues', id), {
      method: 'PUT',

      body: JSON.stringify(body)
    })

    toast('Venue updated successfully.', 'success')
  } else {
    await apiFetch(endpoint('venues'), {
      method: 'POST',

      body: JSON.stringify(body)
    })

    toast('Venue created successfully.', 'success')
  }

  resetVenueForm()

  await loadVenues()

  if (!id) {
    adminVenuePage = getTotalPages(adminVenues, adminVenueLimit)

    renderVenues()
  }
}

/* =========================================================
   DELETE VENUE
   ========================================================= */

async function deleteVenue (id) {
  if (!confirm('Delete this venue? Venues used by events cannot be deleted.')) {
    return
  }

  await apiFetch(endpoint('venues', id), {
    method: 'DELETE'
  })

  toast('Venue deleted.', 'success')

  await loadVenues()
}

/* =========================================================
   BOOKINGS PAGE
   ========================================================= */

async function initBookingsPage () {
  requireRole('ADMIN')

  setCurrentUserLabel()

  const searchInput = document.getElementById('bookingSearch')

  const statusFilter = document.getElementById('bookingStatusFilter')

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      adminBookingPage = 1

      renderBookings()
    })
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      adminBookingPage = 1

      renderBookings()
    })
  }

  await loadBookings()
}

/* =========================================================
   LOAD BOOKINGS
   ========================================================= */

async function loadBookings () {
  adminBookings = await getCollection('bookings')

  /* newest booking first */

  adminBookings.sort((a, b) => Number(b.booking_id) - Number(a.booking_id))

  renderBookings()
}

/* =========================================================
   FILTER BOOKINGS
   ========================================================= */

function filteredAdminBookings () {
  const search =
    document.getElementById('bookingSearch')?.value.trim().toLowerCase() || ''

  const status =
    document.getElementById('bookingStatusFilter')?.value.toUpperCase() || ''

  return adminBookings.filter(booking => {
    const bookingStatus = String(booking.booking_status || '').toUpperCase()

    const searchText = `
          ${booking.booking_id || ''}
          ${booking.customer_name || ''}
          ${booking.event_name || ''}
        `.toLowerCase()

    const matchesSearch = !search || searchText.includes(search)

    const matchesStatus = !status || bookingStatus === status

    return matchesSearch && matchesStatus
  })
}

/* =========================================================
   RENDER BOOKINGS
   ========================================================= */

function renderBookings () {
  const filtered = filteredAdminBookings()

  const totalPages = getTotalPages(filtered, adminBookingLimit)

  if (adminBookingPage > totalPages) {
    adminBookingPage = totalPages
  }

  const pageBookings = getPageItems(
    filtered,
    adminBookingPage,
    adminBookingLimit
  )

  document.getElementById('bookingRows').innerHTML =
    pageBookings

      .map(booking => {
        const id = Number(booking.booking_id)

        const status = String(booking.booking_status || '').toUpperCase()

        let actionButtons = ''

        /* CANCELLED = VIEW ONLY */

        if (status === 'CANCELLED') {
          actionButtons = `
              <button
                class="table-btn"
                type="button"
                onclick="viewBooking(${id})"
              >
                View
              </button>
            `
        } else {
          actionButtons = `
              <button
                class="table-btn"
                type="button"
                onclick="viewBooking(${id})"
              >
                View
              </button>

              <button
                class="table-btn"
                type="button"
                onclick="editBooking(${id})"
              >
                Edit
              </button>
            `
        }

        return `
            <tr>

              <td>
                ${escapeHtml(id)}
              </td>

              <td>
                <strong>
                  ${escapeHtml(booking.customer_name || '—')}
                </strong>
              </td>

              <td>
                ${escapeHtml(booking.event_name || '—')}
              </td>

              <td>
                ${escapeHtml(booking.quantity)}
              </td>

              <td>
                RM ${Number(booking.total_price || 0).toFixed(2)}
              </td>

              <td>
                ${badge(booking.booking_status)}
              </td>

              <td>
                ${escapeHtml(booking.booking_date || '—')}
              </td>

              <td class="actions">
                ${actionButtons}
              </td>

            </tr>
          `
      })

      .join('') || emptyRow(8, 'No matching bookings found.')

  const pageInfo = document.getElementById('bookingPageInfo')

  if (pageInfo) {
    pageInfo.textContent = `Page ${adminBookingPage} of ${totalPages}`
  }

  const prev = document.getElementById('bookingPrevBtn')

  if (prev) {
    prev.disabled = adminBookingPage <= 1
  }

  const next = document.getElementById('bookingNextBtn')

  if (next) {
    next.disabled = adminBookingPage >= totalPages
  }

  const pagination = document.getElementById('adminBookingPagination')

  if (pagination) {
    pagination.style.display =
      filtered.length > adminBookingLimit ? 'flex' : 'none'
  }
}

/* =========================================================
   BOOKING PAGINATION
   ========================================================= */

function previousAdminBookingPage () {
  if (adminBookingPage <= 1) {
    return
  }

  adminBookingPage--

  renderBookings()
}

function nextAdminBookingPage () {
  const filtered = filteredAdminBookings()

  const totalPages = getTotalPages(filtered, adminBookingLimit)

  if (adminBookingPage >= totalPages) {
    return
  }

  adminBookingPage++

  renderBookings()
}

/* =========================================================
   VIEW BOOKING
   ========================================================= */

function viewBooking (id) {
  const booking = adminBookings.find(
    item => Number(item.booking_id) === Number(id)
  )

  if (!booking) {
    toast('Booking not found.', 'error')

    return
  }

  document.getElementById('viewBookingId').value = booking.booking_id

  document.getElementById('viewBookingCustomer').value =
    booking.customer_name || '—'

  document.getElementById('viewBookingEvent').value = booking.event_name || '—'

  document.getElementById('viewBookingQuantity').value = booking.quantity

  document.getElementById('viewBookingTotal').value = `RM ${Number(
    booking.total_price || 0
  ).toFixed(2)}`

  document.getElementById('viewBookingStatus').value = String(
    booking.booking_status || ''
  ).toUpperCase()

  document.getElementById('viewBookingDate').value = booking.booking_date || '—'

  document.getElementById('viewBookingDialog').showModal()
}

/* =========================================================
   CLOSE VIEW BOOKING
   ========================================================= */

function closeViewBooking () {
  const dialog = document.getElementById('viewBookingDialog')

  if (dialog && dialog.open) {
    dialog.close()
  }
}

/* =========================================================
   EDIT BOOKING
   ========================================================= */

function editBooking (id) {
  const booking = adminBookings.find(
    item => Number(item.booking_id) === Number(id)
  )

  if (!booking) {
    toast('Booking not found.', 'error')

    return
  }

  const currentStatus = String(booking.booking_status || '').toUpperCase()

  /* CANCELLED = FINAL */

  if (currentStatus === 'CANCELLED') {
    toast('Cancelled bookings cannot be updated.', 'error')

    return
  }

  document.getElementById('editBookingId').value = booking.booking_id

  document.getElementById('editBookingCustomer').value =
    booking.customer_name || '—'

  document.getElementById('editBookingEvent').value = booking.event_name || '—'

  /* CURRENT DATABASE STATUS */

  document.getElementById('editBookingCurrentStatus').value = currentStatus

  const statusSelect = document.getElementById('editBookingStatus')

  /* =====================================================
     PENDING
     ===================================================== */

  if (currentStatus === 'PENDING') {
    statusSelect.innerHTML = `
      <option value="PENDING">
        Pending
      </option>

      <option value="CONFIRMED">
        Confirmed
      </option>

      <option value="CANCELLED">
        Cancelled
      </option>
    `
  } else if (currentStatus === 'CONFIRMED') {

  /* =====================================================
     CONFIRMED
     ===================================================== */
    statusSelect.innerHTML = `
      <option value="CONFIRMED">
        Confirmed
      </option>

      <option value="CANCELLED">
        Cancelled
      </option>
    `
  } else {

  /* FALLBACK */
    statusSelect.innerHTML = `
      <option value="${escapeHtml(currentStatus)}">
        ${escapeHtml(currentStatus)}
      </option>
    `
  }

  /* SELECT CURRENT DATABASE VALUE */

  statusSelect.value = currentStatus

  document.getElementById('editBookingDialog').showModal()
}

/* =========================================================
   CLOSE EDIT BOOKING
   ========================================================= */

function closeEditBooking () {
  const dialog = document.getElementById('editBookingDialog')

  if (dialog && dialog.open) {
    dialog.close()
  }
}

/* =========================================================
   UPDATE BOOKING STATUS
   ========================================================= */

async function updateBookingStatus () {
  const id = Number(document.getElementById('editBookingId').value)

  const newStatus = String(
    document.getElementById('editBookingStatus').value
  ).toUpperCase()

  if (!id) {
    toast('Invalid booking.', 'error')

    return
  }

  const booking = adminBookings.find(
    item => Number(item.booking_id) === Number(id)
  )

  if (!booking) {
    toast('Booking not found.', 'error')

    return
  }

  const currentStatus = String(booking.booking_status || '').toUpperCase()

  /* CANCELLED FINAL */

  if (currentStatus === 'CANCELLED') {
    toast('Cancelled bookings cannot be updated.', 'error')

    return
  }

  /* SAME STATUS */

  if (newStatus === currentStatus) {
    toast('Please select a different status.', 'error')

    return
  }

  /* VALID TRANSITION */

  if (
    currentStatus === 'PENDING' &&
    !['CONFIRMED', 'CANCELLED'].includes(newStatus)
  ) {
    toast('Pending booking can only be Confirmed or Cancelled.', 'error')

    return
  }

  if (currentStatus === 'CONFIRMED' && newStatus !== 'CANCELLED') {
    toast('Confirmed booking can only be Cancelled.', 'error')

    return
  }

  const saveButton = document.getElementById('saveBookingStatusBtn')

  if (saveButton) {
    setButtonLoading(saveButton, true, 'Save Changes')
  }

  try {
    await apiFetch(endpoint('bookings', id), {
      method: 'PUT',

      body: JSON.stringify({
        booking_status: newStatus
      })
    })

    toast(`Booking status updated to ${newStatus}.`, 'success')

    closeEditBooking()

    await loadBookings()
  } finally {
    if (saveButton) {
      setButtonLoading(saveButton, false, 'Save Changes')
    }
  }
}
