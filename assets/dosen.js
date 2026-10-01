import {
  configured, auth, db, authReady, GoogleAuthProvider, signInWithPopup, signOut,
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, writeBatch, query, where, increment, Timestamp,
} from "./fb.js";
import { esc, shape, toast, LETTERS, OPT_CLASS, pointsFor, fmtDate, setupNotice } from "./ui.js";
import { SAMPLE_QUIZ, SAMPLE_KIDS } from "./sample-quiz.js";
import { THEMES, THEME_KEYS, themeOf, arena, avatar, gameState } from "./themes.js";
import { Sound } from "./sound.js";
import { isChoice, isCorrect, publicQ, solutionList, newSalt } from "./qtypes.js";
import { stageSeq, stageSolution } from "./qwidgets.js";
// Firestore tidak menerima array di dalam array: pasangan disimpan sebagai {l, r}.
const normQ = (q) => (q.kind === "cocok" && q.pairs?.length && !Array.isArray(q.pairs[0]) ? { ...q, pairs: q.pairs.map((p) => [p.l, p.r]) } : q);

const $view = document.getElementById("view");
const $stage = document.getElementById("stage");
const $dlg = document.getElementById("dlg");
const $tabs = document.getElementById("tabs");

let me = null;              // Firebase user
let quizzes = [];           // [{id, ...}]
let sessions = [];          // [{id, ...}]
let tab = "soal";
let draft = null;           // quiz being edited {id, title, course, questions}
let draftDirty = false;
let rekapPin = null;
const unsubs = [];

/* ---------------------------------------------------------------- boot */
boot();
async function boot() {
  if (!configured) { $view.innerHTML = setupNotice(); return; }
  const u = await authReady();
  if (u && !u.isAnonymous) return checkProfile(u);
  renderLogin();
}

// Siapa pun bisa menjadi dosen: masuk dengan akun Google, lalu mengisi profil singkat (sekali saja).
// Setiap dosen hanya bisa melihat dan mengubah bank soal, sesi, dan nilai miliknya sendiri.
function renderLogin() {
  $tabs.hidden = true;
  $view.innerHTML = `
    <div class="stack" style="max-width:440px;margin:48px auto;text-align:center">
      <h1>Masuk atau daftar sebagai dosen</h1>
      <p class="muted">Gunakan akun Google Anda. Pendaftaran gratis dan langsung aktif. Mahasiswa tidak perlu mendaftar: mereka cukup membuka halaman utama dan memasukkan PIN.</p>
      <button class="btn primary lg block" id="g">Lanjut dengan Google</button>
      <a class="small" href="./">Saya mahasiswa → masuk dengan PIN</a>
    </div>`;
  document.getElementById("g").onclick = async () => {
    try { const res = await signInWithPopup(auth, new GoogleAuthProvider()); checkProfile(res.user); }
    catch (e) { toast("Gagal masuk: " + (e.code || e.message)); }
  };
}

async function checkProfile(u) {
  $view.innerHTML = `<p class="muted">Memeriksa akun…</p>`;
  let prof = null;
  try { prof = (await getDoc(doc(db, "dosen", u.uid))).data() || null; } catch (e) { console.error(e); }
  if (prof) return enter(u, prof);
  renderRegister(u);
}

function renderRegister(u) {
  $tabs.hidden = true;
  $view.innerHTML = `
    <form class="stack" id="reg" style="max-width:480px;margin:40px auto">
      <div class="stack tight"><span class="eyebrow">Pendaftaran dosen</span><h1>Selamat datang!</h1>
        <p class="muted">Lengkapi profil singkat ini. Anda masuk sebagai <b>${esc(u.email || "")}</b>.</p></div>
      <label class="field">Nama lengkap (dengan gelar)<input type="text" id="r-name" maxlength="100" required value="${esc(u.displayName || "")}"></label>
      <label class="field">Kampus / sekolah / lembaga<input type="text" id="r-inst" maxlength="120" required placeholder="mis. UIN Syarif Hidayatullah Jakarta"></label>
      <label class="check"><input type="checkbox" id="r-ok" required>Saya akan memakai AlvQuis untuk kegiatan belajar-mengajar dan menjaga data nilai peserta.</label>
      <button class="btn primary lg block">Daftar &amp; mulai</button>
      <button type="button" class="btn ghost" id="r-out">Pakai akun Google lain</button>
    </form>`;
  $view.querySelector("#r-out").onclick = async () => { await signOut(auth); renderLogin(); };
  $view.querySelector("#reg").onsubmit = async (e) => {
    e.preventDefault();
    const prof = { name: $view.querySelector("#r-name").value.trim(), institution: $view.querySelector("#r-inst").value.trim(), email: u.email || "", createdAt: serverTimestamp() };
    if (!prof.name || !prof.institution) return toast("Isi nama dan lembaga.");
    try { await setDoc(doc(db, "dosen", u.uid), prof); toast("Pendaftaran berhasil"); enter(u, prof); }
    catch (er) { toast("Gagal mendaftar: " + (er.code || er.message)); }
  };
}

function enter(u, prof) {
  me = u;
  $tabs.hidden = false;
  const nm = document.getElementById("who-dosen"); if (nm) nm.textContent = prof?.name || u.email || "";
  unsubs.push(onSnapshot(query(collection(db, "quizzes"), where("ownerUid", "==", me.uid)), (s) => {
    quizzes = s.docs.map((d) => { const x = d.data(); return { id: d.id, ...x, questions: (x.questions || []).map(normQ) }; }).sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    if (tab === "soal" && !draft) render();
  }, (e) => toast("Gagal memuat soal: " + e.code)));
  unsubs.push(onSnapshot(query(collection(db, "sessions"), where("ownerUid", "==", me.uid)), (s) => {
    sessions = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || Date.now()) - (a.createdAt?.toMillis?.() || Date.now()));
    if (tab === "sesi" && !rekapPin) render();
  }, (e) => toast("Gagal memuat sesi: " + e.code)));
  render();
}

$tabs.addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "logout") { unsubs.forEach((f) => f()); await signOut(auth); location.reload(); return; }
  if (draft && draftDirty && !(await ask("Perubahan soal belum disimpan. Tinggalkan editor?", "Tinggalkan"))) return;
  tab = b.dataset.tab; draft = null; draftDirty = false; rekapPin = null;
  render();
});

function render() {
  [...$tabs.querySelectorAll("[data-tab]")].forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === tab)));
  if (tab === "soal") return draft ? renderEditor() : renderQuizList();
  if (tab === "sesi") return rekapPin ? renderRekap(rekapPin) : renderSessions();
}

/* ---------------------------------------------------------------- in-page dialogs */
function ask(message, okLabel = "Ya", danger = false) {
  return new Promise((resolve) => {
    $dlg.innerHTML = `<form method="dialog" class="dlg"><p>${esc(message)}</p>
      <div class="dlg-foot"><button class="btn" value="no">Batal</button><button class="btn ${danger ? "danger" : "primary"}" value="ok">${esc(okLabel)}</button></div></form>`;
    $dlg.onclose = () => resolve($dlg.returnValue === "ok");
    $dlg.showModal();
  });
}

