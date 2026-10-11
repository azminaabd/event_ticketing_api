<?php

header("Content-Type: application/json");

require_once "../database.php";
require_once "../middleware/auth.php";

$user = authenticateUser();

requireRole($user, ["ADMIN"]);

$method = $_SERVER["REQUEST_METHOD"];

if ($method == "GET") {

    $sql = "SELECT user_id, name, email, role, created_at FROM users";

    $stmt = $conn->prepare($sql);
    $stmt->execute();

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($users);

}
elseif ($method == "POST") {

    $data = json_decode(file_get_contents("php://input"), true);

    if (
        empty($data["name"]) ||
        empty($data["email"]) ||
        empty($data["password"]) ||
        empty($data["role"])
    ) {

        http_response_code(400);

        echo json_encode([
            "message" => "name, email, password and role are required"
        ]);

        exit;
    }

    $passwordHash = password_hash(
        $data["password"],
        PASSWORD_DEFAULT
    );

    $sql = "INSERT INTO users
            (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);

    $stmt->execute([
        $data["name"],
        $data["email"],
        $passwordHash,
        $data["role"]
    ]);

    http_response_code(201);

    echo json_encode([
        "message" => "User created successfully"
    ]);

}
elseif ($method == "PUT") {

    if (!isset($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" => "User id is required"
        ]);

        exit;
    }

    $id = $_GET["id"];

    $data = json_decode(file_get_contents("php://input"), true);

    if (
        empty($data["name"]) ||
        empty($data["email"]) ||
        empty($data["role"])
    ) {

        http_response_code(400);

        echo json_encode([
            "message" => "name, email and role are required"
        ]);

        exit;
    }

    $sql = "UPDATE users
            SET name = ?,
                email = ?,
                role = ?
            WHERE user_id = ?";

    $stmt = $conn->prepare($sql);

    $stmt->execute([
        $data["name"],
        $data["email"],
        $data["role"],
        $id
    ]);

    echo json_encode([
        "message" => "User updated successfully"
    ]);

}
elseif ($method == "DELETE") {

    if (!isset($_GET["id"])) {

        http_response_code(400);

        echo json_encode([
            "message" => "User id is required"
        ]);

        exit;
    }

    $id = $_GET["id"];

    $sql = "DELETE FROM users
            WHERE user_id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$id]);

    echo json_encode([
        "message" => "User deleted successfully"
    ]);

}
else {

    http_response_code(405);

    echo json_encode([
        "message" => "Method not allowed"
    ]);

}

?>