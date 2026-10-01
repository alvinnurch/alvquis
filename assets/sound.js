// AlvQuis — musik & efek suara panggung, disintesis langsung dengan Web Audio
// (tidak ada file audio, tidak ada lagu berhak cipta; semua pola nada dibuat untuk aplikasi ini).
//
// Sound.phase(theme, status, events)  → ganti musik sesuai tahap (lobby / soal / jawaban / papan skor / selesai)
// Sound.setUrgency(0..1)              → saat soal berjalan, tempo makin cepat menjelang waktu habis
// Sound.tick(secondsLeft)             → detak jam pada 5 detik terakhir
// Sound.toggle() / Sound.isOn()       → tombol musik di panggung

const PREF = "alv:sound";
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ---------- karakter bunyi tiap tema ---------- */
const T = {
  klasik: { root: 57, scale: [0, 2, 3, 5, 7, 8, 10], lead: "triangle", bass: "sine",    tempo: 104, bell: false, lobby: [0, 7, 12, 7, 3, 7, 10, 7] },
  robot:  { root: 50, scale: [0, 1, 3, 5, 7, 8, 10], lead: "square",   bass: "square",  tempo: 112, bell: false, lobby: [0, 0, 12, 0, 10, 0, 7, 3] },
  balon:  { root: 60, scale: [0, 2, 4, 7, 9],        lead: "triangle", bass: "sine",    tempo: 120, bell: false, lobby: [0, 4, 7, 12, 9, 7, 4, 2] },
  roket:  { root: 52, scale: [0, 2, 3, 5, 7, 10],    lead: "sawtooth", bass: "sawtooth",tempo: 126, bell: false, lobby: [0, 7, 12, 15, 12, 7, 10, 7] },
  kebun:  { root: 65, scale: [0, 2, 4, 7, 9],        lead: "sine",     bass: "sine",    tempo: 92,  bell: true,  lobby: [0, 4, 7, 9, 12, 9, 7, 4] },
};

let ctx = null, master, music, sfx, timer = null, nextTime = 0, step = 0;
let on = (() => { try { return localStorage.getItem(PREF) !== "off"; } catch { return true; } })();
let theme = "klasik", track = "off", urgency = 0, key = "", lastTick = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 1.0; master.connect(ctx.destination);
    // sedikit kompresi agar tidak pecah di pengeras suara kelas
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    music = ctx.createGain(); music.gain.value = 0.55; music.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(comp);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return true;
}
// Peramban hanya mengizinkan suara setelah ada klik.
if (typeof window !== "undefined") window.addEventListener("pointerdown", () => { if (on && ctx) ctx.resume().catch(() => {}); }, { passive: true });

