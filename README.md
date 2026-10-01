# AlvQuis — Panduan Pemasangan (versi Firebase)

Kuis interaktif ala Kahoot untuk kuis harian, UTS, dan UAS.

- **Live di kelas**: soal tampil di proyektor, mahasiswa menjawab dari HP. Ada timer, poin, papan skor, dan podium juara.
- **Mandiri**: mahasiswa mengerjakan sendiri dengan durasi dan batas waktu. Cocok untuk UTS/UAS daring.

Mahasiswa **tidak perlu akun**, cukup link + PIN + nama + NIM. **Siapa pun bisa menjadi dosen**: cukup masuk dengan akun Google di halaman dosen dan mengisi profil singkat. Setiap dosen hanya melihat soal, sesi, dan nilai miliknya sendiri.

---

## Gambaran singkat

```
 HP mahasiswa ─┐
 HP mahasiswa ─┼──►  Halaman web (GitHub Pages)  ──►  Database (Firebase Firestore)
 Laptop dosen ─┘         gratis, tanpa server            gratis, paket Spark
```

- **GitHub Pages** menyimpan dan menampilkan halaman web (file HTML/JS di folder ini).
- **Firebase** menyimpan soal, jawaban, dan nilai, lalu mengirimkannya *real-time* ke semua HP.

**Yang Anda butuhkan**

| Kebutuhan | Keterangan |
| --- | --- |
| Akun Google (Gmail) | Untuk Firebase dan untuk masuk sebagai dosen |
| Akun GitHub | Daftar gratis di <https://github.com/signup> |
| Peramban **Google Chrome** di laptop | Unggah folder ke GitHub paling mudah lewat Chrome |
| Waktu | ±30 menit untuk pertama kali |

Biaya: **Rp0**. Paket gratis Firebase (Spark) tidak meminta kartu kredit.

Urutan pengerjaan: **A. Firebase → B. GitHub → C. Isi konfigurasi → D. Sambungkan domain → E. Uji coba.**

---

## A. Menyiapkan Firebase

### A1. Membuat proyek

1. Buka <https://console.firebase.google.com> dan masuk dengan akun Google Anda.
2. Klik **Create a project** (atau **Buat proyek**).
3. Isi nama proyek, misalnya `alvquis`. Centang persetujuan, lalu **Continue**.
4. Jika ditawari **Gemini in Firebase**, boleh dimatikan. **Continue**.
5. Pada halaman **Google Analytics**, matikan tombolnya (tidak diperlukan). Klik **Create project**.
6. Tunggu ±30 detik sampai muncul *Your new project is ready*, lalu **Continue**.

Anda sekarang berada di halaman **Project Overview**.

### A2. Mendaftarkan aplikasi web dan menyalin konfigurasi

