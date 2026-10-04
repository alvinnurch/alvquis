import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, initializeFirestore, getDocFromServer, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, writeBatch, query, where, orderBy, increment, Timestamp, deleteField, getCountFromServer, connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, USE_EMULATOR } from "./firebase-config.js?v=2026.10.04-r6";

export const configured = !String(firebaseConfig.apiKey || "").startsWith("GANTI");

export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
// HP mahasiswa: pakai long-polling. Lebih tahan terhadap jaringan kampus/operator seluler yang
// memutus koneksi streaming diam-diam (gejalanya: HP tidak menerima soal berikutnya).
const PHONE_PAGE = !/dosen\.html$/.test(location.pathname);
export const db = app ? (() => {
  try { return initializeFirestore(app, PHONE_PAGE ? { experimentalForceLongPolling: true } : { experimentalAutoDetectLongPolling: true }); }
  catch { return getFirestore(app); }
})() : null;
if (app && USE_EMULATOR) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export {
  signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut,
  getDocFromServer, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, writeBatch, query, where, orderBy, increment, Timestamp, deleteField, getCountFromServer,
};

/** Resolves with the current user once auth has initialised (may be null). */
export function authReady() {
  return new Promise((resolve) => {
    let done = false;
    const off = onAuthStateChanged(auth, (u) => { if (done) return; done = true; off(); resolve(u); });
    // Jangan biarkan halaman kosong bila Firebase Auth lambat/terblokir.
    setTimeout(() => { if (!done) { done = true; resolve(auth.currentUser || null); } }, 8000);
  });
}
