
/* ==========================================
   MEMBER 5 - ORGANIZER MY EVENTS
   View and Edit Own Events
   ========================================== */

const API_URL = "../../events.php";

const token = sessionStorage.getItem("authToken");
const storedUser = sessionStorage.getItem("authUser");

let currentUser = null;
let myEvents = [];

try {
    currentUser = JSON.parse(storedUser);
} catch (error) {
    currentUser = null;
}

// Only logged-in organisers can use this page.
if (
    !token ||
    !currentUser ||
    currentUser.role !== "ORGANISER"
) {
    window.location.replace("login.html");
}

const eventsList = document.getElementById("organizerEventsList");
const eventsMessage = document.getElementById("eventsMessage");
const eventCount = document.getElementById("eventCount");

const editModal = document.getElementById("editEventModal");
const editForm = document.getElementById("editEventForm");
const editMessage = document.getElementById("editEventMessage");

function showMessage(message) {
    eventsMessage.textContent = message;
}

function formatPrice(price) {
    return "RM " + Number(price).toFixed(2);
}

function formatDate(date) {
    if (!date) return "-";

    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Create HTML elements safely.
function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

// ==========================================
// LOAD EVENTS
// ==========================================

async function loadMyEvents() {
    showMessage("Loading your events...");
    eventsList.replaceChildren();

    try {
        const response = await fetch(
            `${API_URL}?page=1&limit=100`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to load events"
            );
        }

        const allEvents = Array.isArray(result.data)
            ? result.data
            : [];

        // Show events belonging to the logged-in organiser.
        myEvents = allEvents.filter(
            event =>
                Number(event.organiser_id) ===
                Number(currentUser.user_id)
        );

        displayMyEvents();

    } catch (error) {
        showMessage(error.message);
    }
}

// ==========================================
// DISPLAY EVENTS
// ==========================================

function displayMyEvents() {
    eventsList.replaceChildren();

    eventCount.textContent =
        `${myEvents.length} Event${myEvents.length === 1 ? "" : "s"}`;

    if (myEvents.length === 0) {
        showMessage("You do not have any events yet.");
        return;
    }

    showMessage("");

    myEvents.forEach(event => {
        const card = createElement(
            "article",
            "organizer-card organizer-event-card"
        );

        const eyebrow = createElement(
            "span",
            "",
            `✿ EVENT #${event.event_id}`
        );

        const title = createElement(
            "h2",
            "",
            event.event_name
        );

        const description = createElement(
            "p",
            "",
            event.description || "No description provided."
        );

        const details = createElement(
            "div",
            "organizer-event-details"
        );

        const information = [
            ["Date", formatDate(event.event_date)],
            ["Time", `${event.start_time} - ${event.end_time}`],
            ["Venue ID", event.venue_id],
            ["Ticket Price", formatPrice(event.ticket_price)],
            ["Tickets", event.ticket_quantity],
            ["Status", event.status]
        ];

        information.forEach(([label, value]) => {
            const line = createElement(
                "p",
                "",
                `${label}: ${value}`
            );

            details.appendChild(line);
        });

        const editButton = createElement(
            "button",
            "organizer-event-edit-btn",
            "✎ Edit Event"
        );

        editButton.type = "button";

        editButton.addEventListener("click", () => {
            openEditEvent(event);
        });

        // Delete button
const deleteButton = createElement(
    "button",
    "organizer-event-edit-btn",
    "🗑 Delete Event"
);

deleteButton.type = "button";

deleteButton.addEventListener("click", () => {
    deleteMyEvent(event);
});

// Display both action buttons
const actions = createElement(
    "div",
    "organizer-event-actions"
);

actions.style.display = "flex";
actions.style.flexWrap = "wrap";
actions.style.gap = "10px";
actions.style.marginTop = "auto";

actions.append(editButton, deleteButton);

card.append(
    eyebrow,
    title,
    description,
    details,
    actions
);

        eventsList.appendChild(card);
    });
}

// ==========================================
// OPEN EDIT FORM
// ==========================================

function openEditEvent(event) {
    document.getElementById("editEventId").value =
        event.event_id;

    document.getElementById("editEventName").value =
        event.event_name;

    document.getElementById("editEventDescription").value =
        event.description || "";

    document.getElementById("editEventVenue").value =
        event.venue_id;

    document.getElementById("editEventDate").value =
        event.event_date;

    document.getElementById("editEventStart").value =
        event.start_time.substring(0, 5);

    document.getElementById("editEventEnd").value =
        event.end_time.substring(0, 5);

    document.getElementById("editEventPrice").value =
        event.ticket_price;

    document.getElementById("editEventQuantity").value =
        event.ticket_quantity;

    document.getElementById("editEventStatus").value =
        event.status;

    editMessage.textContent = "";

    editModal.hidden = false;
}

function closeEditEvent() {
    editModal.hidden = true;
    editForm.reset();
    editMessage.textContent = "";
}

// ==========================================
// SAVE EDITED EVENT
// ==========================================

editForm.addEventListener("submit", async event => {
    event.preventDefault();

    const eventId = Number(
        document.getElementById("editEventId").value
    );

    const originalEvent = myEvents.find(
        item => Number(item.event_id) === eventId
    );

    if (!originalEvent) {
        editMessage.textContent = "Event not found.";
        return;
    }

    const startTime =
        document.getElementById("editEventStart").value;

    const endTime =
        document.getElementById("editEventEnd").value;

    if (endTime <= startTime) {
        editMessage.textContent =
            "End time must be later than start time.";
        return;
    }

    const updatedEvent = {
        organiser_id: Number(originalEvent.organiser_id),
        venue_id: Number(
            document.getElementById("editEventVenue").value
        ),
        event_name:
            document.getElementById("editEventName").value.trim(),
        description:
            document.getElementById("editEventDescription").value.trim(),
        event_date:
            document.getElementById("editEventDate").value,
        start_time: startTime + ":00",
end_time: endTime + ":00",
        ticket_price: Number(
            document.getElementById("editEventPrice").value
        ),
        ticket_quantity: Number(
            document.getElementById("editEventQuantity").value
        ),
        status:
            document.getElementById("editEventStatus").value
    };

    const saveButton =
        document.getElementById("saveEditEvent");

    saveButton.disabled = true;
    editMessage.textContent = "Saving changes...";

    try {
        const response = await fetch(
            `${API_URL}?id=${eventId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updatedEvent)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to update event"
            );
        }

        closeEditEvent();
        await loadMyEvents();

    } catch (error) {
        editMessage.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
});

// ==========================================
// CLOSE EDIT FORM
// ==========================================

document.getElementById("closeEditEvent")
    .addEventListener("click", closeEditEvent);

document.getElementById("cancelEditEvent")
    .addEventListener("click", closeEditEvent);

// ==========================================
// START
// ==========================================

if (
    token &&
    currentUser &&
    currentUser.role === "ORGANISER"
) {
    loadMyEvents();
}

async function deleteMyEvent(event) {
    const eventId = Number(event.event_id);

    const confirmed = confirm(
        `Are you sure you want to delete "${event.event_name}"?\n\n` +
        "This action cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}?id=${eventId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            alert(
                result.error ||
                "Unable to delete this event."
            );
            return;
        }

        alert("Event deleted successfully!");

        await loadMyEvents();

    } catch (error) {
        console.error("Delete event error:", error);

        alert(
            "Something went wrong. Please try again."
        );
    }
}