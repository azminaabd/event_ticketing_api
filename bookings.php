
<?php

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/shared/api_helpers.php';

jsonHeaders(['GET', 'POST', 'PUT', 'DELETE']);

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? validId($_GET['id']) : null;

if (isset($_GET['id']) && $id === null) {
    respond(400, ['error' => 'Invalid booking ID']);
}



if ($method === 'GET') {

    $fields = 'b.booking_id, b.user_id,
               u.name AS customer_name,
               b.event_id, e.event_name,
               b.quantity, b.total_price,
               b.booking_status, b.booking_date';

    $joins = 'FROM bookings b
              JOIN users u ON b.user_id = u.user_id
              JOIN events e ON b.event_id = e.event_id';

    
    if ($id !== null) {

        $s = $conn->prepare(
            "SELECT $fields $joins
             WHERE b.booking_id = ?"
        );

        $s->bind_param('i', $id);
        $s->execute();

        $booking = $s->get_result()->fetch_assoc();

        if (!$booking) {
            respond(404, [
                'error' => 'Booking not found'
            ]);
        }

        respond(200, ['data' => $booking]);
    }


    $r = $conn->query(
        "SELECT $fields $joins
         ORDER BY b.booking_id"
    );

    respond(200, [
        'data' => $r->fetch_all(MYSQLI_ASSOC)
    ]);
}



if ($method === 'POST') {

    if ($id !== null) {
        respond(400, [
            'error' => 'POST must target /bookings'
        ]);
    }

    
    if (!in_array(
        $_SERVER['REMOTE_ADDR'] ?? '',
        ['127.0.0.1', '::1'],
        true
    )) {
        respond(403, [
            'error' => 'Booking creation is restricted to localhost'
        ]);
    }

    $d = readJson();

    $userId = validId($d['user_id'] ?? null);
    $eventId = validId($d['event_id'] ?? null);
    $quantity = $d['quantity'] ?? null;

    
    if (
        !$userId ||
        !$eventId ||
        !is_int($quantity) ||
        $quantity < 1
    ) {
        respond(422, [
            'error' => 'Valid user_id, event_id and quantity are required'
        ]);
    }

    
    $s = $conn->prepare(
        'SELECT role FROM users WHERE user_id = ?'
    );

    $s->bind_param('i', $userId);
    $s->execute();

    $user = $s->get_result()->fetch_assoc();

    if (!$user) {
        respond(422, [
            'error' => 'Customer does not exist'
        ]);
    }

    if ($user['role'] !== 'CUSTOMER') {
        respond(422, [
            'error' => 'Only CUSTOMER accounts can create bookings'
        ]);
    }

    try {

        $conn->begin_transaction();

        
        $s = $conn->prepare(
            'SELECT event_name, ticket_price,
                    ticket_quantity, status, event_date
             FROM events
             WHERE event_id = ?
             FOR UPDATE'
        );

        $s->bind_param('i', $eventId);
        $s->execute();

        $event = $s->get_result()->fetch_assoc();

        if (!$event) {
            $conn->rollback();

            respond(404, [
                'error' => 'Event not found'
            ]);
        }

        
        if (
            $event['status'] !== 'ACTIVE' ||
            $event['event_date'] < date('Y-m-d')
        ) {
            $conn->rollback();

            respond(409, [
                'error' => 'Event is not available for booking'
            ]);
        }

        
        $s = $conn->prepare(
            "SELECT COALESCE(SUM(quantity), 0) AS reserved
             FROM bookings
             WHERE event_id = ?
             AND booking_status IN ('PENDING', 'CONFIRMED')"
        );

        $s->bind_param('i', $eventId);
        $s->execute();

        $reserved = (int) $s->get_result()
            ->fetch_assoc()['reserved'];

        $available = (int) $event['ticket_quantity']
            - $reserved;

        if ($quantity > $available) {
            $conn->rollback();

            respond(409, [
                'error' => 'Not enough tickets available',
                'available_tickets' => max(0, $available)
            ]);
        }

        
        $totalPrice = round(
            (float) $event['ticket_price'] * $quantity,
            2
        );

        $status = 'PENDING';

        
        $s = $conn->prepare(
            'INSERT INTO bookings
             (user_id, event_id, quantity,
              total_price, booking_status)
             VALUES (?, ?, ?, ?, ?)'
        );

        $s->bind_param(
            'iiids',
            $userId,
            $eventId,
            $quantity,
            $totalPrice,
            $status
        );

        $s->execute();

        $newId = $conn->insert_id;

        $conn->commit();

    } catch (Throwable $e) {

        $conn->rollback();

        respond(500, [
            'error' => 'Booking could not be created'
        ]);
    }

    respond(201, [
        'message' => 'Booking created successfully',
        'data' => [
            'booking_id' => $newId,
            'user_id' => $userId,
            'event_id' => $eventId,
            'event_name' => $event['event_name'],
            'quantity' => $quantity,
            'total_price' => number_format(
                $totalPrice, 2, '.', ''
            ),
            'booking_status' => $status
        ]
    ]);
}



 

