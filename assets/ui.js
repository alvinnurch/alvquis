// Shared helpers: escaping, answer shapes, toast, scoring, shuffling.
export const LETTERS = ["A", "B", "C", "D"];
export const OPT_CLASS = ["opt-a", "opt-b", "opt-c", "opt-d"];
const SHAPES = [
  '<polygon points="12,3 22,20 2,20"/>',
  '<polygon points="12,1 23,12 12,23 1,12"/>',
  '<circle cx="12" cy="12" r="10"/>',
  '<rect x="3" y="3" width="18" height="18" rx="2"/>',
];
const SHAPE_NAMES = ["segitiga", "belah ketupat", "lingkaran", "persegi"];
export function shape(i) {
  return `<svg class="shape" viewBox="0 0 24 24" role="img" aria-label="${SHAPE_NAMES[i]}">${SHAPES[i]}</svg>`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer;
export function toast(msg, ms = 2600) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/** Kahoot-style points: full points at 0s, half at the buzzer. */
export function pointsFor(correct, elapsedMs, timeSec, base) {
  if (!correct || !base) return 0;
  const frac = Math.min(Math.max(elapsedMs / (timeSec * 1000), 0), 1);
  return Math.round(base * (1 - frac / 2));
}

/** Deterministic PRNG so a student sees the same shuffled order after reloading. */
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
export function shuffledIdx(n, seed) {
  const r = seeded(seed), a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function fmtDate(ts) {
  const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return "—";
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
export function mmss(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function setupNotice() {
  return `<div class="notice"><b>Firebase belum dikonfigurasi.</b> Buka <code>assets/firebase-config.js</code> dan isi konfigurasi proyek Firebase Anda. Langkah lengkapnya ada di <code>README.md</code>.</div>`;
}
