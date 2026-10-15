// =====================================
// ADMIN MANAGE BOOKINGS - GET ALL
// =====================================

const API_URL = "../../bookings.php";

const token = sessionStorage.getItem("authToken");
const currentUser = JSON.parse(
    sessionStorage.getItem("authUser") || "null"
);

// Admin access only
if (!token || !currentUser || currentUser.role !== "ADMIN") {
    alert("Admin access required.");
    window.location.href = "login.html";
}

const bookingsList = document.getElementById("adminBookingsList");
const bookingsMessage = document.getElementById("bookingsMessage");
const bookingCount = document.getElementById("bookingCount");

let allBookings = [];

// =====================================
// ADMIN BOOKING STATISTICS
// =====================================

function updateBookingStatistics() {

    // Total booking records
    const totalBookings = allBookings.length;

    // Pending bookings
    const pendingBookings = allBookings.filter(
        booking => booking.booking_status === "PENDING"
    ).length;

    // Cancelled bookings
    const cancelledBookings = allBookings.filter(
        booking => booking.booking_status === "CANCELLED"
    ).length;

    // Total value of confirmed bookings only
    const confirmedBookingValue = allBookings
        .filter(booking => booking.booking_status === "CONFIRMED")
        .reduce((total, booking) => {
            return total + (Number(booking.total_price) || 0);
        }, 0);

    // Display statistics
    document.getElementById("statTotalBookings").textContent =
        totalBookings;

    document.getElementById("statBookingValue").textContent =
        `RM ${confirmedBookingValue.toFixed(2)}`;

    document.getElementById("statPendingBookings").textContent =
        pendingBookings;

    document.getElementById("statCancelledBookings").textContent =
        cancelledBookings;
}

// GET all bookings
async function loadAdminBookings() {

    bookingsMessage.textContent = "Loading bookings...";

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to load bookings."
            );
        }

        allBookings = result.data || [];

bookingCount.textContent =
    `${allBookings.length} Bookings`;

bookingsMessage.textContent = "";

// Update statistics using the latest API data
updateBookingStatistics();

// Display bookings table
displayAdminBookings();

    } catch (error) {
        bookingsMessage.textContent = error.message;
    }
}

