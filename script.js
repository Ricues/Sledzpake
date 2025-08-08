// Sledzpake client
const el = (sel) => document.querySelector(sel);
const tpl = document.getElementById('itemTpl');

const state = {
  proxyUrl: localStorage.getItem('sledzpake_proxy') || '',
};

const year = new Date().getFullYear();
el('#year').textContent = year;

el('#settingsBtn')?.addEventListener('click', () => {
  const d = el('#settingsDlg');
  el('#proxyUrl').value = state.proxyUrl;
  d.showModal();
});

el('#saveSettings')?.addEventListener('click', () => {
  state.proxyUrl = el('#proxyUrl').value.trim();
  localStorage.setItem('sledzpake_proxy', state.proxyUrl);
});

el('#searchBtn').addEventListener('click', () => search());
el('#tracking').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });

async function search(){
  const num = el('#tracking').value.trim();
  if(!num){ el('#tracking').focus(); return; }
  const container = el('#timeline');
  const meta = el('#meta');
  container.innerHTML = '';
  meta.textContent = 'Ładowanie…';
  el('#results').hidden = false;

  try{
    const data = await getTracking(num);
    render(data, num);
  }catch(err){
    console.error(err);
    meta.innerHTML = `Nie udało się pobrać danych. <br/>${err.message}.`;
    // Offer mock
    const demo = makeDemo(num);
    render(demo, num, true);
  }
}

function render(data, num, isMock=false){
  const meta = el('#meta');
  const tl = el('#timeline');
  tl.innerHTML = '';

  const carrier = data.carrier || 'Nieznany przewoźnik';
  meta.textContent = `${carrier} • przesyłka ${num}${isMock ? ' • tryb podglądu (mock)' : ''}`;

  (data.events || []).forEach(evt => {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.querySelector('.status').textContent = evt.status || '—';
    li.querySelector('.time').textContent = evt.time || '';
    if(evt.description) li.querySelector('.desc').textContent = evt.description;
    if(evt.location) li.querySelector('.loc').textContent = evt.location;
    tl.appendChild(li);
  });

  if(!data.events || !data.events.length){
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = '<div class="dot"></div><div class="content"><strong class="status">Brak zdarzeń</strong></div>';
    tl.appendChild(li);
  }
}

/**
 * Fetch tracking data via proxy. You need to run the proxy provided in /proxy.
 * Expected normalized JSON shape:
 * { carrier: "UPS", events: [{time:"2025-08-08 14:20", status:"W doręczeniu", description:"", location:"Warszawa"}] }
 */
async function getTracking(number){
  if(!state.proxyUrl) throw new Error('Proxy API nie jest ustawione');
  const url = new URL(state.proxyUrl);
  url.searchParams.set('number', number);
  const r = await fetch(url, { headers: { 'accept':'application/json' } });
  if(!r.ok) throw new Error('Błąd sieci: ' + r.status);
  const json = await r.json();
  return json;
}

// Demo data used when proxy is not available
function makeDemo(number){
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0,16).replace('T',' ');
  return {
    carrier: 'DEMO (UPS)',
    events: [
      { time: fmt(new Date(now.getTime()-1000*60*60*48)), status:'Nadana', description:'Przesyłka odebrana przez kuriera', location:'Gdańsk' },
      { time: fmt(new Date(now.getTime()-1000*60*60*30)), status:'W tranzycie', description:'Sortownia', location:'Łódź' },
      { time: fmt(new Date(now.getTime()-1000*60*60*6)), status:'W doręczeniu', description:'Kurier w trasie', location:'Warszawa' },
      { time: fmt(now), status:'Dostarczona', description:'Potwierdzono odbiór', location:'Warszawa' },
    ]
  };
}
