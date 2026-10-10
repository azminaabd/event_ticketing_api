
<?php

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/shared/api_helpers.php';

jsonHeaders(['GET', 'POST', 'PUT', 'DELETE']);

$method = $_SERVER['REQUEST_METHOD'];

$id = isset($_GET['id']) ? validId($_GET['id']) : null;

if (isset($_GET['id']) && $id === null) {
    respond(400, ['error' => 'Invalid user ID']);
}



if ($method === 'GET') {

    
    if ($id !== null) {

        $s = $conn->prepare(
            'SELECT user_id, name, role, created_at
             FROM users
             WHERE user_id = ?'
        );

        $s->bind_param('i', $id);
        $s->execute();

        $user = $s->get_result()->fetch_assoc();

        if (!$user) {
            respond(404, ['error' => 'User not found']);
        }

        respond(200, ['data' => $user]);
    }

    
    $result = $conn->query(
        'SELECT user_id, name, role, created_at
         FROM users
         ORDER BY user_id'
    );

    respond(200, [
        'data' => $result->fetch_all(MYSQLI_ASSOC)
    ]);
}



if ($method === 'POST') {

    if ($id !== null) {
        respond(400, [
            'error' => 'POST must target /users'
        ]);
    }

    $d = readJson();

    $name = $d['name'] ?? null;
    $email = $d['email'] ?? null;
    $password = $d['password'] ?? null;

    
    if (
        !is_string($name) ||
        !is_string($email) ||
        !is_string($password)
    ) {
        respond(422, [
            'error' => 'Name, email and password are required'
        ]);
    }

    $name = trim($name);
    $email = strtolower(trim($email));

    
    if ($name === '' || strlen($name) > 100) {
        respond(422, [
            'error' => 'Name must be 1-100 characters'
        ]);
    }

    
    if (
        strlen($email) > 150 ||
        !filter_var($email, FILTER_VALIDATE_EMAIL)
    ) {
        respond(422, [
            'error' => 'Provide a valid email address'
        ]);
    }

    
    if (
        strlen($password) < 8 ||
        strlen($password) > 72
    ) {
        respond(422, [
            'error' => 'Password must be 8-72 bytes'
        ]);
    }

    
    if (
        isset($d['role']) &&
        $d['role'] !== 'CUSTOMER'
    ) {
        respond(403, [
            'error' => 'Only CUSTOMER accounts can be self-registered'
        ]);
    }

    $role = 'CUSTOMER';

    
    $hash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    
    try {

        $s = $conn->prepare(
            'INSERT INTO users
             (name, email, password_hash, role)
             VALUES (?, ?, ?, ?)'
        );

        $s->bind_param(
            'ssss',
            $name,
            $email,
            $hash,
            $role
        );

        $s->execute();

    } catch (mysqli_sql_exception $e) {

        if ($e->getCode() === 1062) {
            respond(409, [
                'error' => 'Email address already exists'
            ]);
        }

        throw $e;
    }

    respond(201, [
        'message' => 'Customer registered successfully',
        'data' => [
            'user_id' => $conn->insert_id,
            'name' => $name,
            'email' => $email,
            'role' => $role
        ]
    ]);
}



 

if ($method === 'PUT') {

    if ($id === null) {
        respond(400, [
            'error' => 'PUT requires /users/{id}'
        ]);
    }

    $d = readJson();

    $name = $d['name'] ?? null;
    $email = $d['email'] ?? null;

    
    if (
        !is_string($name) ||
        !is_string($email)
    ) {
        respond(422, [
            'error' => 'Name and email are required'
        ]);
    }

    $name = trim($name);
    $email = strtolower(trim($email));

    
    if ($name === '' || strlen($name) > 100) {
        respond(422, [
            'error' => 'Name must be 1-100 characters'
        ]);
    }

    
    if (
        strlen($email) > 150 ||
        !filter_var($email, FILTER_VALIDATE_EMAIL)
    ) {
        respond(422, [
            'error' => 'Provide a valid email address'
        ]);
    }

    
    $s = $conn->prepare(
        'SELECT user_id FROM users WHERE user_id = ?'
    );

    $s->bind_param('i', $id);
    $s->execute();

    if (!$s->get_result()->fetch_assoc()) {
        respond(404, [
            'error' => 'User not found'
        ]);
    }

    
    try {

        $s = $conn->prepare(
            'UPDATE users
             SET name = ?, email = ?
             WHERE user_id = ?'
        );

        $s->bind_param(
            'ssi',
            $name,
            $email,
            $id
        );

        $s->execute();

    } catch (mysqli_sql_exception $e) {

        if ((int)$e->getCode() === 1062) {
            respond(409, [
                'error' => 'Email address already exists'
            ]);
        }

        throw $e;
    }

    respond(200, [
        'message' => 'User updated successfully',
        'data' => [
            'user_id' => $id,
            'name' => $name,
            'email' => $email
        ]
    ]);
}






if ($method === 'DELETE') {

    if ($id === null) {
        respond(400, [
            'error' => 'DELETE requires /users/{id}'
        ]);
    }

    
    if (!in_array(
        $_SERVER['REMOTE_ADDR'] ?? '',
        ['127.0.0.1', '::1'],
        true
    )) {
        respond(403, [
            'error' => 'DELETE is restricted to localhost'
        ]);
    }

    
    $s = $conn->prepare(
        'SELECT role FROM users WHERE user_id = ?'
    );

    $s->bind_param('i', $id);
    $s->execute();

    $user = $s->get_result()->fetch_assoc();

    if (!$user) {
        respond(404, [
            'error' => 'User not found'
        ]);
    }

    
    if ($user['role'] !== 'CUSTOMER') {
        respond(403, [
            'error' => 'Only customer accounts can be deleted'
        ]);
    }

    
    try {

        $s = $conn->prepare(
            'DELETE FROM users WHERE user_id = ?'
        );

        $s->bind_param('i', $id);
        $s->execute();

    } catch (mysqli_sql_exception $e) {

        
        if ((int)$e->getCode() === 1451) {
            respond(409, [
                'error' => 'User cannot be deleted because related records exist'
            ]);
        }

        throw $e;
    }

    respond(200, [
        'message' => 'User deleted successfully',
        'data' => [
            'user_id' => $id
        ]
    ]);
}


respond(405, [
    'error' => 'Method not allowed'
]);
