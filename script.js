const API_URL = "https://sledztracking.vercel.app/api/track";
document.getElementById("year")?.textContent = new Date().getFullYear();

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
    const data = await res.json();

    console.log("📦 Odpowiedź API:", data); // logowanie w konsoli

    // jeśli API zwróci błąd
    if (data.error) {
      timeline.innerHTML = `<p style='color:red'>Błąd API: ${data.error}</p>`;
      return;
    }

    renderTimeline(data, number);
  } catch (err) {
    console.error("Błąd zapytania:", err);
    timeline.innerHTML = "<p style='color:red'>Błąd połączenia: " + err.message + "</p>";
  }
}

function renderTimeline(data, number) {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  // sprawdzamy różne możliwe pola
  const events =
    data.events ||
    data.data ||
    data.history ||
    data.tracking ||
    [];

  if (!Array.isArray(events) || events.length === 0) {
    timeline.innerHTML = `<p>Brak danych śledzenia dla numeru: <strong>${number}</strong></p>`;
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
}