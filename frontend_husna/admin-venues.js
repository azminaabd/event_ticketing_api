// =====================================
// ADMIN MANAGE VENUES
// =====================================

const API_URL = "../../venues.php";

const token = sessionStorage.getItem("authToken");

const currentUser = JSON.parse(
    sessionStorage.getItem("authUser") || "null"
);

// =====================================
// ADMIN ACCESS CHECK
// =====================================

if (!token || !currentUser || currentUser.role !== "ADMIN") {
    alert("Admin access required.");
    window.location.href = "login.html";
}

// =====================================
// ELEMENTS
// =====================================

const venuesList = document.getElementById("adminVenuesList");
const venuesMessage = document.getElementById("venuesMessage");
const venueCount = document.getElementById("venueCount");

let allVenues = [];

// =====================================
// LOAD ALL VENUES
// =====================================

async function loadAdminVenues() {
    venuesMessage.textContent = "Loading venues...";

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to load venues.");
        }

        allVenues = result.data || [];

        venueCount.textContent =
            `${allVenues.length} Venues`;

        venuesMessage.textContent = "";

        displayAdminVenues();

    } catch (error) {
        venuesMessage.textContent = error.message;
    }
}

// =====================================
// DISPLAY VENUE CARDS
// =====================================

function displayAdminVenues() {
    venuesList.innerHTML = "";

    if (allVenues.length === 0) {
        venuesMessage.textContent = "No venues available.";
        return;
    }

    allVenues.forEach((venue) => {
        const card = document.createElement("div");
        card.className = "organizer-card organizer-event-card";

        const heading = document.createElement("h3");
        heading.textContent = venue.venue_name;

        const venueId = document.createElement("p");
        venueId.textContent = `Venue #${venue.venue_id}`;

        const location = document.createElement("p");
        location.textContent = `📍 Location: ${venue.location}`;

        const capacity = document.createElement("p");
        capacity.textContent = `👥 Capacity: ${venue.capacity} people`;

        const status = document.createElement("p");
        status.textContent = `Status: ${venue.status}`;

        const actions = document.createElement("div");
        actions.className = "organizer-event-actions";
        actions.style.display = "flex";
actions.style.gap = "10px";
actions.style.flexWrap = "wrap";
actions.style.marginTop = "auto";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "organizer-event-edit-btn";
        editButton.textContent = "Edit Venue ✿";
        editButton.addEventListener("click", () => openEditVenue(venue));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "organizer-event-edit-btn";
        deleteButton.style.background = "#b77b70";
        deleteButton.textContent = "Delete Venue";
        deleteButton.addEventListener("click", () => deleteVenue(venue));

        actions.append(editButton, deleteButton);

        card.append(
            venueId,
            heading,
            location,
            capacity,
            status,
            actions
        );

        venuesList.appendChild(card);
    });
}

// =====================================
// INITIAL LOAD
// =====================================

if (token && currentUser?.role === "ADMIN") {
    loadAdminVenues();
}

// =====================================
// CREATE VENUE MODAL
// =====================================

const createVenueButton = document.getElementById("createVenueButton");
const createVenueModal = document.getElementById("createVenueModal");
const closeCreateVenueButton = document.getElementById("closeCreateVenue");
const cancelCreateVenueButton = document.getElementById("cancelCreateVenue");
const createVenueForm = document.getElementById("createVenueForm");
const createVenueMessage = document.getElementById("createVenueMessage");

// OPEN CREATE VENUE MODAL
createVenueButton.addEventListener("click", () => {
    createVenueForm.reset();
    createVenueMessage.textContent = "";
    createVenueModal.hidden = false;
});

// CLOSE CREATE VENUE MODAL
function closeCreateVenue() {
    createVenueModal.hidden = true;
}

// CLOSE BUTTON (X)
closeCreateVenueButton.addEventListener("click", closeCreateVenue);

// CANCEL BUTTON
cancelCreateVenueButton.addEventListener("click", closeCreateVenue);

// CLOSE WHEN CLICKING OUTSIDE MODAL
createVenueModal.addEventListener("click", (event) => {
    if (event.target === createVenueModal) {
        closeCreateVenue();
    }
});

// =====================================
// CREATE VENUE - POST API
// =====================================

createVenueForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const newVenue = {
        venue_name: document.getElementById("createVenueName").value.trim(),
        location: document.getElementById("createVenueLocation").value.trim(),
        capacity: Number(document.getElementById("createVenueCapacity").value),
        status: document.getElementById("createVenueStatus").value
    };

    const saveButton = document.getElementById("saveCreateVenue");

    saveButton.disabled = true;
    createVenueMessage.textContent = "Creating venue...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(newVenue)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to create venue.");
        }

        closeCreateVenue();

        await loadAdminVenues();

        alert("Venue created successfully!");

    } catch (error) {
        createVenueMessage.textContent = error.message;

    } finally {
        saveButton.disabled = false;
    }
});

// =====================================
// EDIT VENUE - PUT API
// =====================================

const editVenueModal = document.getElementById("editVenueModal");
const editVenueForm = document.getElementById("editVenueForm");
const editVenueMessage = document.getElementById("editVenueMessage");

// OPEN EDIT VENUE MODAL
function openEditVenue(venue) {
    document.getElementById("editVenueId").value = venue.venue_id;
    document.getElementById("editVenueName").value = venue.venue_name;
    document.getElementById("editVenueLocation").value = venue.location;
    document.getElementById("editVenueCapacity").value = venue.capacity;
    document.getElementById("editVenueStatus").value = venue.status;

    editVenueMessage.textContent = "";
    editVenueModal.hidden = false;
}

// CLOSE EDIT VENUE MODAL
function closeEditVenue() {
    editVenueModal.hidden = true;
}

// CLOSE BUTTON
document.getElementById("closeEditVenue")
    .addEventListener("click", closeEditVenue);

// CANCEL BUTTON
document.getElementById("cancelEditVenue")
    .addEventListener("click", closeEditVenue);

// CLOSE WHEN CLICKING OUTSIDE
editVenueModal.addEventListener("click", (event) => {
    if (event.target === editVenueModal) {
        closeEditVenue();
    }
});

// SUBMIT EDIT VENUE
editVenueForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const venueId = document.getElementById("editVenueId").value;

    const updatedVenue = {
        venue_name: document.getElementById("editVenueName").value.trim(),
        location: document.getElementById("editVenueLocation").value.trim(),
        capacity: Number(document.getElementById("editVenueCapacity").value),
        status: document.getElementById("editVenueStatus").value
    };

    const saveButton = document.getElementById("saveEditVenue");

    saveButton.disabled = true;
    editVenueMessage.textContent = "Saving changes...";

    try {
        const response = await fetch(
            `${API_URL}?id=${encodeURIComponent(venueId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updatedVenue)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to update venue.");
        }

        closeEditVenue();
        await loadAdminVenues();

        alert("Venue updated successfully!");

    } catch (error) {
        editVenueMessage.textContent = error.message;

    } finally {
        saveButton.disabled = false;
    }
});

// =====================================
// DELETE VENUE - DELETE API
// =====================================

async function deleteVenue(venue) {

    const confirmed = confirm(
        `Are you sure you want to delete "${venue.venue_name}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}?id=${encodeURIComponent(venue.venue_id)}`,
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
                result.error || "Unable to delete venue."
            );
        }

        alert("Venue deleted successfully!");

        await loadAdminVenues();

    } catch (error) {
        alert(error.message);
    }
}