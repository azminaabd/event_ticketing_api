<?php

header("Content-Type: application/json");

require_once "../database.php";
require_once "../middleware/auth.php";

$user = authenticateUser();

$method = $_SERVER["REQUEST_METHOD"];


/* =========================================================
   GET EVENTS
========================================================= */

if ($method === "GET") {

    requireRole(
        $user,
        ["ADMIN", "ORGANISER", "CUSTOMER"]
    );


    /* ADMIN - VIEW ALL EVENTS */

    if ($user["role"] === "ADMIN") {

        $sql = "SELECT
                    e.event_id,
                    e.organiser_id,
                    e.venue_id,
                    e.event_name,
                    e.description,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    e.ticket_price,
                    e.ticket_quantity,
                    e.status,
                    u.name AS organiser_name,
                    v.venue_name
                FROM events e
                JOIN users u
                    ON e.organiser_id = u.user_id
                JOIN venues v
                    ON e.venue_id = v.venue_id
                ORDER BY e.event_date ASC";

        $stmt = $conn->prepare($sql);

        $stmt->execute();
    }


    /* ORGANISER - VIEW OWN EVENTS */

    elseif ($user["role"] === "ORGANISER") {

        $sql = "SELECT
                    e.event_id,
                    e.organiser_id,
                    e.venue_id,
                    e.event_name,
                    e.description,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    e.ticket_price,
                    e.ticket_quantity,
                    e.status,
                    u.name AS organiser_name,
                    v.venue_name
                FROM events e
                JOIN users u
                    ON e.organiser_id = u.user_id
                JOIN venues v
                    ON e.venue_id = v.venue_id
                WHERE e.organiser_id = ?
                ORDER BY e.event_date ASC";

        $stmt = $conn->prepare($sql);

        $stmt->execute([
            $user["user_id"]
        ]);
    }


    /* CUSTOMER - VIEW ACTIVE EVENTS */

    elseif ($user["role"] === "CUSTOMER") {

        $sql = "SELECT
                    e.event_id,
                    e.organiser_id,
                    e.venue_id,
                    e.event_name,
                    e.description,
                    e.event_date,
                    e.start_time,
                    e.end_time,
                    e.ticket_price,
                    e.ticket_quantity,
                    e.status,
                    u.name AS organiser_name,
                    v.venue_name
                FROM events e
                JOIN users u
                    ON e.organiser_id = u.user_id
                JOIN venues v
                    ON e.venue_id = v.venue_id
                WHERE e.status = 'ACTIVE'
                ORDER BY e.event_date ASC";

        $stmt = $conn->prepare($sql);

        $stmt->execute();
    }


    $events =
        $stmt->fetchAll(PDO::FETCH_ASSOC);


    echo json_encode($events);
}


/* =========================================================
   CREATE EVENT
========================================================= */

elseif ($method === "POST") {

    requireRole(
        $user,
        ["ADMIN", "ORGANISER"]
    );


    $data = json_decode(
        file_get_contents("php://input"),
        true
    );


    if (
        empty($data["venue_id"]) ||
        empty($data["event_name"]) ||
        empty($data["event_date"]) ||
        empty($data["start_time"]) ||
        empty($data["end_time"]) ||
        !isset($data["ticket_price"]) ||
        !isset($data["ticket_quantity"])
    ) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Required event fields are missing"
        ]);

        exit;
    }


    /*
        ORGANISER:
        Automatically use logged-in organiser ID

        ADMIN:
        Can specify organiser_id
    */

    if ($user["role"] === "ORGANISER") {

        $organiserId =
            $user["user_id"];
    }

    else {

        if (empty($data["organiser_id"])) {

            http_response_code(400);

            echo json_encode([
                "message" =>
                    "organiser_id is required for admin"
            ]);

            exit;
        }


        $organiserId =
            $data["organiser_id"];
    }


    $sql = "INSERT INTO events
            (
                organiser_id,
                venue_id,
                event_name,
                description,
                event_date,
                start_time,
                end_time,
                ticket_price,
                ticket_quantity,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";


    $stmt =
        $conn->prepare($sql);


    $stmt->execute([

        $organiserId,

        $data["venue_id"],

        $data["event_name"],

        $data["description"] ?? "",

        $data["event_date"],

        $data["start_time"],

        $data["end_time"],

        $data["ticket_price"],

        $data["ticket_quantity"],

        $data["status"] ?? "ACTIVE"
    ]);


    http_response_code(201);


    echo json_encode([
        "message" =>
            "Event created successfully"
    ]);
}


