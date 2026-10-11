<?php
// Member 4: JWT, role and resource authorisation. Configure JWT_SECRET and API_INTERNAL_KEY in Apache environment.
require_once __DIR__ . '/../shared/api_helpers.php';
function secretValue(string $name): string {
    $v = getenv($name);
    if (!is_string($v) || strlen($v) < 32) respond(503, ['error'=>'Security configuration missing: '.$name]);
    return $v;
}
function b64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function unb64url(string $s): string|false {
    if (!preg_match('/^[A-Za-z0-9_-]+$/D', $s)) return false;
    return base64_decode(strtr($s, '-_', '+/'), true);
}
function issueToken(array $u): string {
    $head=b64url(json_encode(['alg'=>'HS256','typ'=>'JWT']));
    $body=b64url(json_encode(['sub'=>(int)$u['user_id'],'role'=>$u['role'],'iat'=>time(),'exp'=>time()+3600]));
    $sig=b64url(hash_hmac('sha256', "$head.$body", secretValue('JWT_SECRET'), true));
    return "$head.$body.$sig";
}
function authenticatedUser(mysqli $conn): array {
    $header=$_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([A-Za-z0-9_.-]+)$/', $header, $m)) respond(401,['error'=>'Bearer token required']);
    $parts=explode('.', $m[1]);
    if(count($parts)!==3) respond(401,['error'=>'Invalid token']);
    [$h,$b,$s]=$parts;
    $headerData=json_decode(unb64url($h) ?: '',true);
    $claims=json_decode(unb64url($b) ?: '',true);
    $expected=b64url(hash_hmac('sha256', "$h.$b", secretValue('JWT_SECRET'), true));
    if(!is_array($headerData)||($headerData['alg']??null)!=='HS256'||($headerData['typ']??null)!=='JWT'||!hash_equals($expected,$s)||!is_array($claims)||!isset($claims['sub'],$claims['exp'],$claims['iat'])||!is_int($claims['sub'])||!is_int($claims['exp'])||!is_int($claims['iat'])||$claims['sub']<1||$claims['exp']<=time()||$claims['iat']>time()+60||$claims['exp']-$claims['iat']>3600) respond(401,['error'=>'Invalid or expired token']);
    $stmt=$conn->prepare('SELECT user_id, role FROM users WHERE user_id=?');
    $stmt->bind_param('i',$claims['sub']); $stmt->execute();
    $user=$stmt->get_result()->fetch_assoc();
    if(!$user || $user['role']!==($claims['role']??null)) respond(401,['error'=>'Account unavailable or role changed']);
    return $user;
}
function requireRoles(array $user, array $roles): void {
    if(!in_array($user['role'],$roles,true)) respond(403,['error'=>'Insufficient permissions']);
}
function requireOwnBooking(mysqli $conn,array $user,?int $id): void {
    if($id===null) return;
    $s=$conn->prepare('SELECT user_id FROM bookings WHERE booking_id=?');
    $s->bind_param('i',$id);$s->execute();$row=$s->get_result()->fetch_assoc();
    if($row && (int)$row['user_id']!==(int)$user['user_id']) respond(403,['error'=>'Not your booking']);
}
function registerRequestLog(): void {
    $start=microtime(true);
    register_shutdown_function(static function() use ($start): void {
        $record=['time'=>gmdate('c'),'method'=>$_SERVER['REQUEST_METHOD']??'','path'=>parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH),'status'=>http_response_code(),'duration_ms'=>round((microtime(true)-$start)*1000)];
        // No request body, bearer token, API key or password is logged.
        error_log('[event-api] '.json_encode($record));
    });
}
function securityGate(mysqli $conn,string $resource,string $method,?int $id): void {
    registerRequestLog();
    if($method==='OPTIONS')return;
    // Public event and venue browsing; customer self-registration only.
    if($method==='GET' && in_array($resource,['events','venues'],true))return;
    if($resource==='users' && $method==='POST')return;
    $user=authenticatedUser($conn);
    if($resource==='venues')requireRoles($user,['ADMIN']);
    if($resource==='events' && $method!=='GET') {
        requireRoles($user,['ADMIN','ORGANISER']);
        if($user['role']==='ORGANISER') {
            if($method==='POST') {
                // Check the organiser_id in the existing controller; override client-supplied values in later revision.
                respond(403,['error'=>'Event creation by organisers requires ownership-aware controller integration; admin only in this version']);
            }
            if($id===null)respond(400,['error'=>'Event ID required']);
            $s=$conn->prepare('SELECT organiser_id FROM events WHERE event_id=?');$s->bind_param('i',$id);$s->execute();$r=$s->get_result()->fetch_assoc();
            if(!$r || (int)$r['organiser_id']!==(int)$user['user_id'])respond(403,['error'=>'Not your event']);
        }
    }
    if($resource==='users') {
        if($method==='GET' && $id!==null && (int)$user['user_id']===$id)return;
        requireRoles($user,['ADMIN']);
    }
    if($resource==='bookings') {
        if($method==='POST') {
            requireRoles($user,['CUSTOMER','ADMIN']);
            // Prevent trusting user_id from a JSON body: enforced in bookings controller below.
            $GLOBALS['security_user']=$user;
        } elseif($method==='GET' && $id===null) {
            requireRoles($user,['ADMIN','ORGANISER']);
        } else {
            requireOwnBooking($conn,$user,$id);
        }
    }
    $GLOBALS['security_user']=$user;
}
function requireInternalApiKey(): void {
    $given=$_SERVER['HTTP_X_API_KEY']??'';
    if($given==='' || !hash_equals(secretValue('API_INTERNAL_KEY'),$given))respond(401,['error'=>'Valid API key required']);
}
