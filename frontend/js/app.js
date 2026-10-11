const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("message");


        message.innerText = "Logging in...";
        message.className =
            "text-center mt-3 text-secondary";


        try {

            const response = await fetch(
                "http://localhost/event_ticketing_system/api/auth/login.php",
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


            const data =
                await response.json();


            if (!response.ok) {

                message.innerText =
                    data.message || "Login failed";

                message.className =
                    "text-center mt-3 text-danger";

                return;
            }


            // Clear old login information
            localStorage.clear();


            // Save logged-in user information
            localStorage.setItem(
                "token",
                data.token
            );

            localStorage.setItem(
                "role",
                data.user.role
            );

            localStorage.setItem(
                "user_name",
                data.user.name
            );

            localStorage.setItem(
                "user_id",
                data.user.user_id
            );


            message.innerText =
                "Login successful";

            message.className =
                "text-center mt-3 text-success";


            // Redirect based on role
            if (data.user.role === "ADMIN") {

                window.location.href =
                    "admin/dashboard.html";

            }

            else if (
                data.user.role === "ORGANISER"
            ) {

                window.location.href =
                    "organiser/dashboard.html";

            }

            else if (
                data.user.role === "CUSTOMER"
            ) {

                window.location.href =
                    "customer/dashboard.html";

            }

            else {

                message.innerText =
                    "Unknown user role";

                message.className =
                    "text-center mt-3 text-danger";
            }

        }

        catch (error) {

            console.error(error);

            message.innerText =
                "Unable to connect to server";

            message.className =
                "text-center mt-3 text-danger";
        }

    });

}