/* =========================================================
   UPDATE EVENT
========================================================= */

elseif ($method === "PUT") {

    requireRole(
        $user,
        ["ADMIN", "ORGANISER"]
    );


    if (empty($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Event id is required"
        ]);

        exit;
    }


    $id =
        (int) $_GET["id"];


    $data = json_decode(
        file_get_contents("php://input"),
        true
    );


    /* GET EXISTING EVENT */

    $sql = "SELECT *
            FROM events
            WHERE event_id = ?";


    $stmt =
        $conn->prepare($sql);


    $stmt->execute([
        $id
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


    /* ORGANISER CAN ONLY EDIT OWN EVENT */

    if (
        $user["role"] === "ORGANISER" &&
        $event["organiser_id"] !=
        $user["user_id"]
    ) {

        http_response_code(403);

        echo json_encode([
            "message" =>
                "You cannot edit another organiser's event"
        ]);

        exit;
    }


    /*
        Organiser keeps own ID.
        Admin can change organiser.
    */

    if ($user["role"] === "ORGANISER") {

        $organiserId =
            $user["user_id"];
    }

    else {

        $organiserId =
            $data["organiser_id"] ??
            $event["organiser_id"];
    }


    $sql = "UPDATE events
            SET organiser_id = ?,
                venue_id = ?,
                event_name = ?,
                description = ?,
                event_date = ?,
                start_time = ?,
                end_time = ?,
                ticket_price = ?,
                ticket_quantity = ?,
                status = ?
            WHERE event_id = ?";


    $stmt =
        $conn->prepare($sql);


    $stmt->execute([

        $organiserId,

        $data["venue_id"],

        $data["event_name"],

        $data["description"] ?? "",

        $data["event_date"],

        $data["start_time"],

        $data["end_time"],

        $data["ticket_price"],

        $data["ticket_quantity"],

        $data["status"] ?? "ACTIVE",

        $id
    ]);


    echo json_encode([
        "message" =>
            "Event updated successfully"
    ]);
}


/* =========================================================
   DELETE EVENT
========================================================= */

elseif ($method === "DELETE") {

    requireRole(
        $user,
        ["ADMIN", "ORGANISER"]
    );


    if (empty($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Event id is required"
        ]);

        exit;
    }


    $id =
        (int) $_GET["id"];


    /* GET EVENT */

    $sql = "SELECT *
            FROM events
            WHERE event_id = ?";


    $stmt =
        $conn->prepare($sql);


    $stmt->execute([
        $id
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


    /* ORGANISER CAN ONLY DELETE OWN EVENT */

    if (
        $user["role"] === "ORGANISER" &&
        $event["organiser_id"] !=
        $user["user_id"]
    ) {

        http_response_code(403);

        echo json_encode([
            "message" =>
                "You cannot delete another organiser's event"
        ]);

        exit;
    }


    try {

        $sql = "DELETE FROM events
                WHERE event_id = ?";


        $stmt =
            $conn->prepare($sql);


        $stmt->execute([
            $id
        ]);


        echo json_encode([
            "message" =>
                "Event deleted successfully"
        ]);

    }

    catch (PDOException $e) {

        http_response_code(400);

        echo json_encode([
            "message" =>
                "Cannot delete this event because it has related bookings"
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