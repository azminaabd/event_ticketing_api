
<?php
// ==========================================
// MEMBER 5 - DIGITAL BOOKING TICKET PAGE
// ==========================================

// Connect to existing database
require_once __DIR__ . '/config/db.php';

// Get booking ID from URL
$bookingId = filter_input(
    INPUT_GET,
    'booking_id',
    FILTER_VALIDATE_INT
);

// Validate booking ID
if ($bookingId === null || $bookingId === false || $bookingId < 1) {
    http_response_code(400);
    exit("Invalid booking ID.");
}

// Retrieve booking and event information

$stmt = $conn->prepare(
    "SELECT
        b.booking_id,
        b.event_id,
        b.quantity,
        b.total_price,
        b.booking_status,
        b.booking_date,
        e.event_name,
        e.event_date,
        e.start_time,
        e.end_time,
        v.venue_name,
        v.location
     FROM bookings b
     INNER JOIN events e
         ON b.event_id = e.event_id
     INNER JOIN venues v
         ON e.venue_id = v.venue_id
     WHERE b.booking_id = ?"
);


$stmt->bind_param("i", $bookingId);
$stmt->execute();

$booking = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Check whether booking exists
if (!$booking) {
    http_response_code(404);
    exit("Booking not found.");
}

// Only display confirmed booking tickets
if ($booking['booking_status'] !== 'CONFIRMED') {
    http_response_code(403);
    exit("This booking is not confirmed.");
}

// Escape database values before displaying in HTML
function safe($value) {
    return htmlspecialchars(
        (string) $value,
        ENT_QUOTES,
        'UTF-8'
    );
}

// MEMBER 5 - Customer-friendly booking reference
// Example: booking_id 1 becomes BK-0001
$bookingReference = 'BK-' . str_pad(
    $booking['booking_id'],
    4,
    '0',
    STR_PAD_LEFT
);


$eventName = strtolower($booking['event_name']);

$themeColor = '#334155';
$eventIcon = '💻';

if (str_contains($eventName, 'music') ||
    str_contains($eventName, 'concert')) {

    $themeColor = '#6D28D9';
    $eventIcon = '🎵';

} elseif (str_contains($eventName, 'sport')) {

    $themeColor = '#0F766E';
    $eventIcon = '🏆';

} elseif (str_contains($eventName, 'art') ||
          str_contains($eventName, 'exhibition')) {

    $themeColor = '#C2410C';
    $eventIcon = '🎨';

} elseif (str_contains($eventName, 'workshop')) {

    $themeColor = '#15803D';
    $eventIcon = '✏️';

} elseif (str_contains($eventName, 'technology') ||
          str_contains($eventName, 'tech')) {

    $themeColor = '#51427C';
    $eventIcon = '💻';
}

?>


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Digital Event Ticket</title>

    
<style>
    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        background: #f2edf9;
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .ticket {
        width: 100%;
        max-width: 920px;
        background: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 12px 35px rgba(65, 45, 100, 0.10);
    }

    
.ticket-header {
    background: <?= safe($themeColor) ?>;
    color: white;
    padding: 25px 30px;
    position: relative;
    overflow: hidden;
    isolation: isolate;
}

.ticket-header::before {
    content: "";
    position: absolute;
    width: 230px;
    height: 230px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    right: -55px;
    top: -100px;
    z-index: -1;
}