1. Di Project Overview, klik ikon **Web** (bentuknya `</>`). Kalau tidak terlihat, klik **+ Add app** lalu pilih `</>`.
2. **App nickname**: isi `AlvQuis web`.
3. **Jangan** centang *Also set up Firebase Hosting*. Klik **Register app**.
4. Muncul kode seperti ini:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSyD...xyz",
     authDomain: "alvquis-12ab3.firebaseapp.com",
     projectId: "alvquis-12ab3",
     storageBucket: "alvquis-12ab3.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123def456"
   };
   ```

5. **Salin keenam baris itu** ke Notes/catatan sementara. Kita pakai di langkah C.
6. Klik **Continue to console**.

> Lupa menyalin? Klik ⚙️ (di samping *Project Overview*) → **Project settings** → tab **General** → gulir ke **Your apps** → bagian **SDK setup and configuration** → pilih **Config**.

### A3. Mengaktifkan cara masuk (Authentication)

Aplikasi memakai dua cara masuk: **Anonymous** untuk mahasiswa (tanpa akun) dan **Google** untuk dosen.

1. Di menu kiri, buka **Security → Authentication**. Jika ada tombol **Get started**, klik.
2. Buka tab **Sign-in method**.
3. **Anonymous**: klik **Anonymous** di daftar penyedia → nyalakan **Enable** → **Save**.
4. **Google**: klik **Add new provider** → **Google** → nyalakan **Enable** → pada *Support email for project* pilih email Anda → **Save**.

Kedua baris (Anonymous dan Google) kini berstatus **Enabled**.

### A4. Membuat database (Firestore)

1. Di menu kiri, buka **Databases & Storage → Firestore** (di tampilan lama: **Build → Firestore Database**).
2. Klik **Create database**.
3. Jika diminta memilih edisi, pilih **Standard edition**.
4. **Location**: pilih **asia-southeast2 (Jakarta)**. Lokasi tidak bisa diubah setelah dibuat.
5. **Security rules**: pilih **Start in production mode**.
6. Klik **Create**. Tunggu sampai halaman *Data* yang masih kosong muncul.

### A5. Memasang aturan keamanan (Rules)

Aturan inilah yang menjaga kunci jawaban tidak bocor dan mahasiswa tidak bisa mengubah nilai.

1. Masih di halaman Firestore, buka tab **Rules**.
2. Hapus seluruh isi editor (`Cmd+A` lalu `Delete`).
3. Buka file `firestore.rules` dari folder ini (klik kanan → *Open With* → TextEdit atau editor lain), salin **seluruh** isinya, lalu tempel ke editor Rules.
4. Cari fungsi `isAdmin()` dan pastikan email di dalamnya adalah **email Google Anda sebagai super admin** (bawaan: `alvinnurch@gmail.com`). Bila ingin lebih dari satu super admin, pisahkan dengan koma: `'a@gmail.com', 'b@gmail.com'`.
5. Klik **Publish**. Jika muncul tulisan merah, kemungkinan ada bagian yang tidak ikut tersalin. Ulangi langkah 2–3.

Aturan ini memastikan:

- Siapa pun yang masuk dengan **akun Google** dan mengisi profil dosen bisa membuat kuis.
- Setiap dosen hanya bisa membaca dan mengubah **bank soal, sesi, jawaban, dan nilai miliknya sendiri**.
- Mahasiswa (masuk tanpa akun) hanya bisa menulis jawabannya sendiri dan tidak pernah menerima kunci jawaban.

✅ Bagian Firebase selesai, kecuali satu langkah kecil (D) setelah alamat GitHub Anda jadi.

---

## B. Mengunggah ke GitHub Pages

### B1. Membuat repositori

1. Masuk ke <https://github.com>. Klik **+** di kanan atas → **New repository**.
2. **Repository name**: `alvquis`.
3. Pilih **Public**. (GitHub Pages gratis hanya untuk repositori publik. Ini aman: kunci jawaban tidak ada di file, hanya di database.)
4. Biarkan pilihan lain kosong. Klik **Create repository**.

### B2. Mengunggah file

1. Ekstrak `alvquis-firebase.zip` di laptop (klik dua kali di Finder). Akan muncul folder `alvquis-firebase`.
2. Di halaman repositori yang baru dibuat, klik tautan **uploading an existing file**.
3. Buka folder `alvquis-firebase` di Finder, pilih **semua isinya** (`Cmd+A`): `index.html`, `dosen.html`, `firestore.rules`, `README.md`, dan folder `assets`.
4. **Seret ke halaman GitHub**. Penting: seret **isi** foldernya, bukan folder `alvquis-firebase` itu sendiri. `index.html` harus berada di halaman utama repositori, bukan di dalam subfolder.
5. Tunggu daftar file selesai terunggah (folder `assets` berisi 11 file). Klik **Commit changes**.

> File `.nojekyll` tersembunyi di Finder dan tidak wajib diunggah.

### B3. Menyalakan GitHub Pages

1. Di repositori, buka tab **Settings** → menu kiri **Pages**.
2. **Source**: pilih **Deploy from a branch**.
3. **Branch**: pilih **main** dan folder **/ (root)** → **Save**.
4. Tunggu 1–2 menit, lalu muat ulang halaman Settings → Pages. Akan muncul: **Your site is live at `https://NAMA-AKUN.github.io/alvquis/`**.

