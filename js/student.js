
import {
  auth,
  db,
  ref,
  get,
  set,
  signInAnonymously
} from "./firebase.js";

const joinForm = document.getElementById("joinForm");
const joinButton = document.getElementById("joinButton");
const message = document.getElementById("message");
const lobby = document.getElementById("lobby");
const welcomeMessage = document.getElementById("welcomeMessage");
const sessionCodeInput = document.getElementById("sessionCode");

const params = new URLSearchParams(window.location.search);
const linkCode = params.get("code");

if (linkCode) {
  sessionCodeInput.value = linkCode.toUpperCase();
}

function showMessage(text, success = false) {
  message.textContent = text;
  message.className = "message " + (success ? "success" : "error");
}

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = sessionCodeInput.value.trim().toUpperCase();
  const name = document.getElementById("studentName").value.trim();
  const classSection = document.getElementById("classSection").value.trim();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    showMessage("Please enter a valid 6-character session code.");
    return;
  }

  if (!name || name.length > 40 || !classSection || classSection.length > 30) {
    showMessage("Please enter a valid name and class/section.");
    return;
  }

  joinButton.disabled = true;
  joinButton.textContent = "Joining...";
  message.className = "message hidden";
  lobby.classList.add("hidden");

  try {
    // Silently create a Firebase anonymous identity for this browser.
    let user = auth.currentUser;

    if (!user) {
      const result = await signInAnonymously(auth);
      user = result.user;
    }

    // Look up the public session code.
    const codeSnapshot = await get(ref(db, "joinCodes/" + code));

    if (!codeSnapshot.exists()) {
      throw new Error("Session code not found. Please check the code with your teacher.");
    }

    const codeData = codeSnapshot.val();

    if (codeData.status !== "waiting") {
      throw new Error("This session is no longer accepting students.");
    }

    if (typeof codeData.sessionId !== "string" || !codeData.sessionId) {
      throw new Error("This session link is invalid. Please ask your teacher for a new code.");
    }

    // Save this student's own player record.
    const playerData = {
      uid: user.uid,
      name: name,
      classSection: classSection,
      joinedAt: Date.now()
    };

    await set(
      ref(db, "sessions/" + codeData.sessionId + "/players/" + user.uid),
      playerData
    );

    welcomeMessage.textContent =
      "Welcome, " + name + " (" + classSection + ").";

    lobby.classList.remove("hidden");
    joinForm.classList.add("hidden");

    showMessage("You joined the classroom session successfully!", true);

  } catch (error) {
    console.error("Student join error:", error);

    showMessage(
      error.message || "Unable to join. Please try again."
    );

  } finally {
    joinButton.disabled = false;
    joinButton.textContent = "Join Game";
  }
});

console.log("Grammar Drive student join system loaded.");
