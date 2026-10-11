<?php

header("Content-Type: application/json");

require_once "../database.php";
require_once "../middleware/auth.php";

$user = authenticateUser();


if ($_SERVER["REQUEST_METHOD"] !== "PUT") {

    http_response_code(405);

    echo json_encode([
        "message" => "Method not allowed"
    ]);

    exit;
}


$data = json_decode(
    file_get_contents("php://input"),
    true
);


if (
    empty($data["current_password"]) ||
    empty($data["new_password"])
) {

    http_response_code(400);

    echo json_encode([
        "message" =>
            "Current password and new password are required"
    ]);

    exit;
}


$currentPassword =
    $data["current_password"];

$newPassword =
    $data["new_password"];


if (strlen($newPassword) < 6) {

    http_response_code(400);

    echo json_encode([
        "message" =>
            "New password must be at least 6 characters"
    ]);

    exit;
}


/* GET CURRENT USER */

$sql = "SELECT
            user_id,
            password_hash
        FROM users
        WHERE user_id = ?";

$stmt =
    $conn->prepare($sql);

$stmt->execute([
    $user["user_id"]
]);


$account =
    $stmt->fetch(PDO::FETCH_ASSOC);


if (!$account) {

    http_response_code(404);

    echo json_encode([
        "message" =>
            "User not found"
    ]);

    exit;
}


/* CHECK CURRENT PASSWORD */

if (
    !password_verify(
        $currentPassword,
        $account["password_hash"]
    )
) {

    http_response_code(401);

    echo json_encode([
        "message" =>
            "Current password is incorrect"
    ]);

    exit;
}


/* CHECK SAME PASSWORD */

if (
    password_verify(
        $newPassword,
        $account["password_hash"]
    )
) {

    http_response_code(400);

    echo json_encode([
        "message" =>
            "New password cannot be the same as current password"
    ]);

    exit;
}


/* HASH NEW PASSWORD */

$newPasswordHash =
    password_hash(
        $newPassword,
        PASSWORD_DEFAULT
    );


/* UPDATE PASSWORD */

$sql = "UPDATE users
        SET password_hash = ?
        WHERE user_id = ?";

$stmt =
    $conn->prepare($sql);

$stmt->execute([
    $newPasswordHash,
    $user["user_id"]
]);


echo json_encode([
    "message" =>
        "Password changed successfully"
]);

?>