Catat alamat itu:

- Mahasiswa: `https://NAMA-AKUN.github.io/alvquis/`
- Dosen: `https://NAMA-AKUN.github.io/alvquis/dosen.html`

---

## C. Mengisi konfigurasi Firebase

Edit langsung di GitHub agar tanda kutip tidak berubah menjadi kutip miring (TextEdit di Mac sering mengubah `"` menjadi `“ ”` dan aplikasi jadi rusak).

1. Di repositori, buka folder **assets** → klik file **firebase-config.js**.
2. Klik ikon **pensil** (*Edit this file*) di kanan atas.
3. Ganti enam nilai `GANTI...` dengan nilai yang Anda salin di langkah A2. Contoh hasil akhirnya:

   ```js
   export const firebaseConfig = {
     apiKey: "AIzaSyD...xyz",
     authDomain: "alvquis-12ab3.firebaseapp.com",
     projectId: "alvquis-12ab3",
     storageBucket: "alvquis-12ab3.firebasestorage.app",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abc123def456",
   };
   ```

4. Di file yang sama, pastikan `ADMIN_EMAILS` berisi email super admin yang **sama** dengan langkah A5.
5. Klik **Commit changes…** → **Commit changes**.
6. Tunggu ±1 menit. GitHub Pages memperbarui situs secara otomatis setiap ada perubahan.

> `apiKey` Firebase memang boleh terlihat publik. Ia hanya penanda proyek, bukan kata sandi. Yang menjaga data adalah Rules di langkah A5.

---

## D. Mengizinkan domain GitHub di Firebase

Tanpa langkah ini, tombol **Masuk dengan Google** akan gagal (`auth/unauthorized-domain`).

1. Kembali ke Firebase console → **Security → Authentication** → tab **Settings**.
2. Pilih **Authorized domains** → **Add domain**.
3. Isi `NAMA-AKUN.github.io` (tanpa `https://` dan tanpa `/alvquis`). → **Add**.

---

## E. Uji coba pertama (10 menit)

Siapkan laptop dan satu HP.

1. **Laptop**: buka `https://NAMA-AKUN.github.io/alvquis/dosen.html` → **Lanjut dengan Google** → pilih akun Anda. (Jika pop-up diblokir, izinkan pop-up untuk situs ini.) Pada kunjungan pertama, isi **nama lengkap** dan **kampus/lembaga**, centang persetujuan, lalu klik **Daftar & mulai**. Kunjungan berikutnya langsung masuk.
2. Klik **Contoh: Hadis & Teknologi** (atau **Contoh: Kuis Anak**) → **Simpan** → **← Bank soal**.
3. Pada kuis contoh, klik **Mulai sesi** → pilih **Live di kelas** → **Buat sesi & PIN**. Panggung hijau dengan PIN dan kode QR muncul.
4. **HP**: pindai kode QR, atau buka `https://NAMA-AKUN.github.io/alvquis/` dan ketik PIN. Isi nama dan NIM → **Gabung kuis**. Nama Anda muncul di layar laptop.
5. **Laptop**: klik **Mulai kuis**. **HP**: pilih jawaban. Setelah waktu habis, laptop menampilkan grafik jawaban dan HP menampilkan *Benar!* atau *Kurang tepat*.
6. Lanjutkan sampai selesai, lalu klik **Lihat rekap nilai**.
7. Coba juga **Mulai sesi → Mandiri** dengan durasi 5 menit, kerjakan dari HP, kumpulkan, lalu di laptop tekan **Simpan & umumkan nilai**. Di HP, masukkan PIN yang sama untuk melihat nilai.

Jika semua langkah ini berjalan, aplikasi siap dipakai di kelas. Hapus sesi uji coba dari **Sesi & nilai → Rekap nilai → Hapus sesi**.

---

## F. Mengatasi masalah