/* ---------- alat musik ---------- */
function tone(t, freq, dur, o = {}) {
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type || "sine"; osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
  const peak = o.gain ?? 0.2, a = o.attack ?? 0.005, r = o.release ?? Math.min(0.3, dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
  let node = osc;
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; f.Q.value = o.q ?? 1; node.connect(f); node = f; }
  node.connect(g); g.connect(o.dest || music);
  osc.start(t); osc.stop(t + dur + r + 0.05);
}
function bell(t, freq, dur, gain = 0.14, dest) {
  tone(t, freq, dur, { type: "sine", gain, release: dur * 2, dest });
  tone(t, freq * 2.76, dur * 0.5, { type: "sine", gain: gain * 0.35, release: dur, dest });
}
let noiseBuf = null;
function noise(t, dur, o = {}) {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  src.buffer = noiseBuf; f.type = o.type || "highpass"; f.frequency.setValueAtTime(o.freq || 6000, t);
  if (o.sweep) f.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
  f.Q.value = o.q ?? 0.7;
  g.gain.setValueAtTime(o.gain ?? 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(o.dest || music); src.start(t); src.stop(t + dur + 0.05);
}
const kick = (t, gain = 0.5, dest) => tone(t, 120, 0.12, { type: "sine", slide: 40, gain, release: 0.08, dest });
const hat = (t, gain = 0.05) => noise(t, 0.04, { freq: 8000, gain });
const snare = (t, gain = 0.12, dest) => { noise(t, 0.15, { type: "bandpass", freq: 1800, gain, dest }); tone(t, 190, 0.06, { gain: gain * 0.8, dest }); };

/* ---------- pola musik (16 langkah per birama) ---------- */
function schedule(t, s, len) {
  const th = T[theme], R = th.root, n16 = s % 16, bar = Math.floor(s / 16);
  const note = (deg, oct = 0) => midi(R + th.scale[((deg % th.scale.length) + th.scale.length) % th.scale.length] + 12 * (oct + Math.floor(deg / th.scale.length)));

  if (track === "lobby" || track === "board") {
    const soft = track === "board" ? 1.1 : 0.9;
    if (n16 % 2 === 0) {
      const iv = th.lobby[(n16 / 2 + bar * 3) % th.lobby.length];
      th.bell ? bell(t, midi(R + 12 + iv), len * 1.5, 0.08 * soft)
              : tone(t, midi(R + 12 + iv), len * 1.2, { type: th.lead, gain: 0.05 * soft, lp: theme === "roket" ? 1400 + 800 * Math.sin(bar) : 2400, release: 0.08 });
    }
    if (n16 === 0 || n16 === 8 || (theme !== "kebun" && n16 === 11)) tone(t, midi(R - 12 + (bar % 4 === 3 && n16 === 8 ? 5 : 0)), len * 3, { type: th.bass, gain: 0.12, lp: 600 });
    if (theme !== "kebun") { if (n16 === 0 || n16 === 8) kick(t, 0.25); if (n16 === 4 || n16 === 12) snare(t, 0.05); if (n16 % 2 === 1) hat(t, 0.025); }
    if (theme === "robot" && n16 === 14 && bar % 2 === 1) { tone(t, 1760, 0.05, { type: "square", gain: 0.03 }); tone(t + 0.07, 1320, 0.05, { type: "square", gain: 0.03 }); }
    if (theme === "balon" && n16 === 15 && bar % 2 === 0) tone(t, midi(R + 24), 0.06, { type: "triangle", gain: 0.04, slide: midi(R + 31) });
    return;
  }
  if (track === "question") {
    // Ostinato menegangkan: akar nada dan semitone di atasnya, detak jantung, makin rapat saat waktu menipis.
    const u = urgency;
    if (n16 % 2 === 0) {
      const up = (n16 / 2) % 2 === 1;
      const f = midi(R + (up ? 1 : 0) + (bar % 4 >= 2 ? 3 : 0));
      th.bell ? bell(t, f * 2, len, 0.06) : tone(t, f, len * 0.9, { type: th.lead, gain: 0.07, lp: 900 + u * 2200, release: 0.05 });
    }
    if (n16 === 0 || n16 === 3) kick(t, n16 === 0 ? 0.45 : 0.3);
    if (u > 0.45 && (n16 === 8 || n16 === 11)) kick(t, n16 === 8 ? 0.4 : 0.26);
    if (u > 0.6 && n16 % 2 === 1) hat(t, 0.03 + u * 0.03);
    if (n16 === 0) tone(t, midi(R - 24), len * 14, { type: "sawtooth", gain: 0.05 + u * 0.05, lp: 220 + u * 300, attack: 0.3, release: 0.4 });
    if (u > 0.75 && n16 % 4 === 2) tone(t, midi(R + 24 + (n16 === 6 ? 1 : 0)), len, { type: theme === "kebun" || theme === "balon" ? "triangle" : "square", gain: 0.035, lp: 3000 });
    if (theme === "robot" && n16 === 12) noise(t, 0.08, { type: "bandpass", freq: 2600, q: 8, gain: 0.08 });
  }
}
function loop() {
  if (!ctx) return;
  const th = T[theme];
  const bpm = track === "question" ? th.tempo + urgency * 56 : th.tempo;
  const len = 60 / bpm / 4;
  while (nextTime < ctx.currentTime + 0.12) { schedule(nextTime, step, len); nextTime += len; step++; }
}
function startLoop() { if (timer) return; nextTime = ctx.currentTime + 0.06; step = 0; timer = setInterval(loop, 25); }
function stopLoop() {
  clearInterval(timer); timer = null;
  if (ctx && music) { const g = music.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(g.value, ctx.currentTime); g.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15); g.linearRampToValueAtTime(0.55, ctx.currentTime + 0.4); }
}

