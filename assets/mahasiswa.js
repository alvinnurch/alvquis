import {
  configured, auth, db, authReady, signInAnonymously,
  getDocFromServer, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, deleteField,
} from "./fb.js?v=2026.10.04-r8";
import { esc, fmt, shape, toast, LETTERS, OPT_CLASS, shuffledIdx, fmtDate, mmss, setupNotice } from "./ui.js?v=2026.10.04-r8";
import { THEMES, themeOf, avatar, avatarPicker, meWidget, themedFeedback } from "./themes.js?v=2026.10.04-r8";
import { isChoice } from "./qtypes.js?v=2026.10.04-r8";
import { VERSION } from "./version.js?v=2026.10.04-r8";
import { mountSeq, solutionInline } from "./qwidgets.js?v=2026.10.04-r8";

window.__alvOK = true;
const $view = document.getElementById("view");
const $who = document.getElementById("who");
const store = {
  get(k, d) { try { const v = localStorage.getItem("hk:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("hk:" + k, JSON.stringify(v)); } catch {} },
};

let uid = null, pin = null, S = null, unsubs = [], tick = null;

boot();
async function boot() {
  if (!configured) { $view.innerHTML = setupNotice(); return; }
  $view.innerHTML = `<p class="muted">Menyiapkan…</p>`;
  try {
    let u = await authReady();
    if (!u) u = (await signInAnonymously(auth)).user;
    uid = u.uid;
  } catch (e) {
    $view.innerHTML = `<div class="notice">Tidak bisa terhubung (${esc(e.code || e.message)}). Periksa koneksi internet lalu muat ulang halaman.</div>`;
    return;
  }
  const urlPin = new URLSearchParams(location.search).get("pin");
  renderJoin(urlPin || "");
}

function setView(html, center = false) {
  $view.className = "m-main" + (center ? " center" : "");
  $view.innerHTML = html;
}
function stopAll() { unsubs.forEach((f) => f()); unsubs = []; clearInterval(tick); tick = null; clearInterval(watchdog); watchdog = null; }

/* ---------------------------------------------------------------- join */
function renderJoin(prefill, err) {
  stopAll(); $who.textContent = "";
  setView(`
    <div class="hero-join"><span class="eyebrow">Kuis &amp; ujian kelas</span><h1>Masukkan PIN</h1><p class="muted">PIN 6 angka ada di layar proyektor atau di pengumuman dosen.</p></div>
    <form id="f" class="stack">
      <input class="pin-input" id="pin" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" placeholder="000000" value="${esc(prefill)}" aria-label="PIN kuis">
      ${err ? `<p class="small" style="color:var(--salah)">${esc(err)}</p>` : ""}
      <button class="btn primary lg block">Masuk</button>
    </form>
    <p class="small muted" style="text-align:center">Dosen? <a href="dosen.html">Masuk ke halaman dosen</a></p>`);
  const inp = $view.querySelector("#pin");
  inp.oninput = () => { inp.value = inp.value.replace(/\D/g, "").slice(0, 6); };
  $view.querySelector("#f").onsubmit = async (e) => {
    e.preventDefault();
    const p = inp.value.trim();
    if (!/^\d{6}$/.test(p)) return renderJoin(p, "PIN harus 6 angka.");
    const btn = $view.querySelector("#f button"); btn.disabled = true; btn.textContent = "Memeriksa PIN…";
    let snap;
    try { snap = await withTimeout(getDoc(doc(db, "sessions", p)), 15000); }
    catch (er) { console.error(er); return renderJoin(p, er.code === "timeout" ? "Koneksi lambat, server belum menjawab. Periksa internet lalu tekan Masuk lagi." : `Tidak bisa membuka sesi (${er.code || er.message}). Coba lagi.`); }
    if (!snap?.exists()) return renderJoin(p, "PIN tidak ditemukan. Periksa lagi angkanya.");
    pin = p; S = snap.data();
    const mineRef = S.mode === "live" ? doc(db, "sessions", pin, "players", uid) : doc(db, "sessions", pin, "submissions", uid);
    const mine = await withTimeout(getDoc(mineRef), 10000).catch(() => null);
    if (mine?.exists()) return S.mode === "live" ? startLive() : startMandiri();
    if (S.mode === "live" && S.status === "ended") return renderJoin(p, "Kuis ini sudah selesai.");
    if (S.mode === "mandiri" && !isOpen(S)) return renderJoin(p, "Ujian ini sudah ditutup.");
    renderIdentity();
  };
}

function renderIdentity() {
  const prof = store.get("profile", { name: "", nim: "" });
  let av = Number.isInteger(prof.avatar) ? prof.avatar : Math.floor(Math.random() * 12);
  setView(`
    <div class="stack tight"><span class="eyebrow">${S.mode === "live" ? "Kuis live" : "Ujian mandiri"} · PIN <span class="mono">${esc(pin)}</span></span><h1>${esc(S.title)}</h1>${S.course ? `<p class="muted">${esc(S.course)}</p>` : ""}</div>
    <form id="f" class="stack">
      <label class="field">Nama lengkap<input type="text" id="nm" maxlength="60" required autocomplete="name" value="${esc(prof.name)}"></label>
      <label class="field">NIM<input type="text" id="nim" maxlength="30" inputmode="numeric" required value="${esc(prof.nim)}"></label>
      ${S.mode === "live" ? `<div class="stack tight"><span style="font-size:13px;font-weight:600;color:var(--ink-muted)">Pilih avatar</span>${avatarPicker(av)}</div>` : ""}
      <p class="small muted">Nama tampil di layar kelas. NIM hanya terlihat oleh dosen untuk rekap nilai.</p>
      <button class="btn primary lg block">${S.mode === "live" ? "Gabung kuis" : "Lanjut"}</button>
      <button type="button" class="btn ghost" id="back">Ganti PIN</button>
    </form>`);
  $view.querySelector("#back").onclick = () => renderJoin(pin);
  $view.querySelectorAll(".av-opt").forEach((b) => b.onclick = () => { av = +b.dataset.av; $view.querySelectorAll(".av-opt").forEach((x) => x.setAttribute("aria-checked", String(x === b))); });
  $view.querySelector("#f").onsubmit = async (e) => {
    e.preventDefault();
    const name = $view.querySelector("#nm").value.trim().replace(/\s+/g, " ");
    const nim = $view.querySelector("#nim").value.trim();
    if (!name || !nim) return toast("Isi nama dan NIM.");
    store.set("profile", { name, nim, avatar: av });
    try {
      if (S.mode === "live") {
        const t0 = Date.now();
        await setDoc(doc(db, "sessions", pin, "players", uid), { name, nim, avatar: av, score: 0, joinedAt: serverTimestamp(), ...(S.ownerUid ? { ownerUid: S.ownerUid } : {}) });
        joinMid = (t0 + Date.now()) / 2;
        startLive();
      } else {
        renderIntro(name, nim);
      }
    } catch (err) { toast(`Gagal bergabung (${err.code || err.message}). Mungkin sesi sudah ditutup.`, 6000); console.error(err); }
  };
}

/* ================================================================ LIVE */
let watchdog = null, lastSnapAt = 0, checking = false;
let P = null, myAns = {}, qSeenAt = 0, lastQ = -1, sig = "", joinMid = null, offset = null, retry = null, revealWait = null, revealTimer = null;

// Selisih jam HP dengan jam server Firebase, diukur dari cap waktu saat bergabung.
// Dipakai agar hitung mundur di HP sama dengan di layar proyektor.
function questionEnd(q) {
  const st = S.questionStartedAt?.toMillis?.();
  if (st != null && offset != null) {
    const end = st - offset + q.time * 1000, rem = end - Date.now();
    if (rem <= q.time * 1000 + 1500 && rem > -15000) return end;
  }
  return qSeenAt + q.time * 1000;
}

function startLive() {
  stopAll(); clearTimeout(retry); sig = "";
  myAns = store.get("ans:" + pin, {});
  offset = store.get("off:" + pin, null);
  const lost = (e) => {
    console.error(e);
    setView(`<div class="big-icon wait">…</div><h2>Menyambung ulang…</h2><p class="muted small">Koneksi ke kuis terputus (${esc(e.code || e.message)}). Mencoba lagi otomatis.</p>`, true);
    stopAll(); retry = setTimeout(startLive, 3000);
  };
  unsubs.push(onSnapshot(doc(db, "sessions", pin), (s) => {
    lastSnapAt = Date.now();
    const d = s.data(); if (!d) return renderJoin("", "Sesi telah dihapus oleh dosen.");
    applySession(d);
  }, lost));
  unsubs.push(onSnapshot(doc(db, "sessions", pin, "players", uid), (s) => applyPlayer(s.data() || null), lost));
  // Penjaga: bila koneksi langsung ke server diam-diam macet, ambil keadaan terbaru langsung dari server.
  lastSnapAt = Date.now();
  watchdog = setInterval(checkLive, 4000);
}

// Urutan tahap kuis. Dosen tidak pernah mundur, jadi data yang "lebih tua" (dari cache) diabaikan.
function stageRank(x) {
  if (!x) return -1;
  if (x.status === "ended") return 1e9;
  const st = { lobby: 0, question: 1, reveal: x.counts != null ? 3 : 2, leaderboard: 4 }[x.status] ?? 0;
  return (x.current ?? -1) * 10 + st + 10;
}
function applySession(d) {
  if (S && S.pin === d.pin && stageRank(d) < stageRank(S)) return;   // data basi
  S = d;
  if (needsUpdate(S)) return;
  if (S.status === "question" && S.current !== lastQ) { lastQ = S.current; qSeenAt = Date.now(); }
  renderLive();
}
function applyPlayer(d) {
  if (P && d && (d.lastQ ?? -1) < (P.lastQ ?? -1)) return;            // data basi
  P = d; $who.textContent = P ? `${P.name} · ${(P.score || 0).toLocaleString("id-ID")}` : "";
  if (P?.joinedAt?.toMillis && joinMid != null) {   // baru saja bergabung: ukur selisih jam sekarang
    offset = P.joinedAt.toMillis() - joinMid; joinMid = null; store.set("off:" + pin, offset);
  }
  renderLive();
}
async function checkLive(force) {
  if (!pin || checking || (!force && document.hidden)) return;
  if (!force && Date.now() - lastSnapAt < 6000) return;           // koneksi langsung masih hidup
  if (!force && S?.status === "ended") return;
  checking = true;
  try {
    const sd = (await withTimeout(getDocFromServer(doc(db, "sessions", pin)), 8000)).data();
    if (!sd) return;
    const behind = stageRank(sd) > stageRank(S);
    const needP = sd.status !== "lobby" && sd.status !== "question" && (P?.lastQ ?? -1) !== sd.current;
    lastSnapAt = Date.now();
    if (behind) applySession(sd);
    if (needP || behind) {
      const pd = (await withTimeout(getDocFromServer(doc(db, "sessions", pin, "players", uid)), 8000)).data();
      if (pd) applyPlayer(pd);
    }
    if (behind) { console.warn("AlvQuis: koneksi langsung tertinggal, menyambung ulang"); resubscribe(); }
  } catch (e) { console.warn("checkLive", e); }
  finally { checking = false; }
}
// Pasang ulang pendengar tanpa mengubah tampilan (S & P tetap; data basi diabaikan oleh applySession/applyPlayer).
function resubscribe() {
  if (!pin) return;
  startLive(); renderLive();
}
const withTimeout = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error("timeout"), { code: "timeout" })), ms))]);
// HP baru dibuka lagi / sinyal kembali: langsung periksa keadaan terbaru.
document.addEventListener("visibilitychange", () => { if (!document.hidden && watchdog) checkLive(true); });
window.addEventListener("online", () => { if (watchdog) checkLive(true); });
window.addEventListener("pageshow", (e) => { if (e.persisted && watchdog) checkLive(true); });

