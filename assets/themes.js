// AlvQuis — tema panggung & avatar.
// Semua gambar adalah SVG buatan sendiri (tanpa file gambar luar).
import { esc } from "./ui.js";

/* ================================================================ TEMA */
export const THEMES = {
  klasik: { name: "Klasik", desc: "Tampilan bersih: soal, grafik jawaban, papan skor.", lives: false },
  robot:  { name: "Robot Lapar", desc: "Tiap salah, nyawa berkurang. Nyawa habis? Dimakan robot!", lives: true, defaultLives: 3 },
  balon:  { name: "Pesta Balon", desc: "Tiap salah, satu balon meletus. Versi lembut untuk anak kecil.", lives: true, defaultLives: 3 },
  roket:  { name: "Balap Roket", desc: "Jawaban benar mendorong roket menuju bulan.", lives: false },
  kebun:  { name: "Kebun Ceria", desc: "Jawaban benar menumbuhkan tanaman sampai berbunga.", lives: false },
};
export const THEME_KEYS = Object.keys(THEMES);
export const themeOf = (s) => (THEMES[s?.theme] ? s.theme : "klasik");

/** Derived per-player game state. p: {score, correct, wrong, lastQ, lastCorrect, answered} */
export function gameState(p, s) {
  const max = s.lives || 3, wrong = p.wrong || 0;
  const lives = Math.max(0, max - wrong);
  const justHit = s.status === "reveal" && p.lastQ === s.current && !p.lastCorrect;
  const justRight = s.status === "reveal" && p.lastQ === s.current && !!p.lastCorrect;
  return {
    max, lives, out: lives === 0,
    justHit, justRight,
    justOut: lives === 0 && justHit && wrong === max,
    progress: s.total ? (p.correct || 0) / s.total : 0,
    prevProgress: s.total ? Math.max(0, (p.correct || 0) - (justRight ? 1 : 0)) / s.total : 0,
  };
}

/* ================================================================ AVATAR */
export const AVATARS = [
  { n: "Kucing",       c: "#f39c4a", b: "#fde3c8", ear: "tri" },
  { n: "Kelinci",      c: "#eceaf2", b: "#ffffff", ear: "long", inner: "#f6a5b8" },
  { n: "Beruang",      c: "#9a6a46", b: "#d9b48f", ear: "round" },
  { n: "Panda",        c: "#f4f4f4", b: "#ffffff", ear: "dark", patch: true },
  { n: "Katak",        c: "#58b65b", b: "#c9eab3", ear: "frog" },
  { n: "Pinguin",      c: "#2f3a48", b: "#f4f4f4", ear: "none", beak: "#f5a623" },
  { n: "Rubah",        c: "#e8743b", b: "#fff4e8", ear: "tri" },
  { n: "Burung Hantu", c: "#8b6b4a", b: "#e9d6b9", ear: "tuft", beak: "#f0b23a", big: true },
  { n: "Ayam",         c: "#f7d046", b: "#fff2b0", ear: "comb", beak: "#f08a24" },
  { n: "Koala",        c: "#9aa3ad", b: "#e3e7eb", ear: "fluffy", nose: "#3b3f45" },
  { n: "Singa",        c: "#f2b84b", b: "#fbe3a6", ear: "mane" },
  { n: "Domba",        c: "#fbfaf6", b: "#5b4a42", ear: "wool", face: true },
];
const INK = "#1e2328";