/* ---------------------------------------------------------------- bank soal */
function renderQuizList() {
  $view.innerHTML = `
    <div class="page-head">
      <div class="stack tight"><span class="eyebrow">Bank soal</span><h1>Kuis &amp; ujian Anda</h1></div>
      <div class="row">
        <button class="btn" id="sample">Contoh: Hadis &amp; Teknologi</button>
        <button class="btn" id="sample2">Contoh: Kuis Anak</button>
        <button class="btn primary" id="new">+ Kuis baru</button>
      </div>
    </div>
    <div class="list">
      ${quizzes.length ? quizzes.map((q) => `
        <div class="card item">
          <div style="min-width:0">
            <h3>${esc(q.title || "Tanpa judul")}</h3>
            <div class="meta"><span>${esc(q.course || "—")}</span><span>${q.questions?.length || 0} soal</span><span>Diubah ${fmtDate(q.updatedAt)}</span></div>
          </div>
          <div class="actions">
            <button class="btn sm" data-edit="${q.id}">Edit</button>
            <button class="btn sm primary" data-start="${q.id}">Mulai sesi</button>
          </div>
        </div>`).join("") : `
        <div class="empty">
          <h3>Belum ada kuis</h3>
          <p>Buat kuis baru, tempel soal dari Word, atau muat contoh soal Hadis dan Teknologi untuk mencoba alurnya.</p>
        </div>`}
    </div>`;
  $view.querySelector("#new").onclick = () => openEditor({ id: newId(), title: "", course: "", questions: [blankQ()] }, true);
  $view.querySelector("#sample").onclick = () => openEditor({ id: newId(), ...structuredClone(SAMPLE_QUIZ) }, true);
  $view.querySelector("#sample2").onclick = () => openEditor({ id: newId(), ...structuredClone(SAMPLE_KIDS) }, true);
  $view.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => openEditor(structuredClone(quizzes.find((q) => q.id === b.dataset.edit)), false));
  $view.querySelectorAll("[data-start]").forEach((b) => b.onclick = () => startDialog(quizzes.find((q) => q.id === b.dataset.start)));
}

function newId() { return doc(collection(db, "quizzes")).id; }
function blankQ(kind = "pg") {
  if (kind === "urut") return { kind: "urut", text: "", items: ["", "", ""], time: 45, points: 1000 };
  if (kind === "cocok") return { kind: "cocok", text: "", pairs: [["", ""], ["", ""], ["", ""]], time: 60, points: 1000 };
  return kind === "bs"
    ? { kind: "bs", text: "", options: ["Benar", "Salah"], correct: 0, time: 20, points: 1000 }
    : { kind: "pg", text: "", options: ["", "", "", ""], correct: 0, time: 20, points: 1000 };
}

function openEditor(q, dirty) { draft = q; draftDirty = dirty; renderEditor(); window.scrollTo(0, 0); }

function renderEditor() {
  const d = draft;
  $view.innerHTML = `
    <div class="page-head">
      <div class="stack tight"><button class="btn ghost sm" id="back" style="justify-self:start;padding-left:0">← Bank soal</button><h1>${d.title ? esc(d.title) : "Kuis baru"}</h1></div>
      <div class="row">
        <button class="btn" id="import">Tempel dari teks</button>
        <button class="btn danger" id="del">Hapus</button>
        <button class="btn primary" id="save">Simpan</button>
      </div>
    </div>
    <div class="stack">
      <div class="card grid2">
        <label class="field">Judul kuis<input type="text" id="f-title" value="${esc(d.title)}" placeholder="mis. UTS Hadis dan Teknologi"></label>
        <label class="field">Mata kuliah / kelas<input type="text" id="f-course" value="${esc(d.course)}" placeholder="mis. Hadis dan Teknologi — Kelas A"></label>
      </div>
      <div id="qs" class="stack">${d.questions.map(qCard).join("")}</div>
      <div class="row">
        <button class="btn" data-add="pg">+ Pilihan ganda</button>
        <button class="btn" data-add="bs">+ Benar / salah</button>
        <button class="btn" data-add="urut">+ Mengurutkan</button>
        <button class="btn" data-add="cocok">+ Mencocokkan</button>
        <span class="muted small" style="margin-left:auto">${d.questions.length} soal · beri tanda pada opsi yang benar</span>
      </div>
    </div>`;
  const $qs = $view.querySelector("#qs");
  $view.querySelector("#back").onclick = async () => {
    if (draftDirty && !(await ask("Perubahan belum disimpan. Tinggalkan editor?", "Tinggalkan"))) return;
    draft = null; render();
  };
  $view.querySelector("#f-title").oninput = (e) => { d.title = e.target.value; draftDirty = true; };
  $view.querySelector("#f-course").oninput = (e) => { d.course = e.target.value; draftDirty = true; };
  $view.querySelector("#save").onclick = saveDraft;
  $view.querySelector("#import").onclick = importDialog;
  $view.querySelector("#del").onclick = async () => {
    if (!(await ask("Hapus kuis ini dari bank soal? Sesi dan nilai yang sudah berjalan tidak ikut terhapus.", "Hapus", true))) return;
    try { await deleteDoc(doc(db, "quizzes", d.id)); } catch {}
    draft = null; toast("Kuis dihapus"); render();
  };
  $view.querySelectorAll("[data-add]").forEach((b) => b.onclick = () => { d.questions.push(blankQ(b.dataset.add)); draftDirty = true; renderEditor(); $qs.lastElementChild; const last = $view.querySelector("#qs").lastElementChild; last?.scrollIntoView({ block: "center" }); last?.querySelector("textarea")?.focus(); });

  $qs.addEventListener("input", (e) => {
    const card = e.target.closest("[data-qi]"); if (!card) return;
    const q = d.questions[+card.dataset.qi]; draftDirty = true;
    const f = e.target.dataset.f;
    if (f === "text") q.text = e.target.value;
    else if (f === "opt") q.options[+e.target.dataset.oi] = e.target.value;
    else if (f === "item") q.items[+e.target.dataset.oi] = e.target.value;
    else if (f === "pl") q.pairs[+e.target.dataset.oi][0] = e.target.value;
    else if (f === "pr") q.pairs[+e.target.dataset.oi][1] = e.target.value;
  });
  $qs.addEventListener("change", (e) => {
    const card = e.target.closest("[data-qi]"); if (!card) return;
    const qi = +card.dataset.qi, q = d.questions[qi]; draftDirty = true;
    const f = e.target.dataset.f;
    if (f === "correct") q.correct = +e.target.value;
    else if (f === "time") q.time = +e.target.value;
    else if (f === "points") q.points = +e.target.value;
    else if (f === "nopt") {
      const n = +e.target.value;
      while (q.options.length < n) q.options.push("");
      q.options.length = n; if (q.correct >= n) q.correct = 0; renderEditor();
    }
  });
  $qs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const qi = +b.closest("[data-qi]").dataset.qi, qs = d.questions; draftDirty = true;
    const act = b.dataset.act;
    if (act === "up" && qi > 0) [qs[qi - 1], qs[qi]] = [qs[qi], qs[qi - 1]];
    if (act === "down" && qi < qs.length - 1) [qs[qi + 1], qs[qi]] = [qs[qi], qs[qi + 1]];
    if (act === "dup") qs.splice(qi + 1, 0, structuredClone(qs[qi]));
    if (act === "rm") qs.splice(qi, 1);
    const q = qs[qi], oi = +b.dataset.oi;
    if (act === "add-item") q.kind === "urut" ? q.items.push("") : q.pairs.push(["", ""]);
    if (act === "rm-item") (q.kind === "urut" ? q.items : q.pairs).splice(oi, 1);
    if (act === "item-up" && oi > 0) { const L = q.kind === "urut" ? q.items : q.pairs; [L[oi - 1], L[oi]] = [L[oi], L[oi - 1]]; }
    renderEditor();
  });
}

