/**
 * Pakistan agricultural intelligence: crop calendar, city weather, and
 * seasonal advisories. Pure data + a free open-meteo fetch (no API key).
 * Months are 1-12. Data reflects typical Pakistani sowing/harvest windows;
 * farmers should confirm with local extension staff.
 */

export type CropEntry = {
  id: string;
  en: string;
  ur: string;
  sowing: number[];
  harvest: number[];
  regions: string;
  tip: string;
};

export const CROP_CALENDAR: CropEntry[] = [
  {
    id: "wheat",
    en: "Wheat",
    ur: "گندم",
    sowing: [10, 11],
    harvest: [4, 5],
    regions: "Punjab & Sindh breadbasket",
    tip: "Complete sowing by mid-November; late sowing cuts yield sharply. First irrigation at 20-25 days (Zadoks stage 21).",
  },
  {
    id: "rice",
    en: "Rice / Basmati",
    ur: "چاول",
    sowing: [5, 6, 7],
    harvest: [10, 11],
    regions: "Kalar tract (Sialkot, Narowal), upper Sindh",
    tip: "Transplant nursery at 30-35 days. Basmati needs longer day length — avoid early nitrogen overdose.",
  },
  {
    id: "cotton",
    en: "Cotton",
    ur: "کپاس",
    sowing: [4, 5],
    harvest: [8, 9, 10, 11],
    regions: "South Punjab (Multan, Bahawalpur, R.Y. Khan), Sindh",
    tip: "Thrips and whitefly pressure rises in June — scout twice weekly. Avoid spraying during peak bee foraging hours.",
  },
  {
    id: "sugarcane",
    en: "Sugarcane",
    ur: "گنّا",
    sowing: [2, 3, 9],
    harvest: [11, 12, 1, 2, 3],
    regions: "Central Punjab, Sindh sugar belts",
    tip: "Spring planting (Feb-Mar) yields best. Earthing-up with the monsoon prevents lodging.",
  },
  {
    id: "maize",
    en: "Maize",
    ur: "مکئی",
    sowing: [1, 2, 7, 8],
    harvest: [5, 6, 10, 11],
    regions: "Punjab & KP (spring + autumn crops)",
    tip: "Autumn crop must be sown by mid-August to escape frost during grain filling.",
  },
  {
    id: "potato",
    en: "Potato",
    ur: "آلو",
    sowing: [10, 1],
    harvest: [1, 2, 3, 4],
    regions: "Okara, Sahiwal, Kasur, Swat",
    tip: "Use certified seed; home-saved seed builds virus load. Hilling at 25-30 days after planting.",
  },
  {
    id: "tomato",
    en: "Tomato",
    ur: "ٹماٹر",
    sowing: [8, 9, 12, 1],
    harvest: [11, 12, 3, 4],
    regions: "Sindh, south Punjab, tunnel farms nationwide",
    tip: "Stake plants and remove lower infected leaves to slow early blight after rain.",
  },
  {
    id: "onion",
    en: "Onion",
    ur: "پیاز",
    sowing: [11, 12, 1],
    harvest: [4, 5, 6],
    regions: "Sindh (Nasarpur), Mandi Bahauddin, Swabi",
    tip: "Purple blotch strikes in humid February — start protective sprays before symptoms appear.",
  },
  {
    id: "citrus",
    en: "Kinnow / Citrus",
    ur: "کینو",
    sowing: [2, 3],
    harvest: [12, 1, 2],
    regions: "Sargodha, Toba Tek Singh, Bhalwal",
    tip: "Harvest at full colour for export grade; greedy harvesting damages next year's flush.",
  },
  {
    id: "mango",
    en: "Mango",
    ur: "آم",
    sowing: [3, 4],
    harvest: [5, 6, 7, 8],
    regions: "Multan, Rahim Yar Khan, Hyderabad, Sindhri",
    tip: "Stop irrigation 4-5 weeks before flowering. Mango hopper control at panicle emergence is critical.",
  },
  {
    id: "chickpea",
    en: "Chickpea / Gram",
    ur: "چنا",
    sowing: [10, 11],
    harvest: [3, 4],
    regions: "Thal (Bhakkar, Layyah, Mianwali)",
    tip: "Gram is rain-fed — wilt disease follows warm, wet winters, so use resistant varieties.",
  },
  {
    id: "mustard",
    en: "Canola / Mustard",
    ur: "سرسوں",
    sowing: [10, 11],
    harvest: [3, 4],
    regions: "Punjab, Sindh, KP barani tracts",
    tip: "Aphid buildup in January is the main yield thief — monitor and spray before flowering peaks.",
  },
];