| Yang terlihat | Penyebab dan solusi |
| --- | --- |
| Kotak kuning **"Firebase belum dikonfigurasi"** | `firebase-config.js` belum terisi atau belum ter-*commit*. Ulangi langkah C, tunggu 1–2 menit, lalu muat ulang paksa (`Cmd+Shift+R`). |
| Halaman **404 / There isn't a GitHub Pages site here** | Tunggu 2 menit setelah langkah B3. Jika tetap, periksa apakah `index.html` ada di halaman utama repositori, bukan di dalam folder `alvquis-firebase/`. |
| Masuk Google gagal: **auth/unauthorized-domain** | Langkah D belum dilakukan atau domain salah ketik. |
| Masuk Google gagal: **auth/operation-not-allowed** | Penyedia Google atau Anonymous belum *Enabled* (langkah A3). |
| Masuk Google gagal: **auth/popup-blocked** | Izinkan pop-up untuk situs ini di pengaturan peramban. |
| **"Gagal mendaftar: permission-denied"** | Rules belum di-*Publish* atau masih versi lama. Ulangi langkah A5 dengan file `firestore.rules` terbaru. |
| **"Gagal memuat soal: permission-denied"** | Sama seperti di atas. Bila Rules sudah benar, keluar lalu masuk lagi. |
| Mahasiswa: **"Tidak bisa terhubung"** | Langkah A3 (Anonymous) belum aktif, atau HP tidak ada internet. |
| Mahasiswa: **"PIN tidak ditemukan"** | PIN salah ketik, atau sesi sudah dihapus dosen. |
| Mahasiswa: **"Waktu habis"** atau **"Jawaban terlambat"** | Normal. Hitung mundur di HP sudah disamakan dengan layar proyektor, dan panggung menunggu 2,5 detik setelah waktu habis agar jawaban dari sinyal lambat tetap masuk. |
| Mahasiswa: **"Menyambung ulang…"** | Sinyal HP sempat putus. Halaman menyambung lagi sendiri dalam 3 detik. |
| Perubahan file tidak muncul | GitHub Pages butuh 1–2 menit. Muat ulang paksa dengan `Cmd+Shift+R`. |
| Pesan **quota exceeded / resource-exhausted** | Batas harian gratis tercapai (lihat bagian H). Kuota pulih otomatis keesokan hari. |

Untuk melihat pesan kesalahan lengkap: di Chrome tekan `Cmd+Option+J` (Console) lalu ulangi langkah yang gagal.

---

## G. Cara pakai sehari-hari

**Menyusun soal.** Halaman dosen → **Bank soal** → **Kuis baru**. Soal bisa ditempel dari Word lewat **Tempel dari teks**:

```
1. Rangkaian periwayat hadis disebut…
a. Matan
*b. Sanad
c. Rawi
d. Takhrij

2. Matan adalah isi hadis.
a. Benar
b. Salah
Kunci: A
```

Tandai jawaban benar dengan `*` di depan opsi, atau baris `Kunci: B`. Opsi *Benar/Salah* otomatis menjadi soal benar/salah. Setiap soal bisa diatur waktunya (mode live) dan poinnya (standar, ganda, tanpa poin).

**Kuis live.** **Mulai sesi** → **Live di kelas**. Tampilkan panggung di proyektor (**Layar penuh**). Setelah mahasiswa masuk, klik **Mulai kuis**. Jawaban ditutup otomatis saat waktu habis atau semua sudah menjawab.

**Ujian mandiri.** **Mulai sesi** → **Mandiri** → isi durasi dan waktu tutup. Bagikan link dan PIN lewat grup kelas. Pantau di **Sesi & nilai → Rekap nilai**. Setelah selesai, klik **Simpan & umumkan nilai**.

**Rekap.** Nilai 0–100, poin untuk mode live, analisis per soal, tanda **ganda** bila satu NIM masuk lebih dari sekali, dan **Unduh CSV** (langsung terbuka di Excel). Simpan CSV setelah setiap UTS/UAS sebagai arsip.

