<?php

header("Content-Type: application/json");

require_once "../database.php";
require_once "../middleware/auth.php";

$user = authenticateUser();

$sql = "SELECT
            user_id,
            name,
            email,
            role,
            created_at
        FROM users
        WHERE user_id = ?";

$stmt = $conn->prepare($sql);

$stmt->execute([
    $user["user_id"]
]);

$profile =
    $stmt->fetch(PDO::FETCH_ASSOC);


if (!$profile) {

    http_response_code(404);

    echo json_encode([
        "message" =>
            "User not found"
    ]);

    exit;
}


echo json_encode($profile);

?>