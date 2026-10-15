let organiserEvents = []
let organiserVenues = []
let organiserBookings = []

/* =========================================================
   PAGINATION
   ========================================================= */

let organiserBookingPage = 1
const organiserBookingLimit = 5

let organiserEventPage = 1
const organiserEventLimit = 5

/* =========================================================
   ORGANISER USER
   ========================================================= */

function organiserUser () {
  return requireRole('ORGANISER')
}

/* =========================================================
   LOAD EVENTS
   ========================================================= */

async function loadAllEventsForOrganiser () {
  const payload = await apiFetch(`${endpoint('events')}?page=1&limit=100`)

  const data = unwrapData(payload)

  return Array.isArray(data) ? data : []
}

async function safeLoadAllEventsForOrganiser () {
  try {
    return await loadAllEventsForOrganiser()
  } catch (_) {
    return []
  }
}

/* =========================================================
   ORGANISER DASHBOARD
   ========================================================= */

async function initOrganiserDashboard () {
  const user = organiserUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()

  const [events, venues, bookings] = await Promise.all([
    safeLoadAllEventsForOrganiser(),
    safeCollection('venues'),
    safeCollection('bookings')
  ])

  organiserVenues = venues

  organiserEvents = events.filter(
    event => Number(event.organiser_id) === Number(user.user_id)
  )

  const eventIds = new Set(organiserEvents.map(event => Number(event.event_id)))

  const ownBookings = bookings.filter(booking =>
    eventIds.has(Number(booking.event_id))
  )

  /* TOTAL EVENTS */

  document.getElementById('statMyEvents').textContent = organiserEvents.length

  /* ACTIVE EVENTS */

  document.getElementById('statActive').textContent = organiserEvents.filter(
    event => String(event.status).toUpperCase() === 'ACTIVE'
  ).length

  /* AVAILABLE TICKETS */

  document.getElementById('statTickets').textContent = organiserEvents.reduce(
    (total, event) =>
      total + Number(event.available_tickets ?? event.ticket_quantity ?? 0),
    0
  )

  /* BOOKINGS */

  document.getElementById('statBookings').textContent = ownBookings.length

  /* UPCOMING EVENTS */

  document.getElementById('myEventRows').innerHTML =
    organiserEvents

      .filter(event => String(event.status).toUpperCase() === 'ACTIVE')

      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))

      .slice(0, 5)

      .map(event => {
        const venue = venues.find(
          item => Number(item.venue_id) === Number(event.venue_id)
        )

        return `
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
              ${escapeHtml(venue?.venue_name || `Venue #${event.venue_id}`)}
            </td>

            <td>
              ${badge(event.status)}
            </td>

          </tr>
        `
      })

      .join('') || emptyRow(4, 'No upcoming events.')
}

/* =========================================================
   MANAGE EVENTS PAGE
   ========================================================= */

async function initEventsPage () {
  const user = organiserUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()

  /* LOAD VENUES */

  organiserVenues = await getCollection('venues')

  const activeVenues = organiserVenues.filter(
    venue => String(venue.status).toUpperCase() === 'ACTIVE'
  )

  document.getElementById('eventVenue').innerHTML =
    `
      <option value="">
        Select venue
      </option>
    ` +
    activeVenues

      .map(
        venue => `
          <option
            value="${Number(venue.venue_id)}"
          >
            ${escapeHtml(venue.venue_name)}
            — capacity
            ${escapeHtml(venue.capacity)}
          </option>
        `
      )

      .join('')

  document.getElementById('eventForm').addEventListener('submit', saveEvent)

  /* START IN CREATE MODE */

  resetEventForm()

  organiserEventPage = 1

  await loadOrganiserEvents()
}

/* =========================================================
   LOAD ORGANISER EVENTS
   ========================================================= */

async function loadOrganiserEvents () {
  const user = getCurrentUser()

  const events = await loadAllEventsForOrganiser()

  organiserEvents = events.filter(
    event => Number(event.organiser_id) === Number(user.user_id)
  )

  const totalPages = Math.max(
    1,
    Math.ceil(organiserEvents.length / organiserEventLimit)
  )

  /*
   * If an event was deleted from the last page,
   * automatically move back to the previous valid page.
   */

  if (organiserEventPage > totalPages) {
    organiserEventPage = totalPages
  }

  renderOrganiserEvents()
}

/* =========================================================
   RENDER ORGANISER EVENTS
   ========================================================= */

function renderOrganiserEvents () {
  const totalPages = Math.max(
    1,
    Math.ceil(organiserEvents.length / organiserEventLimit)
  )

  if (organiserEventPage > totalPages) {
    organiserEventPage = totalPages
  }

  const startIndex = (organiserEventPage - 1) * organiserEventLimit

  const pageEvents = organiserEvents.slice(
    startIndex,
    startIndex + organiserEventLimit
  )

  document.getElementById('eventRows').innerHTML =
    pageEvents

      .map(event => {
        const venue = organiserVenues.find(
          item => Number(item.venue_id) === Number(event.venue_id)
        )

        const available = Number(
          event.available_tickets ?? event.ticket_quantity ?? 0
        )

        const total = Number(event.ticket_quantity ?? 0)

        return `
          <tr>

            <td>
              <strong>
                ${escapeHtml(event.event_name)}
              </strong>
            </td>


            <td>
              ${escapeHtml(venue?.venue_name || `Venue #${event.venue_id}`)}
            </td>


            <td>
              ${formatDate(event.event_date)}
            </td>


            <td>
              ${currency(event.ticket_price)}
            </td>


            <td>
              ${escapeHtml(available)}
              /
              ${escapeHtml(total)}
            </td>


            <td>
              ${badge(event.status)}
            </td>


            <td class="actions">

              <button
                class="table-btn"
                type="button"
                onclick="editEvent(${Number(event.event_id)})"
              >
                Edit
              </button>


              <button
                class="table-btn danger"
                type="button"
                onclick="deleteEvent(${Number(event.event_id)})"
              >
                Delete
              </button>

            </td>

          </tr>
        `
      })

      .join('') || emptyRow(7, 'You have no events yet.')

  /* PAGE INFORMATION */

  const pageInfo = document.getElementById('eventPageInfo')

  if (pageInfo) {
    pageInfo.textContent = `Page ${organiserEventPage} of ${totalPages}`
  }

  /* PREVIOUS BUTTON */

  const previousButton = document.getElementById('eventPrevBtn')

  if (previousButton) {
    previousButton.disabled = organiserEventPage <= 1
  }

  /* NEXT BUTTON */

  const nextButton = document.getElementById('eventNextBtn')

  if (nextButton) {
    nextButton.disabled = organiserEventPage >= totalPages
  }

  const pagination = document.getElementById('eventPagination')

  if (pagination) {
    pagination.style.display =
      organiserEvents.length > organiserEventLimit ? 'flex' : 'none'
  }
}

/* =========================================================
   PREVIOUS EVENT PAGE
   ========================================================= */

function previousEventPage () {
  if (organiserEventPage <= 1) {
    return
  }

  organiserEventPage--

  renderOrganiserEvents()
}

/* =========================================================
   NEXT EVENT PAGE
   ========================================================= */

function nextEventPage () {
  const totalPages = Math.max(
    1,
    Math.ceil(organiserEvents.length / organiserEventLimit)
  )

  if (organiserEventPage >= totalPages) {
    return
  }

  organiserEventPage++

  renderOrganiserEvents()
}

/* =========================================================
   EDIT EVENT
   ========================================================= */

function editEvent (id) {
  const selectedEvent = organiserEvents.find(
    event => Number(event.event_id) === Number(id)
  )

  if (!selectedEvent) {
    toast('Event not found.', 'error')

    return
  }

  document.getElementById('eventId').value = selectedEvent.event_id

  document.getElementById('eventName').value = selectedEvent.event_name || ''

  document.getElementById('eventVenue').value = selectedEvent.venue_id

  document.getElementById('eventDate').value = selectedEvent.event_date || ''

  document.getElementById('startTime').value = String(
    selectedEvent.start_time || ''
  ).slice(0, 5)

  document.getElementById('endTime').value = String(
    selectedEvent.end_time || ''
  ).slice(0, 5)

  document.getElementById('ticketPrice').value =
    selectedEvent.ticket_price ?? ''

  document.getElementById('ticketQuantity').value =
    selectedEvent.ticket_quantity ?? ''

  document.getElementById('eventStatus').value =
    selectedEvent.status || 'ACTIVE'

  document.getElementById('eventDescription').value =
    selectedEvent.description || ''

  document.getElementById('eventSubmitBtn').textContent = 'Update Event'

  const formMessage = document.getElementById('eventFormMessage')

  if (formMessage) {
    formMessage.textContent = 'Update the selected event using the form below.'
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

/* =========================================================
   RESET EVENT FORM
   ========================================================= */

function resetEventForm () {
  const form = document.getElementById('eventForm')

  if (form) {
    form.reset()
  }

  document.getElementById('eventId').value = ''

  document.getElementById('eventStatus').value = 'ACTIVE'

  document.getElementById('eventVenue').value = ''

  document.getElementById('eventSubmitBtn').textContent = 'Create Event'

  const formMessage = document.getElementById('eventFormMessage')

  if (formMessage) {
    formMessage.textContent =
      'Create and manage your own events using the form below.'
  }
}

/* =========================================================
   SAVE EVENT
   CREATE / UPDATE
   ========================================================= */

async function saveEvent (formEvent) {
  formEvent.preventDefault()

  const user = getCurrentUser()

  const id = document.getElementById('eventId').value

  const venueId = Number(document.getElementById('eventVenue').value)

  const eventName = document.getElementById('eventName').value.trim()

  const eventDate = document.getElementById('eventDate').value

  const startTime = document.getElementById('startTime').value

  const endTime = document.getElementById('endTime').value

  const ticketPrice = Number(document.getElementById('ticketPrice').value)

  const ticketQuantity = Number(document.getElementById('ticketQuantity').value)

  const status = document.getElementById('eventStatus').value

  const description = document.getElementById('eventDescription').value.trim()

  /* VALIDATION */

  if (!eventName) {
    toast('Enter the event name.', 'error')

    return
  }

  if (!venueId) {
    toast('Select a venue.', 'error')

    return
  }

  if (!eventDate) {
    toast('Select an event date.', 'error')

    return
  }

  if (!startTime || !endTime) {
    toast('Enter the event start and end time.', 'error')

    return
  }

  if (endTime <= startTime) {
    toast('End time must be later than start time.', 'error')

    return
  }

  if (Number.isNaN(ticketPrice) || ticketPrice < 0) {
    toast('Enter a valid ticket price.', 'error')

    return
  }

  if (!Number.isInteger(ticketQuantity) || ticketQuantity < 1) {
    toast('Ticket quantity must be at least 1.', 'error')

    return
  }

  const selectedVenue = organiserVenues.find(
    venue => Number(venue.venue_id) === venueId
  )

  if (selectedVenue && ticketQuantity > Number(selectedVenue.capacity)) {
    toast(
      `Ticket quantity cannot exceed venue capacity of ${selectedVenue.capacity}.`,
      'error'
    )

    return
  }

  const body = {
    organiser_id: Number(user.user_id),

    venue_id: venueId,

    event_name: eventName,

    description: description,

    event_date: eventDate,

    start_time: toApiTime(startTime),

    end_time: toApiTime(endTime),

    ticket_price: ticketPrice,

    ticket_quantity: ticketQuantity,

    status: status
  }

  const submitButton = document.getElementById('eventSubmitBtn')

  const originalLabel = id ? 'Update Event' : 'Create Event'

  setButtonLoading(submitButton, true, originalLabel)

  try {
    /* UPDATE */

    if (id) {
      await apiFetch(endpoint('events', id), {
        method: 'PUT',

        body: JSON.stringify(body)
      })

      toast('Event updated successfully.', 'success')
    } else {
      /* CREATE */

      await apiFetch(endpoint('events'), {
        method: 'POST',

        body: JSON.stringify(body)
      })

      toast('Event created successfully.', 'success')
    }

    resetEventForm()

    await loadOrganiserEvents()
  } finally {
    setButtonLoading(submitButton, false, originalLabel)

    if (!document.getElementById('eventId').value) {
      document.getElementById('eventSubmitBtn').textContent = 'Create Event'
    }
  }
}

/* =========================================================
   DELETE EVENT
   ========================================================= */

async function deleteEvent (id) {
  const selected = organiserEvents.find(
    event => Number(event.event_id) === Number(id)
  )

  if (!selected) {
    toast('Event not found.', 'error')

    return
  }

  if (
    !confirm(
      `Delete "${selected.event_name}"? Events with existing bookings cannot be deleted.`
    )
  ) {
    return
  }

  await apiFetch(endpoint('events', id), {
    method: 'DELETE'
  })

  toast('Event deleted successfully.', 'success')

  if (Number(document.getElementById('eventId')?.value) === Number(id)) {
    resetEventForm()
  }

  await loadOrganiserEvents()
}

/* =========================================================
   ORGANISER BOOKINGS PAGE
   ========================================================= */

async function initOrganiserBookings () {
  const user = organiserUser()

  if (!user) {
    return
  }

  setCurrentUserLabel()

  const [events, bookings] = await Promise.all([
    safeLoadAllEventsForOrganiser(),
    safeCollection('bookings')
  ])

  const myEvents = events.filter(
    event => Number(event.organiser_id) === Number(user.user_id)
  )

  const eventMap = new Map(
    myEvents.map(event => [Number(event.event_id), event])
  )

  organiserBookings = bookings

    .filter(booking => eventMap.has(Number(booking.event_id)))

    .map(booking => ({
      ...booking,

      display_event_name:
        eventMap.get(Number(booking.event_id))?.event_name ||
        booking.event_name ||
        `Event #${booking.event_id}`
    }))

  organiserBookingPage = 1

  /* SEARCH */

  const searchInput = document.getElementById('bookingSearch')

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      organiserBookingPage = 1

      renderOrganiserBookings()
    })
  }

  /* STATUS FILTER */

  const statusFilter = document.getElementById('bookingStatusFilter')

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      organiserBookingPage = 1

      renderOrganiserBookings()
    })
  }

  renderOrganiserBookings()
}

