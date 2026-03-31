import { LegalEntity, ServiceRequest } from "@/types";

const SPECIALITIES = [
  "Сімейна медицина", "Терапія", "Педіатрія", "Хірургія", "Кардіологія",
  "Неврологія", "Ендокринологія", "Офтальмологія", "Отоларингологія",
  "Урологія", "Гінекологія", "Дерматологія", "Психіатрія", "Онкологія",
  "Пульмонологія", "Гастроентерологія", "Ортопедія та травматологія",
  "Ревматологія", "Нефрологія", "Інфекційні хвороби",
];

const CATEGORIES = [
  "Консультація",
  "Лабораторна діагностика",
  "Візуалізація",
  "Госпіталізація",
];

const SERVICES: Record<string, { code: string; name: string }[]> = {
  "Консультація": [
    { code: "C001", name: "Консультація кардіолога" },
    { code: "C002", name: "Консультація невролога" },
    { code: "C003", name: "Консультація ендокринолога" },
    { code: "C004", name: "Консультація офтальмолога" },
    { code: "C005", name: "Консультація ЛОРа" },
    { code: "C006", name: "Консультація хірурга" },
    { code: "C007", name: "Консультація уролога" },
    { code: "C008", name: "Консультація дерматолога" },
    { code: "C009", name: "Консультація онколога" },
    { code: "C010", name: "Консультація психіатра" },
  ],
  "Лабораторна діагностика": [
    { code: "L001", name: "Загальний аналіз крові" },
    { code: "L002", name: "Біохімічний аналіз крові" },
    { code: "L003", name: "Загальний аналіз сечі" },
    { code: "L004", name: "Глюкоза крові" },
    { code: "L005", name: "Гормони щитоподібної залози" },
    { code: "L006", name: "Коагулограма" },
    { code: "L007", name: "ПЛР-тест" },
    { code: "L008", name: "Ліпідний профіль" },
  ],
  "Візуалізація": [
    { code: "V001", name: "УЗД черевної порожнини" },
    { code: "V002", name: "УЗД щитоподібної залози" },
    { code: "V003", name: "Рентгенографія грудної клітки" },
    { code: "V004", name: "МРТ головного мозку" },
    { code: "V005", name: "КТ органів черевної порожнини" },
    { code: "V006", name: "Ехокардіографія" },
    { code: "V007", name: "Мамографія" },
    { code: "V008", name: "УЗД нирок" },
  ],
  "Госпіталізація": [
    { code: "H001", name: "Планова госпіталізація (хірургія)" },
    { code: "H002", name: "Планова госпіталізація (терапія)" },
    { code: "H003", name: "Ургентна госпіталізація" },
    { code: "H004", name: "Реабілітація стаціонарна" },
    { code: "H005", name: "Денний стаціонар" },
  ],
};

const AGE_GROUPS = ["y06-17", "y18-39", "y40-64", "y65+"];
const GENDERS = ["Жіноча", "Чоловіча"];
const PRIORITIES = ["Планове", "Ургентне"];
const PERIODS = [
  "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
  "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  "2026-01", "2026-02", "2026-03",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/**
 * Generate mock service requests using real facilities.
 * Real facilities come from the parsed CSV; service requests are synthetic.
 */
export function generateServiceRequests(facilities: LegalEntity[]): ServiceRequest[] {
  const rand = seededRandom(42);
  const serviceRequests: ServiceRequest[] = [];
  const activeFacilities = facilities.filter(e => e.status === "ACTIVE");

  if (activeFacilities.length === 0) return [];

  // Generate ~20000 service request records across all real facilities
  const count = Math.min(activeFacilities.length * 5, 25000);

  for (let i = 0; i < count; i++) {
    const category = pick(CATEGORIES, rand);
    const service = pick(SERVICES[category], rand);
    const requester = pick(activeFacilities, rand);
    const hasExecutor = rand() > 0.15;
    const executor = hasExecutor ? pick(activeFacilities, rand) : null;
    const period = pick(PERIODS, rand);

    const totalCreated = Math.floor(rand() * 50 + 1);
    const completed = hasExecutor ? Math.floor(totalCreated * (0.5 + rand() * 0.5)) : 0;
    const recalled = Math.floor((totalCreated - completed) * rand() * 0.3);
    const errorCount = Math.floor(rand() * 3);

    serviceRequests.push({
      period_created_at: period,
      requester_legal_entity_id: requester.id,
      requester_employee_speciality: pick(SPECIALITIES, rand),
      service_request_category: category,
      service_request_priority: pick(PRIORITIES, rand),
      service_code: service.code,
      service_code_name: service.name,
      patient_age_group: pick(AGE_GROUPS, rand),
      patient_gender: pick(GENDERS, rand),
      used_by_legal_entity_identifier_value: executor?.id ?? null,
      count_created_requests_all: totalCreated,
      count_is_completed: completed,
      count_is_recalled: recalled,
      count_is_entered_in_error: errorCount,
    });
  }

  return serviceRequests;
}

export { SPECIALITIES, CATEGORIES, SERVICES, AGE_GROUPS, GENDERS, PRIORITIES, PERIODS };
