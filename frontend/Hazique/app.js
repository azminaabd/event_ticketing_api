
'use strict';

// EventDesk frontend for the shared PHP/MySQL REST API.
// Supports both frontend/ and frontend/Hazique/ on localhost.

// Find the API folder regardless of the individual frontend subfolder.
const API_BASE = (() => {
  const path = window.location.pathname;
  const marker = '/frontend/';
  const index = path.toLowerCase().indexOf(marker);

  if (index === -1) {
    throw new Error(
      'Open EventDesk from the frontend folder inside XAMPP.'
    );
  }

  return path.slice(0, index);
})();

const LOCAL_HOST = [
  'localhost',
  '127.0.0.1',
  '::1'
].includes(window.location.hostname);

const $ = id => document.getElementById(id);

const state = {
  role: 'ADMIN',
  users: [],
  venues: [],
  events: [],
  bookings: [],
  actors: {
    ORGANISER: null,
    CUSTOMER: null
  },
  manageUser: null,
  manageVenue: null,
  manageEvent: null,
  knownEmails: {},
  busy: false
};

// General helpers
const esc = input =>
  String(input ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const num = value => Number(value) || 0;
const money = value => 'RM ' + num(value).toFixed(2);

function today() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function futureDay(days = 21) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function shortTime(value) {
  return String(value ?? '').slice(0, 5);
}

function fullTime(value) {
  return /^\d\d:\d\d$/.test(String(value))
    ? value + ':00'
    : value;
}

function formatDate(value) {
  const parts = String(value || '').split('-').map(Number);

  if (parts.length !== 3 || parts.some(x => !x)) {
    return String(value ?? '');
  }

  return new Date(
    parts[0],
    parts[1] - 1,
    parts[2]
  ).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function tag(value) {
  const status = String(value ?? '').toUpperCase();

  const styles = {
    PENDING: 'pending',
    CANCELLED: 'cancelled',
    INACTIVE: 'inactive',
    COMPLETED: 'completed',
    ORGANISER: 'organiser',
    ADMIN: 'admin'
  };

  return `<span class="badge ${styles[status] || ''}">${esc(status)}</span>`;
}

function stats(items) {
  return items.map(([label, value, sub]) => `
    <div class="stat">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-number">${esc(value)}</div>
      <div class="stat-sub">${esc(sub)}</div>
    </div>
  `).join('');
}

function empty(message = 'No records to display.') {
  return `<p class="empty-inline">${esc(message)}</p>`;
}

function table(headers, rows, message) {
  if (!rows.length) return empty(message);

  const heading = headers.map(
    h => `<th scope="col">${esc(h)}</th>`
  ).join('');

  const body = rows.map(cols => `
    <tr>
      ${cols.map(col => `<td>${col}</td>`).join('')}
    </tr>
  `).join('');

  return `
    <table class="data-table">
      <thead><tr>${heading}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function notify(id, message, type = 'success') {
  const element = $(id);

  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`;
}

// REST API requests
async function request(method, endpoint, body) {
  if (!LOCAL_HOST && method !== 'GET') {
    throw new Error(
      'Changes are restricted to localhost until JWT security is integrated.'
    );
  }

  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method,
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const raw = await response.text();
  let payload;

  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(
      `The ${endpoint} endpoint did not return JSON. Check XAMPP and the API folder.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `${response.status}: ${payload.error || payload.message || 'Request failed'}`
    );
  }

  return payload;
}

async function loadAll(quiet = false) {
  if (!quiet) {
    $('globalNotice').textContent = 'Loading data from the API...';
    $('globalNotice').className = 'notice';
  }

  try {
    const endpoints = ['users', 'venues', 'events', 'bookings'];

    const results = await Promise.all(
      endpoints.map(endpoint => request('GET', endpoint))
    );

    const datasets = results.map((result, index) => {
      if (!Array.isArray(result.data)) {
        throw new Error(
          `Invalid response from ${endpoints[index]} API`
        );
      }

      return result.data;
    });

    [
      state.users,
      state.venues,
      state.events,
      state.bookings
    ] = datasets;

    for (const role of ['ORGANISER', 'CUSTOMER']) {
      const accounts = state.users.filter(
        user => user.role === role
      );

      const existing = accounts.some(
        user => num(user.user_id) === state.actors[role]
      );

      if (!existing) {
        state.actors[role] = accounts.length
          ? num(accounts[0].user_id)
          : null;
      }
    }

    render();

    $('globalNotice').textContent =
      'Connected successfully · Data loaded from the shared PHP/MySQL REST APIs.';

    $('globalNotice').className = 'notice success';

  } catch (error) {
    $('globalNotice').textContent =
      'Connection problem: ' + error.message;

    $('globalNotice').className = 'notice error';
  }
}

async function submitAction(form, messageId, callback) {
  if (state.busy) return;

  const buttons = Array.from(
    form?.querySelectorAll('button') || []
  );

  state.busy = true;
  buttons.forEach(button => button.disabled = true);

  notify(messageId, 'Working...', '');

  try {
    await callback();
  } catch (error) {
    notify(messageId, error.message, 'error');
  } finally {
    state.busy = false;

    const allowed =
      form?.id === 'userEditForm'
        ? Boolean(state.manageUser)
        : form?.id === 'venueEditForm'
          ? Boolean(state.manageVenue)
          : form?.id === 'eventEditForm'
            ? Boolean(state.manageEvent)
            : true;

    buttons.forEach(button => button.disabled = !allowed);
  }
}

function optionList(
  select,
  items,
  placeholder,
  selectedId,
  labelFn,
  idKey
) {
  const valid = items.some(
    item => num(item[idKey]) === num(selectedId)
  );

  const selected = valid
    ? num(selectedId)
    : items.length
      ? num(items[0][idKey])
      : null;

  select.replaceChildren();

  if (!items.length) {
    select.add(new Option(placeholder, ''));
    select.value = '';
    return null;
  }

  for (const item of items) {
    select.add(
      new Option(labelFn(item), String(item[idKey]))
    );
  }

  select.value = String(selected);
  return selected;
}

// Dashboard rendering
function render() {
  for (const button of $('roleTabs').querySelectorAll('button')) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.role === state.role)
    );
  }

  $('adminView').hidden = state.role !== 'ADMIN';
  $('organiserView').hidden = state.role !== 'ORGANISER';
  $('customerView').hidden = state.role !== 'CUSTOMER';

  const headings = {
    ADMIN: [
      'Administrator dashboard',
      'Manage users, venues and system records.'
    ],
    ORGANISER: [
      'Organiser dashboard',
      'Create events and manage event bookings.'
    ],
    CUSTOMER: [
      'Customer dashboard',
      'Find events, reserve tickets and manage your bookings.'
    ]
  };

  $('roleHeading').textContent = headings[state.role][0];
  $('roleDescription').textContent = headings[state.role][1];

  const picker = $('actorPicker');
  picker.hidden = state.role === 'ADMIN';

  if (state.role !== 'ADMIN') {
    const role = state.role;

    const accounts = state.users.filter(
      user => user.role === role
    );

    $('actorLabel').textContent =
      role === 'CUSTOMER'
        ? 'Customer account'
        : 'Organiser account';

    state.actors[role] = optionList(
      $('actorSelect'),
      accounts,
      `No ${role.toLowerCase()} account`,
      state.actors[role],
      user => `${user.name} (ID ${user.user_id})`,
      'user_id'
    );
  }

  renderAdmin();
  renderOrganiser();
  renderCustomer();
}

// Administrator
function renderAdmin() {
  $('adminStats').innerHTML = stats([
    ['Registered users', state.users.length, 'Across all roles'],
    [
      'Active venues',
      state.venues.filter(v => v.status === 'ACTIVE').length,
      `${state.venues.length} venues total`
    ],
    ['Total bookings', state.bookings.length, 'Including cancellations']
  ]);

  $('usersTable').innerHTML = table(
    ['ID', 'Name', 'Role'],
    state.users.map(user => [
      esc(user.user_id),
      esc(user.name),
      tag(user.role)
    ])
  );

  $('venuesTable').innerHTML = table(
    ['Venue', 'Location', 'Capacity', 'Status'],
    state.venues.map(venue => [
      esc(venue.venue_name),
      esc(venue.location),
      esc(venue.capacity),
      tag(venue.status)
    ])
  );

  $('allBookingsTable').innerHTML = table(
    ['Booking', 'Customer', 'Event', 'Tickets', 'Total', 'Status'],
    state.bookings.map(booking => {
      const user = state.users.find(
        u => num(u.user_id) === num(booking.user_id)
      );

      const event = state.events.find(
        e => num(e.event_id) === num(booking.event_id)
      );

      return [
        esc(booking.booking_id),
        esc(booking.customer_name || user?.name || `User ${booking.user_id}`),
        esc(booking.event_name || event?.event_name || booking.event_id),
        esc(booking.quantity),
        money(booking.total_price),
        tag(booking.booking_status)
      ];
    })
  );

  const customers = state.users.filter(
    user => user.role === 'CUSTOMER' && num(user.user_id) > 5
  );

  state.manageUser = optionList(
    $('manageUserId'),
    customers,
    'Create a customer first',
    state.manageUser,
    user => `${user.name} (ID ${user.user_id})`,
    'user_id'
  );

  fillUser();

  const venues = state.venues.filter(
    venue => num(venue.venue_id) > 5
  );

  state.manageVenue = optionList(
    $('manageVenueId'),
    venues,
    'Create a venue first',
    state.manageVenue,
    venue => `${venue.venue_name} (ID ${venue.venue_id})`,
    'venue_id'
  );

  fillVenue();
}

function fillUser() {
  const user = state.users.find(
    u => num(u.user_id) === state.manageUser
  );

  const form = $('userEditForm');

  form.elements.name.value = user?.name || '';

  form.elements.email.value = user
    ? state.knownEmails[user.user_id] || ''
    : '';

  form.querySelector('[type="submit"]').disabled = !user;
  $('deleteUserBtn').disabled = !user;
}

function fillVenue() {
  const venue = state.venues.find(
    v => num(v.venue_id) === state.manageVenue
  );

  const form = $('venueEditForm');

  for (const key of ['venue_name', 'location', 'capacity']) {
    form.elements[key].value = venue?.[key] ?? '';
  }

  form.elements.status.value = venue?.status || 'ACTIVE';

  form.querySelector('[type="submit"]').disabled = !venue;
  $('deleteVenueBtn').disabled = !venue;
}

// Event and ticket helpers
function reserved(eventId) {
  return state.bookings
    .filter(booking =>
      num(booking.event_id) === num(eventId) &&
      ['PENDING', 'CONFIRMED'].includes(booking.booking_status)
    )
    .reduce(
      (total, booking) => total + num(booking.quantity),
      0
    );
}

function available(event) {
  return Math.max(
    0,
    num(event.ticket_quantity) - reserved(event.event_id)
  );
}

function isBookable(event) {
  return event.status === 'ACTIVE' &&
    String(event.event_date) >= today() &&
    available(event) > 0;
}

// Organiser
function renderOrganiser() {
  const organiserId = state.actors.ORGANISER;

  const events = state.events.filter(
    event => num(event.organiser_id) === organiserId
  );

  const eventIds = new Set(
    events.map(event => num(event.event_id))
  );

  const bookings = state.bookings.filter(
    booking => eventIds.has(num(booking.event_id))
  );

  $('organiserStats').innerHTML = stats([
    ['My events', events.length, 'Events I organise'],
    ['Total reservations', bookings.length, 'Across my events'],
    [
      'Pending approvals',
      bookings.filter(b => b.booking_status === 'PENDING').length,
      'Awaiting confirmation'
    ]
  ]);

  $('organiserEventsTable').innerHTML = table(
    ['Event', 'Date', 'Venue', 'Price', 'Available', 'Status'],
    events.map(event => {
      const venue = state.venues.find(
        v => num(v.venue_id) === num(event.venue_id)
      );

      return [
        esc(event.event_name),
        esc(formatDate(event.event_date)),
        esc(venue?.venue_name || '—'),
        money(event.ticket_price),
        esc(available(event)),
        tag(event.status)
      ];
    }),
    'No events assigned to this organiser.'
  );

  for (const select of document.querySelectorAll('.active-venue-select')) {
    const selectedId = select.value;
    const venues = state.venues.filter(v => v.status === 'ACTIVE');

    optionList(
      select,
      venues,
      'No active venue available',
      selectedId || venues[0]?.venue_id,
      v => `${v.venue_name} (capacity ${v.capacity})`,
      'venue_id'
    );
  }

  const manageable = events.filter(
    event => num(event.event_id) > 5
  );

  state.manageEvent = optionList(
    $('manageEventId'),
    manageable,
    'Create an event first',
    state.manageEvent,
    event => `${event.event_name} (ID ${event.event_id})`,
    'event_id'
  );

  fillEvent();

  $('organiserBookingsTable').innerHTML = table(
    ['Booking', 'Customer', 'Event', 'Quantity', 'Status', 'Action'],
    bookings.map(booking => {
      const event = state.events.find(
        e => num(e.event_id) === num(booking.event_id)
      );

      const user = state.users.find(
        u => num(u.user_id) === num(booking.user_id)
      );

      const canConfirm =
        booking.booking_status === 'PENDING' &&
        event?.status === 'ACTIVE' &&
        event?.event_date >= today();

      const action = canConfirm
        ? `<button type="button" class="btn btn-sm"
             data-confirm-booking="${esc(booking.booking_id)}">
             Confirm
           </button>`
        : '—';

      return [
        esc(booking.booking_id),
        esc(booking.customer_name || user?.name || booking.user_id),
        esc(event?.event_name || booking.event_id),
        esc(booking.quantity),
        tag(booking.booking_status),
        action
      ];
    }),
    'No bookings for these events.'
  );
}

function fillEvent() {
  const event = state.events.find(
    e => num(e.event_id) === state.manageEvent
  );

  const form = $('eventEditForm');

  const fields = [
    'event_name',
    'event_date',
    'ticket_price',
    'ticket_quantity',
    'description'
  ];

  for (const field of fields) {
    form.elements[field].value = event?.[field] ?? '';
  }

  form.elements.start_time.value = shortTime(event?.start_time);
  form.elements.end_time.value = shortTime(event?.end_time);

  if (event) {
    form.elements.venue_id.value = String(event.venue_id);
  }

  form.elements.status.value = event?.status || 'ACTIVE';

  form.querySelector('[type="submit"]').disabled = !event;
  $('deleteEventBtn').disabled = !event;
}

// Customer
function renderCustomer() {
  const userId = state.actors.CUSTOMER;

  const bookings = state.bookings.filter(
    booking => num(booking.user_id) === userId
  );

  $('customerStats').innerHTML = stats([
    [
      'Available events',
      state.events.filter(isBookable).length,
      'Upcoming events with tickets'
    ],
    ['My bookings', bookings.length, 'Booking history'],
    [
      'Active bookings',
      bookings.filter(b => b.booking_status !== 'CANCELLED').length,
      'Pending or confirmed'
    ]
  ]);

  renderEventCards();

  $('customerBookingsTable').innerHTML = table(
    ['Booking', 'Event', 'Tickets', 'Price', 'Status', 'Action'],
    bookings.map(booking => {
      const event = state.events.find(
        e => num(e.event_id) === num(booking.event_id)
      );

      const canCancel =
        ['PENDING', 'CONFIRMED'].includes(booking.booking_status) &&
        event?.event_date >= today();

      const action = canCancel
        ? `<button type="button" class="btn btn-sm btn-danger"
             data-cancel-booking="${esc(booking.booking_id)}">
             Cancel booking
           </button>`
        : '—';

      return [
        esc(booking.booking_id),
        esc(booking.event_name || event?.event_name || booking.event_id),
        esc(booking.quantity),
        money(booking.total_price),
        tag(booking.booking_status),
        action
      ];
    }),
    'No bookings for this customer.'
  );
}

function renderEventCards() {
  const search = $('eventSearch').value.trim().toLowerCase();
  const onlyAvailable = $('eventFilter').value === 'AVAILABLE';

  const events = state.events.filter(event => {
    const venue = state.venues.find(
      v => num(v.venue_id) === num(event.venue_id)
    );

    const text = [
      event.event_name,
      venue?.venue_name || '',
      venue?.location || ''
    ].join(' ').toLowerCase();

    return text.includes(search) &&
      (!onlyAvailable || isBookable(event));
  });

  $('eventCards').innerHTML = events.map(event => {
    const venue = state.venues.find(
      v => num(v.venue_id) === num(event.venue_id)
    );

    const canBook = isBookable(event) && !!state.actors.CUSTOMER;
    const remaining = available(event);

    return `
      <article class="event-tile">
        <div>${tag(event.status)}</div>

        <div class="event-title">${esc(event.event_name)}</div>

        <p>
          ${esc(formatDate(event.event_date))} ·
          ${esc(shortTime(event.start_time))}–${esc(shortTime(event.end_time))}
        </p>

        <p>
          ${esc(venue?.venue_name || 'Venue not found')} ·
          ${esc(venue?.location || '')}
        </p>

        <div class="event-meta">
          <strong>${money(event.ticket_price)}</strong> per ticket ·
          <strong>${esc(remaining)}</strong> available
        </div>

        <div class="booking-control">
          <label>
            Tickets
            <input type="number" min="1"
              max="${Math.max(1, remaining)}"
              value="1"
              id="qty-${num(event.event_id)}"
              ${canBook ? '' : 'disabled'}>
          </label>

          <button type="button" class="btn btn-primary"
            data-book-event="${num(event.event_id)}"
            ${canBook ? '' : 'disabled'}>
            ${canBook ? 'Book tickets' : 'Unavailable'}
          </button>
        </div>
      </article>
    `;
  }).join('') || empty('No events match this search.');
}

function eventData(form, organiserId) {
  const fields = form.elements;

  const payload = {
    organiser_id: organiserId,
    venue_id: num(fields.venue_id.value),
    event_name: fields.event_name.value.trim(),
    description: fields.description.value.trim(),
    event_date: fields.event_date.value,
    start_time: fullTime(fields.start_time.value),
    end_time: fullTime(fields.end_time.value),
    ticket_price: Number(fields.ticket_price.value),
    ticket_quantity: Number(fields.ticket_quantity.value),
    status: fields.status.value
  };

  if (payload.event_date < today()) {
    throw new Error('Choose today or a future event date.');
  }

  if (payload.end_time <= payload.start_time) {
    throw new Error('End time must be later than start time.');
  }

  const venue = state.venues.find(
    v => num(v.venue_id) === payload.venue_id
  );

  if (!venue || venue.status !== 'ACTIVE') {
    throw new Error('Choose an active venue.');
  }

  if (payload.ticket_quantity > num(venue.capacity)) {
    throw new Error(
      `Ticket allocation cannot exceed venue capacity (${venue.capacity}).`
    );
  }

  if (
    !Number.isInteger(payload.ticket_quantity) ||
    payload.ticket_quantity < 1
  ) {
    throw new Error('Ticket quantity must be a positive whole number.');
  }

  if (
    !Number.isFinite(payload.ticket_price) ||
    payload.ticket_price < 0
  ) {
    throw new Error('Price must be zero or greater.');
  }

  return payload;
}

// Role navigation
function setRole(role) {
  if (!['ADMIN', 'ORGANISER', 'CUSTOMER'].includes(role)) {
    return;
  }

  state.role = role;
  render();

  window.scrollTo({
    top: 125,
    behavior: 'smooth'
  });
}

$('roleTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-role]');

  if (button) {
    setRole(button.dataset.role);
  }
});

$('actorSelect').addEventListener('change', event => {
  state.actors[state.role] = num(event.target.value) || null;
  render();
});

$('refreshBtn').addEventListener('click', () => loadAll());

$('manageUserId').addEventListener('change', event => {
  state.manageUser = num(event.target.value) || null;
  fillUser();
});

$('manageVenueId').addEventListener('change', event => {
  state.manageVenue = num(event.target.value) || null;
  fillVenue();
});

$('manageEventId').addEventListener('change', event => {
  state.manageEvent = num(event.target.value) || null;
  fillEvent();
});

$('eventSearch').addEventListener('input', renderEventCards);
$('eventFilter').addEventListener('change', renderEventCards);

// Create customer
$('registerForm').addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;

  submitAction(form, 'registerMessage', async () => {
    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      password: form.elements.password.value
    };

    const result = await request('POST', 'users', payload);
    const id = num(result.data?.user_id);

    state.knownEmails[id] = payload.email;
    state.manageUser = id;
    state.actors.CUSTOMER = id;

    form.reset();
    await loadAll(true);

    notify(
      'registerMessage',
      `Customer created successfully (ID ${id}). You can now select this account on the Customer dashboard.`
    );
  });
});

// Update customer
$('userEditForm').addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;
  const id = state.manageUser;

  submitAction(form, 'userEditMessage', async () => {
    if (!id || id <= 5) {
      throw new Error('Select a demonstration customer.');
    }

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim()
    };

    await request('PUT', `users/${id}`, payload);

    state.knownEmails[id] = payload.email;

    await loadAll(true);

    notify(
      'userEditMessage',
      `Customer ${id} updated successfully.`
    );
  });
});

// Delete customer
$('deleteUserBtn').addEventListener('click', () => {
  const id = state.manageUser;

  const user = state.users.find(
    u => num(u.user_id) === id
  );

  if (!user || id <= 5) return;

  if (!confirm(
    `Delete customer ${user.name} (ID ${id}) permanently?`
  )) {
    return;
  }

  submitAction($('userEditForm'), 'userEditMessage', async () => {
    await request('DELETE', `users/${id}`);

    state.manageUser = null;
    delete state.knownEmails[id];

    await loadAll(true);

    notify(
      'userEditMessage',
      `Customer ${id} deleted successfully.`
    );
  });
});

// Create venue
$('venueCreateForm').addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;

  submitAction(form, 'venueCreateMessage', async () => {
    const payload = {
      venue_name: form.elements.venue_name.value.trim(),
      location: form.elements.location.value.trim(),
      capacity: Number(form.elements.capacity.value),
      status: form.elements.status.value
    };

    const result = await request('POST', 'venues', payload);

    state.manageVenue = num(result.data?.venue_id);

    form.reset();
    await loadAll(true);

    notify(
      'venueCreateMessage',
      `Venue created successfully (ID ${state.manageVenue}).`
    );
  });
});

// Update venue
$('venueEditForm').addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;
  const id = state.manageVenue;

  submitAction(form, 'venueEditMessage', async () => {
    if (!id || id <= 5) {
      throw new Error('Select a demonstration venue.');
    }

    const payload = {
      venue_name: form.elements.venue_name.value.trim(),
      location: form.elements.location.value.trim(),
      capacity: Number(form.elements.capacity.value),
      status: form.elements.status.value
    };

    await request('PUT', `venues/${id}`, payload);
    await loadAll(true);

    notify(
      'venueEditMessage',
      `Venue ${id} updated successfully.`
    );
  });
});

// Delete venue
$('deleteVenueBtn').addEventListener('click', () => {
  const id = state.manageVenue;

  const venue = state.venues.find(
    v => num(v.venue_id) === id
  );

  if (!venue || id <= 5) return;

  if (!confirm(
    `Delete venue ${venue.venue_name} (ID ${id}) permanently?`
  )) {
    return;
  }

  submitAction($('venueEditForm'), 'venueEditMessage', async () => {
    await request('DELETE', `venues/${id}`);

    state.manageVenue = null;
    await loadAll(true);

    notify(
      'venueEditMessage',
      `Venue ${id} deleted successfully.`
    );
  });
});

// Create event
$('eventCreateForm').elements.event_date.min = today();
$('eventCreateForm').elements.event_date.value = futureDay();

$('eventCreateForm').addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;

  submitAction(form, 'eventCreateMessage', async () => {
    const organiserId = state.actors.ORGANISER;

    if (!organiserId) {
      throw new Error('Select an organiser.');
    }

    const payload = eventData(form, organiserId);
    const result = await request('POST', 'events', payload);

    state.manageEvent = num(result.data?.event_id);

    form.reset();

    form.elements.event_date.value = futureDay();
    form.elements.start_time.value = '09:00';
    form.elements.end_time.value = '17:00';
    form.elements.ticket_price.value = '20.00';
    form.elements.ticket_quantity.value = '100';

    await loadAll(true);

    notify(
      'eventCreateMessage',
      `Event created successfully (ID ${state.manageEvent}).`
    );
  });
});

// Update event
$('eventEditForm').addEventListener('submit', event => {
  event.preventDefault();

  const form = event.currentTarget;
  const id = state.manageEvent;

  submitAction(form, 'eventEditMessage', async () => {
    const current = state.events.find(
      event => num(event.event_id) === id
    );

    if (
      !current ||
      id <= 5 ||
      num(current.organiser_id) !== state.actors.ORGANISER
    ) {
      throw new Error('Select your demonstration event.');
    }

    const payload = eventData(
      form,
      state.actors.ORGANISER
    );

    if (payload.ticket_quantity < reserved(id)) {
      throw new Error(
        'Ticket quantity cannot be less than existing active reservations.'
      );
    }

    await request('PUT', `events/${id}`, payload);
    await loadAll(true);

    notify(
      'eventEditMessage',
      `Event ${id} updated successfully.`
    );
  });
});

// Delete event
$('deleteEventBtn').addEventListener('click', () => {
  const id = state.manageEvent;

  const event = state.events.find(
    e => num(e.event_id) === id
  );

  if (
    !event ||
    id <= 5 ||
    num(event.organiser_id) !== state.actors.ORGANISER
  ) {
    return;
  }

  if (!confirm(
    `Delete event ${event.event_name} (ID ${id}) permanently?`
  )) {
    return;
  }

  submitAction($('eventEditForm'), 'eventEditMessage', async () => {
    await request('DELETE', `events/${id}`);

    state.manageEvent = null;
    await loadAll(true);

    notify(
      'eventEditMessage',
      `Event ${id} deleted successfully.`
    );
  });
});

// Confirm a booking
$('organiserBookingsTable').addEventListener('click', event => {
  const button = event.target.closest('[data-confirm-booking]');

  if (!button) return;

  const id = num(button.dataset.confirmBooking);

  const booking = state.bookings.find(
    b => num(b.booking_id) === id
  );

  const selectedEvent = state.events.find(
    e => num(e.event_id) === num(booking?.event_id)
  );

  if (
    !booking ||
    !selectedEvent ||
    num(selectedEvent.organiser_id) !== state.actors.ORGANISER
  ) {
    return;
  }

  if (!confirm(
    `Confirm booking #${id} for ${selectedEvent.event_name}?`
  )) {
    return;
  }

  submitAction(null, 'organiserBookingMessage', async () => {
    await request('PUT', `bookings/${id}`, {
      booking_status: 'CONFIRMED'
    });

    await loadAll(true);

    notify(
      'organiserBookingMessage',
      `Booking #${id} confirmed.`
    );
  });
});

