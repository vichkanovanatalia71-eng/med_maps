import { LegalEntity } from "@/types";
import { OBLAST_CENTERS, CITY_COORDS } from "./city-coords";

// Normalize oblast name to standard form
function normalizeOblast(raw: string): string {
  const s = raw.trim().toUpperCase();

  if (s.startsWith("М.КИЇВ") || s === "МІСТО КИЇВ" || s === "М. КИЇВ") return "м. Київ";

  const mapping: Record<string, string> = {
    "ВІННИЦЬКА": "Вінницька",
    "ВОЛИНСЬКА": "Волинська",
    "ДНІПРОПЕТРОВСЬКА": "Дніпропетровська",
    "ДОНЕЦЬКА": "Донецька",
    "ЖИТОМИРСЬКА": "Житомирська",
    "ЗАКАРПАТСЬКА": "Закарпатська",
    "ЗАПОРІЗЬКА": "Запорізька",
    "ІВАНО-ФРАНКІВСЬКА": "Івано-Франківська",
    "КИЇВСЬКА": "Київська",
    "КІРОВОГРАДСЬКА": "Кіровоградська",
    "ЛУГАНСЬКА": "Луганська",
    "ЛЬВІВСЬКА": "Львівська",
    "МИКОЛАЇВСЬКА": "Миколаївська",
    "ОДЕСЬКА": "Одеська",
    "ПОЛТАВСЬКА": "Полтавська",
    "РІВНЕНСЬКА": "Рівненська",
    "СУМСЬКА": "Сумська",
    "ТЕРНОПІЛЬСЬКА": "Тернопільська",
    "ХАРКІВСЬКА": "Харківська",
    "ХЕРСОНСЬКА": "Херсонська",
    "ХМЕЛЬНИЦЬКА": "Хмельницька",
    "ЧЕРКАСЬКА": "Черкаська",
    "ЧЕРНІВЕЦЬКА": "Чернівецька",
    "ЧЕРНІГІВСЬКА": "Чернігівська",
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (s.includes(key)) return value;
  }

  return raw.trim();
}

// Normalize apostrophes (Ukrainian has many variants)
function normalizeApostrophe(s: string): string {
  return s.replace(/[′ʼ`'''ʻ]/g, "'");
}

// Extract city from address string like "ХМЕЛЬНИЦЬКА область, місто ШЕПЕТІВКА, вулиця ..."
function extractCity(address: string): string {
  const parts = address.split(",").map(p => p.trim());
  for (const part of parts) {
    const upper = part.toUpperCase();
    // Try "місто XXX", "смт XXX", "село XXX", or just the second part
    const match = upper.match(/(?:МІСТО|МІС\.|М\.|СМТ|СЕЛИЩЕ|СЕЛО)\s+(.+)/);
    if (match) return normalizeApostrophe(match[1].trim());
  }
  // Fallback: second part of address is usually city
  if (parts.length >= 2) {
    const p = parts[1].replace(/^(місто|смт|село|селище|м\.)\s*/i, "").trim();
    return normalizeApostrophe(p.toUpperCase());
  }
  return "";
}

// Get coordinates for a city, with small jitter for uniqueness
function getCoords(city: string, oblast: string, seed: number): { lat: number; lng: number } {
  const cityNorm = normalizeApostrophe(city.toUpperCase().trim());

  // Try exact city match
  if (CITY_COORDS[cityNorm]) {
    const c = CITY_COORDS[cityNorm];
    // Very small jitter (~200m) so facilities in same city don't overlap
    const jitterLat = ((seed * 7919) % 1000) / 500000 - 0.001;
    const jitterLng = ((seed * 6271) % 1000) / 500000 - 0.001;
    return { lat: c.lat + jitterLat, lng: c.lng + jitterLng };
  }

  // Try without apostrophe variants
  const cityNoApo = cityNorm.replace(/'/g, "");
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (key.replace(/'/g, "") === cityNoApo) {
      const jitterLat = ((seed * 7919) % 1000) / 500000 - 0.001;
      const jitterLng = ((seed * 6271) % 1000) / 500000 - 0.001;
      return { lat: coords.lat + jitterLat, lng: coords.lng + jitterLng };
    }
  }

  // Fallback to oblast center with TINY jitter (~500m, never into sea)
  const oblastCenter = OBLAST_CENTERS[oblast];
  if (oblastCenter) {
    const jitterLat = ((seed * 7919) % 1000) / 200000 - 0.0025;
    const jitterLng = ((seed * 6271) % 1000) / 200000 - 0.0025;
    return { lat: oblastCenter.lat + jitterLat, lng: oblastCenter.lng + jitterLng };
  }

  // Last resort: center of Ukraine
  return { lat: 48.5, lng: 31.2 };
}

// Parse CSV with proper handling of quoted fields containing commas and escaped quotes
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

export function parseRealFacilities(csvContent: string): LegalEntity[] {
  const lines = csvContent.split("\n").filter(l => l.trim());
  // Skip header
  const dataLines = lines.slice(1);

  // Group by legal_entity_id to deduplicate (keep first address per entity)
  const entityMap = new Map<string, {
    id: string;
    edrpou: string;
    name: string;
    address: string;
    oblast: string;
    city: string;
  }>();

  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields.length < 7) continue;

    const id = fields[0].trim();
    const edrpou = fields[1].trim();
    const name = fields[2].trim();
    const address = fields[6].trim();

    if (entityMap.has(id)) continue; // Keep first occurrence

    const oblast = normalizeOblast(address.split(",")[0] || "");
    const city = extractCity(address);

    entityMap.set(id, { id, edrpou, name, address, oblast, city });
  }

  // Convert to LegalEntity with coordinates
  const entities: LegalEntity[] = [];
  let seed = 0;

  for (const data of entityMap.values()) {
    const coords = getCoords(data.city, data.oblast, seed++);

    entities.push({
      id: data.id,
      name: data.name,
      edrpou: data.edrpou,
      type: "Контрактований заклад",
      address: data.address,
      oblast: data.oblast,
      city: data.city,
      latitude: coords.lat,
      longitude: coords.lng,
      status: "ACTIVE",
    });
  }

  return entities;
}
