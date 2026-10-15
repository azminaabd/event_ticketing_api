/*
 * MEMBER 5 - ORGANIZER BOOKING MANAGEMENT
 * View and filter reservations for own events.
 */

const bookingMessage = document.getElementById("organizerBookingsMessage");
const bookingList = document.getElementById("organizerBookingsList");
const bookingFilter = document.getElementById("organizerBookingFilter");

const token = sessionStorage.getItem("authToken");

let user = null;
let allBookings = [];

try {
    user = JSON.parse(sessionStorage.getItem("authUser") || "null");
} catch (error) {
    user = null;
}

// ==========================================
// 1. CHECK ORGANIZER LOGIN
// ==========================================

if (!token || !user || user.role !== "ORGANISER") {
    window.location.replace("login.html");
} else {
    loadOrganizerBookings();
}

// ==========================================
// 2. LOAD ORGANIZER BOOKINGS
// ==========================================

async function loadOrganizerBookings() {

    bookingMessage.textContent = "Loading your reservations...";

    try {

        const headers = {
            "Authorization": "Bearer " + token
        };

        // Get events and bookings from existing APIs.
        const [eventsResponse, bookingsResponse] = await Promise.all([
            fetch("../../events.php", { headers }),
            fetch("../../bookings.php", { headers })
        ]);

        const eventsResult = await eventsResponse.json();
        const bookingsResult = await bookingsResponse.json();

        if (!eventsResponse.ok) {
            throw new Error(eventsResult.error || "Unable to load events.");
        }

        if (!bookingsResponse.ok) {
            throw new Error(bookingsResult.error || "Unable to load bookings.");
        }

        if (
            !Array.isArray(eventsResult.data) ||
            !Array.isArray(bookingsResult.data)
        ) {
            throw new Error("Invalid API response.");
        }

        // Find events owned by the logged-in organizer.
        const myEventIds = new Set(
            eventsResult.data
                .filter(event =>
                    Number(event.organiser_id) === Number(user.user_id)
                )
                .map(event => Number(event.event_id))
        );

        // Show only bookings for the organizer's events.
        allBookings = bookingsResult.data.filter(booking =>
            myEventIds.has(Number(booking.event_id))
        );

        allBookings.sort(
            (a, b) => Number(b.booking_id) - Number(a.booking_id)
        );

        displayOrganizerBookings();

    } catch (error) {

        console.error("Organizer bookings error:", error);
        bookingMessage.textContent = error.message;
    }
}

// ==========================================
// 3. DISPLAY BOOKINGS
// ==========================================

function displayOrganizerBookings() {

    bookingList.replaceChildren();

    const selectedStatus = bookingFilter.value;

    const filtered = allBookings.filter(booking =>
        selectedStatus === "ALL" ||
        booking.booking_status === selectedStatus
    );

    bookingMessage.textContent =
        `${filtered.length} reservation(s) found.`;

    if (filtered.length === 0) {
        return;
    }

    filtered.forEach(booking => {

        const card = document.createElement("article");
        card.className = "organizer-booking-card";

        const title = document.createElement("h3");
        title.textContent = booking.event_name;

        const status = document.createElement("span");
        status.className = "organizer-booking-status";
        status.textContent = booking.booking_status;

        const details = document.createElement("div");
        details.className = "organizer-booking-details";

        function addDetail(label, value) {
            const item = document.createElement("p");

            const strong = document.createElement("strong");
            strong.textContent = label + ": ";

            item.appendChild(strong);
            item.appendChild(document.createTextNode(String(value)));

            details.appendChild(item);
        }

        addDetail("Booking ID", "#" + booking.booking_id);
        addDetail("Customer", booking.customer_name);
        addDetail("Tickets", booking.quantity);
        addDetail(
            "Total",
            "RM " + Number(booking.total_price).toFixed(2)
        );
        addDetail("Booking Date", booking.booking_date);

        card.append(title, status, details);

        
        if (booking.booking_status === "PENDING") {

            const actions = document.createElement("div");
            actions.className = "organizer-booking-actions";

            const approveButton = document.createElement("button");
            approveButton.type = "button";
            approveButton.className = "organizer-approve-btn";
            approveButton.textContent = "✓ Approve";

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "organizer-cancel-btn";
            cancelButton.textContent = "✕ Cancel";

            approveButton.addEventListener("click", () => {
                updateBookingStatus(booking.booking_id, "CONFIRMED");
            });

            cancelButton.addEventListener("click", () => {
                updateBookingStatus(booking.booking_id, "CANCELLED");
            });

            actions.append(approveButton, cancelButton);
            card.appendChild(actions);
        }


        bookingList.appendChild(card);
    });
}

// ==========================================
// 4. STATUS FILTER
// ==========================================

bookingFilter.addEventListener("change", displayOrganizerBookings);


async function updateBookingStatus(bookingId, newStatus) {

    const action = newStatus === "CONFIRMED"
        ? "approve"
        : "cancel";

    const confirmed = window.confirm(
        `Are you sure you want to ${action} booking #${bookingId}?`
    );

    if (!confirmed) {
        return;
    }

    bookingMessage.textContent = "Updating booking...";

    // Prevent repeated clicks while the request is running.
    bookingList.querySelectorAll("button").forEach(button => {
        button.disabled = true;
    });

    try {

        const response = await fetch(
            "../../bookings.php?id=" + encodeURIComponent(bookingId),
            {
                method: "PUT",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    booking_status: newStatus
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to update booking."
            );
        }

        // Reload bookings so the displayed status stays accurate.
        await loadOrganizerBookings();

    } catch (error) {

        console.error("Booking update error:", error);

        bookingMessage.textContent = error.message;

        bookingList.querySelectorAll("button").forEach(button => {
            button.disabled = false;
        });
    }
}