function seqEditor(q, qi) {
  const list = q.kind === "urut" ? q.items : q.pairs, n = list.length;
  const rows = list.map((it, oi) => q.kind === "urut"
    ? `<div class="row-e"><span class="idx">${oi + 1}</span><input type="text" id="q${qi}-i${oi}" data-f="item" data-oi="${oi}" value="${esc(it)}" placeholder="Butir ke-${oi + 1}" aria-label="Butir ${oi + 1} soal ${qi + 1}">
        <span class="row">${oi ? `<button class="btn ghost sm" data-act="item-up" data-oi="${oi}" aria-label="Naikkan butir">↑</button>` : ""}${n > 2 ? `<button class="btn ghost sm danger" data-act="rm-item" data-oi="${oi}" aria-label="Hapus butir">✕</button>` : ""}</span></div>`
    : `<div class="row-e pair"><span class="idx">${oi + 1}</span><input type="text" id="q${qi}-l${oi}" data-f="pl" data-oi="${oi}" value="${esc(it[0])}" placeholder="Kiri, mis. Imam al-Bukhari" aria-label="Kiri ${oi + 1}">
        <span class="arrow">→</span><input type="text" id="q${qi}-r${oi}" data-f="pr" data-oi="${oi}" value="${esc(it[1])}" placeholder="Pasangannya" aria-label="Kanan ${oi + 1}">
        ${n > 2 ? `<button class="btn ghost sm danger" data-act="rm-item" data-oi="${oi}" aria-label="Hapus pasangan">✕</button>` : "<span></span>"}</div>`).join("");
  return `<div class="seq-edit">
    <p class="small muted">${q.kind === "urut" ? "Tulis butir dalam <b>urutan yang benar</b>. Urutannya akan diacak di HP mahasiswa." : "Tulis setiap <b>pasangan yang benar</b> dalam satu baris. Kolom kanan akan diacak di HP mahasiswa."}</p>
    ${rows}
    ${n < 6 ? `<button class="btn sm" data-act="add-item" style="justify-self:start">+ ${q.kind === "urut" ? "Butir" : "Pasangan"}</button>` : ""}
  </div>`;
}

