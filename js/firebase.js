// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/firebase.js — Firebase setup (the ONLY file that talks to the Firebase CDN)
//
// Teachers and students get SEPARATE Firebase instances. Firebase remembers one
// signed-in user per instance, so a teacher can test the student page in another
// tab of the same browser without being logged out (and without joining as the
// teacher).
// --------------------------------------------------

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  goOffline,
  goOnline,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// Public web configuration. This is not a secret: access is controlled by
// Firebase Authentication and the Realtime Database Rules (database.rules.json).
export const firebaseConfig = {
  apiKey: "AIzaSyDj-qjpoNBhgzGKUDyrccymAD1nvfQwbUA",
  authDomain: "grammar-drive.firebaseapp.com",
  databaseURL: "https://grammar-drive-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "grammar-drive",
  storageBucket: "grammar-drive.firebasestorage.app",
  messagingSenderId: "935974649982",
  appId: "1:935974649982:web:e7595bc522b8879a46d82f"
};

function appNamed(name) {
  return getApps().find((a) => a.name === name) || initializeApp(firebaseConfig, name);
}

/** Teacher dashboard instance (remembers the teacher's login in this browser). */
export function teacherFirebase() {
  const app = appNamed("gd-teacher");
  return { app, auth: getAuth(app), db: getDatabase(app) };
}

/** Student instance (remembers the student's anonymous identity in this browser, so a refresh resumes). */
export function studentFirebase() {
  const app = appNamed("gd-student");
  return { app, auth: getAuth(app), db: getDatabase(app) };
}

/** Throw-away instance for test.html: remembers nothing, so tests never disturb real logins. */
export function testFirebase(name) {
  const app = appNamed("gd-test-" + name);
  let auth;
  try {
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
  } catch (error) {
    auth = getAuth(app); // already initialised earlier on this page
  }
  return { app, auth, db: getDatabase(app) };
}

/** Resolves once Firebase has restored any remembered login for this instance. */
export function authReady(auth) {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user);
    });
  });
}

export {
  // Authentication
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  deleteUser,
  // Realtime Database
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  goOffline,
  goOnline,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  serverTimestamp
};
