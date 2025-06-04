document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const header = document.querySelector("header");
  let isTeacher = false;
  let teacherName = null;

  // Add login/logout UI
  const userIcon = document.createElement("span");
  userIcon.textContent = "👤";
  userIcon.style.cssText =
    "position:absolute;top:20px;right:30px;cursor:pointer;font-size:24px;";
  header.appendChild(userIcon);

  const loginBox = document.createElement("div");
  loginBox.style.cssText =
    "display:none;position:fixed;top:80px;right:30px;background:#fff;padding:20px;border:1px solid #ccc;border-radius:6px;z-index:1000;box-shadow:0 2px 8px #0002;";
  loginBox.innerHTML = `
    <div id="login-form-box">
      <h4>Teacher Login</h4>
      <input id="login-username" placeholder="Username" style="margin-bottom:8px;width:100%"><br>
      <input id="login-password" type="password" placeholder="Password" style="margin-bottom:8px;width:100%"><br>
      <button id="login-btn">Login</button>
    </div>
    <div id="logout-form-box" style="display:none;">
      <p>Logged in as <span id="teacher-name"></span></p>
      <button id="logout-btn">Logout</button>
    </div>
  `;
  document.body.appendChild(loginBox);

  userIcon.onclick = () => {
    loginBox.style.display =
      loginBox.style.display === "none" ? "block" : "none";
  };

  async function checkWhoAmI() {
    const res = await fetch("/whoami");
    const data = await res.json();
    isTeacher = data.role === "teacher";
    teacherName = data.username || null;
    updateLoginUI();
  }

  function updateLoginUI() {
    if (isTeacher) {
      loginBox.querySelector("#login-form-box").style.display = "none";
      loginBox.querySelector("#logout-form-box").style.display = "block";
      loginBox.querySelector("#teacher-name").textContent = teacherName;
    } else {
      loginBox.querySelector("#login-form-box").style.display = "block";
      loginBox.querySelector("#logout-form-box").style.display = "none";
    }
  }

  loginBox.querySelector("#login-btn").onclick = async () => {
    const username = loginBox.querySelector("#login-username").value;
    const password = loginBox.querySelector("#login-password").value;
    const res = await fetch(
      `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(
        password
      )}`,
      { method: "POST" }
    );
    if (res.ok) {
      await checkWhoAmI();
      loginBox.style.display = "none";
      fetchActivities();
    } else {
      alert("Login failed");
    }
  };
  loginBox.querySelector("#logout-btn").onclick = async () => {
    await fetch("/logout", { method: "POST" });
    await checkWhoAmI();
    loginBox.style.display = "none";
    fetchActivities();
  };

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${isTeacher ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;
        activitiesList.appendChild(activityCard);
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      if (isTeacher) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isTeacher) return;
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isTeacher) {
      messageDiv.textContent = "Only teachers can register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  checkWhoAmI().then(fetchActivities);
});
