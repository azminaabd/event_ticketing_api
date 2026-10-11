<?php

require_once __DIR__ . "/../jwt_helper.php";

function authenticateUser()
{
    $headers = getallheaders();

    if (!isset($headers["Authorization"])) {

        http_response_code(401);

        echo json_encode([
            "message" => "Authorization token required"
        ]);

        exit;
    }

    $authHeader = $headers["Authorization"];

    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {

        http_response_code(401);

        echo json_encode([
            "message" => "Invalid authorization format"
        ]);

        exit;
    }

    $token = $matches[1];

    $secret = "event_ticketing_secret_key";

    $payload = verifyJWT($token, $secret);

    if (!$payload) {

        http_response_code(401);

        echo json_encode([
            "message" => "Invalid or expired token"
        ]);

        exit;
    }

    return $payload;
}


function requireRole($user, $allowedRoles)
{
    if (!in_array($user["role"], $allowedRoles)) {

        http_response_code(403);

        echo json_encode([
            "message" => "Access denied"
        ]);

        exit;
    }
}