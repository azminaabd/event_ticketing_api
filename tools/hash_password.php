<?php
// CLI only: php tools/hash_password.php "your-test-password"
if(PHP_SAPI!=='cli') { http_response_code(404);exit; }
if(($argc??0)!==2){fwrite(STDERR,"Usage: php tools/hash_password.php PASSWORD\n");exit(1);}
echo password_hash($argv[1],PASSWORD_DEFAULT),PHP_EOL;