/* ---------- efek suara ---------- */
function stinger(t) {
  const th = T[theme], R = th.root + 12, ch = [0, 4, 7, 12];
  ch.forEach((iv, i) => (th.bell ? bell(t + i * 0.09, midi(R + iv), 0.25, 0.14, sfx) : tone(t + i * 0.09, midi(R + iv), 0.22, { type: th.lead === "sawtooth" ? "square" : th.lead, gain: 0.13, lp: 3500, dest: sfx })));
  kick(t, 0.5, sfx);
}
const FX = {
  chomp(t) { for (let i = 0; i < 6; i++) { const s = t + i * 0.3; tone(s, 110, 0.12, { type: "sawtooth", slide: 55, gain: 0.25, lp: 700, dest: sfx }); noise(s, 0.1, { type: "lowpass", freq: 900, gain: 0.25, dest: sfx }); } tone(t + 1.9, 300, 0.4, { type: "square", slide: 80, gain: 0.08, lp: 1200, dest: sfx }); },
  pop(t) { noise(t, 0.09, { freq: 1500, gain: 0.45, dest: sfx }); tone(t, 900, 0.05, { type: "triangle", slide: 300, gain: 0.1, dest: sfx }); },
  whoosh(t) { noise(t, 1.4, { type: "bandpass", freq: 300, sweep: 5000, q: 2, gain: 0.25, dest: sfx }); tone(t, 200, 1.2, { type: "sawtooth", slide: 900, gain: 0.04, lp: 1500, dest: sfx }); },
  sparkle(t) { [0, 4, 7, 12, 16, 19, 24].forEach((iv, i) => bell(t + i * 0.06, midi(84 + iv), 0.12, 0.07, sfx)); },
  rain(t) { noise(t, 1.6, { type: "lowpass", freq: 1800, gain: 0.06, dest: sfx }); },
  buzz(t) { tone(t, 150, 0.25, { type: "sawtooth", gain: 0.08, lp: 600, dest: sfx }); },
  tick(t, hi) { tone(t, hi ? 1760 : 1320, 0.03, { type: "square", gain: 0.06, lp: 5000, dest: sfx }); },
  gong(t) { tone(t, 80, 1.6, { type: "sine", gain: 0.3, release: 1.4, dest: sfx }); noise(t, 0.6, { type: "bandpass", freq: 400, gain: 0.08, dest: sfx }); },
  fanfare(t) {
    for (let i = 0; i < 10; i++) snare(t + i * 0.06, 0.04 + i * 0.008, sfx);
    const R = T[theme].root + 12, seq = [[0, 0.2], [4, 0.2], [7, 0.2], [12, 0.6], [7, 0.15], [12, 0.9]];
    let s = t + 0.65;
    seq.forEach(([iv, d]) => { tone(s, midi(R + iv), d, { type: "sawtooth", gain: 0.1, lp: 2400, dest: sfx }); tone(s, midi(R + iv - 12), d, { type: "square", gain: 0.05, lp: 1200, dest: sfx }); s += d; });
    kick(t + 0.65, 0.5, sfx); FX.sparkle(s);
  },
};

/* ---------- API ---------- */
export const Sound = {
  isOn: () => on,
  toggle() {
    on = !on; try { localStorage.setItem(PREF, on ? "on" : "off"); } catch {}
    if (!on) { stopLoop(); track = "off"; key = ""; if (ctx) ctx.suspend().catch(() => {}); }
    else { ensure(); }
    return on;
  },
  /** events: {anyOut, anyHit, anyRight, anyWrong} untuk efek sesuai tema saat jawaban dibuka */
  phase(themeKey, status, current, ev = {}) {
    const k = `${themeKey}|${status}|${current}`;
    if (k === key) return; key = k;
    theme = T[themeKey] ? themeKey : "klasik";
    if (!on || !ensure()) return;
    const t = ctx.currentTime + 0.05;
    const want = status === "lobby" ? "lobby" : status === "question" ? "question" : status === "leaderboard" ? "board" : "off";
    if (status === "question") { urgency = 0; lastTick = null; }
    if (want !== track) { stopLoop(); track = want; if (want !== "off") setTimeout(() => { if (track === want && !timer) startLoop(); }, status === "question" ? 250 : 420); }
    if (status === "question") FX.gong(t);
    if (status === "reveal") {
      if (ev.anyRight) stinger(t); else FX.buzz(t);
      if (theme === "robot") { if (ev.anyOut) FX.chomp(t + 1.3); else if (ev.anyHit) FX.buzz(t + 0.4); }
      if (theme === "balon" && ev.anyHit) { FX.pop(t + 0.5); FX.pop(t + 0.62); }
      if (theme === "roket" && ev.anyRight) FX.whoosh(t + 0.35);
      if (theme === "kebun") { if (ev.anyRight) FX.sparkle(t + 0.45); if (ev.anyHit) FX.rain(t + 0.3); }
    }
    if (status === "ended") { FX.fanfare(t); setTimeout(() => { if (key === k && on) { track = "board"; startLoop(); } }, 4000); }
  },
  setUrgency(u) { urgency = Math.max(0, Math.min(1, u)); },
  tick(secondsLeft) {
    const s = Math.ceil(secondsLeft);
    if (!on || !ctx || s === lastTick || s > 5 || s < 0) return;
    lastTick = s; FX.tick(ctx.currentTime + 0.01, s <= 3);
  },
  stop() { stopLoop(); track = "off"; key = ""; },
};