export type CropPhase = "sow" | "field" | "harvest";

export function cropPhase(crop: CropEntry, month: number): CropPhase | null {
  if (crop.sowing.includes(month)) return "sow";
  if (crop.harvest.includes(month)) return "harvest";
  const sowingStart = Math.min(...crop.sowing);
  const harvestEnd = Math.max(...crop.harvest);
  if (harvestEnd > sowingStart && month > sowingStart && month <= harvestEnd) return "field";
  return null;
}

export function seasonSnapshot(month: number) {
  const sowNow = CROP_CALENDAR.filter((c) => cropPhase(c, month) === "sow");
  const harvestNow = CROP_CALENDAR.filter((c) => cropPhase(c, month) === "harvest");
  const inField = CROP_CALENDAR.filter((c) => cropPhase(c, month) === "field");
  return { sowNow, harvestNow, inField };
}

/** Crops from a farmer's own list that need action this month. */
export function cropsInSeason(myCrops: string[], month: number) {
  const normalize = (v: string) => v.trim().toLowerCase();
  const mine = myCrops.map(normalize).filter(Boolean);
  return CROP_CALENDAR.filter((crop) => {
    const names = [crop.en.toLowerCase(), crop.ur, crop.id];
    return mine.some((m) => names.some((n) => n.includes(m) || m.includes(n)));
  });
}

export const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Bahawalpur: { lat: 29.3956, lon: 71.6836 },
  Chiniot: { lat: 31.7292, lon: 72.9786 },
  "D.G. Khan": { lat: 30.0489, lon: 70.6403 },
  Faisalabad: { lat: 31.4187, lon: 73.0791 },
  Gujranwala: { lat: 32.1877, lon: 74.1945 },
  Gujrat: { lat: 32.5731, lon: 74.0789 },
  Hafizabad: { lat: 32.0709, lon: 73.6884 },
  Hyderabad: { lat: 25.396, lon: 68.3578 },
  Islamabad: { lat: 33.6844, lon: 73.0479 },
  Jhang: { lat: 31.2781, lon: 72.3317 },
  Karachi: { lat: 24.8607, lon: 67.0011 },
  Kasur: { lat: 31.1187, lon: 74.45 },
  Khushab: { lat: 32.2961, lon: 72.3527 },
  Lahore: { lat: 31.5204, lon: 74.3587 },
  Larkana: { lat: 27.559, lon: 68.212 },
  Layyah: { lat: 30.9614, lon: 70.9411 },
  Lodhran: { lat: 29.5333, lon: 71.6333 },
  Mardan: { lat: 34.1989, lon: 72.0231 },
  Multan: { lat: 30.1575, lon: 71.5249 },
  Muzaffarabad: { lat: 34.37, lon: 73.4711 },
  Narowal: { lat: 32.1014, lon: 74.873 },
  Nawabshah: { lat: 26.2442, lon: 68.41 },
  Okara: { lat: 30.8081, lon: 73.4534 },
  Peshawar: { lat: 34.0151, lon: 71.5249 },
  Quetta: { lat: 30.1798, lon: 66.975 },
  "Rahim Yar Khan": { lat: 28.4202, lon: 70.2952 },
  Rawalpindi: { lat: 33.5651, lon: 73.0169 },
  Sahiwal: { lat: 30.6682, lon: 73.1114 },
  Sargodha: { lat: 32.0836, lon: 72.6711 },
  Sheikhupura: { lat: 31.7131, lon: 73.9783 },
  Sialkot: { lat: 32.4945, lon: 74.5229 },
  Sukkur: { lat: 27.7052, lon: 68.8574 },
  Vehari: { lat: 30.0333, lon: 72.3519 },
};

