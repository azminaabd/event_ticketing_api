# Sarah Nayli individual frontend - Luma Events

Individual frontend by Sarah Nayli Binti Mohammad Kamal (AM2412018230).

## Run with the shared backend

Place this folder at frontend/Nayli inside the shared PHP project. Start Apache and MySQL in XAMPP, import the shared database, and open:

http://localhost/event_ticketing_api-main/frontend/Nayli/

If the project folder has a different name or is nested, use that actual localhost path. API URLs are resolved from app.js relative to the shared project root. Open through Apache rather than double-clicking index.html.

## Features

Event browsing, search, filtering and sorting; customer registration and JWT login; bookings and booking history; administrator and organiser workspaces; booking approval/cancellation; signed QR tickets and ticket check-in with a purple ticket tear animation. The interface supports smaller screens and reduced-motion preferences.

## Integration requirements

This frontend expects the compatible shared backend used in the Luma demo. It calls auth/login.php, users.php, events.php, venues.php, bookings.php, ticket.php and checkin.php. Requests use JSON and protected requests send a Bearer JWT. Role and ownership checks must remain enforced by the server.

The ticket workflow requires the protected ticket.php/checkin.php endpoints, signed QR verification, booking approval permissions, and the ticket_checkins database migration. At the repository revision inspected for this upload, ticket.php and checkin.php were absent. Those features require separate group backend integration before they will work in that checkout. This frontend-only upload does not include or modify backend code, SQL, server secrets or teammates' files.

The frontend contains no bundled account passwords, JWTs or internal API keys. Configure secrets only on the server. Public self-registration must create CUSTOMER accounts only.

## QR library

QR images are generated locally with vendored QRCode.js 1.0.0 under the included MIT license in vendor/QRCode-LICENSE.txt. Local QR rendering is separate from the group's external QR API integration. Camera scanning depends on browser support; copy/paste is available as an alternative. One signed QR represents the entire booking quantity and is admitted once.

## Validation

The frontend was previously exercised against the compatible local XAMPP backend. JavaScript syntax and local HTML asset references were checked for this upload. The workflow has not been rerun against the current group repository backend, which lacks the ticket endpoints noted above. Physical camera and USB-reader tests were not run.
