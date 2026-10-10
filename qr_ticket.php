<?php
// ==========================================
// MEMBER 5 - THIRD-PARTY API INTEGRATION
// QR CODE GENERATOR API (goQR.me)
// ==========================================

header('Content-Type: application/json; charset=utf-8');

// Step 1: Sample booking confirmation data
// Connect to the existing MySQL database
require_once __DIR__ . '/config/db.php';

$bookingId = filter_input(INPUT_GET, 'booking_id', FILTER_VALIDATE_INT);

// Validate booking ID
if ($bookingId === null || $bookingId === false || $bookingId < 1) {

    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "A valid booking_id is required"
    ]);

    exit;
}

$stmt = $conn->prepare(
    "SELECT booking_id, event_id, booking_status
     FROM bookings
     WHERE booking_id = ?"
);

$stmt->bind_param("i", $bookingId);
$stmt->execute();

$result = $stmt->get_result();
$booking = $result->fetch_assoc();

$stmt->close();

// Check whether the booking exists
if (!$booking) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Booking not found"
    ]);
    exit;
}

// Only confirmed bookings can receive a QR ticket
if ($booking['booking_status'] !== 'CONFIRMED') {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Booking is not confirmed"
    ]);
    exit;
}

// Generate QR data using the booking information
$ticketData = "DEMO-BOOKING-" . $booking['booking_id']
            . "-EVENT-" . $booking['event_id'];

// Step 2: External QR Code Generator API URL
$apiUrl = "https://api.qrserver.com/v1/create-qr-code/"
        . "?size=200x200&data=" . urlencode($ticketData);

// Step 3: Request QR code from external API
$ch = curl_init($apiUrl);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$qrImage = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// Step 4: Check if external API request succeeded
if ($qrImage === false || $httpCode !== 200) {
    http_response_code(502);

    echo json_encode([
        "success" => false,
        "message" => "Failed to generate QR code",
        "error" => $error
    ]);

    exit;
}

// Step 5: Return generated QR image
header('Content-Type: image/png');

echo $qrImage;