function renderLive() {
  if (!S || !P) return;
  const q = S.question, i = S.current, th = themeOf(S), themed = th !== "klasik";
  // Gambar ulang hanya bila keadaan berubah, agar jawaban yang sedang disusun tidak hilang.
  const key = JSON.stringify([S.status, i, myAns[i] != null, P.lastQ, P.score, P.rank, P.wrong, S.counts != null, S.questionStartedAt?.toMillis?.() ?? 0]);
  if (key === sig) return; sig = key;
  clearInterval(tick); tick = null;
  if (S.status === "lobby") {
    return setView(`${avatar(P.avatar, "happy", "big")}<h1>Kamu sudah masuk!</h1><p class="muted">Lihat namamu di layar kelas. Kuis dimulai sebentar lagi.</p><p class="scorebadge">${esc(P.name)}</p>${themed ? `<div class="card stack tight"><b>Tema: ${esc(THEMES[th].name)}</b><span class="small muted">${esc(THEMES[th].desc)}</span>${THEMES[th].lives ? `<span class="small muted">Kamu punya ${S.lives || 3} ${th === "balon" ? "balon" : "nyawa"}.</span>` : ""}</div>` : ""}`, true);
  }
  if (S.status === "question" && q) {
    if (myAns[i] != null) {
      return setView(`<div class="big-icon wait">${Number.isInteger(myAns[i]) ? shape(myAns[i]) : "✓"}</div><h2>Jawaban terkirim</h2><p class="muted">Menunggu teman lain dan waktu habis…</p>${themed ? meWidget(th, S, P) : ""}`, true);
    }
    const bar = `<div class="m-bar"><span>Soal ${i + 1} dari ${S.total}${q.points === 2000 ? " · poin ganda" : ""}</span><span class="clock" id="clk">${q.time}</span></div>
      <p class="m-q">${fmt(q.text)}</p>`;
    if (!isChoice(q)) {
      setView(`${bar}<div id="seq" class="stack tight"></div><button class="btn primary lg block seq-submit" id="send" disabled>Kirim jawaban</button>`);
      const clk = $view.querySelector("#clk"), send = $view.querySelector("#send");
      const end = questionEnd(q);
      tick = setInterval(() => {
        const left = (end - Date.now()) / 1000;
        clk.textContent = Math.max(0, Math.ceil(left)); clk.classList.toggle("warn", left <= 5);
        if (left <= 0) timeUp();
      }, 200);
      let val = null;
      mountSeq($view.querySelector("#seq"), q, null, (v) => { val = v; send.disabled = !v; });
      send.onclick = async () => {
        send.disabled = true; send.textContent = "Mengirim…";
        try {
          await setDoc(doc(db, "sessions", pin, "answers", `${uid}_${i}`), { uid, q: i, choice: val, at: serverTimestamp(), ...(S.ownerUid ? { ownerUid: S.ownerUid } : {}) });
          myAns[i] = val; store.set("ans:" + pin, myAns); sig = ""; renderLive();
        } catch (e) { answerFailed(e); }
      };
      return;
    }
    const n = q.options.length;
    setView(`${bar}
      <div class="m-tiles">${q.options.map((o, k) => `<button class="m-tile ${OPT_CLASS[k]}" data-k="${k}" style="${n === 3 && k === 2 ? "grid-column:span 2" : ""}">${shape(k)}<span>${fmt(o)}</span></button>`).join("")}</div>`);
    const clk = $view.querySelector("#clk"), end = questionEnd(q);
    tick = setInterval(() => {
      const left = (end - Date.now()) / 1000;
      clk.textContent = Math.max(0, Math.ceil(left)); clk.classList.toggle("warn", left <= 5);
      if (left <= 0) timeUp();
    }, 200);
    $view.querySelectorAll(".m-tile").forEach((b) => b.onclick = async () => {
      const k = +b.dataset.k;
      $view.querySelectorAll(".m-tile").forEach((x) => { x.disabled = true; if (x !== b) x.style.opacity = ".3"; });
      try {
        await setDoc(doc(db, "sessions", pin, "answers", `${uid}_${i}`), { uid, q: i, choice: k, at: serverTimestamp(), ...(S.ownerUid ? { ownerUid: S.ownerUid } : {}) });
        myAns[i] = k; store.set("ans:" + pin, myAns); sig = ""; renderLive();
      } catch (e) { answerFailed(e); }
    });
    return;
  }
  if (S.status === "reveal") {
    if (S.counts == null || P.lastQ !== i) {
      // Biasanya hanya 1–2 detik. Bila lebih lama, tampilkan hasil dari jawaban sendiri agar HP tidak macet.
      if (!revealWait || revealWait.i !== i) revealWait = { i, t: Date.now() };
      const waited = Date.now() - revealWait.t;
      clearTimeout(revealTimer); revealTimer = setTimeout(() => { sig = ""; renderLive(); }, 2500);
      if (waited < 5000) return setView(`<div class="big-icon wait">…</div><h2>Menghitung hasil</h2>`, true);
      const mine = myAns[i];
      if (S.counts != null && isChoice(q) && Number.isInteger(S.correct)) {
        const ok = mine === S.correct;
        return setView(`<div class="big-icon ${ok ? "ok" : "no"}">${mine == null ? "–" : ok ? "✓" : "✕"}</div><h1>${mine == null ? "Tidak menjawab" : ok ? "Benar!" : "Kurang tepat"}</h1>${ok ? "" : `<p class="muted">Jawaban benar: ${rightText()}</p>`}<p class="small muted">Skor sedang diperbarui oleh dosen.</p>`, true);
      }
      return setView(`<div class="big-icon wait">…</div><h2>${mine == null ? "Menunggu hasil" : "Jawabanmu sudah terkirim"}</h2><p class="small muted">Dosen sedang menghitung skor. Lihat layar kelas; HP ini akan menyesuaikan sendiri.</p>`, true);
    }
    clearTimeout(revealTimer);
    if (themed) {
      const right = rightText();
      return setView(`${meWidget(th, S, P)}<h1>${P.lastCorrect ? "Benar!" : P.answered ? "Kurang tepat" : "Tidak menjawab"}</h1>
        <p><b>${esc(themedFeedback(th, S, P))}</b></p>
        ${P.lastCorrect ? `<p class="scorebadge">+${(P.lastPoints || 0).toLocaleString("id-ID")}</p>` : `<p class="muted">Jawaban benar: ${right}</p>`}${rankLine()}`, true);
    }
    if (!P.answered) return setView(`<div class="big-icon no">–</div><h1>Tidak menjawab</h1><p class="muted">Jawaban benar: ${rightText()}</p>${rankLine()}`, true);
    return P.lastCorrect
      ? setView(`<div class="big-icon ok">✓</div><h1>Benar!</h1><p class="scorebadge">+${(P.lastPoints || 0).toLocaleString("id-ID")}</p>${rankLine()}`, true)
      : setView(`<div class="big-icon no">✕</div><h1>Kurang tepat</h1><p class="muted">Jawaban benar: ${rightText()}</p>${rankLine()}`, true);
  }
  if (S.status === "leaderboard") {
    return setView(`${themed ? meWidget(th, S, P) : ""}<span class="eyebrow">Papan skor</span><h1>Peringkat ${P.rank || "–"}</h1><p class="scorebadge">${(P.score || 0).toLocaleString("id-ID")} poin</p><p class="muted">Lihat layar kelas untuk lima besar.</p>`, true);
  }
  if (S.status === "ended") {
    return setView(`${themed ? meWidget(th, S, P) : avatar(P.avatar, "happy", "big")}<span class="eyebrow">Kuis selesai</span><h1>${P.rank === 1 ? "Juara 1!" : `Peringkat ${P.rank || "–"}`}</h1>
      <p class="scorebadge">${(P.score || 0).toLocaleString("id-ID")} poin</p>
      <p class="muted">${P.correct || 0} dari ${S.total} soal dijawab benar.</p>
      <button class="btn" id="out">Keluar</button>`, true) || bindOut();
  }
}
// Dosen memakai versi aplikasi yang lebih baru: muat ulang halaman ini sekali agar tidak memakai file lama.
function needsUpdate(S) {
  if (!S?.appVersion || S.appVersion === VERSION) return false;
  let tried = null; try { tried = sessionStorage.getItem("alv:upd"); } catch {}
  if (tried === S.appVersion) return false;
  try { sessionStorage.setItem("alv:upd", S.appVersion); } catch {}
  setView(`<div class="big-icon wait">↻</div><h2>Memperbarui aplikasi…</h2>`, true);
  location.replace(location.pathname + "?pin=" + encodeURIComponent(pin) + "&v=" + encodeURIComponent(S.appVersion));
  return true;
}
function timeUp() {
  clearInterval(tick); tick = null;
  setView(`<div class="big-icon wait">⏱</div><h2>Waktu habis</h2><p class="muted">Menunggu dosen membuka jawaban…</p>`, true);
}
function answerFailed(e) {
  console.error(e);
  const late = e?.code === "permission-denied";
  setView(`<div class="big-icon no">!</div><h2>${late ? "Jawaban terlambat" : "Jawaban gagal terkirim"}</h2><p class="muted">${late ? "Soal sudah ditutup sebelum jawabanmu sampai." : "Periksa koneksi internet. Kalau soal masih berjalan, coba jawab lagi."}</p>`, true);
  if (!late) { sig = ""; setTimeout(renderLive, 1500); }
}
function rightText() {
  const q = S.question;
  return isChoice(q) ? `<b>${LETTERS[S.correct]}. ${fmt(q?.options?.[S.correct])}</b>` : `<b>${fmt(solutionInline(q.kind, S.solution))}</b>`;
}
function rankLine() { return P.rank ? `<p class="muted">Peringkat ${P.rank} · ${(P.score || 0).toLocaleString("id-ID")} poin</p>` : ""; }
function bindOut() { $view.querySelector("#out")?.addEventListener("click", () => { stopAll(); renderJoin(""); }); }

