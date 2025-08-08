const API_URL = "https://sledztracking.vercel.app/api/track";

document.getElementById("searchBtn").addEventListener("click", search);
document.getElementById("tracking").addEventListener("keydown", e => { if (e.key === "Enter") search(); });

let expectedZip = null; // z API: postalCode/zipCode/postcode

async function search() {
  const number = document.getElementById("tracking").value.trim();
  if (!number) return alert("Podaj numer paczki");

  const meta = document.getElementById("meta");
  const timeline = document.getElementById("timeline");
  const zipGate = document.getElementById("zipGate");
  const zipHint = document.getElementById("zipHint");

  document.getElementById("results").hidden = false;
  meta.innerHTML = "";
  timeline.innerHTML = "<p>Ładowanie…</p>";
  zipGate.hidden = true;
  zipHint.hidden = true;
  expectedZip = null;

  try {
    const res = await fetch(API_URL + "?number=" + encodeURIComponent(number));
    const text = await res.text();

    if (!res.ok) { timeline.innerHTML = msgBox(`Nie znaleziono przesyłki lub błąd serwera (HTTP ${res.status}).`, "error"); return; }
    let data; try { data = JSON.parse(text); } catch { timeline.innerHTML = msgBox("Odpowiedź API nie jest JSON-em.", "error"); return; }

    // zapamiętaj spodziewany kod pocztowy z API (jeśli jest)
    expectedZip = normalizeZip(data.postalCode || data.zipCode || data.postcode || null);

    renderMeta(meta, data, number);

    const events = data.details || data.events || data.data || data.history || [];
    if (!Array.isArray(events) || events.length === 0) { timeline.innerHTML = msgBox(`Brak danych śledzenia dla numeru: ${number}`, "warn"); return; }

    // jeśli mamy kod z API — pokaż bramkę weryfikacji
    if (expectedZip) {
      zipGate.hidden = false;
      zipHint.hidden = true;
      document.getElementById("zipCheckBtn").onclick = () => {
        const typed = normalizeZip(document.getElementById("zipInput").value);
        if (!typed) { zipHint.textContent = "Wpisz kod pocztowy w formacie 12-345"; zipHint.hidden = false; return; }
        if (typed === expectedZip) {
          revealSensitive(); // odblokuj pola
          zipGate.hidden = true;
        } else {
          zipHint.textContent = "Niepoprawny kod. Spróbuj ponownie.";
          zipHint.hidden = false;
        }
      };
    } else {
      // brak kodu w danych — zostaw pola zablokowane i pokaż informację
      zipGate.hidden = false;
      document.getElementById("zipHint").textContent = "Brak kodu pocztowego w danych API — nie można zweryfikować.";
      document.getElementById("zipHint").hidden = false;
      document.getElementById("zipCheckBtn").disabled = true;
      document.getElementById("zipInput").disabled = true;
    }

    // rysuj timeline
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

  // Numer referencyjny i Odbiorca – ukryte do czasu poprawnego kodu
  if (data.referenceNo) boxes.push(boxLocked("Numer referencyjny", data.referenceNo, "ref"));
  if (data.consigneeName) boxes.push(boxLocked("Odbiorca", data.consigneeName, "name"));

  if (data.country) boxes.push(box("Kraj", data.country));
  if (data.lastStatus) boxes.push(box("Ostatni status", data.lastStatus, true));

  container.innerHTML = boxes.join("");
}

function revealSensitive() {
  document.querySelectorAll(".box.locked").forEach(b => b.classList.remove("locked"));
}

function box(label, value, wide=false){
  return `<div class="box${wide ? " last" : ""}">
            <span>${label}</span>
            <strong class="value">${escapeHtml(value)}</strong>
          </div>`;
}
function boxLocked(label, value, key){
  return `<div class="box locked" data-key="${key}">
            <span>${label}</span>
            <strong class="value">${escapeHtml(value)}</strong>
          </div>`;
}

/* ===== helpers ===== */
function normalizeZip(x){
  if (!x) return null;
  const digits = String(x).replace(/[^0-9]/g, "");
  return digits.length >= 5 ? digits.slice(0,5) : null; // PL: 5 cyfr
}
function msgBox(text, type="info"){
  const col = type==="error" ? "#ffb3b3" : type==="warn" ? "#ffd37a" : "#b3e5ff";
  return `<p style="background:#141414;border:1px solid rgba(255,255,255,.08);border-left:4px solid ${col};padding:12px;border-radius:10px">${escapeHtml(text)}</p>`;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
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