
/*
 * MEMBER 5 - ADMIN DASHBOARD
 * Event Ticketing and Venue Booking System
 *
 * Features:
 * 1. Check login session
 * 2. Verify ADMIN role
 * 3. Display admin welcome message
 * 4. Logout
 */

// ==========================================
// 1. CHECK ADMIN SESSION
// ==========================================

const adminToken = sessionStorage.getItem("authToken");
const adminUserData = sessionStorage.getItem("authUser");

let adminUser = null;

try {
    adminUser = adminUserData
        ? JSON.parse(adminUserData)
        : null;
} catch (error) {
    console.error("Invalid session data:", error);
}

if (
    !adminToken ||
    !adminUser ||
    String(adminUser.role).toUpperCase() !== "ADMIN"
) {
    // Clear invalid or unauthorized local session.
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");

    window.location.replace("login.html");

} else {

    // ==========================================
    // 2. DISPLAY ADMIN WELCOME MESSAGE
    // ==========================================

    const adminWelcome = document.getElementById(
        "adminWelcome"
    );

    if (adminWelcome) {
        adminWelcome.textContent =
            "Welcome back, " +
            (adminUser.name || "Admin") +
            "! Manage your events, venues, bookings " +
            "and users in one lovely place.";
    }

    // ==========================================
    // 3. ADMIN LOGOUT
    // ==========================================

    const adminLogout = document.getElementById(
        "adminLogout"
    );

    if (adminLogout) {
        adminLogout.addEventListener("click", () => {

            sessionStorage.removeItem("authToken");
            sessionStorage.removeItem("authUser");

            window.location.replace("login.html");
        });
    }
}
