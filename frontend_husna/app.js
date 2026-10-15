
/*
 * MEMBER 5 - EVENT DISCOVERY DASHBOARD
 * Connects frontend to the Events API.
 */

const API_URL = "../../events.php";

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const sortSelect = document.getElementById("sortSelect");

const eventContainer = document.getElementById("eventContainer");
const loadingMessage = document.getElementById("loadingMessage");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

let currentPage = 1;
const pageLimit = 3;
let totalPages = 1;

// Protect displayed text from HTML injection.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return characters[char];
    });
}

// Load events from the backend API.
async function loadEvents() {
    loadingMessage.style.display = "block";
    loadingMessage.textContent = "Loading events...";
    eventContainer.innerHTML = "";

    const [sort, order] = sortSelect.value.split("-");

    const params = new URLSearchParams({
        page: currentPage,
        limit: pageLimit,
        search: searchInput.value.trim(),
        status: statusFilter.value,
        sort: sort,
        order: order
    });

    try {
        const response = await fetch(`${API_URL}?${params}`);

        if (!response.ok) {
            throw new Error(`API request failed (${response.status})`);
        }

        const result = await response.json();

        if (!Array.isArray(result.data) || !result.pagination) {
            throw new Error("Unexpected API response format");
        }

        await displayEvents(result.data);

        totalPages = Math.max(
            1,
            Number(result.pagination.total_pages) || 1
        );

        pageInfo.textContent =
            `Page ${currentPage} of ${totalPages}`;

        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;

        loadingMessage.style.display = "none";

    } catch (error) {
        console.error("Error loading events:", error);

        loadingMessage.textContent =
            "Unable to load events. Please check the API connection.";

        pageInfo.textContent = "Events unavailable";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
    }
}


/* MEMBER 5 - DISPLAY EVENTS WITH VENUE NAMES */

async function displayEvents(events) {
    if (events.length === 0) {
        eventContainer.innerHTML =
            "<p>No events found. Try another search or filter.</p>";
        return;
    }

    // Fetch venue names from the Venues API.
    const venueIds = [
        ...new Set(events.map(event => event.venue_id))
    ];

    const venueEntries = await Promise.all(
        venueIds.map(async (venueId) => {
            try {
                const response = await fetch(
                    `../../venues.php?id=${encodeURIComponent(venueId)}`
                );

                if (!response.ok) {
                    throw new Error("Venue not found");
                }

                const result = await response.json();

                return [
                    String(venueId),
                    result.data.venue_name
                ];

            } catch (error) {
                console.error("Venue loading error:", error);

                return [
                    String(venueId),
                    "Venue unavailable"
                ];
            }
        })
    );

    const venueNames = Object.fromEntries(venueEntries);

    eventContainer.innerHTML = events.map((event) => {
        const name = escapeHTML(event.event_name);
        const description = escapeHTML(event.description);
        const date = escapeHTML(event.event_date);
        const status = escapeHTML(event.status);

        const venueName = escapeHTML(
            venueNames[String(event.venue_id)] ||
            "Venue unavailable"
        );

        const price = Number(event.ticket_price);
        const priceText = Number.isFinite(price)
            ? `RM ${price.toFixed(2)}`
            : "Price unavailable";

        const statusClass = ["CANCELLED", "COMPLETED"].includes(
            event.status
        ) ? event.status.toLowerCase() : "";

        return `
            <article class="event-card">
                <h3>${name}</h3>

                <p>${description}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Venue:</strong> ${venueName}</p>

                <span class="event-status ${statusClass}">
                    ${status}
                </span>

                <div class="event-price">
                    ${priceText}
                </div>

                <button
                    type="button"
                    class="view-details-btn"
                    data-event-id="${Number(event.event_id)}"
                >
                    View Details
                </button>
            </article>
        `;
    }).join("");
}


// Search as the user types.
let searchDelay;

searchInput.addEventListener("input", () => {
    clearTimeout(searchDelay);

    searchDelay = setTimeout(() => {
        currentPage = 1;
        loadEvents();
    }, 350);
});

// Filter events.
statusFilter.addEventListener("change", () => {
    currentPage = 1;
    loadEvents();
});

// Sort events.
sortSelect.addEventListener("change", () => {
    currentPage = 1;
    loadEvents();
});

// Previous page.
prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadEvents();
    }
});

// Next page.
nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadEvents();
    }
});

// Load events when the page opens.
loadEvents();


/* ==========================================
   MEMBER 5 - EVENT DETAILS POPUP
   ========================================== */

const eventModal = document.getElementById("eventModal");
const closeModalBtn = document.getElementById("closeModalBtn");

