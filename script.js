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
    renderTimeline(data);
  } catch (err) {
    timeline.innerHTML = "<p style='color:red'>Błąd: " + err.message + "</p>";
  }
}

function renderTimeline(data) {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";
  const events = data.events || data.data || [];
  if (!events.length) {
    timeline.innerHTML = "<p>Brak danych dla tej przesyłki</p>";
    return;
  }
  events.forEach((e, i) => {
    const div = document.createElement("div");
    div.className = "event";
    div.style.animationDelay = (i * 0.1) + "s";
    div.innerHTML = `
      <h3>${e.status || "—"}</h3>
      <time>${e.time || ""}</time>
      <p>${e.description || ""}</p>
      <p style="color:#888">${e.location || ""}</p>
    `;
    timeline.appendChild(div);
  });
}