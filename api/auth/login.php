<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../database.php";
require_once __DIR__ . "/../jwt_helper.php";

$data = json_decode(file_get_contents("php://input"), true);

if (
    empty($data["email"]) ||
    empty($data["password"])
) {

    http_response_code(400);

    echo json_encode([
        "message" => "Email and password are required"
    ]);

    exit;
}

$email = $data["email"];
$password = $data["password"];

$sql = "SELECT * FROM users WHERE email = ?";

$stmt = $conn->prepare($sql);
$stmt->execute([$email]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {

    http_response_code(401);

    echo json_encode([
        "message" => "Invalid email or password"
    ]);

    exit;
}

if (!password_verify(
    $password,
    $user["password_hash"]
)) {

    http_response_code(401);

    echo json_encode([
        "message" => "Invalid email or password"
    ]);

    exit;
}

$key = "event_ticketing_secret_key";

$payload = [
    "user_id" => $user["user_id"],
    "email" => $user["email"],
    "role" => $user["role"],
    "iat" => time(),
    "exp" => time() + 3600
];

$token = generateJWT(
    $payload,
    $key
);

echo json_encode([
    "message" => "Login successful",
    "token" => $token,
    "user" => [
        "user_id" => $user["user_id"],
        "name" => $user["name"],
        "email" => $user["email"],
        "role" => $user["role"]
    ]
]);

?>