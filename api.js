// API pública: no se necesita ni se almacena una clave.
export async function fetchJSON(url, fetcher = globalThis.fetch, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (response.status === 429) throw new Error('Se alcanzó el límite de consultas. Espera un minuto y vuelve a intentar.');
    if (!response.ok) throw new Error(`El servicio no está disponible (HTTP ${response.status}). Intenta más tarde.`);
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('La API devolvió una respuesta vacía o inválida.');
    if (data.error) throw new Error('La API rechazó la consulta. Intenta con otra ciudad.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La consulta tardó demasiado. Vuelve a intentar.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar. Revisa tu conexión a internet y vuelve a intentar.');
    if (error instanceof SyntaxError) throw new Error('La API devolvió datos que no se pudieron leer.');
    throw error;
  } finally { clearTimeout(timer); }
}

export async function searchCities(name, fetcher) {
  const query = new URLSearchParams({ name, count: '5', language: 'es', format: 'json' });
  const data = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?${query}`, fetcher);
  if (!Array.isArray(data.results) || !data.results.length) throw new Error('No encontramos esa ciudad. Prueba con otro nombre.');
  return data.results.filter(city => city.name && Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
}

export async function getWeather(city, fetcher) {
  const query = new URLSearchParams({ latitude: city.latitude, longitude: city.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto', forecast_days: '6' });
  const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?${query}`, fetcher);
  const fields = ['temperature_2m','relative_humidity_2m','apparent_temperature','weather_code','wind_speed_10m'];
  if (!data.current || !data.current.time || !fields.every(field => Number.isFinite(data.current[field])))
    throw new Error('No hay datos actuales disponibles para esa ciudad.');
  const dailyFields = ['weather_code','temperature_2m_max','temperature_2m_min','precipitation_probability_max'];
  if (!Array.isArray(data.daily?.time) || data.daily.time.length < 6 ||
      !dailyFields.every(field => Array.isArray(data.daily[field]) && data.daily[field].length >= 6 && data.daily[field].slice(1,6).every(Number.isFinite)))
    throw new Error('El pronóstico llegó incompleto. Intenta más tarde.');
  return data;
}

export function weatherDescription(code) {
  if (code === 0) return 'Cielo despejado';
  if ([1,2,3].includes(code)) return 'Parcialmente nublado';
  if ([45,48].includes(code)) return 'Niebla';
  if ([51,53,55,56,57].includes(code)) return 'Llovizna';
  if ([61,63,65,66,67,80,81,82].includes(code)) return 'Lluvia';
  if ([71,73,75,77,85,86].includes(code)) return 'Nieve';
  if ([95,96,99].includes(code)) return 'Tormenta';
  return 'Condición no disponible';
}
