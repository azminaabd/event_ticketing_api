<?php

function jsonHeaders(array $methods): void
{
    header(
        'Content-Type: application/json; charset=UTF-8'
    );

    header(
        'Access-Control-Allow-Origin: *'
    );

    header(
        'Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key'
    );

    header(
        'Access-Control-Allow-Methods: ' .
        implode(', ', $methods) .
        ', OPTIONS'
    );

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    set_exception_handler(
        function (Throwable $e): void {

            respond(
                500,
                ['error' => 'Internal server error']
            );
        }
    );
}

function respond(
    int $status,
    array $payload
): void {

    http_response_code($status);

    echo json_encode(
        $payload,
        JSON_PRETTY_PRINT
    );

    exit;
}

function readJson(): array
{
    $raw = file_get_contents('php://input');

    $data = json_decode(
        $raw,
        true
    );

    if (
        !is_array($data) ||
        json_last_error() !== JSON_ERROR_NONE
    ) {

        respond(
            400,
            ['error' => 'Request body must contain valid JSON']
        );
    }

    return $data;
}

function validId(mixed $value): ?int
{
    $id = filter_var(
        $value,
        FILTER_VALIDATE_INT,
        [
            'options' => [
                'min_range' => 1
            ]
        ]
    );

    return $id === false
        ? null
        : $id;
}

function validDate(string $date): bool
{
    $d = DateTime::createFromFormat(
        'Y-m-d',
        $date
    );

    return $d &&
        $d->format('Y-m-d') === $date;
}

function validTime(string $time): bool
{
    $t = DateTime::createFromFormat(
        'H:i:s',
        $time
    );

    return $t &&
        $t->format('H:i:s') === $time;
}