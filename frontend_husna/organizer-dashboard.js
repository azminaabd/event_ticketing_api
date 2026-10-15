/*
 * MEMBER 5 - ORGANIZER DASHBOARD
 * Event Ticketing and Venue Booking System
 *
 * Features:
 * 1. JWT Session Check
 * 2. Role-Based Access
 * 3. Organizer Welcome Message
 * 4. Logout
 */

const organizerWelcome = document.getElementById("organizerWelcome");
const organizerLogout = document.getElementById("organizerLogout");

// ==========================================
// 1. GET LOGIN SESSION
// ==========================================

const organizerToken = sessionStorage.getItem("authToken");

let organizerUser = null;

try {
    organizerUser = JSON.parse(
        sessionStorage.getItem("authUser") || "null"
    );
} catch (error) {
    organizerUser = null;
}

// ==========================================
// 2. CHECK LOGIN AND ROLE
// ==========================================

if (!organizerToken || !organizerUser) {

    window.location.replace("login.html");

} else if (organizerUser.role !== "ORGANISER") {

    // Prevent other roles from using this dashboard.
    window.location.replace("index.html");

} else {

    // ==========================================
    // 3. DISPLAY ORGANIZER NAME
    // ==========================================

    organizerWelcome.textContent =
        "Welcome back, " + organizerUser.name +
        "! Let's make your next event wonderful. ✿";
}

// ==========================================
// 4. LOGOUT
// ==========================================

organizerLogout.addEventListener("click", () => {

    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");

    window.location.replace("login.html");

});