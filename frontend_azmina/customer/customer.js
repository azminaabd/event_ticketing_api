let customerEvents = []
let customerVenues = []

let pendingPaymentBooking = null
let customerProfileSnapshot = null
let customerBookingRecords = []

let customerBookingPage = 1

const customerBookingLimit = 5

/* =========================================================
   CUSTOMER USER
   ========================================================= */
function customerUser () {
  return requireRole('CUSTOMER')
}

/* =========================================================
   LOCAL BOOKING STORAGE
   ========================================================= */
function bookingStoreKey (userId) {
  return `eventra_booking_ids_${Number(userId)}`
}

function storedBookingIds (userId) {
  try {
    const ids = JSON.parse(
      localStorage.getItem(bookingStoreKey(userId)) || '[]'
    )

    return Array.isArray(ids) ? ids.map(Number).filter(Number.isInteger) : []
  } catch {
    return []
  }
}

function rememberBookingId (userId, bookingId) {
  const id = Number(bookingId)

  if (!Number.isInteger(id) || id < 1) {
    return
  }

  const ids = storedBookingIds(userId)

  if (!ids.includes(id)) {
    ids.push(id)
  }

  localStorage.setItem(bookingStoreKey(userId), JSON.stringify(ids))
}

/* =========================================================
   GET CUSTOMER BOOKINGS
   ========================================================= */
async function getOwnBookings (user) {
  const ids = storedBookingIds(user.user_id)

  if (!ids.length) {
    return []
  }

  const results = await Promise.all(
    ids.map(id =>
      apiFetch(endpoint('bookings', id), {
        silent: true
      })
        .then(payload => unwrapData(payload))
        .catch(() => null)
    )
  )

  return results.filter(Boolean)
}

/* =========================================================
   LOAD EVENTS
   ========================================================= */
async function loadCustomerEvents () {
  const payload = await apiFetch(`${endpoint('events')}?page=1&limit=100`)

  const data = unwrapData(payload)

  return Array.isArray(data) ? data : []
}

async function safeLoadCustomerEvents () {
  try {
    return await loadCustomerEvents()
  } catch (_) {
    return []
  }
}

/* =========================================================
   EVENT CARD
   ========================================================= */
