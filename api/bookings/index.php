<?php

header("Content-Type: application/json");

require_once "../database.php";
require_once "../middleware/auth.php";

$user = authenticateUser();

$method = $_SERVER["REQUEST_METHOD"];


/* =========================================================
   GET BOOKINGS
========================================================= */

if ($method === "GET") {

    /*
        CUSTOMER
        Only sees own bookings
    */

    if ($user["role"] === "CUSTOMER") {

        $sql = "SELECT
                    b.booking_id,
                    b.user_id,
                    u.name AS customer_name,
                    b.event_id,
                    e.event_name,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    v.venue_name,
                    b.quantity,
                    b.total_price,
                    b.booking_status,
                    b.booking_date
                FROM bookings b

                JOIN users u
                    ON b.user_id = u.user_id

                JOIN events e
                    ON b.event_id = e.event_id

                JOIN venues v
                    ON e.venue_id = v.venue_id

                WHERE b.user_id = ?

                ORDER BY b.booking_id ASC";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute([
            $user["user_id"]
        ]);
    }


    /*
        ORGANISER
        Only sees bookings for own events
    */

    elseif ($user["role"] === "ORGANISER") {

        $sql = "SELECT
                    b.booking_id,
                    b.user_id,
                    u.name AS customer_name,
                    b.event_id,
                    e.event_name,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    v.venue_name,
                    b.quantity,
                    b.total_price,
                    b.booking_status,
                    b.booking_date
                FROM bookings b

                JOIN users u
                    ON b.user_id = u.user_id

                JOIN events e
                    ON b.event_id = e.event_id

                JOIN venues v
                    ON e.venue_id = v.venue_id

                WHERE e.organiser_id = ?

                ORDER BY b.booking_id ASC";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute([
            $user["user_id"]
        ]);
    }


    /*
        ADMIN
        Sees all bookings
    */

    elseif ($user["role"] === "ADMIN") {

        $sql = "SELECT
                    b.booking_id,
                    b.user_id,
                    u.name AS customer_name,
                    b.event_id,
                    e.event_name,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    v.venue_name,
                    b.quantity,
                    b.total_price,
                    b.booking_status,
                    b.booking_date
                FROM bookings b

                JOIN users u
                    ON b.user_id = u.user_id

                JOIN events e
                    ON b.event_id = e.event_id

                JOIN venues v
                    ON e.venue_id = v.venue_id

                ORDER BY b.booking_id ASC";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute();
    }


    else {

        http_response_code(403);

        echo json_encode([
            "message" =>
                "Access denied"
        ]);

        exit;
    }


    $bookings =
        $stmt->fetchAll(PDO::FETCH_ASSOC);


    echo json_encode($bookings);
}


/* =========================================================
   CREATE BOOKING
========================================================= */

elseif ($method === "POST") {

    requireRole(
        $user,
        ["CUSTOMER"]
    );


    $data = json_decode(
        file_get_contents("php://input"),
        true
    );


    if (
        empty($data["event_id"]) ||
        empty($data["quantity"])
    ) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "event_id and quantity are required"
        ]);

        exit;
    }


    $userId =
        $user["user_id"];

    $eventId =
        (int) $data["event_id"];

    $quantity =
        (int) $data["quantity"];


    if ($quantity < 1) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Quantity must be at least 1"
        ]);

        exit;
    }


    /*
        GET EVENT
    */

    $sql = "SELECT
                event_id,
                ticket_price,
                ticket_quantity,
                status
            FROM events
            WHERE event_id = ?";

    $stmt =
        $conn->prepare($sql);

    $stmt->execute([
        $eventId
    ]);


    $event =
        $stmt->fetch(PDO::FETCH_ASSOC);


    if (!$event) {

        http_response_code(404);

        echo json_encode([
            "message" =>
                "Event not found"
        ]);

        exit;
    }


    /*
        EVENT MUST BE ACTIVE
    */

    if ($event["status"] !== "ACTIVE") {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "This event is not available for booking"
        ]);

        exit;
    }


    /*
        CHECK AVAILABLE TICKETS
    */

    if (
        $quantity >
        $event["ticket_quantity"]
    ) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Not enough tickets available"
        ]);

        exit;
    }


    $totalPrice =
        $event["ticket_price"] *
        $quantity;


    try {

        $conn->beginTransaction();


        /*
            CREATE BOOKING

            Current system creates booking
            as CONFIRMED immediately.
        */

        $sql = "INSERT INTO bookings
                (
                    user_id,
                    event_id,
                    quantity,
                    total_price,
                    booking_status
                )
                VALUES (?, ?, ?, ?, ?)";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute([
            $userId,
            $eventId,
            $quantity,
            $totalPrice,
            "CONFIRMED"
        ]);


        $bookingId =
            $conn->lastInsertId();


        /*
            REDUCE AVAILABLE TICKETS
        */

        $sql = "UPDATE events
                SET ticket_quantity =
                    ticket_quantity - ?
                WHERE event_id = ?";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute([
            $quantity,
            $eventId
        ]);


        $conn->commit();


        http_response_code(201);


        echo json_encode([

            "message" =>
                "Booking created successfully",

            "booking_id" =>
                $bookingId,

            "total_price" =>
                $totalPrice,

            "booking_status" =>
                "CONFIRMED"
        ]);

    }

    catch (Exception $e) {

        if ($conn->inTransaction()) {

            $conn->rollBack();
        }


        http_response_code(500);

        echo json_encode([
            "message" =>
                "Unable to create booking"
        ]);
    }
}


/* =========================================================
   UPDATE BOOKING
========================================================= */

