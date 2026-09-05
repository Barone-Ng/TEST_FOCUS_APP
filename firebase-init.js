/* ============================================================
   FIREBASE INIT
   ------------------------------------------------------------
   This is the ONLY file with your Firebase config in it.
   It exposes a few simple async functions on `window` so the
   rest of the app (plain scripts, not modules) can call Firebase
   without needing to become a module itself.

   Auth is used for accounts (secure password handling).
   Firestore is used to store each player's game data.

   Since Firebase Auth wants an email, we quietly turn the
   player's chosen username into a fake internal email address
   like "alex@focustree.local" — they never see this, they just
   type a username.
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAQJIfhuGU7KmLMty33xf3PjgGTwT7d2M",
  authDomain: "plantation-72e0c.firebaseapp.com",
  projectId: "plantation-72e0c",
  storageBucket: "plantation-72e0c.firebasestorage.app",
  messagingSenderId: "111932846466",
  appId: "1:111932846466:web:aecbbea599aef95506df9b",
  measurementId: "G-CJWY78JVCP",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

function usernameToEmail(username) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return clean + '@focustree.local';
}

// ---- Auth ----
window.fireSignUp = async function (username, password) {
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
};

window.fireSignIn = async function (username, password) {
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
};

window.fireSignOut = function () {
  return signOut(auth);
};

// ---- Firestore (one document per player, keyed by their auth uid) ----
window.fireLoadUserDoc = async function (uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

window.fireSaveUserDoc = async function (uid, data) {
  await setDoc(doc(db, 'users', uid), data);
};

window.firebaseReady = true;
