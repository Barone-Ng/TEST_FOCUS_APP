/* ============================================================
   STORAGE HELPERS
   ------------------------------------------------------------
   Talks to Firebase: firebase-init.js exposes fireSignUp,
   fireSignIn, fireSignOut, fireLoadUserDoc, fireSaveUserDoc on
   window — this file just wraps them with the game's data shape
   and sensible fallbacks if something goes wrong.
   ============================================================ */

function freshUserData(username) {
  return {
    username,
    fertilizer: 0,
    totalPlanted: 0,
    totalFocusSeconds: 0,
    sunCaught: 0,
    plantCounts: {},
    achievements: [],
    currentSession: null,
  };
}

// Creates a new account (Firebase Auth) + an empty game-data doc (Firestore)
async function signUpUser(username, password) {
  const uid = await window.fireSignUp(username, password);
  const data = freshUserData(username);
  await window.fireSaveUserDoc(uid, data);
  return { uid, data };
}

// Logs in via Firebase Auth, then loads the matching game-data doc
async function signInUser(username, password) {
  const uid = await window.fireSignIn(username, password);
  let data = await window.fireLoadUserDoc(uid);
  if (!data) data = freshUserData(username); // safety net, shouldn't normally happen
  return { uid, data };
}

async function signOutUser() {
  try { await window.fireSignOut(); } catch (e) { /* ignore */ }
}

async function saveUserData(uid, data) {
  try {
    await window.fireSaveUserDoc(uid, data);
  } catch (e) {
    console.error('Could not save to Firestore:', e);
  }
}
