const API_URL = "https://sledztracking.vercel.app/api/track";

document.getElementById("searchBtn").addEventListener("click", search);
document.getElementById("tracking").addEventListener("keydown", e => { if (e.key === "Enter") search(); });

// bramka weryfikuje numer referencyjny
let expectedRef = null;

async function search() {
  const number = document.getElementById("tracking").value.trim();
  if (!number) return alert("Podaj numer paczki");

  const meta = document.getElementById("meta");
  const timeline = document.getElementById("timeline");
  const gate = document.getElementById("zipGate");
  const hint = document.getElementById("zipHint");
  const input = document.getElementById("zipInput");
  const btn = document.getElementById("zipCheckBtn");

  document.getElementById("results").hidden = false;
  meta.innerHTML = "";
  timeline.innerHTML = "<p>Ładowanie…</p>";
  gate.hidden = true; hint.hidden = true; expectedRef = null;

  try {
    const res = await fetch(API_URL + "?number=" + encodeURIComponent(number));
    const text = await res.text();
    if (!res.ok) { timeline.innerHTML = msgBox(`Nie znaleziono przesyłki lub błąd serwera (HTTP ${res.status}).`, "error"); return; }

    let data; 
    try { data = JSON.parse(text); } 
    catch { timeline.innerHTML = msgBox("Odpowiedź API nie jest JSON-em.", "error"); return; }

    // zapamiętaj numer referencyjny z API
    expectedRef = normalizeRef(data.referenceNo || null);

    renderMeta(meta, data, number);

    const events = data.details || data.events || data.data || data.history || [];
    if (!Array.isArray(events) || events.length === 0) { 
      timeline.innerHTML = msgBox(`Brak danych śledzenia dla numeru: ${number}`, "warn"); 
      return; 
    }

    // bramka: oczekujemy podania numeru referencyjnego
    setupRefGate(expectedRef);

    // timeline
    timeline.innerHTML = "";
    events.forEach((e, i) => {
      const icon = pickIcon(e);
      const el = document.createElement("div");
      el.className = "event";
      el.style.animationDelay = (i * 0.08) + "s";
      el.innerHTML = `
        <div class="icon">${icon}</div>
        <div>
          <h3>${escapeHtml(e.status || e.state || e.event || "—")}</h3>
          <time>${escapeHtml(e.time || e.date || e.datetime || "")}</time>
          ${e.location || e.place ? `<div class="loc">${escapeHtml(e.location || e.place)}</div>` : ""}
          ${e.description || e.details ? `<p>${escapeHtml(e.description || e.details)}</p>` : ""}
        </div>`;
      timeline.appendChild(el);
    });

  } catch (err) {
    console.error(err);
    timeline.innerHTML = msgBox("Błąd połączenia: " + err.message, "error");
  }
}

/* ===== META + SENSITIVE ===== */
function renderMeta(container, data, number) {
  const boxes = [];
  boxes.push(box("Numer przesyłki", data.trackingNumber || number, true));
  if (data.referenceNo) boxes.push(box("Numer referencyjny", data.referenceNo));     // widoczny
  if (data.consigneeName) boxes.push(boxLocked("Odbiorca", data.consigneeName));     // ukryty do czasu weryfikacji
  if (data.country) boxes.push(box("Kraj", data.country));
  if (data.lastStatus) boxes.push(box("Ostatni status", data.lastStatus, true));
  container.innerHTML = boxes.join("");
}

function revealSensitive() {
  document.querySelectorAll(".box.locked .value").forEach(el => {
    const real = el.dataset.real;
    if (real) el.textContent = real;
    el.classList.remove("masked");
    el.removeAttribute("data-real");
    el.closest(".box")?.classList.remove("locked");
  });
}

/* ===== Gate (verify reference) ===== */
function setupRefGate(expectedRef) {
  const gate = document.getElementById("zipGate");
  const hint = document.getElementById("zipHint");
  const input = document.getElementById("zipInput");
  const btn = document.getElementById("zipCheckBtn");

  if (expectedRef) {
    gate.hidden = false;
    input.disabled = false; btn.disabled = false;
    hint.hidden = true; input.value = "";
    btn.onclick = () => {
      const typed = normalizeRef(input.value);
      if (!typed) { hint.textContent = "Wpisz numer referencyjny (litery/cyfry)."; hint.hidden = false; return; }
      if (typed === expectedRef) {
        revealSensitive();
        gate.hidden = true;
      } else {
        hint.textContent = "Niepoprawny numer referencyjny. Spróbuj ponownie.";
        hint.hidden = false;
      }
    };
  } else {
    gate.hidden = false;
    input.disabled = true; btn.disabled = true;
    hint.textContent = "Brak numeru referencyjnego w danych API — nie można zweryfikować.";
    hint.hidden = false;
  }
}

/* ===== helpers ===== */
function box(label, value, wide=false){
  return `<div class="box${wide ? " last" : ""}">
            <span>${label}</span>
            <strong class="value">${escapeHtml(value)}</strong>
          </div>`;
}
function boxLocked(label, value){
  const real = String(value);
  const mask = "•".repeat(Math.min(12, Math.max(6, real.length)));
  return `<div class="box locked">
            <span>${label}</span>
            <strong class="value masked" data-real="${attrEscape(real)}">${mask}</strong>
          </div>`;
}
function msgBox(text, type="info"){
  const col = type==="error" ? "#ffb3b3" : type==="warn" ? "#ffd37a" : "#b3e5ff";
  return `<p style="background:#141414;border:1px solid rgba(255,255,255,.08);border-left:4px solid ${col};padding:12px;border-radius:10px">${escapeHtml(text)}</p>`;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function attrEscape(s){ return String(s).replace(/"/g, '&quot;'); }
function normalizeRef(x){ return x ? String(x).trim().replace(/\s+/g,'').toUpperCase() : null; }
function pickIcon(e){
  const t = (e.status || e.details || e.description || "").toLowerCase();
  const loc = (e.location || "").toLowerCase();
  if (t.includes("dostarcz") || t.includes("delivered")) return "✅";
  if (t.includes("doręczen") || t.includes("kurier") || t.includes("out for delivery")) return "🚚";
  if (t.includes("nadana") || t.includes("odebrana") || t.includes("picked up")) return "📦";
  if (t.includes("sortown") || t.includes("centrum operacyjne") || t.includes("hub")) return "🏭";
  if (t.includes("odprawa celna") || t.includes("customs")) return "🛃";
  if (t.includes("lot") || t.includes("air") || t.includes("przylecia") || t.includes("odlecia")) return "✈️";
  if (t.includes("opóźn") || t.includes("exception") || t.includes("failed")) return "⚠️";
  if (t.includes("skan") || t.includes("scan")) return "🔎";
  if (loc.includes("port") || loc.includes("terminal")) return "🛳️";
  return "📍";
}