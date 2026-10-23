import { searchCities, getWeather, weatherDescription } from './api.js';
const $ = id => document.getElementById(id);
let busy = false;
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function setBusy(value) {
  busy = value; $('submit').disabled = value; $('city').disabled = value;
  document.querySelectorAll('.choice').forEach(button => { button.disabled = value; });
  $('search').setAttribute('aria-busy', String(value));
}
function label(city) { return [city.name, city.admin1, city.country].filter(Boolean).join(', '); }
function render(city, data) {
  const c = data.current;
  $('place').textContent = label(city);
  $('updated').textContent = `Datos del ${c.time.replace('T', ' a las ')} · Hora local de la ciudad`;
  $('temperature').textContent = `${Math.round(c.temperature_2m)} °C`;
  $('description').textContent = weatherDescription(c.weather_code);
  $('feels').textContent = `${Math.round(c.apparent_temperature)} °C`;
  $('humidity').textContent = `${c.relative_humidity_2m} %`;
  $('wind').textContent = `${c.wind_speed_10m} km/h`;
  $('forecast').replaceChildren();
  for (let i = 1; i < 6; i++) {
    const card = document.createElement('article'); card.className = 'day';
    const title = document.createElement('h4');
    // Mediodía local evita que una fecha ISO cambie al día anterior por la zona horaria.
    title.textContent = new Date(`${data.daily.time[i]}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
    const temperatures = document.createElement('div');
    const max = document.createElement('strong'); max.textContent = `${Math.round(data.daily.temperature_2m_max[i])}° `;
    const min = document.createElement('span'); min.textContent = `${Math.round(data.daily.temperature_2m_min[i])}°`;
    temperatures.append(max, min);
    const condition = document.createElement('p'); condition.textContent = weatherDescription(data.daily.weather_code[i]);
    const rain = document.createElement('p'); rain.textContent = `Lluvia: ${data.daily.precipitation_probability_max[i]} %`;
    card.append(title, temperatures, condition, rain); $('forecast').append(card);
  }
  $('weather').hidden = false;
}
async function load(city) {
  setBusy(true); $('weather').hidden = true; status('Consultando el clima…');
  try { render(city, await getWeather(city)); $('choices').hidden = true; status('Consulta actualizada. Puedes buscar otra ciudad.'); }
  catch(error) { status(error.message, true); }
  finally { setBusy(false); }
}
$('search').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const name = $('city').value.trim();
  if (name.length < 2) { status('Escribe al menos dos caracteres.', true); $('city').focus(); return; }
  setBusy(true); $('weather').hidden = true; $('choices').hidden = true; status('Buscando ciudades…');
  try {
    const cities = await searchCities(name);
    if (!cities.length) throw new Error('No encontramos ciudades con coordenadas válidas.');
    $('choice-list').replaceChildren();
    cities.forEach(city => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'choice'; button.textContent = label(city);
      button.addEventListener('click', () => { if (!busy) load(city); }); $('choice-list').append(button);
    });
    $('choices').hidden = false; status('Selecciona una ciudad para ver su clima.');
  } catch(error) { status(error.message, true); }
  finally { setBusy(false); }
});