/* ================================================================ MANDIRI */
let SUB = null, order = [], cur = 0, endAt = 0, submitting = false, lastSubState = "";

function isOpen(s) {
  return s.status === "open" && (!s.deadline || s.deadline.toMillis() > Date.now());
}

function renderIntro(name, nim) {
  const n = S.questions.length;
  setView(`
    <div class="stack tight"><span class="eyebrow">Ujian mandiri · PIN <span class="mono">${esc(pin)}</span></span><h1>${esc(S.title)}</h1></div>
    <div class="card stack tight">
      <div class="row between"><span class="muted">Jumlah soal</span><b class="mono">${n}</b></div>
      <div class="row between"><span class="muted">Durasi</span><b class="mono">${S.durationMin} menit</b></div>
      <div class="row between"><span class="muted">Ditutup</span><b>${fmtDate(S.deadline)}</b></div>
      <div class="row between"><span class="muted">Peserta</span><b>${esc(name)} · <span class="mono">${esc(nim)}</span></b></div>
    </div>
    <ul class="small muted" style="margin:0;padding-left:20px;display:grid;gap:4px">
      <li>Waktu mulai berjalan saat Anda menekan <b>Mulai mengerjakan</b> dan tidak berhenti walau halaman ditutup.</li>
      <li>Setiap jawaban tersimpan otomatis. Bila koneksi putus, buka lagi halaman ini dan masukkan PIN yang sama di perangkat yang sama.</li>
      <li>Saat waktu habis, jawaban dikumpulkan otomatis.</li>
    </ul>
    <button class="btn primary lg block" id="go">Mulai mengerjakan</button>`);
  $view.querySelector("#go").onclick = async (e) => {
    e.target.disabled = true;
    try {
      await setDoc(doc(db, "sessions", pin, "submissions", uid), { name, nim, answers: {}, status: "progress", startedAt: serverTimestamp(), updatedAt: serverTimestamp(), ...(S.ownerUid ? { ownerUid: S.ownerUid } : {}) });
      startMandiri();
    } catch (err) { e.target.disabled = false; toast(`Tidak bisa memulai (${err.code || err.message}). Ujian mungkin sudah ditutup.`, 6000); console.error(err); }
  };
}

