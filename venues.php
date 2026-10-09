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
    respond(400, ['error' => 'Invalid venue ID']);
}

// GET
if ($method === 'GET') {
    // GET ONE VENUE
    if ($id !== null) {
        $s = $conn->prepare('SELECT
                venue_id,
                venue_name,
                location,
                capacity,
                status
             FROM venues
             WHERE venue_id = ?');

        $s->bind_param('i', $id);

        $s->execute();

        $row = $s->get_result()->fetch_assoc();

        if (!$row) {
            respond(404, ['error' => 'Venue not found']);
        }

        respond(200, ['data' => $row]);
    }

    // GET ALL VENUES
    $r = $conn->query('SELECT
            venue_id,
            venue_name,
            location,
            capacity,
            status
         FROM venues
         ORDER BY venue_id');

    respond(200, [
        'data' => $r->fetch_all(MYSQLI_ASSOC),
    ]);
}

// POST / PUT
if ($method === 'POST' || $method === 'PUT') {
    if ($method === 'POST' && $id !== null) {
        respond(400, ['error' => 'POST targets /venues']);
    }

    if ($method === 'PUT' && $id === null) {
        respond(400, [
            'error' => 'PUT requires /venues/{id}',
        ]);
    }

    $d = readJson();

    $venueName = trim($d['venue_name'] ?? '');

    $location = trim($d['location'] ?? '');

    $capacity = filter_var($d['capacity'] ?? null, FILTER_VALIDATE_INT);

    $status = strtoupper(trim($d['status'] ?? ''));

    // VALIDATION
    if (
        $venueName === ''
        || $location === ''
        || $capacity === false
        || $capacity < 1
        || !in_array($status, ['ACTIVE', 'INACTIVE'], true)
    ) {
        respond(422, [
            'error' => 'Valid venue_name, location, capacity and status are required',
        ]);
    }

    try {
        // CREATE
        if ($method === 'POST') {
            $s = $conn->prepare('INSERT INTO venues
                (
                    venue_name,
                    location,
                    capacity,
                    status
                )
                VALUES (?, ?, ?, ?)');

            $s->bind_param('ssis', $venueName, $location, $capacity, $status);
        }
        // UPDATE
        else {
            $s = $conn->prepare('UPDATE venues
                 SET
                    venue_name = ?,
                    location = ?,
                    capacity = ?,
                    status = ?
                 WHERE venue_id = ?');

            $s->bind_param('ssisi', $venueName, $location, $capacity, $status, $id);
        }

        $s->execute();
    } catch (mysqli_sql_exception $e) {
        respond(500, ['error' => 'Database operation failed']);
    }

    // Check PUT ID exists
    if ($method === 'PUT' && $s->affected_rows === 0) {
        $c = $conn->prepare('SELECT venue_id
             FROM venues
             WHERE venue_id = ?');

        $c->bind_param('i', $id);

        $c->execute();

        if ($c->get_result()->num_rows === 0) {
            respond(404, ['error' => 'Venue not found']);
        }
    }

    respond($method === 'POST' ? 201 : 200, [
        'message' => $method === 'POST' ? 'Venue created successfully' : 'Venue updated successfully',

        'data' => [
            'venue_id' => $method === 'POST' ? $conn->insert_id : $id,
        ],
    ]);
}

// DELETE
if ($method === 'DELETE') {
    if ($id === null) {
        respond(400, [
            'error' => 'DELETE requires /venues/{id}',
        ]);
    }

    $s = $conn->prepare('DELETE FROM venues
         WHERE venue_id = ?');

    $s->bind_param('i', $id);

    try {
        $s->execute();
    } catch (mysqli_sql_exception $e) {
        // Foreign-key restriction
        if ($e->getCode() === 1451) {
            respond(409, [
                'error' => 'Venue cannot be deleted because it is used by an event',
            ]);
        }

        respond(500, ['error' => 'Database operation failed']);
    }

    if ($s->affected_rows === 0) {
        respond(404, ['error' => 'Venue not found']);
    }

    respond(200, [
        'message' => 'Venue deleted successfully',
    ]);
}

// INVALID METHOD
respond(405, ['error' => 'Method not allowed']);
