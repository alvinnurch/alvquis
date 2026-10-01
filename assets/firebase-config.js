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

// Nama yang tampil di halaman.
export const APP_NAME = "AlvQuis";

// (Opsional) Untuk pengujian lokal dengan Firebase Emulator: set true.
export const USE_EMULATOR = false;