function eventCard (event, venue, bookable = false) {
  const status = String(event.status || '').toUpperCase()

  const tickets = Number(event.available_tickets ?? event.ticket_quantity ?? 0)

  let actionButton = ''

  /* =====================================================
     ACTIVE + AVAILABLE
     ===================================================== */
  if (bookable && status === 'ACTIVE' && tickets > 0) {
    actionButton = `
      <div class="event-card-action">

        <button
          class="btn btn-fit"
          type="button"
          onclick="openBooking(${Number(event.event_id)})"
        >
          Book Now
        </button>

      </div>
    `
  } else if (bookable && status === 'ACTIVE' && tickets <= 0) {
    /* =====================================================
     SOLD OUT
     ===================================================== */
    actionButton = `
      <div class="event-card-action">

        <button
          class="btn btn-fit event-disabled-btn"
          type="button"
          disabled
        >
          Sold Out
        </button>

      </div>
    `
  } else if (bookable && status === 'CANCELLED') {
    /* =====================================================
     CANCELLED EVENT
     ===================================================== */
    actionButton = `
      <div class="event-card-action">

        <button
          class="btn btn-fit event-cancelled-btn"
          type="button"
          disabled
        >
          Cancelled
        </button>

      </div>
    `
  } else if (bookable && status === 'COMPLETED') {
    /* =====================================================
     COMPLETED EVENT
     ===================================================== */
    actionButton = `
      <div class="event-card-action">

        <button
          class="btn btn-fit event-completed-btn"
          type="button"
          disabled>Event Ended
        </button>
      </div>`
  }

  const unavailable = status !== 'ACTIVE' || tickets <= 0

  return ` <article class="event-card ${
    unavailable ? 'event-card-unavailable' : ''
  }">

      <div class="event-card-top">

        <span>
          ${formatDate(event.event_date)}
        </span>

        ${badge(event.status)}

      </div>

      <h3>
        ${escapeHtml(event.event_name)}
      </h3>

      <p>
        ${escapeHtml(venue?.venue_name || `Venue #${event.venue_id}`)}
        ·
        ${formatTime(event.start_time)}
        –
        ${formatTime(event.end_time)}
      </p>

      <div class="event-card-meta">

        <span>
          ${currency(event.ticket_price)}
        </span>

        <span>
          ${tickets > 0 ? `${escapeHtml(tickets)} tickets` : 'Sold out'}
        </span>

      </div>

      ${actionButton}

    </article>`
}

/* =========================================================
   CUSTOMER DASHBOARD
   ========================================================= */
async function initCustomerDashboard () {
  const user = customerUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()

  const [events, venues, bookings] = await Promise.all([
    safeLoadCustomerEvents(),
    safeCollection('venues'),
    getOwnBookings(user)
  ])

  customerEvents = events
  customerVenues = venues

  const active = events.filter(
    event => String(event.status).toUpperCase() === 'ACTIVE'
  )

  document.getElementById('statAvailable').textContent = active.length
  document.getElementById('statMine').textContent = bookings.length || '—'
  document.getElementById('statConfirmed').textContent = bookings.length
    ? bookings.filter(
        booking => String(booking.booking_status).toUpperCase() === 'CONFIRMED'
      ).length
    : '—'

  document.getElementById('statSpent').textContent = bookings.length
    ? currency(
        bookings.reduce(
          (total, booking) => total + Number(booking.total_price || 0),
          0
        )
      )
    : '—'

  document.getElementById('dashboardEventCards').innerHTML =
    active
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
      .slice(0, 5)
      .map(event =>
        eventCard(
          event,
          venues.find(
            venue => Number(venue.venue_id) === Number(event.venue_id)
          ),
          false
        )
      )
      .join('') ||
    `
        <p class="empty-state">
          No active events available.
        </p>`
}

/* =========================================================
   CUSTOMER EVENTS PAGE
   ========================================================= */
async function initCustomerEvents () {
  const user = customerUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()
  ;[customerEvents, customerVenues] = await Promise.all([
    loadCustomerEvents(),
    getCollection('venues')
  ])

  document
    .getElementById('eventSearch')
    .addEventListener('input', renderCustomerEvents)

  document
    .getElementById('eventStatusFilter')
    .addEventListener('change', renderCustomerEvents)

  document
    .getElementById('bookingForm')
    .addEventListener('submit', submitBooking)

  document
    .getElementById('bookingQuantity')
    .addEventListener('input', updateBookingTotal)

  renderCustomerEvents()
}

/* =========================================================
   RENDER CUSTOMER EVENTS
   ========================================================= */
function renderCustomerEvents () {
  const search = document
    .getElementById('eventSearch')
    .value.trim()
    .toLowerCase()

  const status = document
    .getElementById('eventStatusFilter')
    .value.toUpperCase()

  const filtered = customerEvents.filter(event => {
    const venue = customerVenues.find(
      item => Number(item.venue_id) === Number(event.venue_id)
    )

    const searchText = `
            ${event.event_name || ''}
            ${venue?.venue_name || ''}
            ${venue?.location || ''}
          `.toLowerCase()

    const matchesStatus =
      !status || String(event.status || '').toUpperCase() === status
    const matchesSearch = !search || searchText.includes(search)
    return matchesStatus && matchesSearch
  })

  filtered.sort((a, b) =>
    String(a.event_date).localeCompare(String(b.event_date))
  )

  document.getElementById('customerEventCards').innerHTML =
    filtered
      .map(event =>
        eventCard(
          event,
          customerVenues.find(
            venue => Number(venue.venue_id) === Number(event.venue_id)
          ),
          true
        )
      )
      .join('') ||
    `
        <p class="empty-state">
          No matching events found.
        </p>
      `
}

/* =========================================================
   OPEN BOOKING
   ========================================================= */
function openBooking (eventId) {
  const user = getCurrentUser()
  const event = customerEvents.find(
    item => Number(item.event_id) === Number(eventId)
  )

  if (!event) {
    toast('Event not found.', 'error')

    return
  }

  const status = String(event.status || '').toUpperCase()

  const availableTickets = Number(
    event.available_tickets ?? event.ticket_quantity ?? 0
  )

  if (status !== 'ACTIVE') {
    toast('This event is not available for booking.', 'error')

    return
  }

  if (availableTickets <= 0) {
    toast('This event is sold out.', 'error')

    return
  }

  const venue = customerVenues.find(
    item => Number(item.venue_id) === Number(event.venue_id)
  )

  document.getElementById('bookingEventId').value = event.event_id
  document.getElementById('bookingEventName').textContent = event.event_name
  document.getElementById('bookingEventMeta').textContent = `${formatDate(
    event.event_date
  )} · ${venue?.venue_name || 'Venue'} 
  · ${currency(event.ticket_price)} each`
  document.getElementById('bookingCustomer').textContent =
    user?.name || 'Customer'
  document.getElementById('bookingDetailEvent').textContent = event.event_name
  document.getElementById('bookingDetailVenue').textContent =
    venue?.venue_name || `Venue #${event.venue_id}`
  document.getElementById('bookingDetailDate').textContent = formatDate(
    event.event_date
  )
  document.getElementById('bookingDetailTime').textContent = `${formatTime(
    event.start_time
  )} – ${formatTime(event.end_time)}`
  document.getElementById('bookingDetailPrice').textContent = currency(
    event.ticket_price
  )

  const quantityInput = document.getElementById('bookingQuantity')

  quantityInput.value = 1
  quantityInput.max = availableTickets

  updateBookingTotal()

  document.getElementById('bookingDialog').showModal()
}

