const API_URL = "https://sledztracking.vercel.app/api/track";

document.getElementById("searchBtn").addEventListener("click", search);
document.getElementById("tracking").addEventListener("keydown", e => {
  if (e.key === "Enter") search();
});

async function search() {
  const number = document.getElementById("tracking").value.trim();
  if (!number) return alert("Podaj numer paczki");

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "<p>Ładowanie...</p>";
  document.getElementById("results").hidden = false;

  try {
    const res = await fetch(API_URL + "?number=" + encodeURIComponent(number));

    // Sprawdzenie statusu HTTP
    if (!res.ok) {
      timeline.innerHTML = `<p style="color:red">Błąd HTTP: ${res.status} ${res.statusText}</p>`;
      return;
    }

    // Pobierz surowy tekst i spróbuj sparsować JSON
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      timeline.innerHTML = `<p style="color:red">Błąd: odpowiedź nie jest JSON-em</p><pre>${text}</pre>`;
      return;
    }

    // Pokaż surowe dane (do debugowania)
    console.log("📦 API response:", data);

    // Rysuj timeline jeśli są zdarzenia
    renderTimeline(data, number);

  } catch (err) {
    console.error("Błąd połączenia:", err);
    timeline.innerHTML = `<p style="color:red">Błąd połączenia: ${err.message}</p>`;
  }
}

function renderTimeline(data, number) {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  const events = data.events || data.data || data.history || data.tracking || [];
  if (!Array.isArray(events) || events.length === 0) {
    timeline.innerHTML = `<p>Brak danych śledzenia dla numeru: <strong>${number}</strong></p><pre>${JSON.stringify(data, null, 2)}</pre>`;
    return;
  }

  events.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "event";
    div.style.animationDelay = (i * 0.1) + "s";
    div.innerHTML = `
      <h3>${e.status || e.state || e.event || "—"}</h3>
      <time>${e.time || e.date || e.datetime || ""}</time>
      <p>${e.description || e.details || ""}</p>
      <p style="color:#888">${e.location || e.place || ""}</p>
    `;
    timeline.appendChild(div);
  });

  // Dodaj surowe dane pod osią czasu (do testów)
  const raw = document.createElement("pre");
  raw.style.marginTop = "20px";
  raw.style.background = "#111";
  raw.style.padding = "10px";
  raw.textContent = JSON.stringify(data, null, 2);
  timeline.appendChild(raw);
}