function startMandiri() {
  stopAll();
  const n = S.questions.length;
  order = S.shuffleQ ? shuffledIdx(n, uid + pin) : [...Array(n).keys()];
  cur = store.get("cur:" + pin, 0);
  const lost = (e) => { console.error(e); toast("Koneksi terputus (" + (e.code || e.message) + "). Memuat ulang…"); setTimeout(() => startMandiri(), 3000); };
  unsubs.push(onSnapshot(doc(db, "sessions", pin), (s) => { S = s.data(); if (!S) return renderJoin("", "Sesi telah dihapus oleh dosen."); renderMandiri(); }, lost));
  unsubs.push(onSnapshot(doc(db, "sessions", pin, "submissions", uid), (s) => {
    const first = !SUB; SUB = s.data() || null;
    if (!SUB) return;
    $who.textContent = `${SUB.name} · ${SUB.nim}`;
    const started = SUB.startedAt?.toMillis?.() ?? Date.now();
    endAt = started + S.durationMin * 60e3;
    if (S.deadline) endAt = Math.min(endAt, S.deadline.toMillis());
    // Gambar ulang hanya bila perlu, agar komponen urut/cocok yang sedang diisi tidak ter-reset.
    const st = SUB.status + "|" + (SUB.nilai ?? "");
    if (first || st !== lastSubState) { lastSubState = st; renderMandiri(); }
  }, lost));
}