/* =========================================================
   UPDATE BOOKING TOTAL
   ========================================================= */
function updateBookingTotal () {
  const eventId = Number(document.getElementById('bookingEventId')?.value)

  const selectedEvent = customerEvents.find(
    event => Number(event.event_id) === eventId
  )

  const quantity = Number(
    document.getElementById('bookingQuantity')?.value || 1
  )

  if (selectedEvent && document.getElementById('bookingTotal')) {
    document.getElementById(
      'bookingTotal'
    ).textContent = `Estimated total: ${currency(
      Number(selectedEvent.ticket_price) * quantity
    )}`
  }
}

/* =========================================================
   SUBMIT BOOKING
   ========================================================= */
async function submitBooking (formEvent) {
  formEvent.preventDefault()

  const user = getCurrentUser()

  const eventId = Number(document.getElementById('bookingEventId').value)

  const quantity = Number(document.getElementById('bookingQuantity').value)

  const selected = customerEvents.find(
    event => Number(event.event_id) === eventId
  )

  if (!selected) {
    toast('Event not found.', 'error')

    return
  }

  if (String(selected.status).toUpperCase() !== 'ACTIVE') {
    toast('This event cannot be booked.', 'error')

    return
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    toast('Enter a valid ticket quantity.', 'error')

    return
  }

  const availableTickets = Number(
    selected.available_tickets ?? selected.ticket_quantity ?? 0
  )

  if (quantity > availableTickets) {
    toast(`Only ${availableTickets} ticket(s) are available.`, 'error')

    return
  }

  const payload = await apiFetch(endpoint('bookings'), {
    method: 'POST',

    body: JSON.stringify({
      user_id: Number(user.user_id),

      event_id: eventId,

      quantity
    })
  })

  const booking = unwrapData(payload)

  if (!booking || !booking.booking_id) {
    toast('Booking could not be created.', 'error')

    return
  }

  rememberBookingId(user.user_id, booking.booking_id)

  document.getElementById('bookingDialog').close()

  selected.available_tickets = Math.max(0, availableTickets - quantity)

  if (Number(booking.total_price || 0) <= 0) {
    await confirmBookingAfterPayment(booking.booking_id)

    toast('Booking confirmed. Your digital ticket is ready.', 'success')

    setTimeout(() => (location.href = 'bookings.html'), 700)

    return
  }

  openPaymentDialog(booking)
}

/* =========================================================
   OPEN PAYMENT DIALOG
   ========================================================= */
function openPaymentDialog (booking) {
  if (!booking) {
    return
  }

  pendingPaymentBooking = booking

  document.getElementById('paymentBookingId').value = booking.booking_id

  document.getElementById('paymentBookingReference').textContent = `BK-${String(
    booking.booking_id
  ).padStart(4, '0')}`

  document.getElementById('paymentEventName').textContent =
    booking.event_name || `Event #${booking.event_id}`

  document.getElementById('paymentQuantity').textContent = booking.quantity

  document.getElementById('paymentTotal').textContent = currency(
    booking.total_price
  )

  const method = document.getElementById('paymentMethod')

  if (method) {
    method.value = ''
  }

  document.getElementById('paymentDialog').showModal()
}

/* =========================================================
   CLOSE PAYMENT DIALOG
   ========================================================= */
function closePaymentDialog () {
  const dialog = document.getElementById('paymentDialog')

  if (dialog && dialog.open) {
    dialog.close()
  }

  pendingPaymentBooking = null
}