**Mengajak dosen/guru lain.** Bagikan alamat `…/alvquis/dosen.html`. Mereka cukup masuk dengan akun Google masing-masing dan mengisi profil. Tidak ada yang perlu Anda ubah. Setiap dosen punya bank soal dan rekap nilainya sendiri dan tidak bisa melihat milik dosen lain.

**Super admin.** Akun yang emailnya tercantum di `isAdmin()` (Rules) dan `ADMIN_EMAILS` (config) mendapat tab **Super admin** di halaman dosen. Isinya:

- **Ringkasan:** jumlah dosen terdaftar, kuis, sesi, dan peserta.
- **Dosen:** nama, lembaga, email, tanggal daftar, jumlah kuis dan sesi, serta aktivitas terakhir.
  - **Lihat** menampilkan sesi milik dosen tersebut.
  - **Blokir** menghentikan dosen itu membuat kuis atau sesi baru; datanya tetap tersimpan. Tombol **Aktifkan** membatalkannya.
- **Sesi:** semua sesi dari semua dosen, beserta jumlah pesertanya. **Hapus** menghapus sesi bersama seluruh jawaban dan nilainya secara permanen.
- **Kuis:** semua bank soal dari semua dosen. **Hapus** menghapusnya secara permanen.

Super admin tidak bisa memblokir dirinya sendiri. Dosen lain tidak melihat tab ini, dan Rules juga menolak mereka membaca data milik orang lain.

---

## Tipe soal

| Tipe | Cara menjawab di HP | Kapan benar |
| --- | --- | --- |
| **Pilihan ganda** (2–4 opsi) | Ketuk satu warna/bentuk | Memilih opsi kunci |
| **Benar / salah** | Ketuk Benar atau Salah | Memilih kunci |
| **Mengurutkan** (2–6 butir) | Ketuk butir satu per satu sesuai urutan, lalu **Kirim jawaban** | Seluruh urutan tepat |
| **Mencocokkan** (2–6 pasangan) | Ketuk baris kiri, lalu ketuk pasangannya; ulangi sampai semua terpasang, lalu **Kirim jawaban** | Semua pasangan tepat |

- Di editor, tulis butir **dalam urutan yang benar**, atau tulis **pasangan yang benar** per baris. Aplikasi mengacaknya sendiri untuk mahasiswa.
- Urutan dan pasangan yang benar tidak pernah dikirim ke HP. Setiap butir diberi kode acak yang hanya bisa dicocokkan oleh dosen/server.
- Penilaian untuk mengurutkan dan mencocokkan bersifat **semua-atau-tidak**: benar bila seluruhnya tepat.
- Fitur **Tempel dari teks** masih khusus pilihan ganda dan benar/salah. Soal mengurutkan dan mencocokkan dibuat lewat tombol **+ Mengurutkan** dan **+ Mencocokkan**.

## Musik & efek suara

Panggung (laptop/proyektor) memutar musik yang dibuat langsung oleh aplikasi, tanpa file audio dan tanpa lagu berhak cipta:

- **Layar tunggu & papan skor**: musik ringan sesuai tema. Klasik bernuansa elektronik tenang, Robot Lapar mekanis, Pesta Balon riang, Balap Roket bertempo cepat, dan Kebun Ceria seperti kotak musik.
- **Saat soal berjalan**: musik menegangkan dengan detak jantung yang makin cepat menjelang waktu habis, ditambah detak jam pada 5 detik terakhir.
- **Saat jawaban dibuka**: nada "benar" dan efek tema, misalnya robot mengunyah, balon meletus, roket melesat, atau denting bunga tumbuh.
- **Juara**: tabuhan drum dan fanfare.

Tombol **Musik: nyala/mati** ada di pojok kanan atas panggung, dan pilihan ini diingat oleh peramban. Hubungkan laptop ke pengeras suara kelas. HP mahasiswa tidak berbunyi, agar kelas tidak riuh.

---

## Tema panggung (mode live)

Saat **Mulai sesi → Live di kelas**, pilih tema. Tema hanya mengubah tampilan; nilai tetap dihitung dari jawaban benar.

