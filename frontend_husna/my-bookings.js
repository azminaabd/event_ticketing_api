
/* =========================================
   MEMBER 5 - MY BOOKINGS FRONTEND
   ========================================= */

const bookingsMessage =
    document.getElementById("myBookingsMessage");

const bookingsWelcome =
    document.getElementById("myBookingsWelcome");

const bookingsActions =
    document.getElementById("myBookingsActions");

const bookingsContainer =
    document.getElementById("bookingsContainer");

const token = sessionStorage.getItem("authToken");

let currentUser = null;

try {
    currentUser = JSON.parse(
        sessionStorage.getItem("authUser") || "null"
    );
} catch (error) {
    currentUser = null;
}

// Create a separate area for booking cards.
// Keep the existing Cozy HTML and styling.
const bookingsList = document.createElement("div");
bookingsList.id = "customerBookingsList";
bookingsList.style.marginTop = "24px";

if (bookingsContainer) {
    bookingsContainer.appendChild(bookingsList);
}

function addBookingDetail(card, label, value) {
    const line = document.createElement("p");
    line.style.margin = "8px 0";

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    line.appendChild(strong);
    line.appendChild(
        document.createTextNode(String(value))
    );

    card.appendChild(line);
}

function displayBookings(bookings) {

    bookingsList.replaceChildren();

    if (bookings.length === 0) {
        bookingsMessage.textContent =
            "You have not made any bookings yet.";
        return;
    }

    bookingsMessage.textContent =
        `✿ You have ${bookings.length} lovely booking(s)`;

    bookings.forEach(booking => {

        const card = document.createElement("article");
        card.className = "cozy-my-ticket";

        const status = String(booking.booking_status || "").toUpperCase();
        const reference = "BK-" +
            String(booking.booking_id).padStart(4, "0");

        const header = document.createElement("div");
        header.className = "cozy-my-ticket-header";

        const eyebrow = document.createElement("span");
        eyebrow.className = "cozy-my-ticket-eyebrow";
        eyebrow.textContent = "✿ EVENT RESERVATION";

        const badge = document.createElement("span");
        badge.className = "booking-status " + status.toLowerCase();
        badge.textContent = status;

        const title = document.createElement("h3");
        title.textContent = booking.event_name;

        const referenceText = document.createElement("p");
        referenceText.textContent = "Booking Reference: " + reference;

        header.append(eyebrow, badge, title, referenceText);

        const details = document.createElement("div");
        details.className = "cozy-my-ticket-details";

        function addDetail(label, value) {
            const item = document.createElement("div");
            const small = document.createElement("span");
            const strong = document.createElement("strong");

            small.textContent = label;
            strong.textContent = value;

            item.append(small, strong);
            details.appendChild(item);
        }

        addDetail("TICKETS", booking.quantity + " Ticket(s)");
        addDetail(
            "TOTAL PRICE",
            "RM " + Number(booking.total_price).toFixed(2)
        );
        addDetail("BOOKED ON", booking.booking_date);

        const footer = document.createElement("div");
        footer.className = "cozy-my-ticket-footer";

        if (status === "PENDING") {
            footer.textContent =
                "⏳ Awaiting booking confirmation";
        } else if (status === "CONFIRMED") {

    const message = document.createElement("p");
    message.textContent = "✓ Booking confirmed!";
    message.style.marginBottom = "12px";

    const ticketButton = document.createElement("button");
    ticketButton.type = "button";
    ticketButton.className = "cozy-view-ticket-btn";
    ticketButton.textContent = "🎟 View Digital Ticket";

    ticketButton.addEventListener("click", () => {
        openDigitalTicket(booking.booking_id);
    });

    footer.append(message, ticketButton);
}
        else {
            footer.textContent = "Booking status: " + status;
        }

        card.append(header, details, footer);
        bookingsList.appendChild(card);
    });
}

async function loadMyBookingsPage() {

    if (!token || !currentUser) {
        window.location.replace(
            "login.html?return=my-bookings.html"
        );
        return;
    }

    if (currentUser.role !== "CUSTOMER") {
        bookingsMessage.textContent =
            "My Bookings is available for customers only.";
        return;
    }

    bookingsWelcome.textContent =
        `Welcome back, ${currentUser.name}! ✿`;

    bookingsActions.hidden = false;

    bookingsMessage.textContent =
        "Loading your bookings...";

    try {

        const response = await fetch(
            "../../bookings.php?mine=1",
            {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Authorization": "Bearer " + token
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to load bookings."
            );
        }

        if (!Array.isArray(result.data)) {
            throw new Error("Invalid booking response.");
        }

        // Display only bookings belonging to
        // the currently signed-in customer.
        const myBookings = result.data.filter(
            booking =>
                Number(booking.user_id) ===
                Number(currentUser.user_id)
        );

        myBookings.sort(
            (a, b) =>
                Number(b.booking_id) -
                Number(a.booking_id)
        );

        displayBookings(myBookings);

    } catch (error) {

        console.error("My Bookings error:", error);

        bookingsMessage.textContent =
            "Unable to load your bookings: " +
            error.message;
    }
}

loadMyBookingsPage();

async function openDigitalTicket(bookingId) {

    const ticketWindow = window.open("", "_blank");

    if (!ticketWindow) {
        alert("Please allow pop-ups to view your ticket.");
        return;
    }

    ticketWindow.document.body.textContent =
        "Loading your digital ticket...";

    try {

        const headers = {
            "Authorization": "Bearer " + token
        };

        // Fetch protected ticket page and QR image.
        const [ticketResponse, qrResponse] = await Promise.all([
            fetch(
                "../../ticket_view.php?booking_id=" +
                encodeURIComponent(bookingId),
                { headers }
            ),
            fetch(
                "../../qr_ticket.php?booking_id=" +
                encodeURIComponent(bookingId),
                { headers }
            )
        ]);

        if (!ticketResponse.ok || !qrResponse.ok) {
            throw new Error(
                "Unable to load digital ticket or QR code."
            );
        }

        const ticketHtml = await ticketResponse.text();
       const qrBlob = await qrResponse.blob();

if (!qrBlob.type.startsWith("image/")) {
    throw new Error("QR response is not an image.");
}

// Convert QR image into a data URL.
const qrUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
        new Error("Unable to read QR image.")
    );

    reader.readAsDataURL(qrBlob);
});

        // Parse the ticket HTML without executing scripts.
        const parsed = new DOMParser().parseFromString(
            ticketHtml,
            "text/html"
        );

        const qrImage = parsed.querySelector(".qr-section img");

        if (!qrImage) {
    throw new Error("QR image element not found.");
}

        // Replace protected QR URL with authenticated image data.
        qrImage.src = qrUrl;

        // Display the fetched ticket document.
        ticketWindow.document.open();
        ticketWindow.document.write(
            "<!DOCTYPE html>\n" +
            parsed.documentElement.outerHTML
        );
        ticketWindow.document.close();

    } catch (error) {

        console.error("Digital ticket error:", error);

        ticketWindow.document.body.textContent =
            "Unable to load digital ticket: " + error.message;
    }
}
