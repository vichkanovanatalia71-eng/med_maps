import { LegalEntity, ServiceRequest } from "@/types";

const OBLASTS: { name: string; lat: number; lng: number; cities: string[] }[] = [
  { name: "Вінницька", lat: 49.23, lng: 28.47, cities: ["Вінниця", "Жмеринка", "Козятин", "Хмільник"] },
  { name: "Волинська", lat: 50.75, lng: 25.32, cities: ["Луцьк", "Ковель", "Нововолинськ", "Володимир"] },
  { name: "Дніпропетровська", lat: 48.46, lng: 35.04, cities: ["Дніпро", "Кривий Ріг", "Кам'янське", "Нікополь", "Павлоград"] },
  { name: "Донецька", lat: 48.0, lng: 37.8, cities: ["Краматорськ", "Маріуполь", "Слов'янськ", "Покровськ"] },
  { name: "Житомирська", lat: 50.26, lng: 28.66, cities: ["Житомир", "Бердичів", "Коростень", "Новоград-Волинський"] },
  { name: "Закарпатська", lat: 48.62, lng: 22.29, cities: ["Ужгород", "Мукачево", "Хуст", "Берегове"] },
  { name: "Запорізька", lat: 47.84, lng: 35.14, cities: ["Запоріжжя", "Мелітополь", "Бердянськ", "Енергодар"] },
  { name: "Івано-Франківська", lat: 48.92, lng: 24.71, cities: ["Івано-Франківськ", "Калуш", "Коломия", "Надвірна"] },
  { name: "Київська", lat: 50.45, lng: 30.52, cities: ["Біла Церква", "Бровари", "Бориспіль", "Ірпінь", "Буча"] },
  { name: "Кіровоградська", lat: 48.51, lng: 32.26, cities: ["Кропивницький", "Олександрія", "Знам'янка"] },
  { name: "Луганська", lat: 48.57, lng: 39.31, cities: ["Сєвєродонецьк", "Лисичанськ", "Рубіжне"] },
  { name: "Львівська", lat: 49.84, lng: 24.03, cities: ["Львів", "Дрогобич", "Стрий", "Червоноград", "Самбір"] },
  { name: "Миколаївська", lat: 46.97, lng: 32.0, cities: ["Миколаїв", "Первомайськ", "Вознесенськ"] },
  { name: "Одеська", lat: 46.48, lng: 30.73, cities: ["Одеса", "Ізмаїл", "Чорноморськ", "Южне", "Білгород-Дністровський"] },
  { name: "Полтавська", lat: 49.59, lng: 34.55, cities: ["Полтава", "Кременчук", "Горішні Плавні", "Лубни"] },
  { name: "Рівненська", lat: 50.62, lng: 26.25, cities: ["Рівне", "Дубно", "Вараш", "Острог"] },
  { name: "Сумська", lat: 50.91, lng: 34.8, cities: ["Суми", "Конотоп", "Шостка", "Охтирка"] },
  { name: "Тернопільська", lat: 49.55, lng: 25.59, cities: ["Тернопіль", "Чортків", "Кременець"] },
  { name: "Харківська", lat: 49.99, lng: 36.23, cities: ["Харків", "Лозова", "Ізюм", "Чугуїв"] },
  { name: "Херсонська", lat: 46.64, lng: 32.62, cities: ["Херсон", "Нова Каховка", "Каховка"] },
  { name: "Хмельницька", lat: 49.42, lng: 27.0, cities: ["Хмельницький", "Кам'янець-Подільський", "Шепетівка"] },
  { name: "Черкаська", lat: 49.44, lng: 32.06, cities: ["Черкаси", "Умань", "Сміла", "Золотоноша"] },
  { name: "Чернівецька", lat: 48.29, lng: 25.94, cities: ["Чернівці", "Новодністровськ", "Сторожинець"] },
  { name: "Чернігівська", lat: 51.49, lng: 31.29, cities: ["Чернігів", "Ніжин", "Прилуки"] },
  { name: "м. Київ", lat: 50.45, lng: 30.52, cities: ["Київ"] },
];

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
const FACILITY_TYPES = ["Первинна ланка", "Вторинна ланка", "Третинна ланка"];
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

function uuid(rand: () => number): string {
  const hex = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      result += "-";
    } else if (i === 14) {
      result += "4";
    } else {
      result += hex[Math.floor(rand() * 16)];
    }
  }
  return result;
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function generateEdrpou(rand: () => number): string {
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += Math.floor(rand() * 10).toString();
  }
  return result;
}

export function generateMockData(): {
  legalEntities: LegalEntity[];
  serviceRequests: ServiceRequest[];
} {
  const rand = seededRandom(42);
  const legalEntities: LegalEntity[] = [];

  // Generate ~500 facilities across Ukraine
  for (const oblast of OBLASTS) {
    const facilitiesCount = oblast.name === "м. Київ" ? 40 :
      oblast.name === "Дніпропетровська" || oblast.name === "Харківська" || oblast.name === "Львівська" || oblast.name === "Одеська" ? 30 :
      Math.floor(12 + rand() * 15);

    for (let i = 0; i < facilitiesCount; i++) {
      const city = pick(oblast.cities, rand);
      const latOffset = (rand() - 0.5) * 1.2;
      const lngOffset = (rand() - 0.5) * 1.5;

      legalEntities.push({
        id: uuid(rand),
        name: `${pick(["КНП", "ТОВ", "КП", "ПП"], rand)} "${pick(["Міська лікарня", "Поліклініка", "Діагностичний центр", "Медичний центр", "Районна лікарня", "Обласна клінічна лікарня", "Клініка", "Центр ПМСД"], rand)} №${Math.floor(rand() * 20 + 1)}" ${city}`,
        edrpou: generateEdrpou(rand),
        type: pick(FACILITY_TYPES, rand),
        address: `${city}, вул. ${pick(["Шевченка", "Франка", "Лесі Українки", "Грушевського", "Соборна", "Незалежності", "Миру", "Перемоги", "Центральна", "Героїв"], rand)}, ${Math.floor(rand() * 150 + 1)}`,
        oblast: oblast.name,
        city,
        latitude: oblast.lat + latOffset,
        longitude: oblast.lng + lngOffset,
        status: rand() > 0.05 ? "ACTIVE" : "CLOSED",
      });
    }
  }

  // Generate service requests
  const serviceRequests: ServiceRequest[] = [];
  const activeFacilities = legalEntities.filter(e => e.status === "ACTIVE");

  for (let i = 0; i < 15000; i++) {
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

  return { legalEntities, serviceRequests };
}

export { SPECIALITIES, CATEGORIES, SERVICES, AGE_GROUPS, GENDERS, PRIORITIES, PERIODS };