| Tema | Cara main | Cocok untuk |
| --- | --- | --- |
| **Klasik** | Soal, grafik jawaban, papan skor | Kuliah, UTS/UAS |
| **Robot Lapar** | Tiap pemain punya 1–5 nyawa. Salah atau tidak menjawab = nyawa berkurang. Nyawa habis = dimakan robot dan masuk ke perut robot | Remaja, mahasiswa, kelas yang suka tantangan |
| **Pesta Balon** | Tiap salah, satu balon meletus dan avatar turun pelan-pelan. Balon habis = mendarat di rumput | Anak kecil (TK/SD) |
| **Balap Roket** | Tiap jawaban benar mendorong roket menuju bulan. Sepuluh roket terdepan tampil di layar | Semua usia |
| **Kebun Ceria** | Tiap jawaban benar menumbuhkan tanaman sampai berbunga. Jawaban salah hanya mendatangkan awan hujan sebentar | Anak kecil, suasana tanpa "kalah" |

- Mahasiswa/anak **memilih avatar** (12 hewan lucu) saat bergabung. Avatar tampil di layar proyektor dan di HP.
- Pemain yang sudah dimakan robot atau kehabisan balon **tetap bisa menjawab**, dan nilainya tetap dihitung.
- Ada contoh soal kedua, **Contoh: Kuis Anak** (10 soal pengenalan Islam untuk TPA/SD), yang cocok untuk tema-tema ini.

---

## H. Kapasitas paket gratis

Paket Spark Firestore: **50.000 baca** dan **20.000 tulis** per hari, pulih setiap hari.

| Kegiatan | Perkiraan pemakaian |
| > **Penting bila banyak dosen ikut memakai.** Semua dosen yang mendaftar memakai **satu kuota gratis yang sama**, yaitu kuota proyek Firebase Anda. Bila pemakaian mulai sering mendekati batas (pantau di **Firestore → Usage**), ada dua pilihan: beralih ke paket **Blaze** (bayar sesuai pemakaian di atas kuota gratis; cek tarif terbaru di <https://firebase.google.com/pricing>), atau minta dosen dari lembaga lain membuat proyek Firebase sendiri dengan folder yang sama.

--- | --- |
| Kuis live 10 soal, 60 mahasiswa | ±4.000 baca, ±1.300 tulis |
| Ujian mandiri 40 soal, 100 mahasiswa | ±5.000 baca, ±4.500 tulis |

Artinya beberapa kelas per hari masih aman. Pemakaian bisa dipantau di Firebase → **Firestore → Usage**.

---

## I. Keamanan & integritas ujian

- Kunci jawaban **tidak pernah dikirim** ke HP mahasiswa. Mode live: skor dihitung di laptop dosen. Mode mandiri: nilai dihitung saat dosen membuka rekap.
- Waktu menjawab dicap oleh server Google. Jawaban yang masuk setelah soal ditutup, setelah durasi habis (+1 menit toleransi), atau setelah ujian ditutup ditolak oleh database.
- Mahasiswa hanya bisa membaca dan menulis datanya sendiri. Mereka tidak bisa melihat daftar sesi, jawaban teman, atau mengubah skor.
- Batasan: aplikasi tidak mengunci layar HP, jadi UTS/UAS tetap perlu pengawasan seperti biasa. Mahasiswa yang berganti peramban atau HP tercatat sebagai peserta baru. Rekap menandai NIM yang sama dengan **ganda**.

---

## Isi folder

| File | Fungsi |
| --- | --- |
| `index.html` | Halaman mahasiswa (masukkan PIN) |
| `dosen.html` | Halaman dosen: bank soal, panggung proyektor, rekap nilai |
| `assets/firebase-config.js` | **Satu-satunya file yang perlu diubah** (langkah C) |
| `firestore.rules` | Aturan keamanan yang ditempel di Firebase (langkah A5) |
| `assets/sample-quiz.js` | Contoh 10 soal Hadis dan Teknologi |
| `assets/*.js`, `assets/style.css` | Kode aplikasi dan tampilan (tidak perlu diubah) |
