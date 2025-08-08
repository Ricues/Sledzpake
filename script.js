const API_URL = "https://sledztracking.vercel.app/api/track";

document.getElementById("searchBtn").addEventListener("click", search);
document.getElementById("tracking").addEventListener("keydown", e => {
  if (e.key === "Enter") search();
});

async function search() {
  const number = document.getElementById("tracking").value.trim();
  if (!number) return alert("Podaj numer paczki");

  const timeline = document.getElementById("timeline");
  const meta = document.getElementById("meta");

  document.getElementById("results").hidden = false;
  meta.innerHTML = "";
  timeline.innerHTML = "<p>Ładowanie…</p>";

  try {
    const res = await fetch(API_URL + "?number=" + encodeURIComponent(number));
    const text = await res.text();
    if (!res.ok) {
      timeline.innerHTML = msgBox(`Nie znaleziono przesyłki lub błąd serwera (HTTP ${res.status}).`, "error");
      return;
    }
    let data;
    try { data = JSON.parse(text); }
    catch { timeline.innerHTML = msgBox("Odpowiedź API nie jest JSON-em.", "error"); return; }

    renderMeta(meta, data, number);

    // u Ciebie lista zdarzeń przychodzi jako `details`
    const events = data.details || data.events || data.data || data.history || [];
    if (!Array.isArray(events) || events.length === 0) {
      timeline.innerHTML = msgBox(`Brak danych śledzenia dla numeru: ${number}`, "warn");
      return;
    }

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
        </div>
      `;
      timeline.appendChild(el);
    });

  } catch (err) {
    console.error(err);
    timeline.innerHTML = msgBox("Błąd połączenia: " + err.message, "error");
  }
}

/* ===== helpers ===== */

function renderMeta(container, data, number) {
  const boxes = [];
  boxes.push(box("Numer przesyłki", data.trackingNumber || number, true));
  if (data.referenceNo) boxes.push(box("Numer referencyjny", data.referenceNo));
  if (data.country) boxes.push(box("Kraj", data.country));
  if (data.lastStatus) boxes.push(box("Ostatni status", data.lastStatus, true));
  container.innerHTML = boxes.join("");

  function box(label, value, wide=false){
    return `<div class="box${wide ? " last" : ""}"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
  }
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