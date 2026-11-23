
/* --------------------------------------------------
   Grammar Drive: Open Road Challenge
   js/teacher.js

   Teacher Login and Authorization
-------------------------------------------------- */

import {
  auth,
  db,
  ref,
  get,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

// HTML elements
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

const message = document.getElementById("message");
const teacherEmail = document.getElementById("teacherEmail");

// Prevent duplicate verification when login and auth listener
// detect the same authenticated user.
const verificationTasks = new Map();

let loginInProgress = false;

// --------------------------------------------------
// DISPLAY HELPERS
// --------------------------------------------------

function showMessage(text, type = "error") {
  message.textContent = text;
  message.classList.remove("hidden");

  message.style.background =
    type === "success" ? "#14532d" : "#7f1d1d";

  message.style.color = "#ffffff";
}

function hideMessage() {
  message.textContent = "";
  message.classList.add("hidden");
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

// --------------------------------------------------
// VERIFY TEACHER AUTHORIZATION
// --------------------------------------------------

function verifyTeacher(user) {
  if (verificationTasks.has(user.uid)) {
    return verificationTasks.get(user.uid);
  }

  const task = (async () => {
    try {
      const teacherRef = ref(db, "teachers/" + user.uid);
      const snapshot = await get(teacherRef);

      if (!snapshot.exists()) {
        throw new Error("This account is not registered as a teacher.");
      }

      const teacherData = snapshot.val();

      if (
        teacherData.role !== "teacher" ||
        teacherData.active !== true
      ) {
        throw new Error("This teacher account is not authorized or is inactive.");
      }

      showDashboard(user);

      return true;

    } catch (error) {
      console.error("Teacher verification failed:", error);

      await signOut(auth);

      showLogin();

      if (error.message.includes("permission_denied")) {
        showMessage(
          "Database permission denied. Please check Firebase security rules."
        );
      } else if (error.message.includes("not registered") ||
                 error.message.includes("not authorized")) {
        showMessage(error.message);
      } else {
        showMessage(
          "Unable to verify teacher access. Please try again."
        );
      }

      return false;
    }
  })();

  verificationTasks.set(user.uid, task);

  task.finally(() => {
    verificationTasks.delete(user.uid);
  });

  return task;
}

// --------------------------------------------------
// TEACHER LOGIN
// --------------------------------------------------

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loginInProgress) return;

  loginInProgress = true;
  loginButton.disabled = true;
  loginButton.textContent = "Verifying...";
  hideMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const authorized = await verifyTeacher(result.user);

    if (authorized) {
      console.log("Teacher login successful.");
    }

  } catch (error) {
    console.error("Login error:", error);

    let errorMessage = "Login failed. Please try again.";

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      errorMessage = "Incorrect email or password.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Please enter a valid email address.";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many attempts. Please wait before trying again.";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage = "Network error. Please check your internet connection.";
    }

    showLogin();
    showMessage(errorMessage);

  } finally {
    loginInProgress = false;
    loginButton.disabled = false;
    loginButton.textContent = "Teacher Login";
  }
});

// --------------------------------------------------
// RESTORE EXISTING LOGIN SESSION
// --------------------------------------------------

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showLogin();
    return;
  }

  if (loginInProgress) return;

  await verifyTeacher(user);
});

// --------------------------------------------------
// TEACHER LOGOUT
// --------------------------------------------------

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Logging out...";

  try {
    await signOut(auth);

    showLogin();
    loginForm.reset();
    hideMessage();

  } catch (error) {
    console.error("Logout error:", error);
    showMessage("Unable to log out. Please try again.");

  } finally {
    logoutButton.disabled = false;
    logoutButton.textContent = "Log Out";
  }
});

console.log("Grammar Drive: Teacher authentication loaded.");