function optOrder(qi) {
  const q = S.questions[qi];
  return S.shuffleOpt && q.kind !== "bs" ? shuffledIdx(q.options.length, uid + pin + ":" + qi) : [...q.options.keys()];
}

function renderMandiri() {
  if (!S || !SUB) return;
  clearInterval(tick); tick = null;
  const n = S.questions.length;
  if (SUB.status === "submitted") {
    const done = Object.keys(SUB.answers || {}).length;
    if (S.resultsPublished && SUB.nilai != null) {
      return setView(`<span class="eyebrow">Nilai</span><h1 class="mono" style="font-size:56px">${String(SUB.nilai).replace(".", ",")}</h1><p class="muted">${SUB.right} dari ${SUB.total} soal benar</p><p class="small muted">${esc(S.title)}</p>`, true);
    }
    return setView(`<div class="big-icon ok">✓</div><h1>Jawaban terkumpul</h1><p class="muted">${done} dari ${n} soal terjawab. Dikumpulkan ${fmtDate(SUB.submittedAt)}.</p><p class="small muted">Nilai akan muncul di halaman ini setelah dosen mengumumkannya. Masukkan PIN yang sama untuk melihatnya nanti.</p>`, true);
  }
  if (S.status !== "open" || Date.now() > endAt + 60e3) {
    return setView(`<div class="big-icon wait">⏱</div><h1>Waktu habis</h1><p class="muted">Jawaban yang sudah tersimpan tetap dinilai oleh dosen.</p>`, true);
  }
  cur = Math.min(Math.max(cur, 0), n - 1); store.set("cur:" + pin, cur);
  const qi = order[cur], q = S.questions[qi], picked = SUB.answers?.[qi];
  const answered = (k) => SUB.answers?.[order[k]] != null;
  const doneCount = order.filter((_, k) => answered(k)).length;
  setView(`
    <div class="m-bar"><span>Soal ${cur + 1} dari ${n} · ${doneCount} terjawab</span><span class="clock" id="clk">${mmss((endAt - Date.now()) / 1000)}</span></div>
    <p class="m-q">${fmt(q.text)}</p>
    ${isChoice(q) ? `<div class="stack tight" role="group" aria-label="Pilihan jawaban">
      ${optOrder(qi).map((oi, pos) => `<button class="choice" data-oi="${oi}" aria-pressed="${picked === oi}"><span class="badge ${OPT_CLASS[pos]}">${shape(pos)}</span><span>${fmt(q.options[oi])}</span></button>`).join("")}
    </div>` : `<div id="seq" class="stack tight"></div>`}
    <div class="row between">
      <button class="btn" id="prev" ${cur === 0 ? "disabled" : ""}>← Sebelumnya</button>
      ${cur < n - 1 ? `<button class="btn primary" id="next">Berikutnya →</button>` : `<button class="btn gold" id="finish">Kumpulkan</button>`}
    </div>
    <div class="stack tight"><span class="eyebrow">Navigasi soal</span>
      <div class="exam-nav">${order.map((_, k) => `<button data-go="${k}" class="${answered(k) ? "done" : ""} ${k === cur ? "cur" : ""}" aria-label="Soal ${k + 1}${answered(k) ? ", terjawab" : ""}">${k + 1}</button>`).join("")}</div>
    </div>
    <div id="confirm" class="card stack tight" hidden>
      <p><b>Kumpulkan sekarang?</b> ${doneCount < n ? `Masih ada <b>${n - doneCount}</b> soal belum dijawab.` : "Semua soal sudah dijawab."} Setelah dikumpulkan, jawaban tidak bisa diubah.</p>
      <div class="row"><button class="btn" id="cancel">Periksa lagi</button><button class="btn gold" id="sure">Ya, kumpulkan</button></div>
    </div>
    ${cur < n - 1 ? `<button class="btn ghost" id="finish2">Selesai lebih awal? Kumpulkan</button>` : ""}`);

  const clk = $view.querySelector("#clk");
  tick = setInterval(() => {
    const left = (endAt - Date.now()) / 1000;
    clk.textContent = mmss(left); clk.classList.toggle("warn", left < 120);
    if (left <= 0) submit(true);
  }, 500);
  $view.querySelectorAll(".choice").forEach((b) => b.onclick = async () => {
    const oi = +b.dataset.oi;
    $view.querySelectorAll(".choice").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $view.querySelector(`[data-go="${cur}"]`)?.classList.add("done");
    try { await updateDoc(doc(db, "sessions", pin, "submissions", uid), { [`answers.${qi}`]: oi, updatedAt: serverTimestamp() }); }
    catch (e) { toast("Jawaban gagal tersimpan. Periksa koneksi."); console.error(e); }
  });
  if (!isChoice(q)) {
    let had = picked != null;
    mountSeq($view.querySelector("#seq"), q, picked, async (v) => {
      $view.querySelector(`[data-go="${cur}"]`)?.classList.toggle("done", !!v);
      if (!v && !had) return;          // belum lengkap dan belum pernah tersimpan: tidak perlu menulis
      had = !!v;
      try { await updateDoc(doc(db, "sessions", pin, "submissions", uid), { [`answers.${qi}`]: v || deleteField(), updatedAt: serverTimestamp() }); }
      catch (e) { toast("Jawaban gagal tersimpan. Periksa koneksi."); console.error(e); }
    });
  }
  $view.querySelector("#prev").onclick = () => { cur--; renderMandiri(); window.scrollTo(0, 0); };
  $view.querySelector("#next")?.addEventListener("click", () => { cur++; renderMandiri(); window.scrollTo(0, 0); });
  $view.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => { cur = +b.dataset.go; renderMandiri(); window.scrollTo(0, 0); });
  const showConfirm = () => { const c = $view.querySelector("#confirm"); c.hidden = false; c.scrollIntoView({ block: "center" }); };
  $view.querySelector("#finish")?.addEventListener("click", showConfirm);
  $view.querySelector("#finish2")?.addEventListener("click", showConfirm);
  $view.querySelector("#cancel").onclick = () => { $view.querySelector("#confirm").hidden = true; };
  $view.querySelector("#sure").onclick = () => submit(false);
}

async function submit(auto) {
  if (submitting) return; submitting = true; clearInterval(tick);
  try {
    await updateDoc(doc(db, "sessions", pin, "submissions", uid), { status: "submitted", submittedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    if (auto) toast("Waktu habis — jawaban dikumpulkan otomatis");
  } catch (e) {
    console.error(e);
    if (!auto) toast("Gagal mengumpulkan. Coba lagi.");
  } finally { submitting = false; }
}
