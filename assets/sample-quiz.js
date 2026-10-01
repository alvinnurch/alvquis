// Contoh bank soal. Muncul di halaman Dosen lewat tombol "Muat contoh soal".
// kind: "pg" (pilihan ganda, 2–4 opsi) atau "bs" (benar/salah).
// time: detik per soal (mode live). points: 1000 standar, 2000 ganda, 0 tanpa poin.
export const SAMPLE_QUIZ = {
  title: "UTS Hadis dan Teknologi (contoh)",
  course: "Hadis dan Teknologi",
  questions: [
    { kind: "pg", text: "Rangkaian periwayat yang menyampaikan sebuah hadis hingga sampai kepada kita disebut…",
      options: ["Matan", "Sanad", "Rawi", "Takhrij"], correct: 1, time: 20, points: 1000 },
    { kind: "bs", text: "Matan adalah isi atau redaksi (teks) hadis.",
      options: ["Benar", "Salah"], correct: 0, time: 15, points: 1000 },
    { kind: "pg", text: "Kegiatan menelusuri hadis sampai ke kitab-kitab sumber aslinya beserta sanadnya, lalu menilai kualitasnya, disebut…",
      options: ["Tahqiq", "Syarah", "Takhrij", "Tarjih"], correct: 2, time: 20, points: 1000 },
    { kind: "pg", text: "Manakah yang TIDAK termasuk al-Kutub al-Sittah?",
      options: ["Sunan Abi Dawud", "Sunan al-Tirmidzi", "Musnad Ahmad", "Sunan Ibn Majah"], correct: 2, time: 20, points: 1000 },
    { kind: "pg", text: "Kitab al-Mu'jam al-Mufahras li Alfazh al-Hadits al-Nabawi membantu takhrij berdasarkan…",
      options: ["Nama sahabat periwayat", "Tema atau bab hadis", "Kata (lafaz) dalam matan", "Kualitas hadis"], correct: 2, time: 30, points: 1000 },
    { kind: "pg", text: "Perpustakaan digital berisi ribuan kitab turats yang banyak dipakai untuk mencari teks hadis adalah…",
      options: ["Mendeley", "al-Maktabah al-Syamilah", "Zotero", "Scrivener"], correct: 1, time: 20, points: 1000 },
    { kind: "pg", text: "Salah satu kelebihan al-Mausu'ah al-Haditsiyyah di situs Dorar.net adalah…",
      options: ["Menampilkan ringkasan penilaian ulama hadis terhadap riwayat", "Menerjemahkan hadis ke bahasa Indonesia", "Menyediakan rekaman audio setiap hadis", "Menghapus hadis yang dha'if"], correct: 0, time: 30, points: 1000 },
    { kind: "bs", text: "Hasil pencarian di aplikasi hadis digital boleh langsung dijadikan hujjah tanpa merujuk kitab sumbernya.",
      options: ["Benar", "Salah"], correct: 1, time: 15, points: 1000 },
    { kind: "pg", text: "Periwayat yang identitas atau keadaannya tidak dikenal oleh para ulama disebut…",
      options: ["Tsiqah", "Majhul", "Mudallis", "Shaduq"], correct: 1, time: 20, points: 1000 },
    { kind: "urut", text: "Urutkan generasi periwayat hadis dari yang paling awal.",
      items: ["Sahabat", "Tabi'in", "Tabi' al-Tabi'in", "Ulama penyusun kitab hadis"], time: 45, points: 1000 },
    { kind: "cocok", text: "Cocokkan imam dengan kitab hadisnya.",
      pairs: [["Imam Malik", "al-Muwatta'"], ["Imam Ahmad ibn Hanbal", "al-Musnad"], ["Imam al-Bukhari", "al-Jami' al-Shahih"], ["Imam Abu Dawud", "al-Sunan"]], time: 60, points: 1000 },
    { kind: "pg", text: "Langkah paling tepat sebelum membagikan potongan hadis yang viral di media sosial adalah…",
      options: ["Mengecek jumlah like dan share", "Menelusuri sumber dan kualitas sanadnya", "Menanyakan ke grup WhatsApp", "Melihat siapa yang pertama mengunggah"], correct: 1, time: 30, points: 2000 },
  ],
};

// Contoh kuis untuk anak-anak (TPA/SD). Cocok dengan tema Robot Lapar, Pesta Balon, Balap Roket, atau Kebun Ceria.
export const SAMPLE_KIDS = {
  title: "Kuis Anak: Mengenal Islam (contoh)",
  course: "TPA / Sekolah Dasar",
  questions: [
    { kind: "pg", text: "Huruf hijaiyah yang pertama adalah…", options: ["Ba", "Alif", "Ta", "Jim"], correct: 1, time: 20, points: 1000 },
    { kind: "pg", text: "Kitab suci umat Islam adalah…", options: ["Al-Qur'an", "Kamus", "Majalah", "Buku cerita"], correct: 0, time: 20, points: 1000 },
    { kind: "pg", text: "Shalat wajib dalam sehari semalam ada berapa kali?", options: ["3 kali", "4 kali", "5 kali", "7 kali"], correct: 2, time: 20, points: 1000 },
    { kind: "pg", text: "Nabi yang membuat kapal besar sebelum banjir datang adalah…", options: ["Nabi Musa", "Nabi Nuh", "Nabi Isa", "Nabi Yusuf"], correct: 1, time: 20, points: 1000 },
    { kind: "pg", text: "Nabi yang pernah berada di dalam perut ikan besar adalah…", options: ["Nabi Yunus", "Nabi Ibrahim", "Nabi Sulaiman", "Nabi Adam"], correct: 0, time: 20, points: 1000 },
    { kind: "pg", text: "Bulan saat umat Islam berpuasa wajib adalah…", options: ["Syawal", "Muharram", "Ramadhan", "Rajab"], correct: 2, time: 20, points: 1000 },
    { kind: "pg", text: "Ka'bah berada di kota…", options: ["Madinah", "Makkah", "Jakarta", "Kairo"], correct: 1, time: 20, points: 1000 },
    { kind: "pg", text: "Rukun Islam ada berapa?", options: ["3", "4", "5", "6"], correct: 2, time: 20, points: 1000 },
    { kind: "urut", text: "Urutkan huruf hijaiyah berikut dari yang pertama.", items: ["Alif", "Ba", "Ta", "Tsa"], time: 30, points: 1000 },
    { kind: "cocok", text: "Cocokkan nabi dengan kisahnya.", pairs: [["Nabi Nuh", "Membuat kapal besar"], ["Nabi Yunus", "Ditelan ikan besar"], ["Nabi Ibrahim", "Tidak terbakar api"], ["Nabi Musa", "Tongkat membelah laut"]], time: 45, points: 1000 },
    { kind: "bs", text: "Sebelum makan, kita membaca basmalah.", options: ["Benar", "Salah"], correct: 0, time: 15, points: 1000 },
    { kind: "pg", text: "Nabi terakhir adalah…", options: ["Nabi Isa", "Nabi Musa", "Nabi Muhammad", "Nabi Ibrahim"], correct: 2, time: 20, points: 2000 },
  ],
};