/* =========================================================
   CONFIRM AFTER PAYMENT
   ========================================================= */
async function confirmBookingAfterPayment (bookingId) {
  return apiFetch(endpoint('bookings', bookingId), {
    method: 'PUT',

    body: JSON.stringify({
      booking_status: 'CONFIRMED'
    })
  })
}

/* =========================================================
   PAY CURRENT BOOKING
   ========================================================= */
async function payCurrentBooking () {
  const bookingId = Number(document.getElementById('paymentBookingId').value)

  const paymentMethod = document.getElementById('paymentMethod').value

  if (!bookingId) {
    toast('Invalid booking.', 'error')

    return
  }

  if (!paymentMethod) {
    toast('Please select a payment method.', 'error')

    return
  }

  const button = document.getElementById('payNowBtn')

  setButtonLoading(button, true, 'Pay Now')

  try {
    await confirmBookingAfterPayment(bookingId)

    toast('Payment successful. Booking confirmed.', 'success')

    closePaymentDialog()

    if (document.getElementById('customerBookingRows')) {
      await initCustomerBookings()
    } else {
      setTimeout(() => (location.href = 'bookings.html'), 700)
    }
  } finally {
    setButtonLoading(button, false, 'Pay Now')
  }
}

/* =========================================================
   CUSTOMER BOOKINGS
   ========================================================= */
async function initCustomerBookings () {
  const user = customerUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()

  customerBookingRecords = await getOwnBookings(user)

  customerBookingRecords.sort(
    (a, b) => Number(b.booking_id) - Number(a.booking_id)
  )

  const totalPages = Math.max(
    1,
    Math.ceil(customerBookingRecords.length / customerBookingLimit)
  )

  if (customerBookingPage > totalPages) {
    customerBookingPage = totalPages
  }

  const searchInput = document.getElementById('customerBookingSearch')

  if (searchInput) {
    searchInput.oninput = () => {
      customerBookingPage = 1

      renderCustomerBookings()
    }
  }

  const statusFilter = document.getElementById('customerBookingStatusFilter')

  if (statusFilter) {
    statusFilter.onchange = () => {
      customerBookingPage = 1

      renderCustomerBookings()
    }
  }

  renderCustomerBookings()
}

/* =========================================================
   FILTER CUSTOMER BOOKINGS
   ========================================================= */
function filteredCustomerBookings () {
  const search =
    document
      .getElementById('customerBookingSearch')
      ?.value.trim()
      .toLowerCase() || ''

  const selectedStatus =
    document
      .getElementById('customerBookingStatusFilter')
      ?.value.toUpperCase() || ''

  return customerBookingRecords.filter(booking => {
    const status = String(booking.booking_status || '').toUpperCase()

    const searchText = `
          ${booking.booking_id || ''}
          ${booking.event_name || ''}
          ${booking.event_id || ''}
        `.toLowerCase()

    const matchesSearch = !search || searchText.includes(search)

    const matchesStatus = !selectedStatus || status === selectedStatus

    return matchesSearch && matchesStatus
  })
}

/* =========================================================
   RENDER CUSTOMER BOOKINGS
   ========================================================= */
