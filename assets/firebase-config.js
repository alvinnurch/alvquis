// ============================================================
//  GANTI ISI DI BAWAH INI dengan konfigurasi proyek Firebase Anda.
//  Firebase Console → Project settings → Your apps → Web app → SDK setup (Config)
// ============================================================
export const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI.appspot.com",
  messagingSenderId: "000000000000",
  appId: "GANTI_APP_ID",
};

// Dosen tidak perlu didaftarkan di sini: siapa pun bisa mendaftar lewat halaman dosen.html
// dengan akun Google-nya. Setiap dosen hanya melihat soal, sesi, dan nilai miliknya sendiri.

// Email Google SUPER ADMIN: bisa melihat semua dosen, kuis, dan sesi, menghapusnya, serta memblokir dosen.
// Harus SAMA dengan daftar di fungsi isAdmin() pada firestore.rules.
export const ADMIN_EMAILS = ["alvinnurch@gmail.com"];

// Nama yang tampil di halaman.
export const APP_NAME = "AlvQuis";

// (Opsional) Untuk pengujian lokal dengan Firebase Emulator: set true.
export const USE_EMULATOR = false;
