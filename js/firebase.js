
// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/firebase.js
// Firebase Initialization
// --------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update,
  push,
  onValue,
  onDisconnect,
  remove
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// 1. Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDj-qjpoNBhgzGKUDyrccymAD1nvfQwbUA",
  authDomain: "grammar-drive.firebaseapp.com",
  databaseURL: "https://grammar-drive-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "grammar-drive",
  storageBucket: "grammar-drive.firebasestorage.app",
  messagingSenderId: "935974649982",
  appId: "1:935974649982:web:e7595bc522b8879a46d82f"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3. Initialize Authentication
const auth = getAuth(app);

// 4. Initialize Realtime Database
const db = getDatabase(app);

// 5. Export Firebase services and functions
export {
  app,
  auth,
  db,
  firebaseConfig,

  // Authentication
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,

  // Realtime Database
  ref,
  get,
  set,
  update,
  push,
  onValue,
  onDisconnect,
  remove
};

console.log("Grammar Drive: Firebase initialized successfully.");

