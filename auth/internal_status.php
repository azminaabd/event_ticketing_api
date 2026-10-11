<?php
require_once __DIR__.'/../shared/api_helpers.php';
require_once __DIR__.'/../middleware/security.php';
jsonHeaders(['GET']);
if($_SERVER['REQUEST_METHOD']!=='GET')respond(405,['error'=>'Method not allowed']);
requireInternalApiKey();
respond(200,['status'=>'ok','message'=>'Internal API key accepted']);
