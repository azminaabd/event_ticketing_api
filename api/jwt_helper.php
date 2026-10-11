<?php

function base64UrlEncode($data)
{
    return rtrim(
        strtr(base64_encode($data), '+/', '-_'),
        '='
    );
}

function base64UrlDecode($data)
{
    $remainder = strlen($data) % 4;

    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }

    return base64_decode(
        strtr($data, '-_', '+/')
    );
}

function generateJWT($payload, $secret)
{
    $header = [
        "typ" => "JWT",
        "alg" => "HS256"
    ];

    $headerEncoded = base64UrlEncode(
        json_encode($header)
    );

    $payloadEncoded = base64UrlEncode(
        json_encode($payload)
    );

    $signature = hash_hmac(
        "sha256",
        $headerEncoded . "." . $payloadEncoded,
        $secret,
        true
    );

    $signatureEncoded = base64UrlEncode($signature);

    return $headerEncoded . "." .
           $payloadEncoded . "." .
           $signatureEncoded;
}

function verifyJWT($token, $secret)
{
    $parts = explode(".", $token);

    if (count($parts) !== 3) {
        return false;
    }

    $headerEncoded = $parts[0];
    $payloadEncoded = $parts[1];
    $signatureEncoded = $parts[2];

    $expectedSignature = hash_hmac(
        "sha256",
        $headerEncoded . "." . $payloadEncoded,
        $secret,
        true
    );

    $expectedSignatureEncoded =
        base64UrlEncode($expectedSignature);

    if (!hash_equals(
        $expectedSignatureEncoded,
        $signatureEncoded
    )) {
        return false;
    }

    $payload = json_decode(
        base64UrlDecode($payloadEncoded),
        true
    );

    if (!$payload) {
        return false;
    }

    if (
        isset($payload["exp"]) &&
        time() > $payload["exp"]
    ) {
        return false;
    }

    return $payload;
}