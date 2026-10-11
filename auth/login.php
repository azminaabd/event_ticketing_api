<?php
require_once __DIR__.'/../config/db.php';
require_once __DIR__.'/../shared/api_helpers.php';
require_once __DIR__.'/../middleware/security.php';
jsonHeaders(['POST']);
if($_SERVER['REQUEST_METHOD']!=='POST')respond(405,['error'=>'Method not allowed']);
$d=readJson();$email=$d['email']??null;$password=$d['password']??null;
if(!is_string($email)||!filter_var($email,FILTER_VALIDATE_EMAIL)||!is_string($password)||$password==='')respond(422,['error'=>'Valid email and password required']);
$s=$conn->prepare('SELECT user_id,name,email,password_hash,role FROM users WHERE email=? LIMIT 1');
$s->bind_param('s',$email);$s->execute();$u=$s->get_result()->fetch_assoc();
if(!$u||!password_verify($password,$u['password_hash']))respond(401,['error'=>'Invalid email or password']);
respond(200,['token'=>issueToken($u),'token_type'=>'Bearer','expires_in'=>3600,'user'=>['user_id'=>(int)$u['user_id'],'name'=>$u['name'],'role'=>$u['role']]]);