// Open event details using the selected event ID
async function viewEventDetails(eventId) {
    try {
        const response = await fetch(
            `../../events.php?id=${encodeURIComponent(eventId)}`
        );

        if (!response.ok) {
            throw new Error("Unable to load event details");
        }

        const result = await response.json();
        const event = result.data;

        document.getElementById("modalEventName").textContent =
            event.event_name;

        document.getElementById("modalDescription").textContent =
            event.description || "No description available.";

        document.getElementById("modalDate").textContent =
            event.event_date;

        document.getElementById("modalTime").textContent =
            `${event.start_time} - ${event.end_time}`;

        
// Load venue information using the venue ID.
const modalVenue = document.getElementById("modalVenue");
const modalLocation = document.getElementById("modalLocation");

modalVenue.textContent = "Loading...";
modalLocation.textContent = "Loading...";

try {
    const venueResponse = await fetch(
        `../../venues.php?id=${encodeURIComponent(event.venue_id)}`
    );

    if (!venueResponse.ok) {
        throw new Error("Unable to load venue");
    }

    const venueResult = await venueResponse.json();
    const venue = venueResult.data;

    modalVenue.textContent = venue.venue_name;
    modalLocation.textContent = venue.location;

} catch (venueError) {
    console.error("Venue loading error:", venueError);

    modalVenue.textContent = `Venue ID: ${event.venue_id}`;
    modalLocation.textContent = "Location unavailable";
}


        document.getElementById("modalPrice").textContent =
            `RM ${Number(event.ticket_price).toFixed(2)}`;

       
document.getElementById("modalStatus").textContent =
    event.status;

// MEMBER 5 - BOOK NOW NAVIGATION
const bookNowBtn = document.getElementById("bookNowBtn");

// Enable navigation only for active, upcoming events.
// Booking submission remains disabled on booking.html.
const eventDate = String(event.event_date).slice(0, 10);
const isUpcoming = eventDate >= new Date().toLocaleDateString("en-CA");

if (event.status === "ACTIVE" && isUpcoming) {
    bookNowBtn.disabled = false;
    bookNowBtn.textContent = "Book Now →";

    
bookNowBtn.onclick = () => {

    const authToken = sessionStorage.getItem("authToken");

    let authUser = null;

    try {
        authUser = JSON.parse(
            sessionStorage.getItem("authUser") || "null"
        );
    } catch (error) {
        authUser = null;
    }

    const bookingUrl =
        `booking.html?event_id=${encodeURIComponent(event.event_id)}`;

    if (!authToken || !authUser) {

        // Customer belum login
        window.location.href =
            `login.html?return=${encodeURIComponent(bookingUrl)}`;

    } else if (authUser.role !== "CUSTOMER") {

        // Organiser dan Admin tidak boleh book
        alert("Only customer accounts can book tickets.");

    } else {

        // Customer sudah login
        window.location.href = bookingUrl;

    }
};

} else {
    bookNowBtn.disabled = true;
    bookNowBtn.textContent = "Booking Unavailable";
    bookNowBtn.onclick = null;
}

eventModal.showModal();


    } catch (error) {
        console.error("Event details error:", error);
        alert("Unable to load event details. Please try again.");
    }
}

// Close modal
closeModalBtn.addEventListener("click", () => {
    eventModal.close();
});

// Close when clicking outside the modal
eventModal.addEventListener("click", (event) => {
    if (event.target === eventModal) {
        eventModal.close();
    }
});


// Open event details when a card button is clicked.
eventContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".view-details-btn");

    if (!button || !eventContainer.contains(button)) {
        return;
    }

    const eventId = Number(button.dataset.eventId);

    if (Number.isSafeInteger(eventId) && eventId > 0) {
        viewEventDetails(eventId);
    }
});


/* =========================================
   MEMBER 5 - DYNAMIC NAVBAR & LOGOUT
   ========================================= */

function updateCustomerNavbar() {

    const token = sessionStorage.getItem("authToken");

    let user = null;

    try {
        user = JSON.parse(
            sessionStorage.getItem("authUser") || "null"
        );
    } catch (error) {
        user = null;
    }

    const myBookingsLink =
        document.getElementById("myBookingsLink");

    const welcomeUser =
        document.getElementById("welcomeUser");

    const loginNavLink =
        document.getElementById("loginNavLink");

    const registerNavLink =
        document.getElementById("registerNavLink");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const isLoggedIn = Boolean(token && user);

    // Hide Login / Register after login.
    loginNavLink.hidden = isLoggedIn;
    registerNavLink.hidden = isLoggedIn;

    // Show Logout for logged-in users.
    logoutBtn.hidden = !isLoggedIn;

    // My Bookings is for customers only.
    const isCustomer =
        isLoggedIn && user.role === "CUSTOMER";

    myBookingsLink.hidden = !isCustomer;
    welcomeUser.hidden = !isLoggedIn;

    if (isLoggedIn) {
        welcomeUser.textContent =
            `Hi, ${user.name || "User"}! ✿`;
    }
}

// LOGOUT

document.getElementById("logoutBtn")
    .addEventListener("click", () => {

        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("authUser");

        window.location.href = "login.html";
    });

// Update navbar when homepage loads.
updateCustomerNavbar();