/** mood: "happy" | "sad" | "out" */
export function avatar(i, mood = "happy", cls = "") {
  const a = AVATARS[((+i || 0) % AVATARS.length + AVATARS.length) % AVATARS.length];
  const p = [];
  // ears / behind-head
  if (a.ear === "tri") p.push(`<path d="M10 26 L15 4 L29 16Z M54 26 L49 4 L35 16Z" fill="${a.c}"/><path d="M14 20 L16 10 L23 16Z M50 20 L48 10 L41 16Z" fill="${a.b}"/>`);
  if (a.ear === "long") p.push(`<ellipse cx="23" cy="12" rx="5.5" ry="13" fill="${a.c}"/><ellipse cx="41" cy="12" rx="5.5" ry="13" fill="${a.c}"/><ellipse cx="23" cy="13" rx="2.6" ry="9" fill="${a.inner}"/><ellipse cx="41" cy="13" rx="2.6" ry="9" fill="${a.inner}"/>`);
  if (a.ear === "round") p.push(`<circle cx="15" cy="18" r="8" fill="${a.c}"/><circle cx="49" cy="18" r="8" fill="${a.c}"/><circle cx="15" cy="18" r="4" fill="${a.b}"/><circle cx="49" cy="18" r="4" fill="${a.b}"/>`);
  if (a.ear === "dark") p.push(`<circle cx="15" cy="18" r="8" fill="${INK}"/><circle cx="49" cy="18" r="8" fill="${INK}"/>`);
  if (a.ear === "frog") p.push(`<circle cx="21" cy="17" r="9" fill="${a.c}"/><circle cx="43" cy="17" r="9" fill="${a.c}"/>`);
  if (a.ear === "tuft") p.push(`<path d="M12 22 L14 6 L24 15Z M52 22 L50 6 L40 15Z" fill="${a.c}"/>`);
  if (a.ear === "comb") p.push(`<circle cx="27" cy="12" r="5" fill="#e5483f"/><circle cx="33" cy="9" r="5.5" fill="#e5483f"/><circle cx="39" cy="12" r="5" fill="#e5483f"/>`);
  if (a.ear === "fluffy") p.push(`<circle cx="11" cy="24" r="11" fill="${a.c}"/><circle cx="53" cy="24" r="11" fill="${a.c}"/><circle cx="11" cy="24" r="6" fill="#f2f4f6"/><circle cx="53" cy="24" r="6" fill="#f2f4f6"/>`);
  if (a.ear === "mane") p.push(`<circle cx="32" cy="35" r="29" fill="#c97b2a"/>`);
  if (a.ear === "wool") p.push(`${[[14,22],[22,13],[32,10],[42,13],[50,22],[54,34],[50,46],[10,34],[14,46]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${a.c}" stroke="#e7e2d6" stroke-width="1"/>`).join("")}`);
  // head
  p.push(`<circle cx="32" cy="36" r="22" fill="${a.face ? a.b : a.c}"/>`);
  if (a.ear === "wool") p.push(`<circle cx="32" cy="18" r="9" fill="${a.c}"/>`);
  if (!a.face && !a.beak) p.push(`<ellipse cx="32" cy="45" rx="12" ry="8.5" fill="${a.b}"/>`);
  if (a.beak && a.n === "Pinguin") p.push(`<ellipse cx="32" cy="41" rx="15" ry="13" fill="${a.b}"/>`);
  if (a.patch) p.push(`<ellipse cx="24" cy="34" rx="5.5" ry="7" transform="rotate(-25 24 34)" fill="${INK}"/><ellipse cx="40" cy="34" rx="5.5" ry="7" transform="rotate(25 40 34)" fill="${INK}"/>`);
  // eyes
  const ex = a.ear === "frog" ? [21, 43] : [24, 40], ey = a.ear === "frog" ? 17 : 33;
  const eyeFill = a.patch || a.face ? "#fff" : INK;
  if (mood === "out") {
    p.push(ex.map((x) => `<path d="M${x - 3} ${ey - 3} l6 6 M${x + 3} ${ey - 3} l-6 6" stroke="${a.patch || a.face ? "#fff" : INK}" stroke-width="2.4" stroke-linecap="round"/>`).join(""));
  } else if (a.big || a.ear === "frog") {
    p.push(ex.map((x) => `<circle cx="${x}" cy="${ey}" r="${a.big ? 7 : 5.5}" fill="#fff"/><circle cx="${x}" cy="${ey + (mood === "sad" ? 1.5 : 0)}" r="${a.big ? 3.6 : 2.8}" fill="${INK}"/>`).join(""));
  } else if (mood === "sad") {
    p.push(ex.map((x, k) => `<path d="M${x - 3.5} ${ey + (k ? -1 : 1)} L${x + 3.5} ${ey + (k ? 1 : -1)}" stroke="${eyeFill}" stroke-width="2.6" stroke-linecap="round"/>`).join(""));
  } else {
    p.push(ex.map((x) => `<circle cx="${x}" cy="${ey}" r="3.3" fill="${eyeFill}"/><circle cx="${x + 1}" cy="${ey - 1.2}" r="1.1" fill="${eyeFill === "#fff" ? INK : "#fff"}"/>`).join(""));
  }
  // nose / beak / mouth
  const my = a.beak ? 50 : 47;
  if (a.beak) p.push(`<path d="M27 40 L37 40 L32 47Z" fill="${a.beak}"/>`);
  else p.push(`<ellipse cx="32" cy="${a.nose ? 41 : 40}" rx="${a.nose ? 4.5 : 2.6}" ry="${a.nose ? 3.5 : 2}" fill="${a.nose || (a.face ? "#2b211c" : INK)}"/>`);
  const mouthStroke = a.face ? "#fff" : INK;
  if (mood === "happy") p.push(`<path d="M27 ${my - 2} Q32 ${my + 3} 37 ${my - 2}" stroke="${mouthStroke}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="18" cy="43" r="3" fill="#ff7f8e" opacity=".45"/><circle cx="46" cy="43" r="3" fill="#ff7f8e" opacity=".45"/>`);
  else if (mood === "sad") p.push(`<path d="M27 ${my + 1} Q32 ${my - 4} 37 ${my + 1}" stroke="${mouthStroke}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  else p.push(`<ellipse cx="32" cy="${my}" rx="3" ry="2.4" fill="${mouthStroke}"/>`);
  return `<svg class="av ${cls} ${mood === "out" ? "av-out" : ""}" viewBox="0 0 64 64" role="img" aria-label="${a.n}">${p.join("")}</svg>`;
}

/* ================================================================ BAGIAN-BAGIAN */
const heart = (cls = "") => `<svg class="heart ${cls}" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21 L3 12 A5.5 5.5 0 0 1 12 4.5 A5.5 5.5 0 0 1 21 12 Z"/></svg>`;
export function hearts(g) {
  let h = "";
  for (let k = 0; k < g.max; k++) {
    const lostNow = g.justHit && k === g.lives;
    h += heart(k < g.lives ? "on" : lostNow ? "break" : "off");
  }
  return `<span class="hearts" aria-label="${g.lives} nyawa">${h}</span>`;
}
const BAL = ["#e5483f", "#2d7be0", "#f2b705", "#2e9e5b", "#c25bd6", "#ff8a3d"];
function balloons(g, seed) {
  let b = "";
  const n = g.lives + (g.justHit ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const popping = g.justHit && k === n - 1;
    const x = (k - (n - 1) / 2) * 14;
    b += `<g class="bl ${popping ? "pop" : ""}" style="--x:${x}px"><path d="M${30 + x * 0.6} 58 Q${30 + x * 0.3} 70 30 82" stroke="#e8e2d0" stroke-width="1" fill="none"/><ellipse cx="${30 + x}" cy="${40 - Math.abs(x) * 0.3}" rx="11" ry="13" fill="${BAL[(seed + k) % BAL.length]}"/><ellipse cx="${26 + x}" cy="${35 - Math.abs(x) * 0.3}" rx="3" ry="4" fill="#fff" opacity=".45"/></g>`;
  }
  return `<svg class="balloons" viewBox="-22 24 104 60" aria-hidden="true">${b}</svg>`;
}
export function robotSVG(chomp = false) {
  return `<svg class="robot ${chomp ? "chomp" : ""}" viewBox="0 0 200 230" aria-label="Robot">
    <line x1="100" y1="8" x2="100" y2="30" stroke="#5d6b78" stroke-width="5"/><circle class="bulb" cx="100" cy="8" r="8" fill="#ff5a4e"/>
    <rect x="40" y="128" width="120" height="86" rx="16" fill="#6f7f8e"/>
    <rect class="belly" x="60" y="142" width="80" height="56" rx="10" fill="#2a333c"/>
    <rect x="18" y="140" width="22" height="58" rx="10" fill="#5d6b78"/><rect x="160" y="140" width="22" height="58" rx="10" fill="#5d6b78"/>
    <g class="head">
      <rect x="26" y="28" width="148" height="66" rx="18" fill="#8a99a8"/>
      <circle cx="70" cy="60" r="18" fill="#2a333c"/><circle class="eye" cx="70" cy="60" r="9" fill="#ff5a4e"/>
      <circle cx="130" cy="60" r="18" fill="#2a333c"/><circle class="eye" cx="130" cy="60" r="9" fill="#ff5a4e"/>
      <path d="M44 94 h112 v8 l-8 8 l-8 -8 l-8 8 l-8 -8 l-8 8 l-8 -8 l-8 8 l-8 -8 l-8 8 l-8 -8 l-8 8 l-8 -8 l-8 8 l-8 -8 Z" fill="#f4f7f2"/>
    </g>
    <g class="jaw">
      <rect x="34" y="104" width="132" height="26" rx="10" fill="#7a8a99"/>
      <path d="M44 104 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 Z" fill="#f4f7f2"/>
    </g>
  </svg>`;
}
const rocket = (av) => `<span class="rocket-wrap"><svg class="rocket" viewBox="0 0 90 44" aria-hidden="true">
  <path class="flame" d="M4 22 L18 14 L16 22 L18 30 Z" fill="#ffb238"/><path class="flame2" d="M10 22 L19 18 L18 22 L19 26Z" fill="#ff5a4e"/>
  <path d="M18 12 h40 q22 0 30 10 q-8 10 -30 10 h-40 Z" fill="#f4f7f2"/><path d="M22 12 l-6 -9 h12 l8 9 Z M22 32 l-6 9 h12 l8 -9Z" fill="#e5483f"/>
  <circle cx="58" cy="22" r="9" fill="#2a333c"/></svg><span class="rocket-av">${av}</span></span>`;
function plant(progress, from, grow) {
  const h = Math.round(6 + progress * 54), leaves = Math.min(5, Math.floor(progress * 6));
  let lv = "";
  for (let k = 0; k < leaves; k++) {
    const y = 70 - 8 - k * (h / 6), side = k % 2 ? 1 : -1;
    lv += `<ellipse cx="${30 + side * 7}" cy="${y}" rx="7" ry="3.5" transform="rotate(${side * -25} ${30 + side * 7} ${y})" fill="#4caf50"/>`;
  }
  const top = 70 - h;
  const flower = progress >= 0.8
    ? `<g class="bloom">${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="30" cy="${top - 7}" rx="5" ry="8" transform="rotate(${r} 30 ${top})" fill="#ff7aa8"/>`).join("")}<circle cx="30" cy="${top}" r="5" fill="#ffd23f"/></g>`
    : progress >= 0.4 ? `<ellipse cx="30" cy="${top - 3}" rx="4.5" ry="6" fill="#ff9fc2"/>` : progress > 0 ? `<ellipse cx="30" cy="${top}" rx="4" ry="2.4" fill="#7ccf6a"/>` : "";
  return `<svg class="plant ${grow ? "grow" : ""}" viewBox="0 0 60 90" style="--from:${from}" aria-hidden="true">
    <g class="stalk"><rect x="28.5" y="${top}" width="3" height="${h}" rx="1.5" fill="#3d8b40"/>${lv}${flower}</g>
    <path d="M12 68 h36 l-4 20 h-28 Z" fill="#c8693c"/><rect x="10" y="64" width="40" height="7" rx="2" fill="#d97b4a"/></svg>`;
}
const cloud = `<svg class="raincloud" viewBox="0 0 60 40" aria-hidden="true"><g fill="#cfd8e3"><circle cx="20" cy="16" r="9"/><circle cx="32" cy="12" r="11"/><circle cx="44" cy="17" r="8"/><rect x="14" y="16" width="36" height="9" rx="4"/></g><g stroke="#7fb3ff" stroke-width="2" stroke-linecap="round"><path d="M22 30 l-2 6"/><path d="M32 30 l-2 6"/><path d="M42 30 l-2 6"/></g></svg>`;

/* ================================================================ ARENA (layar proyektor) */
// players: [{id, name, avatar, score, correct, wrong, lastQ, lastCorrect, answered, joinedAt}]
// opts: { answeredIds?: Set, mode: "mini" | "full" }
export function arena(themeKey, s, players, opts = {}) {
  const mode = opts.mode || "full", answered = opts.answeredIds || new Set();
  const list = players.slice().sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const LIMIT = mode === "mini" ? 40 : 48;
  const shown = list.slice(0, LIMIT), more = list.length - shown.length;
  const tag = (p) => `<span class="nm">${esc(p.name)}</span>`;
  const ans = (p) => (s.status === "question" && answered.has(p.id) ? " answered" : "");
  const moreTag = more > 0 ? `<div class="more">+${more} lainnya</div>` : "";

  if (themeKey === "robot") {
    const alive = shown.filter((p) => !gameState(p, s).out || gameState(p, s).justOut);
    const eaten = list.filter((p) => gameState(p, s).out && !gameState(p, s).justOut);
    const chomp = shown.some((p) => gameState(p, s).justOut);
    return `<div class="arena robot-arena ${mode}">
      <div class="crowd">${alive.map((p, k) => { const g = gameState(p, s);
        return `<div class="pl${ans(p)}${g.justOut ? " eaten-now" : g.justHit ? " hit" : ""}" style="--d:${(k % 12) * 40}ms">${avatar(p.avatar, g.justHit ? "sad" : "happy")}${hearts(g)}${tag(p)}</div>`; }).join("")}${moreTag}</div>
      <div class="robot-box">${robotSVG(chomp)}
        <div class="belly-list" aria-label="Sudah dimakan robot">${eaten.slice(0, 18).map((p) => `<span title="${esc(p.name)}">${avatar(p.avatar, "out")}</span>`).join("")}${eaten.length > 18 ? `<b>+${eaten.length - 18}</b>` : ""}</div>
        <div class="robot-cap">${eaten.length ? `${eaten.length} dimakan` : "Robot lapar…"}</div></div>
    </div>`;
  }
  if (themeKey === "balon") {
    return `<div class="arena balon-arena ${mode}"><div class="sky">${shown.map((p, k) => { const g = gameState(p, s);
      return `<div class="pl${ans(p)}${g.out ? " landed" : ""}${g.justHit ? " hit" : ""}" style="--h:${g.lives / g.max};--d:${(k % 12) * 40}ms">${g.out && !g.justHit ? "" : balloons(g, k)}${avatar(p.avatar, g.out ? "sad" : g.justHit ? "sad" : "happy")}${tag(p)}</div>`; }).join("")}${moreTag}</div><div class="ground"></div></div>`;
  }
  if (themeKey === "roket") {
    const lanes = list.slice().sort((a, b) => (b.score || 0) - (a.score || 0) || (a.joinedAt || 0) - (b.joinedAt || 0)).slice(0, mode === "mini" ? 8 : 10);
    const rest = list.length - lanes.length;
    return `<div class="arena roket-arena ${mode}"><div class="stars"></div>
      ${lanes.map((p, k) => { const g = gameState(p, s);
        return `<div class="lane${ans(p)}"><span class="rk">${k + 1}</span>${tag(p)}<div class="track"><div class="ship${g.justRight ? " fly" : ""}" style="--from:${g.prevProgress};--to:${g.progress}">${rocket(avatar(p.avatar))}</div></div></div>`; }).join("")}
      ${rest > 0 ? `<div class="more">+${rest} roket lainnya</div>` : ""}
      <svg class="moon" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" fill="#f4efd8"/><circle cx="28" cy="30" r="7" fill="#e0d9bd"/><circle cx="50" cy="52" r="9" fill="#e0d9bd"/><circle cx="52" cy="24" r="4" fill="#e0d9bd"/></svg></div>`;
  }
  if (themeKey === "kebun") {
    return `<div class="arena kebun-arena ${mode}"><div class="garden">${shown.map((p, k) => { const g = gameState(p, s);
      return `<div class="pl${ans(p)}" style="--d:${(k % 12) * 40}ms">${g.justHit ? cloud : ""}${plant(Math.sqrt(g.progress), Math.sqrt(g.prevProgress) / Math.max(Math.sqrt(g.progress), 0.0001), g.justRight)}<span class="pot-av">${avatar(p.avatar, g.justHit ? "sad" : "happy")}</span>${tag(p)}</div>`; }).join("")}${moreTag}</div></div>`;
  }
  // klasik
  return `<div class="players">${list.map((p) => `<span class="chip${ans(p)}">${avatar(p.avatar)}${esc(p.name)}</span>`).join("")}</div>`;
}