elseif ($method === "PUT") {

    if (empty($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Booking id is required"
        ]);

        exit;
    }


    $bookingId =
        (int) $_GET["id"];


    $data = json_decode(
        file_get_contents("php://input"),
        true
    );


    if (empty($data["booking_status"])) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "booking_status is required"
        ]);

        exit;
    }


    $newStatus =
        strtoupper(
            $data["booking_status"]
        );


    $allowedStatuses = [
        "PENDING",
        "CONFIRMED",
        "CANCELLED"
    ];


    if (
        !in_array(
            $newStatus,
            $allowedStatuses
        )
    ) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Invalid booking status"
        ]);

        exit;
    }


    /*
        GET BOOKING
        AND EVENT ORGANISER
    */

    $sql = "SELECT
                b.*,
                e.organiser_id
            FROM bookings b

            JOIN events e
                ON b.event_id = e.event_id

            WHERE b.booking_id = ?";

    $stmt =
        $conn->prepare($sql);

    $stmt->execute([
        $bookingId
    ]);


    $booking =
        $stmt->fetch(PDO::FETCH_ASSOC);


    if (!$booking) {

        http_response_code(404);

        echo json_encode([
            "message" =>
                "Booking not found"
        ]);

        exit;
    }


    /*
        CUSTOMER
        Only own booking
    */

    if ($user["role"] === "CUSTOMER") {

        if (
            $booking["user_id"] !=
            $user["user_id"]
        ) {

            http_response_code(403);

            echo json_encode([
                "message" =>
                    "You cannot update another customer's booking"
            ]);

            exit;
        }


        /*
            Customer can only cancel
        */

        if ($newStatus !== "CANCELLED") {

            http_response_code(403);

            echo json_encode([
                "message" =>
                    "Customers can only cancel bookings"
            ]);

            exit;
        }
    }


    /*
        ORGANISER
        Only bookings for own events
    */

    elseif ($user["role"] === "ORGANISER") {

        if (
            $booking["organiser_id"] !=
            $user["user_id"]
        ) {

            http_response_code(403);

            echo json_encode([
                "message" =>
                    "You cannot update bookings for another organiser's event"
            ]);

            exit;
        }
    }


    /*
        ADMIN
    */

    elseif ($user["role"] !== "ADMIN") {

        http_response_code(403);

        echo json_encode([
            "message" =>
                "Access denied"
        ]);

        exit;
    }


    /*
        ALREADY CANCELLED
    */

    if (
        $booking["booking_status"] === "CANCELLED" &&
        $newStatus === "CANCELLED"
    ) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Booking is already cancelled"
        ]);

        exit;
    }


    try {

        $conn->beginTransaction();


        /*
            RETURN TICKETS
            WHEN CANCELLED
        */

        if (
            $newStatus === "CANCELLED" &&
            $booking["booking_status"] !== "CANCELLED"
        ) {

            $sql = "UPDATE events
                    SET ticket_quantity =
                        ticket_quantity + ?
                    WHERE event_id = ?";

            $stmt =
                $conn->prepare($sql);

            $stmt->execute([
                $booking["quantity"],
                $booking["event_id"]
            ]);
        }


        /*
            UPDATE STATUS
        */

        $sql = "UPDATE bookings
                SET booking_status = ?
                WHERE booking_id = ?";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute([
            $newStatus,
            $bookingId
        ]);


        $conn->commit();


        echo json_encode([
            "message" =>
                "Booking updated successfully"
        ]);

    }

    catch (Exception $e) {

        if ($conn->inTransaction()) {

            $conn->rollBack();
        }


        http_response_code(500);

        echo json_encode([
            "message" =>
                "Unable to update booking"
        ]);
    }
}


/* =========================================================
   DELETE BOOKING
========================================================= */

elseif ($method === "DELETE") {

    requireRole(
        $user,
        ["ADMIN"]
    );


    if (empty($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Booking id is required"
        ]);

        exit;
    }


    $bookingId =
        (int) $_GET["id"];


    /*
        GET BOOKING
    */

    $sql = "SELECT *
            FROM bookings
            WHERE booking_id = ?";

    $stmt =
        $conn->prepare($sql);

    $stmt->execute([
        $bookingId
    ]);


    $booking =
        $stmt->fetch(PDO::FETCH_ASSOC);


    if (!$booking) {

        http_response_code(404);

        echo json_encode([
            "message" =>
                "Booking not found"
        ]);

        exit;
    }


    try {

        $conn->beginTransaction();


        /*
            RETURN TICKETS
            BEFORE DELETE

            Only if booking
            was not cancelled.
        */

        if (
            $booking["booking_status"]
            !== "CANCELLED"
        ) {

            $sql = "UPDATE events
                    SET ticket_quantity =
                        ticket_quantity + ?
                    WHERE event_id = ?";

            $stmt =
                $conn->prepare($sql);

            $stmt->execute([
                $booking["quantity"],
                $booking["event_id"]
            ]);
        }


        /*
            DELETE BOOKING
        */

        $sql = "DELETE FROM bookings
                WHERE booking_id = ?";

        $stmt =
            $conn->prepare($sql);

        $stmt->execute([
            $bookingId
        ]);


        $conn->commit();


        echo json_encode([
            "message" =>
                "Booking deleted successfully"
        ]);

    }

    catch (Exception $e) {

        if ($conn->inTransaction()) {

            $conn->rollBack();
        }


        http_response_code(500);

        echo json_encode([
            "message" =>
                "Unable to delete booking"
        ]);
    }
}


/* =========================================================
   METHOD NOT ALLOWED
========================================================= */

else {

    http_response_code(405);

    echo json_encode([
        "message" =>
            "Method not allowed"
    ]);
}

?>