function renderCustomerBookings () {
  const filtered = filteredCustomerBookings()


  filtered.sort((a, b) => Number(b.booking_id) - Number(a.booking_id))

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / customerBookingLimit)
  )

  if (customerBookingPage > totalPages) {
    customerBookingPage = totalPages
  }

  const startIndex = (customerBookingPage - 1) * customerBookingLimit

  const pageBookings = filtered.slice(
    startIndex,
    startIndex + customerBookingLimit
  )

  document.getElementById('customerBookingRows').innerHTML =
    pageBookings

      .map(booking => {
        const id = Number(booking.booking_id)

        const status = String(booking.booking_status || '').toUpperCase()

        let actions = '—'

        /* ===============================
               PENDING
          =============================== */

        if (status === 'PENDING') {
          actions = `
                <button
                  class="table-btn"
                  type="button"
                  onclick="payPendingBooking(${id})"
                >
                  Pay Now
                </button>


                <button
                  class="table-btn danger"
                  type="button"
                  onclick="cancelBooking(${id})"
                >
                  Cancel
                </button>
              `
        } else if (status === 'CONFIRMED') {

          /* ===============================
               CONFIRMED
            =============================== */
          actions = `
                <button
                  class="table-btn"
                  type="button"
                  onclick="viewTicket(${id})"
                >
                  QR Ticket
                </button>


                <button
                  class="table-btn danger"
                  type="button"
                  onclick="cancelBooking(${id})"
                >
                  Cancel
                </button>
              `
        } else if (status === 'CANCELLED') {

          /* ===============================
               CANCELLED
            =============================== */
          actions = '<span class="empty-state">—</span>'
        }

        return `
              <tr>
                <td>
                  #${escapeHtml(booking.booking_id)}
                </td>
                <td>
                  <strong>
                    ${escapeHtml(
                      booking.event_name || `Event #${booking.event_id}`
                    )}
                  </strong>
                </td>
                <td>
                  ${escapeHtml(booking.quantity)}
                </td>
                <td>
                  ${currency(booking.total_price)}
                </td>
                <td>
                  ${badge(booking.booking_status)}
                </td>
                <td>
                  ${escapeHtml(booking.booking_date || '—')}
                </td>

                <td class="actions">
                  ${actions}
                </td>

              </tr>
            `
      })

      .join('') || emptyRow(7, 'No matching bookings found.')

  /* =====================================================
     PAGE INFO
     ===================================================== */
  const pageInfo = document.getElementById('customerBookingPageInfo')

  if (pageInfo) {
    pageInfo.textContent = `Page ${customerBookingPage} of ${totalPages}`
  }

  /* =====================================================
     PREVIOUS BUTTON
     ===================================================== */
  const previous = document.getElementById('customerBookingPrevBtn')

  if (previous) {
    previous.disabled = customerBookingPage <= 1
  }

  /* =====================================================
     NEXT BUTTON
     ===================================================== */
  const next = document.getElementById('customerBookingNextBtn')

  if (next) {
    next.disabled = customerBookingPage >= totalPages
  }
}

/* =========================================================
   PREVIOUS CUSTOMER BOOKING PAGE
   ========================================================= */
function previousCustomerBookingPage () {
  if (customerBookingPage <= 1) {
    return
  }

  customerBookingPage--

  renderCustomerBookings()
}

/* =========================================================
   NEXT CUSTOMER BOOKING PAGE
   ========================================================= */
function nextCustomerBookingPage () {
  const filtered = filteredCustomerBookings()

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / customerBookingLimit)
  )

  if (customerBookingPage >= totalPages) {
    return
  }

  customerBookingPage++

  renderCustomerBookings()
}

/* =========================================================
   PAY PENDING BOOKING
   ========================================================= */
async function payPendingBooking (id) {
  const user = getCurrentUser()

  const bookings = await getOwnBookings(user)

  const booking = bookings.find(item => Number(item.booking_id) === Number(id))

  if (!booking) {
    toast('Booking not found.', 'error')
    return
  }

  if (String(booking.booking_status).toUpperCase() !== 'PENDING') {
    toast('Only pending bookings can be paid.', 'error')
    return
  }

  if (Number(booking.total_price || 0) <= 0) {
    await confirmBookingAfterPayment(id)

    toast('Booking confirmed. Your QR ticket is ready.', 'success')

    await initCustomerBookings()

    return
  }

  openPaymentDialog(booking)
}

/* =========================================================
   VIEW QR TICKET
   ========================================================= */
function viewTicket (id) {
  const ticketUrl = `../../ticket_view.php?booking_id=${encodeURIComponent(id)}`

  window.open(ticketUrl, '_blank', 'noopener')
}

/* =========================================================
   CANCEL BOOKING
   ========================================================= */
async function cancelBooking (id) {
  if (!confirm('Cancel this booking?')) {
    return
  }

  await apiFetch(endpoint('bookings', id), {
    method: 'DELETE'
  })

  toast('Booking cancelled.', 'success')

  await initCustomerBookings()
}

/* =========================================================
   CUSTOMER PROFILE
   ========================================================= */
async function initCustomerProfile () {
  const user = customerUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()

  let account = null

  try {
    account = unwrapData(
      await apiFetch(endpoint('users', user.user_id), {
        silent: true
      })
    )
  } catch (_) {
    account = null
  }

  const name = account?.name || user.name || ''

  const email = account?.email || user.email || ''

  const role = account?.role || user.role || 'CUSTOMER'

  const createdAt = account?.created_at || user.created_at || ''

  /* LEFT FORM */

  document.getElementById('profileName').value = name

  document.getElementById('profileEmail').value = email

  document.getElementById('profileRole').value = role

  /* RIGHT OVERVIEW */

  document.getElementById('profileOverviewName').textContent = name || 'User'

  document.getElementById('profileOverviewRole').textContent = String(role).toUpperCase()

  document.getElementById('profileOverviewEmail').textContent = email || '—'

  document.getElementById('profileOverviewCreated').textContent = createdAt
    ? formatDate(String(createdAt).slice(0, 10))
    : '—'

  /* AVATAR INITIAL */

  document.getElementById('profileAvatarInitial').textContent = name
    ? name.charAt(0).toUpperCase()
    : 'U'

  customerProfileSnapshot = {
    name,
    email,
    role,
    created_at: createdAt
  }

  const form = document.getElementById('profileForm')

  if (form) {
    form.addEventListener('submit', saveCustomerProfile)
  }
}

/* =========================================================
   LOAD PROFILE
   ========================================================= */
function loadCustomerProfileFields () {
  if (!customerProfileSnapshot) {
    return
  }

  document.getElementById('profileName').value = customerProfileSnapshot.name

  document.getElementById('profileEmail').value = customerProfileSnapshot.email

  document.getElementById('profileRole').value = customerProfileSnapshot.role
}

/* =========================================================
   EDIT PROFILE
   ========================================================= */
function editCustomerProfile () {
  document.getElementById('profileName').disabled = false

  document.getElementById('profileEmail').disabled = false

  document.getElementById('profileRole').disabled = true

  document.getElementById('passwordSection').hidden = false

  document.getElementById('editProfileBtn').hidden = true

  document.getElementById('saveProfileBtn').hidden = false

  document.getElementById('cancelProfileBtn').hidden = false
}

/* =========================================================
   CANCEL PROFILE EDIT
   ========================================================= */
function cancelCustomerProfileEdit () {
  loadCustomerProfileFields()

  document.getElementById('profileName').disabled = true

  document.getElementById('profileEmail').disabled = true

  document.getElementById('profileRole').disabled = true

  document.getElementById('passwordSection').hidden = true

  document.getElementById('currentPassword').value = ''

  document.getElementById('newPassword').value = ''

  document.getElementById('confirmNewPassword').value = ''

  document.getElementById('editProfileBtn').hidden = false

  document.getElementById('saveProfileBtn').hidden = true

  document.getElementById('cancelProfileBtn').hidden = true
}

/* =========================================================
   UPDATE LOCAL CUSTOMER LABEL
   ========================================================= */
function updateCustomerLocalSession (name, email) {
  document.querySelectorAll('[data-user-name]').forEach(element => {
    element.textContent = name
  })
}

/* =========================================================
   SAVE CUSTOMER PROFILE
   ========================================================= */
async function saveCustomerProfile (event) {
  event.preventDefault()

  const user = getCurrentUser()

  const name = document.getElementById('profileName').value.trim()

  const email = document.getElementById('profileEmail').value.trim()

  const currentPassword = document.getElementById('currentPassword').value

  const newPassword = document.getElementById('newPassword').value

  const confirmPassword = document.getElementById('confirmNewPassword').value

  if (!name) {
    toast('Full name is required.', 'error')
    return
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!email || !emailPattern.test(email)) {
    toast('Enter a valid email address.', 'error')
    return
  }

  const wantsPasswordChange = Boolean(
    currentPassword || newPassword || confirmPassword
  )

  if (wantsPasswordChange) {
    if (!currentPassword) {
      toast('Enter your current password.', 'error')
      return
    }

    if (newPassword.length < 8) {
      toast('New password must contain at least 8 characters.', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'error')
      return
    }
  }

  const body = {
    name,
    email
  }

  if (wantsPasswordChange) {
    body.current_password = currentPassword

    body.new_password = newPassword
  }

  const saveButton = document.getElementById('saveProfileBtn')

  setButtonLoading(saveButton, true, 'Save Changes')

  try {
    await apiFetch(endpoint('users', user.user_id), {
      method: 'PUT',

      body: JSON.stringify(body)
    })

    customerProfileSnapshot = {
      name,
      email,

      role: customerProfileSnapshot?.role || user.role || 'CUSTOMER'
    }

    updateCustomerLocalSession(name, email)

    toast(
      wantsPasswordChange
        ? 'Profile and password updated successfully.'
        : 'Profile updated successfully.',

      'success'
    )

    cancelCustomerProfileEdit()
  } finally {
    setButtonLoading(saveButton, false, 'Save Changes')
  }
}
