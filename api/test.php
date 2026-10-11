<?php

header("Content-Type: application/json");

require_once "database.php";

echo json_encode([
    "message" => "Database connected successfully"
]);

?>