function qCard(q, qi) {
  const seq = q.kind === "urut" || q.kind === "cocok";
  const n = seq ? 0 : q.options.length;
  return `<div class="card qcard" data-qi="${qi}">
    <div class="qcard-head">
      <span class="qnum">${qi + 1}</span>
      <span class="pill">${{ bs: "Benar / salah", pg: "Pilihan ganda", urut: "Mengurutkan", cocok: "Mencocokkan" }[q.kind]}</span>
      <span class="spacer"></span>
      <button class="btn ghost sm" data-act="up" aria-label="Naikkan soal ${qi + 1}" ${qi === 0 ? "disabled" : ""}>↑</button>
      <button class="btn ghost sm" data-act="down" aria-label="Turunkan soal ${qi + 1}" ${qi === draft.questions.length - 1 ? "disabled" : ""}>↓</button>
      <button class="btn ghost sm" data-act="dup">Duplikat</button>
      <button class="btn ghost sm danger" data-act="rm">Hapus</button>
    </div>
    <textarea id="q${qi}-text" data-f="text" rows="2" placeholder="Tulis pertanyaan…" aria-label="Pertanyaan ${qi + 1}">${esc(q.text)}</textarea>
    ${seq ? seqEditor(q, qi) : `<div class="opts">
      ${q.options.map((o, oi) => `
        <div class="opt-edit ${OPT_CLASS[oi]}">
          ${shape(oi)}
          ${q.kind === "bs" ? `<b style="padding:10px 4px">${esc(o)}</b>` : `<input type="text" id="q${qi}-o${oi}" data-f="opt" data-oi="${oi}" value="${esc(o)}" placeholder="Opsi ${LETTERS[oi]}" aria-label="Opsi ${LETTERS[oi]} soal ${qi + 1}">`}
          <label class="correct"><input type="radio" name="c${qi}" data-f="correct" value="${oi}" ${q.correct === oi ? "checked" : ""}>Benar</label>
        </div>`).join("")}
    </div>`}
    <div class="qsettings">
      ${q.kind === "pg" ? `<label>Jumlah opsi <select data-f="nopt">${[2, 3, 4].map((k) => `<option ${k === n ? "selected" : ""}>${k}</option>`).join("")}</select></label>` : ""}
      <label>Waktu (mode live) <select data-f="time">${[10, 15, 20, 30, 45, 60, 90, 120].map((t) => `<option value="${t}" ${t === q.time ? "selected" : ""}>${t} detik</option>`).join("")}</select></label>
      <label>Poin <select data-f="points">${[[1000, "Standar"], [2000, "Ganda"], [0, "Tanpa poin"]].map(([v, l]) => `<option value="${v}" ${v === q.points ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    </div>
  </div>`;
}

function validateDraft() {
  const d = draft;
  if (!d.title.trim()) return "Isi judul kuis.";
  if (!d.questions.length) return "Tambahkan minimal satu soal.";
  for (const [i, q] of d.questions.entries()) {
    if (!q.text.trim()) return `Soal ${i + 1} belum ada pertanyaannya.`;
    if (q.kind === "urut") { if (q.items.some((t) => !String(t).trim())) return `Soal ${i + 1}: semua butir harus diisi.`; continue; }
    if (q.kind === "cocok") {
      if (q.pairs.some((p) => !String(p[0]).trim() || !String(p[1]).trim())) return `Soal ${i + 1}: semua pasangan harus diisi.`;
      if (new Set(q.pairs.map((p) => p[1].trim().toLowerCase())).size < q.pairs.length) return `Soal ${i + 1}: isi kolom kanan tidak boleh kembar.`;
      continue;
    }
    if (q.options.some((o) => !String(o).trim())) return `Soal ${i + 1}: semua opsi harus diisi.`;
  }
  return null;
}
function cleanQ(q) {
  const base = { kind: q.kind, text: q.text.trim(), time: q.time, points: q.points };
  if (q.kind === "urut") return { ...base, items: q.items.map((t) => String(t).trim()) };
  if (q.kind === "cocok") return { ...base, pairs: q.pairs.map((p) => ({ l: String(p[0]).trim(), r: String(p[1]).trim() })) };
  return { ...base, options: q.options.map((o) => String(o).trim()), correct: q.correct };
}
async function saveDraft() {
  const err = validateDraft(); if (err) return toast(err);
  const d = draft;
  try {
    await setDoc(doc(db, "quizzes", d.id), {
      title: d.title.trim(), course: d.course.trim(), owner: me.email || "", ownerUid: me.uid,
      questions: d.questions.map(cleanQ),
      updatedAt: serverTimestamp(),
    });
    draftDirty = false; toast("Tersimpan");
  } catch (e) { toast("Gagal menyimpan: " + e.code); }
}

/* Paste-from-text import. Format:
   1. Pertanyaan
   a. opsi
   *b. opsi benar      (atau tulis "Kunci: B" di baris setelah opsi)          */
function parseText(txt) {
  const out = []; let cur = null;
  const lines = txt.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    let m;
    if ((m = line.match(/^(\*)?\s*([a-dA-D])[\.\)]\s+(.+)$/)) && cur) {
      let t = m[3], mark = !!m[1];
      if (/\((benar|kunci|✓)\)\s*$/i.test(t) || /\*\s*$/.test(t)) { mark = true; t = t.replace(/\s*(\((benar|kunci|✓)\)|\*)\s*$/i, ""); }
      if (mark) cur.correct = cur.options.length;
      cur.options.push(t);
    } else if ((m = line.match(/^(kunci|jawaban)\s*[:=]\s*([a-dA-D])\b/i)) && cur) {
      cur.correct = "ABCD".indexOf(m[2].toUpperCase());
    } else if ((m = line.match(/^\d+[\.\)]\s*(.+)$/))) {
      cur = { kind: "pg", text: m[1], options: [], correct: 0, time: 20, points: 1000 }; out.push(cur);
    } else if (cur && !cur.options.length) {
      cur.text += " " + line;
    }
  }
  return out.filter((q) => q.options.length >= 2).map((q) => {
    q.options = q.options.slice(0, 4);
    if (q.correct >= q.options.length) q.correct = 0;
    if (q.options.length === 2 && /^benar$/i.test(q.options[0]) && /^salah$/i.test(q.options[1])) { q.kind = "bs"; q.options = ["Benar", "Salah"]; }
    return q;
  });
}
function importDialog() {
  $dlg.innerHTML = `<form method="dialog" class="dlg">
    <h2>Tempel soal dari teks</h2>
    <p class="muted small">Salin soal dari Word lalu tempel di sini. Tandai jawaban benar dengan bintang di depan opsi, atau tulis <b>Kunci: B</b> di bawah opsi.</p>
    <textarea id="imp" rows="10" placeholder="1. Rangkaian periwayat hadis disebut…&#10;a. Matan&#10;*b. Sanad&#10;c. Rawi&#10;d. Takhrij&#10;&#10;2. Matan adalah isi hadis.&#10;a. Benar&#10;b. Salah&#10;Kunci: A"></textarea>
    <p class="small muted" id="imp-n">0 soal terbaca</p>
    <div class="dlg-foot"><button class="btn" value="no">Batal</button><button class="btn primary" value="ok" id="imp-ok" disabled>Tambahkan</button></div>
  </form>`;
  const ta = $dlg.querySelector("#imp"), n = $dlg.querySelector("#imp-n"), ok = $dlg.querySelector("#imp-ok");
  let parsed = [];
  ta.oninput = () => { parsed = parseText(ta.value); n.textContent = `${parsed.length} soal terbaca`; ok.disabled = !parsed.length; };
  $dlg.onclose = () => {
    if ($dlg.returnValue !== "ok" || !parsed.length) return;
    draft.questions = draft.questions.filter((q) => q.text.trim() || q.items || q.pairs || q.options.some((o) => o.trim() && !/^(benar|salah)$/i.test(o)));
    draft.questions.push(...parsed); draftDirty = true; renderEditor(); toast(`${parsed.length} soal ditambahkan`);
  };
  $dlg.showModal();
}

/* ---------------------------------------------------------------- start a session */
function startDialog(quiz) {
  const now = new Date(Date.now() + 7 * 864e5); now.setHours(23, 59, 0, 0);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  $dlg.innerHTML = `<form method="dialog" class="dlg">
    <div class="stack tight"><span class="eyebrow">Mulai sesi</span><h2>${esc(quiz.title)}</h2><p class="muted small">${quiz.questions.length} soal · ${esc(quiz.course || "")}</p></div>
    <div class="seg">
      <label><input type="radio" name="mode" value="live" checked><b>Live di kelas</b><span>Soal tampil di proyektor, mahasiswa menjawab dari HP. Ada timer, poin, dan papan skor.</span></label>
      <label><input type="radio" name="mode" value="mandiri"><b>Mandiri</b><span>Mahasiswa mengerjakan sendiri dengan batas waktu. Cocok untuk UTS/UAS daring.</span></label>
    </div>
    <div id="live-opts" class="stack tight">
      <span class="eyebrow">Tema panggung</span>
      <div class="theme-pick">${THEME_KEYS.map((k, i) => `<label><input type="radio" name="theme" value="${k}" ${i === 0 ? "checked" : ""}><b>${THEMES[k].name}</b><span>${THEMES[k].desc}</span></label>`).join("")}</div>
      <label class="field" id="lives-f" hidden>Jumlah nyawa / balon<select id="lives">${[1, 2, 3, 4, 5].map((n) => `<option ${n === 3 ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <p class="small muted">Tema hanya mengubah tampilan. Nilai tetap dihitung dari jawaban benar; mahasiswa yang kehabisan nyawa tetap bisa menjawab.</p>
    </div>
    <div id="mandiri-opts" class="stack" hidden>
      <div class="grid2">
        <label class="field">Durasi pengerjaan (menit)<input type="number" id="dur" min="1" max="600" value="${Math.max(10, quiz.questions.length * 2)}"></label>
        <label class="field">Ditutup otomatis pada<input type="datetime-local" id="deadline" value="${local}"></label>
      </div>
      <label class="check"><input type="checkbox" id="shq" checked>Acak urutan soal untuk tiap mahasiswa</label>
      <label class="check"><input type="checkbox" id="sho" checked>Acak urutan opsi (kecuali benar/salah)</label>
    </div>
    <div class="dlg-foot"><button class="btn" value="no">Batal</button><button class="btn primary" value="ok">Buat sesi &amp; PIN</button></div>
  </form>`;
  const mo = $dlg.querySelector("#mandiri-opts"), lo = $dlg.querySelector("#live-opts"), lf = $dlg.querySelector("#lives-f");
  $dlg.querySelectorAll("[name=mode]").forEach((r) => r.onchange = () => { const m = $dlg.querySelector("[name=mode]:checked").value; mo.hidden = m !== "mandiri"; lo.hidden = m !== "live"; });
  $dlg.querySelectorAll("[name=theme]").forEach((r) => r.onchange = () => { lf.hidden = !THEMES[$dlg.querySelector("[name=theme]:checked").value].lives; });
  $dlg.onclose = async () => {
    if ($dlg.returnValue !== "ok") return;
    const mode = $dlg.querySelector("[name=mode]:checked").value;
    const opts = mode === "mandiri" ? {
      durationMin: Math.max(1, Math.round(+$dlg.querySelector("#dur").value || 30)),
      deadline: $dlg.querySelector("#deadline").value ? Timestamp.fromDate(new Date($dlg.querySelector("#deadline").value)) : null,
      shuffleQ: $dlg.querySelector("#shq").checked, shuffleOpt: $dlg.querySelector("#sho").checked,
    } : { theme: $dlg.querySelector("[name=theme]:checked").value, lives: +$dlg.querySelector("#lives").value };
    try {
      const pin = await createSession(quiz, mode, opts);
      if (mode === "live") openStage(pin);
      else { tab = "sesi"; rekapPin = pin; draft = null; render(); toast(`Ujian mandiri dibuka. PIN ${pin}`, 5000); }
    } catch (e) { console.error(e); toast("Gagal membuat sesi: " + (e.code || e.message)); }
  };
  $dlg.showModal();
}

async function createSession(quiz, mode, opts) {
  let pin;
  for (let i = 0; i < 8; i++) {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    if (!(await getDoc(doc(db, "sessions", pin))).exists()) break;
  }
  const full = quiz.questions.map(cleanQ), salt = newSalt();
  const base = { pin, quizId: quiz.id, title: quiz.title, course: quiz.course || "", owner: me.email || "", ownerUid: me.uid, mode, total: full.length, createdAt: serverTimestamp() };
  const sess = mode === "live"
    ? { ...base, status: "lobby", current: -1, question: null, correct: null, counts: null, leaderboard: [], theme: THEMES[opts.theme] ? opts.theme : "klasik", lives: Math.min(Math.max(+opts.lives || 3, 1), 5) }
    : { ...base, status: "open", questions: quiz.questions.map((q, qi) => publicQ(q, qi, salt)),
        durationMin: opts.durationMin, deadline: opts.deadline, shuffleQ: opts.shuffleQ, shuffleOpt: opts.shuffleOpt, resultsPublished: false };
  await setDoc(doc(db, "sessions", pin), sess);
  await setDoc(doc(db, "sessions", pin, "private", "quiz"), { questions: full, salt });
  return pin;
}

/* ---------------------------------------------------------------- sessions list */
function statusPill(s) {
  if (s.mode === "live") {
    if (s.status === "ended") return `<span class="pill">Selesai</span>`;
    return `<span class="pill live"><i class="dot"></i>Live</span>`;
  }
  return s.status === "open" ? `<span class="pill open"><i class="dot"></i>Dibuka</span>` : `<span class="pill">Ditutup</span>`;
}
function renderSessions() {
  $view.innerHTML = `
    <div class="page-head"><div class="stack tight"><span class="eyebrow">Sesi &amp; nilai</span><h1>Riwayat sesi</h1></div></div>
    <div class="list">
      ${sessions.length ? sessions.map((s) => `
        <div class="card item">
          <div style="min-width:0">
            <div class="row" style="gap:8px"><h3>${esc(s.title)}</h3>${statusPill(s)}</div>
            <div class="meta"><span class="mono">PIN ${esc(s.pin)}</span><span>${s.mode === "live" ? "Live di kelas" : `Mandiri · ${s.durationMin} menit`}</span><span>${esc(s.course)}</span><span>${fmtDate(s.createdAt)}</span></div>
          </div>
          <div class="actions">
            ${s.mode === "live" && s.status !== "ended" ? `<button class="btn sm primary" data-stage="${s.pin}">Buka panggung</button>` : ""}
            <button class="btn sm" data-rekap="${s.pin}">Rekap nilai</button>
          </div>
        </div>`).join("") : `<div class="empty"><h3>Belum ada sesi</h3><p>Buka Bank soal, pilih kuis, lalu tekan <b>Mulai sesi</b>.</p></div>`}
    </div>`;
  $view.querySelectorAll("[data-stage]").forEach((b) => b.onclick = () => openStage(b.dataset.stage));
  $view.querySelectorAll("[data-rekap]").forEach((b) => b.onclick = () => { rekapPin = b.dataset.rekap; render(); });
}

/* ---------------------------------------------------------------- rekap */
async function renderRekap(pin) {
  $view.innerHTML = `<p class="muted">Memuat rekap…</p>`;
  const [sSnap, kSnap] = await Promise.all([getDoc(doc(db, "sessions", pin)), getDoc(doc(db, "sessions", pin, "private", "quiz"))]);
  if (!sSnap.exists()) { $view.innerHTML = `<p>Sesi tidak ditemukan.</p>`; return; }
  const s = sSnap.data(), Q = (kSnap.data()?.questions || []).map(normQ), salt = kSnap.data()?.salt;
  const total = Q.length;
  let rows = [], perQ = Q.map(() => ({ counts: [0, 0, 0, 0], answered: 0, right: 0 }));

  if (s.mode === "live") {
    const [pSnap, aSnap] = await Promise.all([getDocs(collection(db, "sessions", pin, "players")), getDocs(collection(db, "sessions", pin, "answers"))]);
    const byUid = {};
    pSnap.forEach((d) => { byUid[d.id] = { uid: d.id, ...d.data(), answers: {} }; });
    aSnap.forEach((d) => { const a = d.data(); if (byUid[a.uid]) byUid[a.uid].answers[a.q] = a.choice; });
    rows = Object.values(byUid);
  } else {
    const subSnap = await getDocs(collection(db, "sessions", pin, "submissions"));
    rows = subSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  }
  rows.forEach((r) => {
    let right = 0;
    Q.forEach((q, qi) => {
      const c = r.answers?.[qi];
      if (c === undefined || c === null) return;
      perQ[qi].answered++; if (isChoice(q)) perQ[qi].counts[c]++;
      if (isCorrect(q, qi, salt, c)) { right++; perQ[qi].right++; }
    });
    r.right = right; r.nilai = total ? Math.round((right / total) * 1000) / 10 : 0;
  });
  const nimCount = {}; rows.forEach((r) => { const k = (r.nim || "").trim(); if (k) nimCount[k] = (nimCount[k] || 0) + 1; });
  rows.sort((a, b) => s.mode === "live" ? (b.score || 0) - (a.score || 0) : (a.name || "").localeCompare(b.name || "", "id"));
  const avg = rows.length ? rows.reduce((t, r) => t + r.nilai, 0) / rows.length : 0;
  const max = rows.reduce((m, r) => Math.max(m, r.nilai), 0);
  const submitted = rows.filter((r) => r.status === "submitted").length;

  $view.innerHTML = `
    <div class="page-head">
      <div class="stack tight"><button class="btn ghost sm" id="back" style="justify-self:start;padding-left:0">← Riwayat sesi</button>
        <div class="row" style="gap:8px"><h1>${esc(s.title)}</h1>${statusPill(s)}</div>
        <p class="muted small"><span class="mono">PIN ${esc(pin)}</span> · ${s.mode === "live" ? "Live di kelas" : `Mandiri · ${s.durationMin} menit · tutup ${fmtDate(s.deadline)}`} · ${fmtDate(s.createdAt)}</p></div>
      <div class="row">
        ${s.mode === "mandiri" ? `<button class="btn" id="toggle">${s.status === "open" ? "Tutup ujian" : "Buka lagi"}</button>
          <button class="btn gold" id="publish">${s.resultsPublished ? "Perbarui nilai" : "Simpan &amp; umumkan nilai"}</button>` : ""}
        ${s.mode === "live" && s.status !== "ended" ? `<button class="btn primary" id="stage">Buka panggung</button>` : ""}
        <button class="btn" id="csv" ${rows.length ? "" : "disabled"}>Unduh CSV</button>
        <button class="btn danger" id="del">Hapus sesi</button>
      </div>
    </div>
    <div class="stack">
      <div class="stats">
        <div class="card stat"><div class="v">${rows.length}</div><div class="k">Peserta${s.mode === "mandiri" ? ` · ${submitted} sudah kumpul` : ""}</div></div>
        <div class="card stat"><div class="v">${avg.toFixed(1)}</div><div class="k">Rata-rata nilai (0–100)</div></div>
        <div class="card stat"><div class="v">${max.toFixed(1)}</div><div class="k">Nilai tertinggi</div></div>
        <div class="card stat"><div class="v">${total}</div><div class="k">Jumlah soal</div></div>
      </div>
      ${s.mode === "mandiri" && s.status === "open" ? `<div class="notice">Mahasiswa masuk di halaman utama dengan PIN <b class="mono">${esc(pin)}</b>. ${s.resultsPublished ? "Nilai sudah diumumkan; tekan <b>Perbarui nilai</b> bila ada yang baru mengumpulkan." : "Nilai baru terlihat oleh mahasiswa setelah Anda menekan <b>Simpan &amp; umumkan nilai</b>."}</div>` : ""}
      <h2>Nilai mahasiswa</h2>
      ${rows.length ? `<div class="tablewrap"><table>
        <thead><tr><th class="num">#</th><th>Nama</th><th>NIM</th>${s.mode === "live" ? `<th class="num">Poin</th>` : `<th>Status</th>`}<th class="num">Benar</th><th class="num">Nilai</th>${s.mode === "mandiri" ? `<th>Mulai</th><th>Kumpul</th>` : ""}</tr></thead>
        <tbody>${rows.map((r, i) => `<tr>
          <td class="num">${i + 1}</td><td>${esc(r.name)}</td>
          <td class="mono">${esc(r.nim || "—")} ${nimCount[(r.nim || "").trim()] > 1 ? `<span class="flag" title="NIM ini muncul lebih dari sekali">ganda</span>` : ""}</td>
          ${s.mode === "live" ? `<td class="num mono">${(r.score || 0).toLocaleString("id-ID")}</td>` : `<td>${r.status === "submitted" ? "Dikumpulkan" : "Belum kumpul"}</td>`}
          <td class="num mono">${r.right}/${total}</td><td class="num mono"><b>${r.nilai.toFixed(1)}</b></td>
          ${s.mode === "mandiri" ? `<td>${fmtDate(r.startedAt)}</td><td>${fmtDate(r.submittedAt)}</td>` : ""}
        </tr>`).join("")}</tbody></table></div>` : `<div class="empty"><p>Belum ada mahasiswa yang masuk ke sesi ini.</p></div>`}
      <h2>Analisis per soal</h2>
      <div class="card">
        ${Q.map((q, qi) => {
          const pct = perQ[qi].answered ? Math.round((perQ[qi].right / perQ[qi].answered) * 100) : 0;
          return `<div class="qstat"><span class="qnum">${qi + 1}</span>
            <div style="min-width:0"><div class="txt" title="${esc(q.text)}">${esc(q.text)}</div>
              <div class="muted small">${isChoice(q) ? `Kunci: ${LETTERS[q.correct]} · ${q.options.map((o, oi) => `${LETTERS[oi]} ${perQ[qi].counts[oi]}`).join(" · ")}` : `${q.kind === "urut" ? "Mengurutkan" : "Mencocokkan"} · benar ${perQ[qi].right} · salah ${perQ[qi].answered - perQ[qi].right}`}</div>
              <div class="bar"><i style="width:${pct}%"></i></div></div>
            <span class="mono" style="text-align:right">${perQ[qi].answered ? pct + "%" : "—"}</span></div>`;
        }).join("")}
      </div>
    </div>`;

  $view.querySelector("#back").onclick = () => { rekapPin = null; render(); };
  $view.querySelector("#stage")?.addEventListener("click", () => openStage(pin));
  $view.querySelector("#csv").onclick = () => downloadCSV(s, Q, rows, salt);
  $view.querySelector("#del").onclick = async () => {
    if (!(await ask("Hapus sesi ini beserta seluruh jawaban dan nilainya? Unduh CSV dulu bila perlu.", "Hapus permanen", true))) return;
    await deleteSession(pin, s.mode); rekapPin = null; render(); toast("Sesi dihapus");
  };
  $view.querySelector("#toggle")?.addEventListener("click", async () => {
    await updateDoc(doc(db, "sessions", pin), { status: s.status === "open" ? "closed" : "open" });
    renderRekap(pin);
  });
  $view.querySelector("#publish")?.addEventListener("click", async () => {
    try {
      // Ambil ulang semua kiriman terbaru (rekap di layar bisa sudah lama dibuka).
      const fresh = (await getDocs(collection(db, "sessions", pin, "submissions"))).docs.map((d) => ({ uid: d.id, ...d.data() }));
      fresh.forEach((r) => { r.right = Q.filter((q, qi) => isCorrect(q, qi, salt, r.answers?.[qi])).length; r.nilai = total ? Math.round((r.right / total) * 1000) / 10 : 0; });
      for (let i = 0; i < fresh.length; i += 400) {
        const b = writeBatch(db);
        fresh.slice(i, i + 400).forEach((r) => b.update(doc(db, "sessions", pin, "submissions", r.uid), { right: r.right, nilai: r.nilai, total }));
        await b.commit();
      }
      await updateDoc(doc(db, "sessions", pin), { resultsPublished: true });
      toast("Nilai tersimpan dan terlihat oleh mahasiswa"); renderRekap(pin);
    } catch (e) { toast("Gagal menyimpan nilai: " + e.code); }
  });
}

async function deleteSession(pin, mode) {
  const subs = mode === "live" ? ["players", "answers", "private"] : ["submissions", "private"];
  for (const c of subs) {
    const snap = await getDocs(collection(db, "sessions", pin, c));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = writeBatch(db); snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref)); await b.commit();
    }
  }
  await deleteDoc(doc(db, "sessions", pin));
}

