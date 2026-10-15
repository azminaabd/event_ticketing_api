// =====================================
// ADMIN MANAGE USERS - GET ALL USERS
// =====================================

const API_URL = "../../users.php";

const token = sessionStorage.getItem("authToken");
const currentUser = JSON.parse(
    sessionStorage.getItem("authUser") || "null"
);

// Admin access only
if (!token || !currentUser || currentUser.role !== "ADMIN") {
    alert("Admin access required.");
    window.location.href = "login.html";
}

const usersList = document.getElementById("adminUsersList");
const usersMessage = document.getElementById("usersMessage");
const userCount = document.getElementById("userCount");

let allUsers = [];

// GET all users
async function loadAdminUsers() {

    usersMessage.textContent = "Loading users...";

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
                result.error || "Unable to load users."
            );
        }

        allUsers = result.data || [];

        userCount.textContent = `${allUsers.length} Users`;
        usersMessage.textContent = "";

        displayAdminUsers();

    } catch (error) {
        usersMessage.textContent = error.message;
    }
}

// Display users in table
function displayAdminUsers() {

    usersList.innerHTML = "";

    if (allUsers.length === 0) {
        usersMessage.textContent = "No users available.";
        return;
    }

    // Get search, filter and sort values
const searchValue = document.getElementById("userSearch").value
    .toLowerCase()
    .trim();

const roleValue = document.getElementById("userRoleFilter").value;
const sortValue = document.getElementById("userSort").value;

// Filter users by name, ID and role
let filteredUsers = allUsers.filter(user => {

    const matchesSearch =
        user.name.toLowerCase().includes(searchValue) ||
        String(user.user_id).includes(searchValue);

    const matchesRole =
        roleValue === "ALL" || user.role === roleValue;

    return matchesSearch && matchesRole;
});

// Sort the filtered users
filteredUsers.sort((a, b) => {

    if (sortValue === "newest") {
        return new Date(b.created_at.replace(" ", "T")) -
               new Date(a.created_at.replace(" ", "T"));
    }

    if (sortValue === "oldest") {
        return new Date(a.created_at.replace(" ", "T")) -
               new Date(b.created_at.replace(" ", "T"));
    }

    if (sortValue === "name_asc") {
        return a.name.localeCompare(b.name);
    }

    if (sortValue === "name_desc") {
        return b.name.localeCompare(a.name);
    }

    return 0;
});

// Display filtered and sorted users
filteredUsers.forEach(user => {

        const row = document.createElement("tr");

        // User ID
        const idCell = document.createElement("td");
        idCell.textContent = `#${user.user_id}`;

        // Name
        const nameCell = document.createElement("td");
        nameCell.textContent = user.name;

        // Role
        const roleCell = document.createElement("td");

        const badge = document.createElement("span");
        badge.textContent = user.role;

        badge.style.padding = "7px 12px";
        badge.style.borderRadius = "20px";
        badge.style.fontSize = "12px";
        badge.style.fontWeight = "700";
        badge.style.display = "inline-block";

        if (user.role === "ADMIN") {
            badge.style.background = "#eadff5";
            badge.style.color = "#704c91";

        } else if (user.role === "ORGANISER") {
            badge.style.background = "#dce9f7";
            badge.style.color = "#38658e";

        } else if (user.role === "CUSTOMER") {
            badge.style.background = "#dcebdd";
            badge.style.color = "#326b42";
        }

        roleCell.appendChild(badge);

        // Registered Date
        const dateCell = document.createElement("td");
        dateCell.textContent = user.created_at;

        // =====================================
// ADMIN USER ACTIONS
// =====================================

const actionsCell = document.createElement("td");

// =====================================
// EDIT USER BUTTON
// =====================================

const editButton = document.createElement("button");

editButton.type = "button";
editButton.className = "organizer-event-edit-btn";
editButton.textContent = "Edit";

editButton.style.marginTop = "0";
editButton.style.marginRight = "8px";

editButton.addEventListener("click", () => {
    editUserName(user);
});

actionsCell.appendChild(editButton);

if (user.role === "CUSTOMER") {

    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.className = "organizer-event-edit-btn";
    deleteButton.textContent = "Delete User";

    deleteButton.style.background = "#b77b70";
    deleteButton.style.marginTop = "0";

    deleteButton.addEventListener("click", () => {
        deleteUser(user);
    });

       actionsCell.appendChild(deleteButton);

}

        row.append(
            idCell,
            nameCell,
            roleCell,
            dateCell,
            actionsCell
        );

        usersList.appendChild(row);
    });
}

// Load users when page opens
if (token && currentUser?.role === "ADMIN") {
    loadAdminUsers();
}

// =====================================
// ADMIN - DELETE USER (DELETE API)
// =====================================

async function deleteUser(user) {

    if (user.role !== "CUSTOMER") {
        alert("Only customer accounts can be deleted.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to permanently delete "${user.name}" (User #${user.user_id})?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}?id=${encodeURIComponent(user.user_id)}`,
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
                result.error || "Unable to delete user."
            );
        }

        alert("User deleted successfully!");

        await loadAdminUsers();

    } catch (error) {
        alert(error.message);
    }
}