function displayAdminBookings() {

    bookingsList.innerHTML = "";

    if (allBookings.length === 0) {
        bookingsMessage.textContent = "No bookings available.";
        return;
    }

    // =====================================
// SEARCH, FILTER & SORT BOOKINGS
// =====================================

// Read search, filter and sort inputs
const searchValue = document.getElementById("bookingSearch")
    .value.toLowerCase().trim();

const statusValue = document.getElementById("bookingStatusFilter").value;
const sortValue = document.getElementById("bookingSort").value;

// Filter bookings
let filteredBookings = allBookings.filter(booking => {

    const matchesSearch =
        String(booking.booking_id).includes(searchValue) ||
        String(booking.customer_name || "").toLowerCase().includes(searchValue) ||
        String(booking.event_name || "").toLowerCase().includes(searchValue);

    const matchesStatus =
        statusValue === "ALL" ||
        booking.booking_status === statusValue;

    return matchesSearch && matchesStatus;
});

// Sort bookings
filteredBookings.sort((a, b) => {

    if (sortValue === "newest") {
        return new Date(b.booking_date.replace(" ", "T")) -
               new Date(a.booking_date.replace(" ", "T"));
    }

    if (sortValue === "oldest") {
        return new Date(a.booking_date.replace(" ", "T")) -
               new Date(b.booking_date.replace(" ", "T"));
    }

    if (sortValue === "id_asc") {
        return Number(a.booking_id) - Number(b.booking_id);
    }

    if (sortValue === "id_desc") {
        return Number(b.booking_id) - Number(a.booking_id);
    }

    return 0;
});

// Display the filtered and sorted bookings
filteredBookings.forEach(booking => {

        const row = document.createElement("tr");

        const values = [
            `#${booking.booking_id}`,
            booking.customer_name,
            booking.event_name,
            booking.quantity,
            Number(booking.total_price).toFixed(2),
            null,
            booking.booking_date
        ];

       values.forEach((value, index) => {

    const cell = document.createElement("td");

    if (index === 5) {

        const badge = document.createElement("span");

        badge.textContent = booking.booking_status;

        badge.style.padding = "7px 12px";
        badge.style.borderRadius = "20px";
        badge.style.fontSize = "12px";
        badge.style.fontWeight = "700";
        badge.style.display = "inline-block";

        if (booking.booking_status === "PENDING") {
            badge.style.background = "#fff0c2";
            badge.style.color = "#936400";

        } else if (booking.booking_status === "CONFIRMED") {
            badge.style.background = "#dcebdd";
            badge.style.color = "#326b42";

        } else if (booking.booking_status === "CANCELLED") {
            badge.style.background = "#f7deda";
            badge.style.color = "#a3433d";
        }

        cell.appendChild(badge);

    } else {
        cell.textContent = value;
    }

    row.appendChild(cell);
});

// =====================================
// BOOKING ACTION BUTTONS
// =====================================

const actionsCell = document.createElement("td");

const actions = document.createElement("div");
actions.style.display = "flex";
actions.style.gap = "8px";
actions.style.flexWrap = "wrap";

// Confirm button
const confirmButton = document.createElement("button");
confirmButton.type = "button";
confirmButton.className = "organizer-event-edit-btn";
confirmButton.textContent = "Confirm";
confirmButton.style.marginTop = "0";
confirmButton.addEventListener("click", () => {
    confirmBooking(booking);
});

// Cancel button
const cancelButton = document.createElement("button");
cancelButton.type = "button";
cancelButton.className = "organizer-event-edit-btn";
cancelButton.textContent = "Cancel";
cancelButton.style.background = "#b77b70";
cancelButton.style.marginTop = "0";
cancelButton.addEventListener("click", () => {
    cancelBooking(booking);
});

// Disable buttons according to booking status
if (booking.booking_status === "CONFIRMED") {
    confirmButton.disabled = true;
}

if (booking.booking_status === "CANCELLED") {
    confirmButton.disabled = true;
    cancelButton.disabled = true;
}

// Disabled button appearance
[confirmButton, cancelButton].forEach(button => {
    if (button.disabled) {
        button.style.opacity = "0.45";
        button.style.cursor = "not-allowed";
    }
});

actions.append(confirmButton, cancelButton);
actionsCell.appendChild(actions);
row.appendChild(actionsCell);

        bookingsList.appendChild(row);
    });
}

// Load bookings when page opens
if (token && currentUser?.role === "ADMIN") {
    loadAdminBookings();
}

// =====================================
// ADMIN - CONFIRM BOOKING (PUT API)
// =====================================

async function confirmBooking(booking) {

    if (booking.booking_status !== "PENDING") {
        alert("Only pending bookings can be confirmed.");
        return;
    }

    const confirmed = confirm(
        `Confirm Booking #${booking.booking_id} for ${booking.customer_name}?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}?id=${encodeURIComponent(booking.booking_id)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    booking_status: "CONFIRMED"
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to confirm booking."
            );
        }

        alert("Booking confirmed successfully!");

        await loadAdminBookings();

    } catch (error) {
        alert(error.message);
    }
}

// =====================================
// ADMIN - CANCEL BOOKING (DELETE API)
// =====================================

async function cancelBooking(booking) {

    if (booking.booking_status === "CANCELLED") {
        alert("This booking is already cancelled.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to cancel Booking #${booking.booking_id} for ${booking.customer_name}?`
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}?id=${encodeURIComponent(booking.booking_id)}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to cancel booking."
            );
        }

        alert("Booking cancelled successfully!");

        await loadAdminBookings();

    } catch (error) {
        alert(error.message);
    }
}

// =====================================
// BOOKING SEARCH, FILTER & SORT LISTENERS
// =====================================

document.getElementById("bookingSearch")
    .addEventListener("input", displayAdminBookings);

document.getElementById("bookingStatusFilter")
    .addEventListener("change", displayAdminBookings);

document.getElementById("bookingSort")
    .addEventListener("change", displayAdminBookings);