export type CityWeather = {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  label: string;
  icon: string;
  rainChanceToday: number;
  days: { date: string; max: number; min: number; rainChance: number }[];
  fetchedAt: string;
};

export function describeWeatherCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear sky", icon: "clear_day" };
  if (code <= 2) return { label: "Partly cloudy", icon: "partly_cloudy_day" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code <= 48) return { label: "Fog / mist", icon: "foggy" };
  if (code <= 57) return { label: "Drizzle", icon: "rainy" };
  if (code <= 67) return { label: "Rain", icon: "rainy" };
  if (code <= 77) return { label: "Snow", icon: "ac_unit" };
  if (code <= 82) return { label: "Rain showers", icon: "rainy" };
  return { label: "Thunderstorm", icon: "thunderstorm" };
}

/** Free weather via open-meteo (no API key). Returns null when offline. */
export async function fetchCityWeather(city: string | null): Promise<CityWeather | null> {
  const coords = city ? CITY_COORDS[city] : undefined;
  const point = coords ?? { lat: 30.3753, lon: 69.3451 }; // Pakistan centroid
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
    "&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=Asia%2FKarachi&forecast_days=4";
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      current: { temperature_2m: number; relative_humidity_2m: number; precipitation: number; weather_code: number; wind_speed_10m: number };
      daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] };
    };
    const described = describeWeatherCode(data.current.weather_code);
    return {
      city: city ?? "Pakistan",
      temperature: Math.round(data.current.temperature_2m),
      humidity: Math.round(data.current.relative_humidity_2m),
      windSpeed: Math.round(data.current.wind_speed_10m),
      precipitation: data.current.precipitation,
      label: described.label,
      icon: described.icon,
      rainChanceToday: data.daily.precipitation_probability_max?.[0] ?? 0,
      days: data.daily.time.slice(0, 4).map((date, i) => ({
        date,
        max: Math.round(data.daily.temperature_2m_max[i] ?? 0),
        min: Math.round(data.daily.temperature_2m_min[i] ?? 0),
        rainChance: data.daily.precipitation_probability_max?.[i] ?? 0,
      })),
      fetchedAt: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return null;
  }
}

/** Practical field advisories derived from weather + season. */
export function buildAdvisories(weather: CityWeather | null, month: number): string[] {
  const notes: string[] = [];
  const snapshot = seasonSnapshot(month);
  if (snapshot.sowNow.length > 0) {
    notes.push(`Sowing window: ${snapshot.sowNow.map((c) => `${c.en} (${c.ur})`).join(", ")}. Prepare a fine seedbed and confirm certified seed before the window closes.`);
  }
  if (snapshot.harvestNow.length > 0) {
    notes.push(`Harvest window: ${snapshot.harvestNow.map((c) => c.en).join(", ")}. Arrange labour and transport early — post-harvest losses are highest in the first 48 hours.`);
  }
  if (weather) {
    const rainSoon = weather.days.some((d) => d.rainChance >= 60);
    const hot = weather.days.some((d) => d.max >= 40);
    const dry = weather.days.every((d) => d.rainChance < 25);
    if (rainSoon) notes.push(`Rain likely (${weather.rainChanceToday}% today). Hold fertilizer and pesticide applications until the system passes — runoff wastes inputs.`);
    if (hot) notes.push("Heat above 40°C forecast. Shift irrigation to early morning or evening and provide shade + extra water for poultry and dairy animals.");
    if (dry && !rainSoon) notes.push("Dry week ahead. Plan irrigation turns now and mulch vegetable beds to hold soil moisture.");
  }
  if (notes.length === 0) {
    notes.push("No critical alerts today. Keep scouting fields twice weekly and log what you see — it builds your farm record.");
  }
  return notes.slice(0, 3);
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
