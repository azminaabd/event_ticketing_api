<?php

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/shared/api_helpers.php';

jsonHeaders([
    'GET',
    'POST',
    'PUT',
    'DELETE',
]);

$method = $_SERVER['REQUEST_METHOD'];

$id = isset($_GET['id']) ? validId($_GET['id']) : null;

if (isset($_GET['id']) && $id === null) {
    respond(400, ['error' => 'Invalid event ID']);
}

// GET
if ($method === 'GET') {
    $fields = 'event_id,
         organiser_id,
         venue_id,
         event_name,
         description,
         event_date,
         start_time,
         end_time,
         ticket_price,
         ticket_quantity,
         status';

    // GET ONE EVENT
    if ($id !== null) {
        $s = $conn->prepare("SELECT $fields
             FROM events
             WHERE event_id = ?");

        $s->bind_param('i', $id);

        $s->execute();

        $row = $s->get_result()->fetch_assoc();

        if (!$row) {
            respond(404, ['error' => 'Event not found']);
        }

        respond(200, ['data' => $row]);
    }

    
    // ==========================================
    // MEMBER 5 - API MANAGEMENT
    // FEATURE 1: PAGINATION
    // ==========================================

    // Get page and limit from URL parameters
    $page = filter_var(
        $_GET['page'] ?? 1,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    $limit = filter_var(
        $_GET['limit'] ?? 10,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1, 'max_range' => 100]]
    );

    // Validate pagination parameters
    if ($page === false || $limit === false) {
        respond(400, [
            'error' => 'Page must be positive and limit must be between 1 and 100'
        ]);
    }

    // Calculate offset
    $offset = ($page - 1) * $limit;

// ==========================================
// MEMBER 5 - API MANAGEMENT
// FEATURE 2: SEARCHING
// ==========================================

// Get search keyword from URL
$search = trim($_GET['search'] ?? '');

// Prepare search pattern for SQL LIKE
$searchPattern = '%' . $search . '%';

// ==========================================
// MEMBER 5 - API MANAGEMENT
// FEATURE 3: FILTERING
// ==========================================

// Get event status from URL
$statusFilter = strtoupper(trim($_GET['status'] ?? ''));

// Validate event status
if (
    $statusFilter !== '' &&
    !in_array(
        $statusFilter,
        ['ACTIVE', 'CANCELLED', 'COMPLETED'],
        true
    )
) {
    respond(400, [
        'error' => 'Invalid status. Use ACTIVE, CANCELLED, or COMPLETED'
    ]);
}

// ==========================================
// MEMBER 5 - API MANAGEMENT
// FEATURE 4: SORTING
// ==========================================

// Get sorting column and direction from URL
$sort = $_GET['sort'] ?? 'event_id';
$order = strtolower($_GET['order'] ?? 'asc');

// Allow only specific database columns
$allowedSort = [
    'event_id',
    'event_name',
    'event_date',
    'ticket_price'
];

// Validate sorting column
if (!in_array($sort, $allowedSort, true)) {
    respond(400, [
        'error' => 'Invalid sort column'
    ]);
}

// Validate sorting direction
if (!in_array($order, ['asc', 'desc'], true)) {
    respond(400, [
        'error' => 'Invalid sort order. Use asc or desc'
    ]);
}

// Convert direction to SQL format
$order = strtoupper($order);

    // Count total events matching search and status filter
$countQuery = $conn->prepare(
    "SELECT COUNT(*) AS total
     FROM events
     WHERE event_name LIKE ?
     AND (? = '' OR status = ?)"
);

// Bind search keyword and status filter
$countQuery->bind_param(
    'sss',
    $searchPattern,
    $statusFilter,
    $statusFilter
);

$countQuery->execute();

// Get total matching records
$total = (int) $countQuery->get_result()->fetch_assoc()['total'];

    // Retrieve events matching search and status filter
// with pagination
$s = $conn->prepare(
    "SELECT $fields
     FROM events
     WHERE event_name LIKE ?
     AND (? = '' OR status = ?)
     ORDER BY $sort $order, event_id ASC
     LIMIT ? OFFSET ?"
);

// Bind search, status, limit, and offset parameters
$s->bind_param(
    'sssii',
    $searchPattern,
    $statusFilter,
    $statusFilter,
    $limit,
    $offset
);

$s->execute();

$events = $s->get_result()->fetch_all(MYSQLI_ASSOC);

    respond(200, [
        'data' => $events,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $limit,
            'total_records' => $total,
            'total_pages' => (int) ceil($total / $limit)
        ]
    ]);

    
}

