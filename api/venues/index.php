<?php

header("Content-Type: application/json");

require_once "../database.php";

$method = $_SERVER["REQUEST_METHOD"];

if ($method == "GET") {

    $sql = "SELECT * FROM venues";

    $stmt = $conn->prepare($sql);
    $stmt->execute();

    $venues = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($venues);

}
elseif ($method == "POST") {

    $data = json_decode(file_get_contents("php://input"), true);

    if (
        empty($data["venue_name"]) ||
        empty($data["location"]) ||
        empty($data["capacity"])
    ) {

        http_response_code(400);

        echo json_encode([
            "message" => "venue_name, location and capacity are required"
        ]);

        exit;
    }

    $sql = "INSERT INTO venues
            (venue_name, location, capacity, status)
            VALUES (?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);

    $stmt->execute([
        $data["venue_name"],
        $data["location"],
        $data["capacity"],
        $data["status"] ?? "ACTIVE"
    ]);

    http_response_code(201);

    echo json_encode([
        "message" => "Venue created successfully"
    ]);

}
elseif ($method == "PUT") {

    if (!isset($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" => "Venue id is required"
        ]);

        exit;
    }

    $id = $_GET["id"];

    $data = json_decode(file_get_contents("php://input"), true);

    if (
        empty($data["venue_name"]) ||
        empty($data["location"]) ||
        empty($data["capacity"])
    ) {

        http_response_code(400);

        echo json_encode([
            "message" => "venue_name, location and capacity are required"
        ]);

        exit;
    }

    $sql = "UPDATE venues
            SET venue_name = ?,
                location = ?,
                capacity = ?,
                status = ?
            WHERE venue_id = ?";

    $stmt = $conn->prepare($sql);

    $stmt->execute([
        $data["venue_name"],
        $data["location"],
        $data["capacity"],
        $data["status"] ?? "ACTIVE",
        $id
    ]);

    echo json_encode([
        "message" => "Venue updated successfully"
    ]);

}
elseif ($method == "DELETE") {

    if (!isset($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" => "Venue id is required"
        ]);

        exit;
    }

    $id = $_GET["id"];

    $sql = "DELETE FROM venues
            WHERE venue_id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$id]);

    echo json_encode([
        "message" => "Venue deleted successfully"
    ]);

}
else {

    http_response_code(405);

    echo json_encode([
        "message" => "Method not allowed"
    ]);

}

?>