// =====================================
// SEARCH, FILTER & SORT EVENT LISTENERS
// =====================================

document.getElementById("userSearch").addEventListener("input", displayAdminUsers);

document.getElementById("userRoleFilter").addEventListener("change", displayAdminUsers);

document.getElementById("userSort").addEventListener("change", displayAdminUsers);

const editUserModal = document.getElementById("editUserModal");
const editUserForm = document.getElementById("editUserForm");
const saveEditUser = document.getElementById("saveEditUser");

// Open Edit User form
function editUserName(user) {

    if (!user.email) {
        alert("User email is missing from the API response.");
        return;
    }

    document.getElementById("editUserId").value = user.user_id;
    document.getElementById("editUserName").value = user.name;
    document.getElementById("editUserEmail").value = user.email;
    document.getElementById("editUserRole").value = user.role;

    editUserModal.style.display = "flex";

    document.getElementById("editUserName").focus();
}

// Close Edit User form
function closeEditUserForm() {
    editUserModal.style.display = "none";
    editUserForm.reset();
}

// Close buttons
document.getElementById("closeEditUserModal")
    .addEventListener("click", closeEditUserForm);

document.getElementById("cancelEditUser")
    .addEventListener("click", closeEditUserForm);

// Close when clicking outside the form
editUserModal.addEventListener("click", (event) => {
    if (event.target === editUserModal) {
        closeEditUserForm();
    }
});

// Close with Escape key
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" &&
        editUserModal.style.display === "flex") {
        closeEditUserForm();
    }
});

// =====================================
// SAVE USER CHANGES - PUT API
// =====================================

editUserForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const userId = document.getElementById("editUserId").value;
    const name = document.getElementById("editUserName").value.trim();
    const email = document.getElementById("editUserEmail").value.trim();

    if (!name || name.length > 100) {
        alert("Name must be between 1 and 100 characters.");
        return;
    }

    if (!email || email.length > 150) {
        alert("Please enter a valid email address.");
        return;
    }

    saveEditUser.disabled = true;
    saveEditUser.textContent = "Saving...";

    try {

        const response = await fetch(
            `${API_URL}?id=${encodeURIComponent(userId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name,
                    email: email
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to update user."
            );
        }

        closeEditUserForm();

        alert("User updated successfully!");

        await loadAdminUsers();

    } catch (error) {
        alert(error.message);

    } finally {
        saveEditUser.disabled = false;
        saveEditUser.textContent = "Save Changes";
    }
});

// =====================================
// ADMIN - CREATE ORGANISER MODAL
// =====================================

const addOrganiserBtn = document.getElementById("addOrganiserBtn");
const createOrganiserModal = document.getElementById("createOrganiserModal");
const createOrganiserForm = document.getElementById("createOrganiserForm");
const saveCreateOrganiser = document.getElementById("saveCreateOrganiser");

// Open Create Organiser form
addOrganiserBtn.addEventListener("click", () => {

    createOrganiserForm.reset();

    createOrganiserModal.style.display = "flex";

    document.getElementById("organiserName").focus();
});

// Close Create Organiser form
function closeCreateOrganiserForm() {

    createOrganiserModal.style.display = "none";

    createOrganiserForm.reset();
}

// Close button (X)
document.getElementById("closeCreateOrganiserModal")
    .addEventListener("click", closeCreateOrganiserForm);

// Cancel button
document.getElementById("cancelCreateOrganiser")
    .addEventListener("click", closeCreateOrganiserForm);

// Close when clicking outside the form
createOrganiserModal.addEventListener("click", (event) => {

    if (event.target === createOrganiserModal) {
        closeCreateOrganiserForm();
    }
});

// Close with Escape key
document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape" &&
        createOrganiserModal.style.display === "flex"
    ) {
        closeCreateOrganiserForm();
    }
});


// =====================================
// CREATE ORGANISER - POST API
// =====================================

createOrganiserForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const name = document.getElementById("organiserName").value.trim();
    const email = document.getElementById("organiserEmail").value.trim();
    const password = document.getElementById("organiserPassword").value;

    // Validate name
    if (!name || name.length > 100) {
        alert("Name must be between 1 and 100 characters.");
        return;
    }

    // Validate email
    if (!email || email.length > 150) {
        alert("Please enter a valid email address.");
        return;
    }

    // Match backend password validation (8-72 bytes)
    const passwordBytes = new TextEncoder().encode(password).length;

    if (passwordBytes < 8 || passwordBytes > 72) {
        alert("Password must be between 8 and 72 bytes.");
        return;
    }

    saveCreateOrganiser.disabled = true;
    saveCreateOrganiser.textContent = "Creating...";

    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },

            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                role: "ORGANISER"
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to create organiser."
            );
        }

        closeCreateOrganiserForm();

        alert("Organiser account created successfully!");

        await loadAdminUsers();

    } catch (error) {

        alert(error.message);

    } finally {

        saveCreateOrganiser.disabled = false;
        saveCreateOrganiser.textContent = "Create Organiser";
    }
});