.ticket-header::after {
    content: "";
    position: absolute;
    width: 135px;
    height: 135px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    right: 115px;
    bottom: -95px;
    z-index: -1;
}


    .brand {
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 1px;
        opacity: 0.95;
    }

    .event-icon {
        display: none;
    }

    .event-title {
        font-size: 25px;
        margin: 18px 0 10px;
        line-height: 1.3;
    }

    .ticket-header p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
    }

    .ticket-body {
        padding: 25px 30px;
    }

    .status {
        display: inline-block;
        background: #dcfce7;
        color: #166534;
        padding: 7px 13px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-bottom: 16px;
    }

    .booking-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .booking-reference {
        color: #51427c;
        font-size: 22px;
        font-weight: bold;
    }

    .ticket-quantity {
        color: #51427c;
        font-size: 17px;
        font-weight: bold;
    }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px 35px;
    }

    .detail-label {
        color: #756b83;
        font-size: 11px;
        text-transform: uppercase;
        margin-bottom: 7px;
    }

    .detail-value {
        color: #1f1830;
        font-size: 16px;
        font-weight: bold;
    }

    .qr-section {
        margin-top: 25px;
        padding-top: 20px;
        border-top: 1px dashed #b8a9d5;
        text-align: center;
    }

    .qr-section img {
        display: block;
        width: 150px;
        height: 150px;
        margin: 0 auto 10px;
        background: white;
    }

    .qr-section p {
        margin: 0;
        font-size: 13px;
        color: #756b83;
    }

    .info-table {
        width: 100%;
        border-collapse: collapse;
    }

    .info-table td {
        padding: 11px 0;
        border-bottom: 1px solid #eee8f4;
        font-size: 14px;
    }

    .info-table td:first-child {
        color: #756b83;
    }

    .info-table td:last-child {
        text-align: right;
        font-weight: bold;
        color: #1f1830;
    }

    .footer {
        margin-top: 18px;
        text-align: center;
        font-size: 12px;
        color: #756b83;
    }

    @media (max-width: 600px) {
        body {
            padding: 12px;
        }

        .ticket-header,
        .ticket-body {
            padding: 20px;
        }

        .event-title {
            font-size: 21px;
        }

        .details-grid {
            gap: 18px;
        }

        .detail-value {
            font-size: 14px;
        }

        .qr-section img {
            width: 135px;
            height: 135px;
        }
    }

    .event-art {
    position: absolute;
    right: 45px;
    top: 95px;
    font-size: 65px;
    opacity: 0.65;
    transform: rotate(-12deg);
    pointer-events: none;
}

.ticket-header .event-title,
.ticket-header p {
    position: relative;
    z-index: 1;
}

@media (max-width: 600px) {
    .event-art {
        right: 15px;
        top: 105px;
        font-size: 42px;
    }
}

</style>

</head>


<body>

    <div class="ticket">

        <!-- EVENT HEADER -->
        <div class="ticket-header">

            <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">

                <div class="brand">
                    ✦ EVENTPASS
                </div>

                <span class="status" style="margin-bottom:0;">
                    ✓ CONFIRMED
                </span>

            </div>

            <div class="event-art" aria-hidden="true">
    <?= safe($eventIcon) ?>
</div>

            <h1 class="event-title">
                <?= safe($booking['event_name']) ?>
            </h1>

            <p>
                <?= safe($booking['venue_name']) ?>
                ·
                <?= safe($booking['location']) ?>
            </p>

        </div>


        <!-- TICKET DETAILS -->
        <div class="ticket-body">

            <div class="booking-top">

                <div class="booking-reference">
                    <?= safe($bookingReference) ?>
                </div>

                <div class="ticket-quantity">
                    <?= safe($booking['quantity']) ?>
                    <?= (int)$booking['quantity'] === 1 ? 'Ticket' : 'Tickets' ?>
                </div>

            </div>


            <div class="details-grid">

                <!-- EVENT DATE -->
                <div>
                    <div class="detail-label">Event Date</div>
                    <div class="detail-value">
                        <?= date('d M Y', strtotime($booking['event_date'])) ?>
                    </div>
                </div>

                <!-- EVENT TIME -->
                <div>
                    <div class="detail-label">Event Time</div>
                    <div class="detail-value">
                        <?= date('g:i A', strtotime($booking['start_time'])) ?>
                        –
                        <?= date('g:i A', strtotime($booking['end_time'])) ?>
                    </div>
                </div>

                <!-- TOTAL PRICE -->
                <div>
                    <div class="detail-label">Total Price</div>
                    <div class="detail-value">
                        RM <?= number_format((float)$booking['total_price'], 2) ?>
                    </div>
                </div>

                <!-- BOOKING DATE -->
                <div>
                    <div class="detail-label">Booked On</div>
                    <div class="detail-value">
                        <?= date('d M Y', strtotime($booking['booking_date'])) ?>
                    </div>
                </div>

            </div>


            <!-- QR CODE -->
            <div class="qr-section">

                <img
                    src="qr_ticket.php?booking_id=<?= (int)$booking['booking_id'] ?>"
                    alt="Booking QR Code"
                >

                <p>Present QR at entrance</p>

            </div>

        </div>

    </div>

</body>
</html>

