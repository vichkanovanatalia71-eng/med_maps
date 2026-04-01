import { LegalEntity } from "@/types";
import { OBLAST_CENTERS } from "./city-coords";

function normalizeOblast(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s.startsWith("М.КИЇВ") || s === "МІСТО КИЇВ" || s === "М. КИЇВ" || s === "КИЇВ") return "м. Київ";

  const mapping: Record<string, string> = {
    "ВІННИЦЬКА": "Вінницька", "ВОЛИНСЬКА": "Волинська", "ДНІПРОПЕТРОВСЬКА": "Дніпропетровська",
    "ДОНЕЦЬКА": "Донецька", "ЖИТОМИРСЬКА": "Житомирська", "ЗАКАРПАТСЬКА": "Закарпатська",
    "ЗАПОРІЗЬКА": "Запорізька", "ІВАНО-ФРАНКІВСЬКА": "Івано-Франківська", "КИЇВСЬКА": "Київська",
    "КІРОВОГРАДСЬКА": "Кіровоградська", "ЛУГАНСЬКА": "Луганська", "ЛЬВІВСЬКА": "Львівська",
    "МИКОЛАЇВСЬКА": "Миколаївська", "ОДЕСЬКА": "Одеська", "ПОЛТАВСЬКА": "Полтавська",
    "РІВНЕНСЬКА": "Рівненська", "СУМСЬКА": "Сумська", "ТЕРНОПІЛЬСЬКА": "Тернопільська",
    "ХАРКІВСЬКА": "Харківська", "ХЕРСОНСЬКА": "Херсонська", "ХМЕЛЬНИЦЬКА": "Хмельницька",
    "ЧЕРКАСЬКА": "Черкаська", "ЧЕРНІВЕЦЬКА": "Чернівецька", "ЧЕРНІГІВСЬКА": "Чернігівська",
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (s.includes(key)) return value;
  }
  return raw.trim();
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

/**
 * Parse legal entities from pmg-legal-entity-info.csv (has real lat/lng).
 * Columns: legal_entity_id, legal_entity_name, legal_entity_edrpou, care_type,
 * property_type, email, website, phone, owner, registration_area,
 * registration_settlement, registration_address, lat, lng
 */
export function parseRealFacilities(entityCsv: string, divisionsCsv?: string, executorIds?: string[]): LegalEntity[] {
  // Build division info lookup (coords + name + address) for fallback
  const divisionInfo = new Map<string, { lat: number; lng: number; name: string; address: string; oblast: string; city: string }>();
  if (divisionsCsv) {
    const divLines = divisionsCsv.split("\n").filter(l => l.trim());
    // Columns: 0:legal_entity_id, 1:division_id, 2:division_name, 3:division_type,
    // 4:phone, 5:email, 6:residence_area, 7:gromada, 8:gromada_koatuu,
    // 9:region, 10:settlement_type, 11:settlement, 12:settlement_koatuu,
    // 13:residence_addresses, 14:location, 15:lat, 16:lng
    for (let i = 1; i < divLines.length; i++) {
      const fields = parseCSVLine(divLines[i]);
      if (fields.length < 17) continue;
      const entityId = fields[0].trim();
      const lat = parseFloat(fields[15]);
      const lng = parseFloat(fields[16]);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && !divisionInfo.has(entityId)) {
        divisionInfo.set(entityId, {
          lat, lng,
          name: fields[2]?.trim() || "",
          address: fields[13]?.trim() || "",
          oblast: normalizeOblast(fields[6] || ""),
          city: fields[11]?.trim() || "",
        });
      }
    }
  }

  const lines = entityCsv.split("\n").filter(l => l.trim());
  const entities: LegalEntity[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 14) continue;

    const id = fields[0].trim();
    if (seen.has(id)) continue;
    seen.add(id);

    const name = fields[1].trim();
    const edrpou = fields[2].trim();
    const careType = fields[3].trim();
    const oblast = normalizeOblast(fields[9] || "");
    const city = fields[10]?.trim() || "";
    const address = fields[11]?.trim() || "";

    let lat = parseFloat(fields[12]);
    let lng = parseFloat(fields[13]);

    // Fallback to division coordinates if entity has no coords
    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      const divCoord = divisionInfo.get(id);
      if (divCoord) {
        lat = divCoord.lat;
        lng = divCoord.lng;
      } else {
        // Last fallback: oblast center
        const center = OBLAST_CENTERS[oblast];
        if (center) {
          lat = center.lat;
          lng = center.lng;
        } else {
          lat = 48.5;
          lng = 31.2;
        }
      }
    }

    entities.push({
      id,
      name,
      edrpou,
      type: careType || "Контрактований заклад",
      address,
      oblast,
      city,
      latitude: lat,
      longitude: lng,
      status: "ACTIVE",
    });
  }

  // Create placeholder entities for executors not found in entity CSV
  if (executorIds) {
    for (const execId of executorIds) {
      if (seen.has(execId)) continue;
      seen.add(execId);

      const divInfo = divisionInfo.get(execId);
      if (divInfo) {
        entities.push({
          id: execId,
          name: divInfo.name || "Заклад (дані з підрозділу)",
          edrpou: "",
          type: "Контрактований заклад",
          address: divInfo.address,
          oblast: divInfo.oblast,
          city: divInfo.city,
          latitude: divInfo.lat,
          longitude: divInfo.lng,
          status: "ACTIVE",
        });
      }
      // Skip executors without any coordinates — they won't appear on the map
    }
  }

  return entities;
}
