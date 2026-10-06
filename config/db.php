<?php

mysqli_report(
    MYSQLI_REPORT_ERROR |
    MYSQLI_REPORT_STRICT
);

try {

    $conn = new mysqli(
        'localhost',
        'root',
        '',
        'event_ticketing_db'
    );

    $conn->set_charset('utf8mb4');

} catch (mysqli_sql_exception $e) {

    http_response_code(500);

    header(
        'Content-Type: application/json; charset=UTF-8'
    );

    echo json_encode([
        'error' => 'Database connection failed'
    ]);

    exit;
}