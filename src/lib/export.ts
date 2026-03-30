import { EnrichedFacility, Filters } from "@/types";

export function exportToCSV(facilities: EnrichedFacility[]) {
  const BOM = "\uFEFF";
  const headers = [
    "Назва закладу",
    "ЄДРПОУ",
    "Тип",
    "Адреса",
    "Область",
    "Місто",
    "Широта",
    "Довгота",
    "Погашено направлень",
    "Створено направлень",
    "Відкликано",
    "Помилкові",
  ];

  const rows = facilities.map(f => [
    `"${f.name.replace(/"/g, '""')}"`,
    f.edrpou,
    f.type,
    `"${f.address.replace(/"/g, '""')}"`,
    f.oblast,
    f.city,
    f.latitude,
    f.longitude,
    f.totalCompleted,
    f.totalCreated,
    f.totalRecalled,
    f.totalError,
  ]);

  const csv = BOM + headers.join(";") + "\n" + rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `med_maps_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportMapScreenshot() {
  const { toPng } = await import("html-to-image");
  const mapContainer = document.getElementById("map-container");
  if (!mapContainer) return;

  try {
    const dataUrl = await toPng(mapContainer, {
      quality: 0.95,
      backgroundColor: "#ffffff",
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `med_maps_screenshot_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  } catch (err) {
    console.error("Screenshot export failed:", err);
  }
}

export function generateShareableURL(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.specialities.length) params.set("spec", filters.specialities.join(","));
  if (filters.categories.length) params.set("cat", filters.categories.join(","));
  if (filters.services.length) params.set("svc", filters.services.join(","));
  if (filters.priority !== "Всі") params.set("pri", filters.priority);
  if (filters.ageGroups.length) params.set("age", filters.ageGroups.join(","));
  if (filters.gender !== "Всі") params.set("gen", filters.gender);
  if (filters.periodFrom) params.set("from", filters.periodFrom);
  if (filters.periodTo) params.set("to", filters.periodTo);
  if (filters.statuses.length) params.set("stat", filters.statuses.join(","));

  const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
}
