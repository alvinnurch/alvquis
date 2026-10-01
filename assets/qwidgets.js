// Komponen HP untuk soal Mengurutkan dan Mencocokkan (ketuk, tanpa seret).
import { esc } from "./ui.js?v=2026.10.01-r3";

/**
 * Pasang komponen jawaban di `root`.
 * pq: soal publik ({kind:"urut", items:[{id,text}]} atau {kind:"cocok", left:[..], right:[{id,text}]})
 * initial: jawaban sebelumnya (array id) atau null
 * onChange(value): value = array id lengkap, atau null bila belum lengkap
 */
export function mountSeq(root, pq, initial, onChange) {
  if (pq.kind === "urut") return mountOrder(root, pq, initial, onChange);
  return mountMatch(root, pq, initial, onChange);
}

function mountOrder(root, pq, initial, onChange) {
  let seq = Array.isArray(initial) ? initial.slice() : [];
  const text = (id) => pq.items.find((x) => x.id === id)?.text ?? "";
  const draw = () => {
    const pool = pq.items.filter((x) => !seq.includes(x.id));
    root.innerHTML = `
      <p class="small muted">Ketuk butir sesuai urutan yang benar. Ketuk lagi untuk membatalkan.</p>
      <ol class="ord-slots">${pq.items.map((_, k) => seq[k]
        ? `<li><button type="button" class="ord-item placed" data-rm="${esc(seq[k])}"><span class="ord-n">${k + 1}</span><span class="ord-t">${esc(text(seq[k]))}</span><span class="ord-x" aria-hidden="true">✕</span></button></li>`
        : `<li><div class="ord-empty"><span class="ord-n">${k + 1}</span></div></li>`).join("")}</ol>
      ${pool.length ? `<div class="ord-pool">${pool.map((x) => `<button type="button" class="ord-item" data-add="${esc(x.id)}">${esc(x.text)}</button>`).join("")}</div>` : ""}
      ${seq.length ? `<button type="button" class="btn ghost sm" data-reset>Ulangi urutan</button>` : ""}`;
    root.querySelectorAll("[data-add]").forEach((b) => b.onclick = () => { seq.push(b.dataset.add); changed(); });
    root.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { seq = seq.filter((id) => id !== b.dataset.rm); changed(); });
    root.querySelector("[data-reset]")?.addEventListener("click", () => { seq = []; changed(); });
  };
  const changed = () => { draw(); onChange(seq.length === pq.items.length ? seq.slice() : null); };
  draw();
}

function mountMatch(root, pq, initial, onChange) {
  const n = pq.left.length;
  let pick = Array.isArray(initial) && initial.length === n ? initial.slice() : Array(n).fill(null);
  let active = pick.findIndex((x) => x == null); if (active < 0) active = 0;
  const text = (id) => pq.right.find((x) => x.id === id)?.text ?? "";
  const draw = () => {
    root.innerHTML = `
      <p class="small muted">Ketuk satu baris kiri, lalu ketuk pasangannya di bawah.</p>
      <div class="mt-rows">${pq.left.map((l, i) => `
        <button type="button" class="mt-row ${i === active ? "active" : ""} ${pick[i] ? "done" : ""}" data-row="${i}" aria-pressed="${i === active}">
          <span class="mt-n">${i + 1}</span><span class="mt-l">${esc(l)}</span>
          <span class="mt-r">${pick[i] ? esc(text(pick[i])) : "pilih pasangan…"}</span>
        </button>`).join("")}</div>
      <div class="mt-pool" aria-label="Pilihan pasangan untuk baris ${active + 1}">${pq.right.map((r) => {
        const at = pick.indexOf(r.id);
        return `<button type="button" class="mt-opt ${at >= 0 ? "used" : ""}" data-pick="${esc(r.id)}">${at >= 0 ? `<span class="mt-badge">${at + 1}</span>` : ""}${esc(r.text)}</button>`;
      }).join("")}</div>`;
    root.querySelectorAll("[data-row]").forEach((b) => b.onclick = () => { active = +b.dataset.row; draw(); });
    root.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => {
      const id = b.dataset.pick, prev = pick.indexOf(id);
      if (prev >= 0) pick[prev] = null;
      pick[active] = id;
      const next = pick.findIndex((x) => x == null);
      if (next >= 0) active = next;
      draw(); onChange(pick.every(Boolean) ? pick.slice() : null);
    });
  };
  draw();
}

/** Tampilan butir soal di layar proyektor (tanpa jawaban). */
export function stageSeq(pq) {
  if (pq.kind === "urut") {
    return `<div class="seq-stage"><span class="seq-hint">Urutkan butir berikut</span><div class="seq-items">${pq.items.map((x) => `<div class="seq-card">${esc(x.text)}</div>`).join("")}</div></div>`;
  }
  const L = "ABCDEF";
  return `<div class="seq-stage match"><span class="seq-hint">Cocokkan kiri dengan kanan</span>
    <div class="seq-cols"><div>${pq.left.map((t, i) => `<div class="seq-card"><b>${i + 1}</b> ${esc(t)}</div>`).join("")}</div>
    <div>${pq.right.map((r, i) => `<div class="seq-card alt"><b>${L[i]}</b> ${esc(r.text)}</div>`).join("")}</div></div></div>`;
}
/** Kunci jawaban di layar proyektor setelah soal ditutup. */
export function stageSolution(kind, sol) {
  return `<div class="seq-solution">${(sol || []).map((x) => `<div class="seq-card ok"><b>${esc(x.a)}</b><span>${kind === "cocok" ? "→ " : ""}${esc(x.b)}</span></div>`).join("")}</div>`;
}
export const solutionInline = (kind, sol) => (sol || []).map((x) => kind === "cocok" ? `${x.a} → ${x.b}` : `${x.a}. ${x.b}`).join(" · ");
