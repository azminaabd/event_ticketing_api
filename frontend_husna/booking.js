
/* MEMBER 5 - BOOKING PAGE */

const bookingMessage = document.getElementById("bookingMessage");
const bookingDetails = document.getElementById("bookingDetails");
const ticketQuantity = document.getElementById("ticketQuantity");
const totalBookingPrice = document.getElementById("totalBookingPrice");


const params = new URLSearchParams(window.location.search);
const eventId = params.get("event_id");

/* MEMBER 5 - CUSTOMER BOOKING ACCESS */

const authToken = sessionStorage.getItem("authToken");
let authUser = null;

try {
    authUser = JSON.parse(
        sessionStorage.getItem("authUser") || "null"
    );
} catch (error) {
    authUser = null;
}

// Visitor must log in before booking.
if (!authToken || !authUser) {
    const returnUrl = encodeURIComponent(
        `booking.html?event_id=${encodeURIComponent(eventId || "")}`
    );

    window.location.replace(
        `login.html?return=${returnUrl}`
    );
}

// Only CUSTOMER accounts can book tickets.
else if (authUser.role !== "CUSTOMER") {
    alert("Only customer accounts can book tickets.");
    window.location.replace("index.html");
}

let ticketPrice = 0;


function formatPrice(price) {
    return "RM " + Number(price).toFixed(2);
}

function calculateTotal() {
    const quantity = Number(ticketQuantity.value);

    if (!Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10) {
        totalBookingPrice.textContent = "Invalid quantity";
        return;
    }

    const total = ticketPrice * quantity;
    totalBookingPrice.textContent = formatPrice(total);
}

async function loadBookingEvent() {
    if (!eventId || !/^[1-9]\d*$/.test(eventId)) {
        bookingMessage.textContent =
            "Please select an event from Explore Events to begin.";
        return;
    }

    bookingMessage.textContent = "Loading event details...";

    try {
        const response = await fetch(
            `../../events.php?id=${encodeURIComponent(eventId)}`
        );

        const result = await response.json();

        if (!response.ok || !result.data) {
            throw new Error("Event not found.");
        }

        const event = result.data;

        if (event.status !== "ACTIVE") {
            bookingMessage.textContent =
                "This event is not available for booking.";
            return;
        }

        ticketPrice = Number(event.ticket_price);

        if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
            throw new Error("Invalid event ticket price.");
        }

        document.getElementById("bookingEventName").textContent =
            event.event_name;

        document.getElementById("bookingEventDate").textContent =
            event.event_date;

        document.getElementById("bookingEventTime").textContent =
            `${event.start_time} - ${event.end_time}`;

        document.getElementById("bookingTicketPrice").textContent =
            formatPrice(ticketPrice);

        bookingMessage.hidden = true;
        bookingDetails.hidden = false;

        calculateTotal();

    } catch (error) {
        bookingMessage.textContent =
            "Unable to load event details. Please try again.";
        console.error("Booking page error:", error);
    }
}

ticketQuantity.addEventListener("input", calculateTotal);

loadBookingEvent();


/* =========================================
   MEMBER 5 - CONFIRM BOOKING INTEGRATION
   ========================================= */

const confirmBookingBtn =
    document.getElementById("confirmBookingBtn");

const bookingSubmitMessage =
    document.getElementById("bookingSubmitMessage");

confirmBookingBtn.addEventListener("click", async () => {

    const quantity = Number(ticketQuantity.value);

    // Validate quantity.
    if (!Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10) {

        bookingSubmitMessage.textContent =
            "Please enter a valid quantity between 1 and 10.";

        return;
    }

    // Check customer login.
    if (!authToken || !authUser ||
        authUser.role !== "CUSTOMER") {

        bookingSubmitMessage.textContent =
            "Please log in as a customer to book tickets.";

        return;
    }

    confirmBookingBtn.disabled = true;
    confirmBookingBtn.textContent = "Creating Booking...";

    bookingSubmitMessage.textContent =
        "Please wait while we create your booking.";

    try {

        const response = await fetch("../../bookings.php", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },

            body: JSON.stringify({
                event_id: Number(eventId),
                quantity: quantity
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to create booking."
            );
        }

        const booking = result.data;

        
bookingSubmitMessage.textContent =
    `Your booking has been submitted successfully! ✿ ` +
    `Booking Reference: #${booking.booking_id}. ` +
    `Status: ${booking.booking_status}. ` +
    `Total: RM ${Number(booking.total_price).toFixed(2)}.`;

document.getElementById("viewMyBookingsBtn").hidden = false;


        confirmBookingBtn.textContent = "Booking Created ✓";

        // Prevent duplicate submissions.
        ticketQuantity.disabled = true;

    } catch (error) {

        console.error("Booking error:", error);

        bookingSubmitMessage.textContent =
            error.message || "Booking failed. Please try again.";

        confirmBookingBtn.disabled = false;
        confirmBookingBtn.textContent = "Confirm Booking ✿";

    }

});