/* =========================================================
   FILTER ORGANISER BOOKINGS
   ========================================================= */

function filteredOrganiserBookings () {
  const search =
    document.getElementById('bookingSearch')?.value.trim().toLowerCase() || ''

  const status =
    document.getElementById('bookingStatusFilter')?.value.toUpperCase() || ''

  return organiserBookings.filter(booking => {
    const bookingStatus = String(booking.booking_status || '').toUpperCase()

    const searchText = `
          ${booking.booking_id || ''}
          ${booking.display_event_name || ''}
          ${booking.customer_name || ''}
        `.toLowerCase()

    const matchesSearch = !search || searchText.includes(search)

    const matchesStatus = !status || bookingStatus === status

    return matchesSearch && matchesStatus
  })
}

/* =========================================================
   RENDER ORGANISER BOOKINGS
   ========================================================= */

function renderOrganiserBookings () {
  const filtered = filteredOrganiserBookings()

  filtered.sort((a, b) => Number(b.booking_id) - Number(a.booking_id))

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / organiserBookingLimit)
  )

  if (organiserBookingPage > totalPages) {
    organiserBookingPage = totalPages
  }

  const startIndex = (organiserBookingPage - 1) * organiserBookingLimit

  const pageBookings = filtered.slice(
    startIndex,
    startIndex + organiserBookingLimit
  )

  document.getElementById('organiserBookingRows').innerHTML =
    pageBookings

      .map(
        booking => `
          <tr>

            <td>
              #${escapeHtml(booking.booking_id)}
            </td>


            <td>
              <strong>
                ${escapeHtml(booking.display_event_name)}
              </strong>
            </td>


            <td>
              ${escapeHtml(booking.customer_name || `User #${booking.user_id}`)}
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

              <button
                class="table-btn"
                type="button"
                onclick="viewOrganiserBooking(${Number(booking.booking_id)})"
              >
                View
              </button>

            </td>

          </tr>
        `
      )

      .join('') || emptyRow(8, 'No matching bookings found.')

  /* PAGE INFORMATION */

  const pageInfo = document.getElementById('bookingPageInfo')

  if (pageInfo) {
    pageInfo.textContent = `Page ${organiserBookingPage} of ${totalPages}`
  }

  /* PREVIOUS */

  const previousButton = document.getElementById('bookingPrevBtn')

  if (previousButton) {
    previousButton.disabled = organiserBookingPage <= 1
  }

  /* NEXT */

  const nextButton = document.getElementById('bookingNextBtn')

  if (nextButton) {
    nextButton.disabled = organiserBookingPage >= totalPages
  }

  const pagination = document.getElementById('bookingPagination')

  if (pagination) {
    pagination.style.display =
      filtered.length > organiserBookingLimit ? 'flex' : 'none'
  }
}

/* =========================================================
   PREVIOUS BOOKING PAGE
   ========================================================= */

function previousBookingPage () {
  if (organiserBookingPage <= 1) {
    return
  }

  organiserBookingPage--

  renderOrganiserBookings()
}

/* =========================================================
   NEXT BOOKING PAGE
   ========================================================= */

function nextBookingPage () {
  const filtered = filteredOrganiserBookings()

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / organiserBookingLimit)
  )

  if (organiserBookingPage >= totalPages) {
    return
  }

  organiserBookingPage++

  renderOrganiserBookings()
}

/* =========================================================
   VIEW ORGANISER BOOKING
   ========================================================= */

function viewOrganiserBooking (id) {
  const booking = organiserBookings.find(
    item => Number(item.booking_id) === Number(id)
  )

  if (!booking) {
    toast('Booking not found.', 'error')

    return
  }

  document.getElementById('orgViewBookingId').value = `#${booking.booking_id}`

  document.getElementById('orgViewEvent').value =
    booking.display_event_name || '—'

  document.getElementById('orgViewCustomer').value =
    booking.customer_name || `User #${booking.user_id}`

  document.getElementById('orgViewQuantity').value = booking.quantity

  document.getElementById('orgViewTotal').value = currency(booking.total_price)

  document.getElementById('orgViewStatus').value = booking.booking_status

  document.getElementById('orgViewDate').value = booking.booking_date || '—'

  document.getElementById('organiserBookingDialog').showModal()
}

/* =========================================================
   CLOSE ORGANISER BOOKING
   ========================================================= */

function closeOrganiserBooking () {
  const dialog = document.getElementById('organiserBookingDialog')

  if (dialog && dialog.open) {
    dialog.close()
  }
}
