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

// Normalize apostrophes
function normalizeApostrophe(s: string): string {
  return s.replace(/[′ʼ`'''ʻ]/g, "'");
}

// Extract city from address string
function extractCity(address: string): string {
  const parts = address.split(",").map(p => p.trim());
  for (const part of parts) {
    const upper = part.toUpperCase();
    const match = upper.match(/(?:МІСТО|МІС\.|М\.|СМТ|СМТ\.|СЕЛИЩЕ|СЕЛО)\s+(.+)/);
    if (match) return normalizeApostrophe(match[1].trim());
  }
  if (parts.length >= 2) {
    const p = parts[1].replace(/^(місто|смт|село|селище|м\.)\s*/i, "").trim();
    return normalizeApostrophe(p.toUpperCase());
  }
  return "";
}

// Get coordinates for a city
function getCoords(city: string, oblast: string, seed: number): { lat: number; lng: number } {
  const cityNorm = normalizeApostrophe(city.toUpperCase().trim());

  if (CITY_COORDS[cityNorm]) {
    const c = CITY_COORDS[cityNorm];
    const jitterLat = ((seed * 7919) % 1000) / 500000 - 0.001;
    const jitterLng = ((seed * 6271) % 1000) / 500000 - 0.001;
    return { lat: c.lat + jitterLat, lng: c.lng + jitterLng };
  }

  // Fuzzy match without apostrophes
  const cityNoApo = cityNorm.replace(/'/g, "");
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (key.replace(/'/g, "") === cityNoApo) {
      const jitterLat = ((seed * 7919) % 1000) / 500000 - 0.001;
      const jitterLng = ((seed * 6271) % 1000) / 500000 - 0.001;
      return { lat: coords.lat + jitterLat, lng: coords.lng + jitterLng };
    }
  }

  // Fallback to oblast center with tiny jitter
  const oblastCenter = OBLAST_CENTERS[oblast];
  if (oblastCenter) {
    const jitterLat = ((seed * 7919) % 1000) / 200000 - 0.0025;
    const jitterLng = ((seed * 6271) % 1000) / 200000 - 0.0025;
    return { lat: oblastCenter.lat + jitterLat, lng: oblastCenter.lng + jitterLng };
  }

  return { lat: 48.5, lng: 31.2 };
}

// Parse the wrapped CSV line: each line is one big quoted field with doubled quotes
function unwrapLine(line: string): string {
  line = line.trim();
  if (line.startsWith('"') && line.endsWith('"')) {
    line = line.slice(1, -1);
  }
  return line.replace(/""/g, '"');
}

// Parse CSV with proper handling of quoted fields
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

interface Division {
  division_id: string;
  division_adresses: string;
}

export function parseRealFacilities(csvContent: string): LegalEntity[] {
  const lines = csvContent.split("\n").filter(l => l.trim());
  const dataLines = lines.slice(1); // Skip header

  // Group by legal_entity_id, keeping first address per entity
  const entityMap = new Map<string, {
    id: string;
    edrpou: string;
    name: string;
    address: string;
    oblast: string;
    city: string;
    contractAmount: number;
  }>();

  for (const rawLine of dataLines) {
    const unwrapped = unwrapLine(rawLine);
    const fields = parseCSVLine(unwrapped);
    if (fields.length < 13) continue;

    const id = fields[0].trim();
    const edrpou = fields[1].trim();
    const name = fields[2].trim();
    const contractAmount = parseFloat(fields[10]) || 0;

    if (entityMap.has(id)) continue;

    // Parse divisions JSON to get address
    let address = "";
    let oblast = "";
    let city = "";

    try {
      const divisionsJson = fields[12].trim();
      const divisions: Division[] = JSON.parse(divisionsJson);
      if (divisions.length > 0) {
        address = divisions[0].division_adresses || "";
        oblast = normalizeOblast(address.split(",")[0] || "");
        city = extractCity(address);
      }
    } catch {
      // If JSON parsing fails, try to extract address from raw text
      const addrMatch = fields[12]?.match(/division_adresses["\s:]+([^"]+)/);
      if (addrMatch) {
        address = addrMatch[1];
        oblast = normalizeOblast(address.split(",")[0] || "");
        city = extractCity(address);
      }
    }

    entityMap.set(id, { id, edrpou, name, address, oblast, city, contractAmount });
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
