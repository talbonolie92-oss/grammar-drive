
import {
  auth,
  db,
  ref,
  get,
  set,
  push,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const message = document.getElementById("message");
const teacherEmail = document.getElementById("teacherEmail");

const createSessionForm = document.getElementById("createSessionForm");
const createSessionButton = document.getElementById("createSessionButton");
const sessionMessage = document.getElementById("sessionMessage");
const sessionResult = document.getElementById("sessionResult");

let loginInProgress = false;

function showMessage(element, text, success = false) {
  element.textContent = text;
  element.classList.remove("hidden");
  element.style.background = success ? "#14532d" : "#7f1d1d";
}

function hideMessage(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
}

function showDashboard(user) {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  teacherEmail.textContent = "Logged in as: " + user.email;
}

async function verifyTeacher(user) {
  try {
    const snapshot = await get(ref(db, "teachers/" + user.uid));

    if (!snapshot.exists()) {
      throw new Error("This account is not registered as a teacher.");
    }

    const teacher = snapshot.val();

    if (teacher.role !== "teacher" || teacher.active !== true) {
      throw new Error("This teacher account is inactive or unauthorized.");
    }

    showDashboard(user);
    return true;

  } catch (error) {
    console.error("Teacher verification failed:", error);
    await signOut(auth);
    showLogin();

    showMessage(
      message,
      error.message.includes("registered") ||
      error.message.includes("inactive")
        ? error.message
        : "Unable to verify teacher access. Check your Firebase Database Rules."
    );

    return false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loginInProgress) return;

  loginInProgress = true;
  loginButton.disabled = true;
  loginButton.textContent = "Verifying...";
  hideMessage(message);

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await verifyTeacher(result.user);

  } catch (error) {
    console.error("Login error:", error);

    let text = "Login failed. Please try again.";

    if (error.code === "auth/invalid-credential") {
      text = "Incorrect email or password.";
    } else if (error.code === "auth/invalid-email") {
      text = "Please enter a valid email address.";
    } else if (error.code === "auth/too-many-requests") {
      text = "Too many attempts. Please wait before trying again.";
    } else if (error.code === "auth/network-request-failed") {
      text = "Network error. Check your internet connection.";
    }

    showLogin();
    showMessage(message, text);

  } finally {
    loginInProgress = false;
    loginButton.disabled = false;
    loginButton.textContent = "Teacher Login";
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLogin();
    return;
  }

  if (loginInProgress) return;

  await verifyTeacher(user);
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  try {
    await signOut(auth);
    loginForm.reset();
    createSessionForm.reset();
    sessionResult.classList.add("hidden");
    hideMessage(message);
    hideMessage(sessionMessage);
    showLogin();

  } catch (error) {
    console.error("Logout failed:", error);
    showMessage(message, "Unable to log out. Please try again.");

  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = "Log Out";
  }
});

createSessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    showMessage(sessionMessage, "Please log in again before creating a session.");
    return;
  }

  const selectedTopics = Array.from(
    createSessionForm.querySelectorAll('input[name="topics"]:checked')
  ).map((checkbox) => checkbox.value);

  if (selectedTopics.length === 0) {
    showMessage(sessionMessage, "Please select at least one grammar topic.");
    return;
  }

  createSessionButton.disabled = true;
  createSessionButton.textContent = "Creating Session...";
  hideMessage(sessionMessage);
  sessionResult.classList.add("hidden");

  try {
    const sessionRef = push(ref(db, "sessions"));

    const sessionCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const sessionData = {
      teacherUid: user.uid,
      teacherEmail: user.email,
      sessionCode: sessionCode,
      grade: document.getElementById("grade").value,
      topics: selectedTopics,
      durationMinutes: Number(document.getElementById("duration").value),
      status: "waiting",
      createdAt: Date.now()
    };

    await set(sessionRef, sessionData);

    document.getElementById("sessionCode").textContent = sessionCode;

    document.getElementById("sessionDetails").textContent =
      "Grade " + sessionData.grade +
      " | " + sessionData.topics.join(", ") +
      " | " + sessionData.durationMinutes + " minutes";

    sessionResult.classList.remove("hidden");

    showMessage(
      sessionMessage,
      "Your game session has been saved successfully.",
      true
    );

    console.log("Created session:", sessionRef.key);

  } catch (error) {
    console.error("Session creation failed:", error);

    showMessage(
      sessionMessage,
      "Could not create the session. Check your Firebase Database Rules and try again."
    );

  } finally {
    createSessionButton.disabled = false;
    createSessionButton.textContent = "Create Game Session";
  }
});

console.log("Grammar Drive teacher dashboard loaded.");
