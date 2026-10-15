
/*
 * MEMBER 5 - CUSTOMER REGISTRATION
 * Event Ticketing and Venue Booking System
 *
 * Features:
 * 1. Show / Hide Password
 * 2. Live Password Validation
 * 3. Confirm Password Matching
 * 4. Users API Registration
 * 5. Success and Error Feedback
 */

const registerForm = document.getElementById("registerForm");
const registerBtn = document.getElementById("registerBtn");
const registerMessage = document.getElementById("registerMessage");

const passwordInput = document.getElementById("registerPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");

const passwordHint = document.getElementById("passwordHint");
const confirmPasswordHint = document.getElementById("confirmPasswordHint");

const togglePassword = document.getElementById(
    "toggleRegisterPassword"
);

const toggleConfirmPassword = document.getElementById(
    "toggleConfirmPassword"
);

// ==========================================
// 1. SHOW / HIDE PASSWORD
// ==========================================

function setupPasswordToggle(button, input) {
    button.addEventListener("click", () => {
        const isHidden = input.type === "password";

        input.type = isHidden ? "text" : "password";
        button.textContent = isHidden ? "Hide" : "Show";

        button.setAttribute(
            "aria-pressed",
            String(isHidden)
        );

        button.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });
}

setupPasswordToggle(togglePassword, passwordInput);
setupPasswordToggle(toggleConfirmPassword, confirmPasswordInput);


// ==========================================
// 2. LIVE PASSWORD VALIDATION
// ==========================================

function getPasswordBytes(password) {
    return new TextEncoder().encode(password).length;
}

function validatePassword() {
    const password = passwordInput.value;
    const passwordBytes = getPasswordBytes(password);

    passwordHint.classList.remove("valid", "invalid");

    if (password.length === 0) {
        passwordHint.textContent =
            "○ Password must contain 8–72 bytes.";
        return false;
    }

    if (passwordBytes >= 8 && passwordBytes <= 72) {
        passwordHint.textContent =
            "✓ Password length is valid!";
        passwordHint.classList.add("valid");
        return true;
    }

    passwordHint.textContent =
        "✕ Password must contain 8–72 bytes.";
    passwordHint.classList.add("invalid");
    return false;
}


// ==========================================
// 3. CONFIRM PASSWORD VALIDATION
// ==========================================

function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirmation = confirmPasswordInput.value;

    confirmPasswordHint.classList.remove(
        "valid",
        "invalid"
    );

    if (confirmation.length === 0) {
        confirmPasswordHint.textContent =
            "○ Passwords must match.";
        return false;
    }

    if (password === confirmation) {
        confirmPasswordHint.textContent =
            "✓ Passwords match!";
        confirmPasswordHint.classList.add("valid");
        return true;
    }

    confirmPasswordHint.textContent =
        "✕ Passwords do not match.";
    confirmPasswordHint.classList.add("invalid");
    return false;
}


// ==========================================
// 4. LIVE INPUT LISTENERS
// ==========================================

passwordInput.addEventListener("input", () => {
    validatePassword();
    validateConfirmPassword();
});

confirmPasswordInput.addEventListener(
    "input",
    validateConfirmPassword
);


// ==========================================
// 5. REGISTER CUSTOMER THROUGH USERS API
// ==========================================

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById(
        "registerName"
    ).value.trim();

    const email = document.getElementById(
        "registerEmail"
    ).value.trim();

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Clear previous messages.
    registerMessage.textContent = "";
    registerMessage.className = "auth-message";

    // Validate password length.
    if (!validatePassword()) {
        registerMessage.textContent =
            "Please enter a valid password.";

        registerMessage.classList.add("error");
        return;
    }

    // Validate password confirmation.
    if (!validateConfirmPassword()) {
        registerMessage.textContent =
            "Passwords do not match. Please try again.";

        registerMessage.classList.add("error");
        return;
    }

    // Prevent duplicate submissions.
    registerBtn.disabled = true;
    registerBtn.textContent = "Creating Account...";

    try {
        const response = await fetch("../../users.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Registration failed. Please try again."
            );
        }

        // Registration successful.
        registerMessage.textContent =
            "✿ Account created successfully! " +
            "You can now sign in to your account.";

        registerMessage.classList.add("success");

        registerForm.reset();

        // Reset validation hints.
        validatePassword();
        validateConfirmPassword();

    } catch (error) {
        console.error("Registration error:", error);

        registerMessage.textContent = error.message;
        registerMessage.classList.add("error");

    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = "Create My Account ✿";
    }
});