// POST / PUT
if ($method === 'POST' || $method === 'PUT') {
    if ($method === 'POST' && $id !== null) {
        respond(400, ['error' => 'POST targets /events']);
    }

    if ($method === 'PUT' && $id === null) {
        respond(400, [
            'error' => 'PUT requires /events/{id}',
        ]);
    }

    $d = readJson();

    $organiserId = validId($d['organiser_id'] ?? null);

    $venueId = validId($d['venue_id'] ?? null);

    $eventName = trim($d['event_name'] ?? '');

    $description = trim($d['description'] ?? '');

    $eventDate = trim($d['event_date'] ?? '');

    $startTime = trim($d['start_time'] ?? '');

    $endTime = trim($d['end_time'] ?? '');

    $ticketPrice = filter_var($d['ticket_price'] ?? null, FILTER_VALIDATE_FLOAT);

    $ticketQuantity = filter_var($d['ticket_quantity'] ?? null, FILTER_VALIDATE_INT);

    $status = strtoupper(trim($d['status'] ?? ''));

    // BASIC VALIDATION
    if (
        !$organiserId
        || !$venueId
        || $eventName === ''
        || !validDate($eventDate)
        || !validTime($startTime)
        || !validTime($endTime)
        || $ticketPrice === false
        || $ticketPrice < 0
        || $ticketQuantity === false
        || $ticketQuantity < 1
        || !in_array(
            $status,
            [
                'ACTIVE',
                'CANCELLED',
                'COMPLETED',
            ],
            true,
        )
    ) {
        respond(422, [
            'error' => 'Valid event data is required',
        ]);
    }

    // CHECK START AND END TIME
    if (strtotime($endTime) <= strtotime($startTime)) {
        respond(422, [
            'error' => 'End time must be later than start time',
        ]);
    }

    // CHECK ORGANISER
    $u = $conn->prepare('SELECT user_id, role
         FROM users
         WHERE user_id = ?');

    $u->bind_param('i', $organiserId);

    $u->execute();

    $organiser = $u->get_result()->fetch_assoc();

    if (!$organiser) {
        respond(422, ['error' => 'Organiser does not exist']);
    }

    if ($organiser['role'] !== 'ORGANISER') {
        respond(422, [
            'error' => 'organiser_id must belong to an ORGANISER',
        ]);
    }

    // CHECK VENUE
    $v = $conn->prepare('SELECT
            venue_id,
            capacity,
            status
         FROM venues
         WHERE venue_id = ?');

    $v->bind_param('i', $venueId);

    $v->execute();

    $venue = $v->get_result()->fetch_assoc();

    if (!$venue) {
        respond(422, ['error' => 'Venue does not exist']);
    }

    if ($venue['status'] !== 'ACTIVE') {
        respond(422, ['error' => 'Selected venue is inactive']);
    }

    if ($ticketQuantity > (int) $venue['capacity']) {
        respond(422, [
            'error' => 'Ticket quantity cannot exceed venue capacity',
        ]);
    }

    try {
        // POST
        if ($method === 'POST') {
            $s = $conn->prepare('INSERT INTO events
                (
                    organiser_id,
                    venue_id,
                    event_name,
                    description,
                    event_date,
                    start_time,
                    end_time,
                    ticket_price,
                    ticket_quantity,
                    status
                )
                VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

            $s->bind_param(
                'iisssssdis',
                $organiserId,
                $venueId,
                $eventName,
                $description,
                $eventDate,
                $startTime,
                $endTime,
                $ticketPrice,
                $ticketQuantity,
                $status,
            );
        }
        // PUT
        else {
            $s = $conn->prepare('UPDATE events
                 SET
                    organiser_id = ?,
                    venue_id = ?,
                    event_name = ?,
                    description = ?,
                    event_date = ?,
                    start_time = ?,
                    end_time = ?,
                    ticket_price = ?,
                    ticket_quantity = ?,
                    status = ?
                 WHERE event_id = ?');

            $s->bind_param(
                'iisssssdisi',
                $organiserId,
                $venueId,
                $eventName,
                $description,
                $eventDate,
                $startTime,
                $endTime,
                $ticketPrice,
                $ticketQuantity,
                $status,
                $id,
            );
        }

        $s->execute();
    } catch (mysqli_sql_exception $e) {
        respond(500, ['error' => 'Database operation failed']);
    }

    // CHECK PUT EVENT EXISTS
    if ($method === 'PUT' && $s->affected_rows === 0) {
        $c = $conn->prepare('SELECT event_id
             FROM events
             WHERE event_id = ?');

        $c->bind_param('i', $id);

        $c->execute();

        if ($c->get_result()->num_rows === 0) {
            respond(404, ['error' => 'Event not found']);
        }
    }

    respond($method === 'POST' ? 201 : 200, [
        'message' => $method === 'POST' ? 'Event created successfully' : 'Event updated successfully',

        'data' => [
            'event_id' => $method === 'POST' ? $conn->insert_id : $id,
        ],
    ]);
}

// DELETE
if ($method === 'DELETE') {
    if ($id === null) {
        respond(400, [
            'error' => 'DELETE requires /events/{id}',
        ]);
    }

    $s = $conn->prepare('DELETE FROM events
         WHERE event_id = ?');

    $s->bind_param('i', $id);

    try {
        $s->execute();
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() === 1451) {
            respond(409, [
                'error' => 'Event cannot be deleted because bookings exist',
            ]);
        }

        respond(500, ['error' => 'Database operation failed']);
    }

    if ($s->affected_rows === 0) {
        respond(404, ['error' => 'Event not found']);
    }

    respond(200, [
        'message' => 'Event deleted successfully',
    ]);
}

respond(405, ['error' => 'Method not allowed']);
