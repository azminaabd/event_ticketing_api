
/*
 * MEMBER 5 - LOGIN FRONTEND
 * Event Ticketing and Venue Booking System
 *
 * Features:
 * 1. Show / Hide Password
 * 2. JWT Login Authentication
 * 3. Login Error Handling
 * 4. Session Storage
 * 5. Role-Based Dashboard Redirect
 */

const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const toggleLoginPassword = document.getElementById(
    "toggleLoginPassword"
);

// ==========================================
// 1. SHOW / HIDE PASSWORD
// ==========================================

toggleLoginPassword.addEventListener("click", () => {
    const isHidden = loginPassword.type === "password";

    loginPassword.type = isHidden ? "text" : "password";

    toggleLoginPassword.textContent =
        isHidden ? "Hide" : "Show";

    toggleLoginPassword.setAttribute(
        "aria-pressed",
        String(isHidden)
    );

    toggleLoginPassword.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password"
    );
});

// ==========================================
// 2. SHOW LOGIN MESSAGE
// ==========================================

function showLoginMessage(message, type = "error") {
    loginMessage.textContent = message;
    loginMessage.className = "auth-message";
    loginMessage.classList.add(type);
}

// ==========================================
// 3. ROLE-BASED DASHBOARD PATHS
// ==========================================

// Update these paths after confirming the actual
// dashboard filenames for each role.
const dashboardPaths = {
    CUSTOMER: "index.html",
    ORGANISER: "organizer-dashboard.html",
    ADMIN: "admin-dashboard.html"
};

// ==========================================
// 4. LOGIN USING JWT API
// ==========================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    loginMessage.textContent = "";
    loginMessage.className = "auth-message";

    if (!email || !password) {
        showLoginMessage(
            "Please enter your email and password."
        );
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";

    try {
        const response = await fetch(
            "../../auth/login.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Login failed. Please try again."
            );
        }

        // Check that the API returned valid login data.
        if (
            !result.token ||
            !result.user ||
            !result.user.role
        ) {
            throw new Error(
                "Login response is incomplete."
            );
        }

        const role = result.user.role.toUpperCase();

        if (!Object.prototype.hasOwnProperty.call(
            dashboardPaths, role
        )) {
            throw new Error(
                "This account role is not supported."
            );
        }

        // Clear any previous login session.
        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("authUser");

        // Store the JWT and user details for this tab.
        sessionStorage.setItem(
            "authToken",
            result.token
        );

        sessionStorage.setItem(
            "authUser",
            JSON.stringify(result.user)
        );

        // Display login success.
        showLoginMessage(
            "✿ Welcome back, " +
            result.user.name +
            "! Login successful.",
            "success"
        );

        
        // MEMBER 5 - REDIRECT AFTER LOGIN

        const urlParams = new URLSearchParams(
            window.location.search
        );

        const returnPage = urlParams.get("return");

        // Only allow a CUSTOMER to return to a local booking page.
        // Other destinations are not accepted.
        const validBookingPage =
            role === "CUSTOMER" &&
            returnPage !== null &&
            /^booking\.html\?event_id=[1-9]\d*$/.test(returnPage);

        if (validBookingPage) {

            // Continue booking the event selected before login.
            window.location.href = returnPage;

        } else {

            // Normal login: go to the existing landing page.
            // Role-specific dashboards will be configured later.
            window.location.href = dashboardPaths[role];

        }


    } catch (error) {
        console.error("Login error:", error);

        showLoginMessage(
            error.message ||
            "Unable to sign in. Please try again."
        );

    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In ✿";
    }
});