// Book tickets
$('eventCards').addEventListener('click', event => {
  const button = event.target.closest('[data-book-event]');

  if (!button) return;

  const eventId = num(button.dataset.bookEvent);

  const selectedEvent = state.events.find(
    e => num(e.event_id) === eventId
  );

  const userId = state.actors.CUSTOMER;

  if (!selectedEvent || !userId) return;

  const quantity = Number(
    $(`qty-${eventId}`)?.value
  );

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > available(selectedEvent)
  ) {
    notify(
      'customerBookMessage',
      'Enter a valid ticket quantity within availability.',
      'error'
    );
    return;
  }

  const total = money(
    num(selectedEvent.ticket_price) * quantity
  );

  if (!confirm(
    `Book ${quantity} ticket(s) for ${selectedEvent.event_name}? Total ${total}.`
  )) {
    return;
  }

  submitAction(null, 'customerBookMessage', async () => {
    const result = await request('POST', 'bookings', {
      user_id: userId,
      event_id: eventId,
      quantity
    });

    await loadAll(true);

    notify(
      'customerBookMessage',
      `Booking #${result.data?.booking_id} created · ${money(result.data?.total_price)} · ${result.data?.booking_status}.`
    );
  });
});

// Cancel booking
$('customerBookingsTable').addEventListener('click', event => {
  const button = event.target.closest('[data-cancel-booking]');

  if (!button) return;

  const id = num(button.dataset.cancelBooking);

  const booking = state.bookings.find(
    b => num(b.booking_id) === id
  );

  if (
    !booking ||
    num(booking.user_id) !== state.actors.CUSTOMER
  ) {
    return;
  }

  if (!confirm(
    `Cancel booking #${id}? The record will remain as CANCELLED.`
  )) {
    return;
  }

  submitAction(null, 'customerCancelMessage', async () => {
    await request('DELETE', `bookings/${id}`);
    await loadAll(true);

    notify(
      'customerCancelMessage',
      `Booking #${id} cancelled. Its record is retained.`
    );
  });
});

// Start EventDesk
loadAll();