/* ================================================================ HP MAHASISWA */
export function meWidget(themeKey, s, me) {
  const g = gameState(me, s);
  if (themeKey === "robot") {
    if (g.out) return `<div class="mw robot-mw"><div class="mw-robot">${robotSVG(g.justOut)}</div><p class="small muted">Kamu sudah dimakan robot. Tetap jawab ya, nilaimu tetap dihitung!</p></div>`;
    return `<div class="mw">${avatar(me.avatar, g.justHit ? "sad" : "happy", "big")}${hearts(g)}<p class="small muted">${g.lives} dari ${g.max} nyawa tersisa</p></div>`;
  }
  if (themeKey === "balon") {
    return `<div class="mw balon-mw">${g.out && !g.justHit ? "" : balloons(g, 0)}${avatar(me.avatar, g.out || g.justHit ? "sad" : "happy", "big")}<p class="small muted">${g.out ? "Balonmu habis, tapi tetap ikut menjawab ya!" : `${g.lives} balon tersisa`}</p></div>`;
  }
  if (themeKey === "roket") {
    return `<div class="mw roket-mw"><div class="track"><div class="ship${g.justRight ? " fly" : ""}" style="--from:${g.prevProgress};--to:${g.progress}">${rocket(avatar(me.avatar))}</div></div><p class="small muted">${Math.round(g.progress * 100)}% menuju bulan</p></div>`;
  }
  if (themeKey === "kebun") {
    return `<div class="mw kebun-mw">${g.justHit ? cloud : ""}${plant(Math.sqrt(g.progress), Math.sqrt(g.prevProgress) / Math.max(Math.sqrt(g.progress), 0.0001), g.justRight)}<span class="pot-av">${avatar(me.avatar)}</span></div>`;
  }
  return `<div class="mw">${avatar(me.avatar, g.justHit ? "sad" : "happy", "big")}</div>`;
}
export function themedFeedback(themeKey, s, me) {
  const g = gameState(me, s);
  if (themeKey === "robot") return g.justOut ? "Nyam! Kamu dimakan robot!" : g.justHit ? (g.out ? "Tetap semangat!" : "Aduh, nyawamu berkurang!") : "Robot gagal menangkapmu!";
  if (themeKey === "balon") return g.justHit ? (g.out ? "Balon terakhir meletus!" : "Dor! Satu balon meletus.") : "Balonmu tetap terbang!";
  if (themeKey === "roket") return g.justRight ? "Roketmu melaju!" : "Roketmu tertahan.";
  if (themeKey === "kebun") return g.justRight ? "Tanamanmu tumbuh!" : "Hujan sebentar, coba lagi ya.";
  return "";
}
export function avatarPicker(selected) {
  return `<div class="av-pick" role="radiogroup" aria-label="Pilih avatar">${AVATARS.map((a, i) => `<button type="button" class="av-opt" role="radio" aria-checked="${i === selected}" data-av="${i}" title="${a.n}">${avatar(i)}</button>`).join("")}</div>`;
}