function downloadCSV(s, Q, rows, salt) {
  const cell = (v) => { const t = String(v ?? ""); return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const head = ["No", "Nama", "NIM", ...(s.mode === "live" ? ["Poin"] : ["Status", "Mulai", "Kumpul"]), "Benar", "Jumlah soal", "Nilai", ...Q.map((_, i) => `S${i + 1}`)];
  const key = ["", "KUNCI", "", ...(s.mode === "live" ? [""] : ["", "", ""]), "", "", "", ...Q.map((q) => isChoice(q) ? LETTERS[q.correct] : q.kind)];
  const body = rows.map((r, i) => [i + 1, r.name, r.nim, ...(s.mode === "live" ? [r.score || 0] : [r.status === "submitted" ? "Dikumpulkan" : "Belum", fmtDate(r.startedAt), fmtDate(r.submittedAt)]),
    r.right, Q.length, String(r.nilai).replace(".", ","), ...Q.map((q, qi) => { const a = r.answers?.[qi]; return a == null ? "" : isChoice(q) ? LETTERS[a] : isCorrect(q, qi, salt, a) ? "benar" : "salah"; })]);
  const csv = "﻿" + [head, key, ...body].map((row) => row.map(cell).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `nilai-${(s.title || "kuis").replace(/[^\w\-]+/g, "_")}-${s.pin}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

/* ================================================================ PANGGUNG (live host) */
const H = { pin: null, s: null, Q: [], players: [], answers: [], unsubs: [], tick: null, qStartLocal: 0, revealing: false };

async function openStage(pin) {
  closeStage();
  H.pin = pin;
  const k = await getDoc(doc(db, "sessions", pin, "private", "quiz"));
  H.Q = (k.data()?.questions || []).map(normQ); H.salt = k.data()?.salt;
  $stage.hidden = false; document.body.style.overflow = "hidden";
  $stage.innerHTML = `<p>Memuat…</p>`;
  H.unsubs.push(onSnapshot(doc(db, "sessions", pin), (snap) => {
    const prev = H.s; H.s = snap.data();
    if (!H.s) return;
    if (H.s.status === "question" && (!prev || prev.status !== "question" || prev.current !== H.s.current)) {
      watchAnswers(H.s.current);
      const started = H.s.questionStartedAt?.toMillis?.();
      H.qStartLocal = started && Math.abs(Date.now() - started) < 5 * 60e3 ? started : Date.now();
    }
    renderStage();
  }));
  H.unsubs.push(onSnapshot(collection(db, "sessions", pin, "players"), (snap) => {
    H.players = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    renderStage();
  }));
}
function closeStage() {
  H.unsubs.forEach((f) => f()); H.unsubs = []; H.ansUnsub?.(); H.ansUnsub = null;
  clearInterval(H.tick); H.tick = null; H.s = null; H.revealing = false;
  Sound.stop();
  $stage.hidden = true; $stage.innerHTML = ""; document.body.style.overflow = "";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function watchAnswers(qi) {
  H.ansUnsub?.(); H.answers = [];
  H.ansUnsub = onSnapshot(query(collection(db, "sessions", H.pin, "answers"), where("q", "==", qi)), (snap) => {
    H.answers = snap.docs.map((d) => d.data());
    const el = $stage.querySelector("#ans-n"); if (el) el.textContent = H.answers.length;
    const ar = $stage.querySelector("#arena-mini");
    if (ar && H.s) ar.innerHTML = arena(themeOf(H.s), H.s, PL(), { mode: "mini", answeredIds: new Set(H.answers.map((a) => a.uid)) });
    if (H.s?.status === "question" && H.players.length && H.answers.length >= H.players.length) reveal();
  });
}

function soundFor(s, players, force) {
  if (s.status === "reveal" && !s.counts) return;
  if (force) Sound.stop();
  const gs = players.map((p) => gameState(p, s));
  Sound.phase(themeOf(s), s.status, s.current, { anyOut: gs.some((g) => g.justOut), anyHit: gs.some((g) => g.justHit), anyRight: gs.some((g) => g.justRight) });
}
function joinUrl() {
  const u = new URL("./", location.href); return u.href;
}

function renderStage() {
  const s = H.s; if (!s) return;
  clearInterval(H.tick); H.tick = null;
  const top = `<div class="stage-top">
      <div class="stage-title">${esc(s.title)} · <span class="mono">PIN ${esc(s.pin)}</span></div>
      <div class="row"><span class="small" style="opacity:.8">${H.players.length} peserta</span>
        <button class="btn sm" id="snd" aria-pressed="${Sound.isOn()}">${Sound.isOn() ? "Musik: nyala" : "Musik: mati"}</button>
        <button class="btn sm" id="fs">Layar penuh</button><button class="btn sm" id="x">Tutup panggung</button></div>
    </div>`;
  let body = "", foot = "";
  const q = s.current >= 0 ? H.Q[s.current] : null;
  const th = themeOf(s), themed = th !== "klasik";

  if (s.status === "lobby") {
    const url = joinUrl();
    body = `<div class="lobby">
      <div class="joinbox">
        ${window.QRCode ? `<div id="qr" aria-label="Kode QR untuk bergabung"></div>` : ""}
        <div class="stack tight" style="text-align:left"><div class="url">Buka <b>${esc(url.replace(/^https?:\/\//, ""))}</b></div><div>lalu masukkan PIN</div><div class="pin">${esc(s.pin)}</div></div>
      </div>
      <div class="bigcount">${H.players.length} <span style="font-size:.45em;font-weight:600">${themed ? `pemain · tema ${esc(THEMES[th].name)}` : "mahasiswa sudah masuk"}</span></div>
      ${themed ? `<p style="opacity:.85">${esc(THEMES[th].desc)}</p>` : ""}
      ${arena(th, s, PL(), { mode: th === "roket" ? "mini" : "full" })}
    </div>`;
    foot = `<span class="small" style="opacity:.8">${H.Q.length} soal</span><button class="btn gold lg" id="next" ${H.players.length ? "" : "disabled"}>Mulai kuis</button>`;
  } else if (s.status === "question" && q) {
    body = `<div class="qmeta">
        <div class="stage-title">Soal ${s.current + 1} dari ${H.Q.length}${q.points === 2000 ? ` · <span class="pill gold">Poin ganda</span>` : q.points === 0 ? " · tanpa poin" : ""}</div>
        <div class="timer" id="timer"><b id="tleft">${q.time}</b></div>
        <div class="answered"><div class="n" id="ans-n">${H.answers.length}</div><div class="l">jawaban</div></div>
      </div>
      <div class="qtext${q.kind === "urut" || q.kind === "cocok" ? " sm" : ""}">${esc(q.text)}</div>
      ${isChoice(q) ? `<div class="tiles">${q.options.map((o, i) => `<div class="tile ${OPT_CLASS[i]}">${shape(i)}<span class="t">${esc(o)}</span></div>`).join("")}</div>` : stageSeq(publicQ(q, s.current, H.salt))}
      ${themed ? `<div id="arena-mini">${arena(th, s, PL(), { mode: "mini", answeredIds: new Set(H.answers.map((a) => a.uid)) })}</div>` : ""}`;
    foot = `<span></span><button class="btn light" id="reveal">Tampilkan jawaban</button>`;
    H.tick = setInterval(() => {
      const left = q.time - (Date.now() - H.qStartLocal) / 1000;
      const t = $stage.querySelector("#tleft"), tm = $stage.querySelector("#timer");
      if (t) t.textContent = Math.max(0, Math.ceil(left));
      if (tm) tm.style.setProperty("--p", Math.max(0, left / q.time));
      Sound.setUrgency(1 - left / q.time); Sound.tick(left);
      if (left <= 0) reveal();
    }, 200);
  } else if (s.status === "reveal" && q) {
    const counts = s.counts || [0, 0, 0, 0];
    const maxC = Math.max(1, ...counts);
    body = !isChoice(q) ? `<div class="qtext sm">${esc(q.text)}</div>
      ${s.counts ? `<div class="seq-score">${counts[0] || 0} dari ${H.players.length} menjawab benar</div>${stageSolution(q.kind, solutionList(q))}${themed ? arena(th, s, PL()) : ""}` : `<p style="text-align:center">Menghitung jawaban…</p>`}`
    : themed ? `<div class="qtext" style="font-size:clamp(18px,2.4vw,30px)">${esc(q.text)}</div>
      ${s.counts ? `<div class="answer-banner"><div class="tile ${OPT_CLASS[s.correct]} win">${shape(s.correct)}<span class="t">${esc(q.options[s.correct])}</span><span class="mark">✓</span></div>
        <span class="stat">${counts[s.correct] || 0} dari ${H.players.length} benar</span></div>
      ${arena(th, s, PL())}` : `<p style="text-align:center">Menghitung jawaban…</p>`}`
    : `<div class="qtext" style="font-size:clamp(20px,3vw,36px)">${esc(q.text)}</div>
      ${s.counts ? `<div class="dist">${q.options.map((_, i) => `<div class="col"><div class="c">${counts[i]}</div><div class="b ${OPT_CLASS[i]}" style="height:${(counts[i] / maxC) * 100}%"></div><div class="s ${OPT_CLASS[i]}">${shape(i)}</div></div>`).join("")}</div>` : `<p style="text-align:center">Menghitung jawaban…</p>`}
      <div class="tiles">${q.options.map((o, i) => `<div class="tile ${OPT_CLASS[i]} ${s.correct === i ? "win" : s.correct == null ? "" : "dim"}">${shape(i)}<span class="t">${esc(o)}</span>${s.correct === i ? `<span class="mark" aria-label="jawaban benar">✓</span>` : ""}</div>`).join("")}</div>`;
    foot = `<span class="small" style="opacity:.8">Soal ${s.current + 1} dari ${H.Q.length}</span><div class="row"><button class="btn" id="board" ${s.counts ? "" : "disabled"}>Papan skor</button><button class="btn gold lg" id="next" ${s.counts ? "" : "disabled"}>${s.current + 1 >= H.Q.length ? "Lihat juara" : "Soal berikutnya"}</button></div>`;
  } else if (s.status === "leaderboard") {
    body = `<h2 style="text-align:center;font-size:clamp(28px,4vw,48px)">Papan skor</h2>
      <div class="board">${(s.leaderboard || []).map((p, i) => `<div class="board-row with-av" style="animation-delay:${i * 80}ms"><span class="r">${i + 1}</span>${avatar(p.avatar)}<span class="nm">${esc(p.name)}</span><span class="sc">${p.score.toLocaleString("id-ID")}</span></div>`).join("") || `<p style="text-align:center">Belum ada skor.</p>`}</div>`;
    foot = `<span class="small" style="opacity:.8">Setelah soal ${s.current + 1} dari ${H.Q.length}</span><button class="btn gold lg" id="next">${s.current + 1 >= H.Q.length ? "Lihat juara" : "Soal berikutnya"}</button>`;
  } else if (s.status === "ended") {
    const lb = s.leaderboard || [];
    const order = [1, 0, 2].filter((i) => lb[i]);
    body = `<h2 style="text-align:center;font-size:clamp(28px,4vw,48px)">Juara kuis</h2>
      <div class="podium">${order.map((i) => `<div class="p p${i + 1}">${avatar(lb[i].avatar)}<div class="nm">${esc(lb[i].name)}</div><div class="sc">${lb[i].score.toLocaleString("id-ID")}</div><div class="blk">${i + 1}</div></div>`).join("")}</div>
      ${themed ? arena(th, s, PL(), { mode: "mini" }) : ""}`;
    foot = `<span></span><div class="row"><button class="btn light" id="rekap">Lihat rekap nilai</button></div>`;
  }
  const hasArena = themed && ["question", "reveal", "lobby", "ended"].includes(s.status);
  $stage.innerHTML = top + `<div class="stage-body${hasArena ? " has-arena" : ""}">${body}</div><div class="stage-foot">${foot}</div>`;

  if (s.status === "lobby" && window.QRCode) {
    const el = $stage.querySelector("#qr");
    try { new QRCode(el, { text: joinUrl() + "?pin=" + s.pin, width: 140, height: 140, colorDark: "#15201b", colorLight: "#f4f7f2" }); } catch {}
  }
  $stage.querySelector("#x").onclick = closeStage;
  $stage.querySelector("#snd").onclick = (e) => { const on = Sound.toggle(); e.target.textContent = on ? "Musik: nyala" : "Musik: mati"; e.target.setAttribute("aria-pressed", String(on)); if (on) soundFor(s, PL(), true); };
  soundFor(s, PL());
  $stage.querySelector("#fs").onclick = () => (document.fullscreenElement ? document.exitFullscreen() : $stage.requestFullscreen?.())?.catch?.(() => toast("Layar penuh tidak tersedia di peramban ini"));
  $stage.querySelector("#next")?.addEventListener("click", nextQuestion);
  $stage.querySelector("#reveal")?.addEventListener("click", reveal);
  $stage.querySelector("#board")?.addEventListener("click", showBoard);
  $stage.querySelector("#rekap")?.addEventListener("click", () => { const p = H.pin; closeStage(); tab = "sesi"; rekapPin = p; draft = null; render(); });
}

function topN(scores, n) {
  return H.players.map((p) => ({ uid: p.uid, name: p.name, avatar: p.avatar || 0, score: scores?.[p.uid] ?? p.score ?? 0 }))
    .sort((a, b) => b.score - a.score).slice(0, n).map(({ name, score, avatar }) => ({ name, score, avatar }));
}
function PL() { return H.players.map((p) => ({ ...p, id: p.uid, joinedAt: p.joinedAt?.toMillis?.() || 0 })); }

async function nextQuestion() {
  const s = H.s, i = s.current + 1;
  if (i >= H.Q.length) {
    await updateDoc(doc(db, "sessions", H.pin), { status: "ended", leaderboard: topN(null, 5), question: null });
    return;
  }
  const q = H.Q[i];
  H.revealing = false;
  await updateDoc(doc(db, "sessions", H.pin), {
    status: "question", current: i, correct: null, counts: null,
    question: { ...publicQ(q, i, H.salt), time: q.time, points: q.points }, solution: null,
    questionStartedAt: serverTimestamp(),
  });
}

async function reveal() {
  if (H.revealing || H.s?.status !== "question") return;
  H.revealing = true; clearInterval(H.tick);
  const qi = H.s.current, q = H.Q[qi], ref = doc(db, "sessions", H.pin);
  try {
    await updateDoc(ref, { status: "reveal" });               // closes answering (rules check status)
    const [sSnap, aSnap] = await Promise.all([getDoc(ref), getDocs(query(collection(db, "sessions", H.pin, "answers"), where("q", "==", qi)))]);
    const startMs = sSnap.data().questionStartedAt?.toMillis?.() ?? H.qStartLocal;
    const counts = [0, 0, 0, 0], got = {};
    aSnap.forEach((d) => {
      const a = d.data(); if (got[a.uid]) return;
      const ok = isCorrect(q, qi, H.salt, a.choice);
      if (isChoice(q)) counts[a.choice]++; else counts[ok ? 0 : 1]++;
      got[a.uid] = { ok, pts: pointsFor(ok, (a.at?.toMillis?.() ?? startMs) - startMs, q.time, q.points) };
    });
    const newScores = {};
    H.players.forEach((p) => { newScores[p.uid] = (p.score || 0) + (got[p.uid]?.pts || 0); });
    const ranked = Object.entries(newScores).sort((a, b) => b[1] - a[1]);
    const rankOf = {}; ranked.forEach(([uid], i) => { rankOf[uid] = i + 1; });
    for (let i = 0; i < H.players.length; i += 400) {
      const b = writeBatch(db);
      H.players.slice(i, i + 400).forEach((p) => {
        const g = got[p.uid];
        b.update(doc(db, "sessions", H.pin, "players", p.uid), {
          score: increment(g?.pts || 0), correct: increment(g?.ok ? 1 : 0),
          wrong: increment(g?.ok ? 0 : 1),
          lastQ: qi, lastPoints: g?.pts || 0, lastCorrect: !!g?.ok, answered: !!g, rank: rankOf[p.uid],
        });
      });
      await b.commit();
    }
    await updateDoc(ref, { correct: isChoice(q) ? q.correct : null, solution: isChoice(q) ? null : solutionList(q), counts, leaderboard: topN(newScores, 5) });
  } catch (e) { console.error(e); toast("Gagal menghitung skor: " + (e.code || e.message)); H.revealing = false; }
}

async function showBoard() {
  await updateDoc(doc(db, "sessions", H.pin), { status: "leaderboard", leaderboard: topN(null, 5) });
}
