// AlvQuis — tipe soal: pilihan ganda (pg), benar/salah (bs), mengurutkan (urut), mencocokkan (cocok).
//
// Untuk "urut" dan "cocok", HP mahasiswa tidak pernah menerima urutan/pasangan yang benar.
// Setiap butir diberi ID tersamar = hash(garam rahasia sesi, nomor soal, posisi benar),
// lalu ditampilkan sesuai urutan ID (tampak acak). Hanya pemegang garam (dosen/server) yang
// bisa mencocokkan ID kembali ke posisi aslinya.

export const KINDS = {
  pg: "Pilihan ganda",
  bs: "Benar / salah",
  urut: "Mengurutkan",
  cocok: "Mencocokkan",
};
export const isChoice = (q) => q.kind === "pg" || q.kind === "bs";

export function hid(salt, qi, k) {
  const str = `${salt}|${qi}|${k}`;
  let h1 = 0x811c9dc5, h2 = 0x9e3779b1;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36)).slice(0, 10);
}
export function newSalt() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Urutkan menurut ID (tampak acak); bila kebetulan sama dengan urutan benar, geser satu langkah.
function mix(list) {
  const out = list.map((x, k) => ({ ...x, k })).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (out.every((x, i) => x.k === i)) out.push(out.shift());
  return out.map(({ id, text }) => ({ id, text }));
}

/** Versi soal yang aman dikirim ke HP mahasiswa. */
export function publicQ(q, qi, salt) {
  if (q.kind === "urut") return { kind: "urut", text: q.text, items: mix(q.items.map((t, k) => ({ id: hid(salt, qi, k), text: t }))) };
  if (q.kind === "cocok") return { kind: "cocok", text: q.text, left: q.pairs.map((p) => p[0]), right: mix(q.pairs.map((p, k) => ({ id: hid(salt, qi, k), text: p[1] }))) };
  return { kind: q.kind, text: q.text, options: q.options };
}

export function isCorrect(q, qi, salt, ans) {
  if (ans == null) return false;
  if (q.kind === "urut" || q.kind === "cocok") {
    const n = q.kind === "urut" ? q.items.length : q.pairs.length;
    return Array.isArray(ans) && ans.length === n && ans.every((id, k) => id === hid(salt, qi, k));
  }
  return ans === q.correct;
}

/** Pemeriksaan bentuk jawaban (bukan benar/salahnya). */
export function validAnswer(pq, ans) {
  if (pq.kind === "urut") return Array.isArray(ans) && ans.length === pq.items.length && new Set(ans).size === ans.length && ans.every((id) => pq.items.some((x) => x.id === id));
  if (pq.kind === "cocok") return Array.isArray(ans) && ans.length === pq.left.length && new Set(ans).size === ans.length && ans.every((id) => pq.right.some((x) => x.id === id));
  return Number.isInteger(ans) && ans >= 0 && ans < pq.options.length;
}

/** Teks kunci jawaban untuk ditampilkan setelah soal ditutup / di rekap. */
export function solutionText(q) {
  if (q.kind === "urut") return q.items.map((t, k) => `${k + 1}. ${t}`).join("  ·  ");
  if (q.kind === "cocok") return q.pairs.map((p) => `${p[0]} → ${p[1]}`).join("  ·  ");
  return null;
}
export function solutionList(q) {
  if (q.kind === "urut") return q.items.map((t, k) => ({ a: String(k + 1), b: t }));
  if (q.kind === "cocok") return q.pairs.map((p) => ({ a: p[0], b: p[1] }));
  return [];
}