if ($method === 'PUT') {

    if ($id === null) {
        respond(400, [
            'error' => 'PUT requires /bookings/{id}'
        ]);
    }

    
    if (!in_array(
        $_SERVER['REMOTE_ADDR'] ?? '',
        ['127.0.0.1', '::1'],
        true
    )) {
        respond(403, [
            'error' => 'Updates restricted to localhost during development'
        ]);
    }

    $d = readJson();
    $requested = $d['booking_status'] ?? null;

    if (!is_string($requested)) {
        respond(422, [
            'error' => 'booking_status must be CONFIRMED or CANCELLED'
        ]);
    }

    $newStatus = strtoupper(trim($requested));

    if (!in_array(
        $newStatus,
        ['CONFIRMED', 'CANCELLED'],
        true
    )) {
        respond(422, [
            'error' => 'booking_status must be CONFIRMED or CANCELLED'
        ]);
    }

    try {

        $conn->begin_transaction();

        
        $s = $conn->prepare(
            'SELECT b.booking_status,
                    e.event_date,
                    e.status AS event_status
             FROM bookings b
             JOIN events e
                 ON b.event_id = e.event_id
             WHERE b.booking_id = ?
             FOR UPDATE'
        );

        $s->bind_param('i', $id);
        $s->execute();

        $booking = $s->get_result()->fetch_assoc();

        if (!$booking) {
            $conn->rollback();

            respond(404, [
                'error' => 'Booking not found'
            ]);
        }

        $oldStatus = $booking['booking_status'];

        
        if ($oldStatus === 'CANCELLED') {
            $conn->rollback();

            respond(409, [
                'error' => 'Cancelled bookings cannot be updated'
            ]);
        }

        
        if ($oldStatus === $newStatus) {
            $conn->rollback();

            respond(409, [
                'error' => 'Booking already has this status'
            ]);
        }

    
        if ($booking['event_date'] < date('Y-m-d')) {
            $conn->rollback();

            respond(409, [
                'error' => 'Past-event bookings cannot be changed'
            ]);
        }

        
        if (
            $newStatus === 'CONFIRMED' &&
            (
                $oldStatus !== 'PENDING' ||
                $booking['event_status'] !== 'ACTIVE'
            )
        ) {
            $conn->rollback();

            respond(409, [
                'error' => 'Only pending bookings for active events can be confirmed'
            ]);
        }

        
        $s = $conn->prepare(
            'UPDATE bookings
             SET booking_status = ?
             WHERE booking_id = ?'
        );

        $s->bind_param(
            'si',
            $newStatus,
            $id
        );

        $s->execute();

        $conn->commit();

    } catch (Throwable $e) {

        $conn->rollback();

        respond(500, [
            'error' => 'Booking status could not be updated'
        ]);
    }

    respond(200, [
        'message' => 'Booking status updated successfully',
        'data' => [
            'booking_id' => $id,
            'booking_status' => $newStatus
        ]
    ]);
}



 

if ($method === 'DELETE') {

    if ($id === null) {
        respond(400, [
            'error' => 'DELETE requires /bookings/{id}'
        ]);
    }

    

    if (!in_array(
        $_SERVER['REMOTE_ADDR'] ?? '',
        ['127.0.0.1', '::1'],
        true
    )) {
        respond(403, [
            'error' => 'Cancellation restricted to localhost during development'
        ]);
    }

    
    $s = $conn->prepare(
        'SELECT b.booking_status, e.event_date
         FROM bookings b
         JOIN events e ON b.event_id = e.event_id
         WHERE b.booking_id = ?'
    );

    $s->bind_param('i', $id);
    $s->execute();

    $booking = $s->get_result()->fetch_assoc();

    if (!$booking) {
        respond(404, [
            'error' => 'Booking not found'
        ]);
    }

    if ($booking['booking_status'] === 'CANCELLED') {
        respond(409, [
            'error' => 'Booking is already cancelled'
        ]);
    }

    if ($booking['event_date'] < date('Y-m-d')) {
        respond(409, [
            'error' => 'Past-event bookings cannot be cancelled'
        ]);
    }

    
    $s = $conn->prepare(
        "UPDATE bookings
         SET booking_status = 'CANCELLED'
         WHERE booking_id = ?
           AND booking_status IN ('PENDING', 'CONFIRMED')
           AND EXISTS (
               SELECT 1 FROM events e
               WHERE e.event_id = bookings.event_id
                 AND e.event_date >= CURRENT_DATE()
           )"
    );

    $s->bind_param('i', $id);
    $s->execute();

    if ($s->affected_rows !== 1) {
        respond(409, [
            'error' => 'Booking could not be cancelled because its status or event date changed'
        ]);
    }

    respond(200, [
        'message' => 'Booking cancelled successfully',
        'data' => [
            'booking_id' => $id,
            'booking_status' => 'CANCELLED'
        ]
    ]);
}



respond(405, [
    'error' => 'Method not allowed'
]);
