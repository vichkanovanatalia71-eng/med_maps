"use client";

import { useStore } from "@/store";

function ChipSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const isActive = selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`
                px-2.5 py-1 rounded-full text-xs font-medium transition-all
                ${isActive
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }
              `}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RadioToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </label>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`
              flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${value === opt
                ? "bg-white text-cyan-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
              }
            `}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

const AGE_GROUP_LABELS: Record<string, string> = {
  "y0-5": "0-5 років",
  "y06-17": "6-17 років",
  "y18-39": "18-39 років",
  "y40-64": "40-64 років",
  "y65+": "65+ років",
  "Уточнюється": "Уточнюється",
};

const AGE_GROUPS_ORDER = ["y0-5", "y06-17", "y18-39", "y40-64", "y65+", "Уточнюється"];

export default function FilterPanel() {
  const {
    filters, setFilter, resetFilters,
    availableServices, allSpecialities, allCategories, allPeriods,
  } = useStore();

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">Фільтри</h2>
        <button
          onClick={resetFilters}
          className="text-xs text-cyan-600 hover:text-cyan-800 font-medium"
        >
          Скинути всі
        </button>
      </div>

      {/* Period filter */}
      {allPeriods.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Період
          </label>
          <div className="flex gap-2">
            <select
              value={filters.periodFrom}
              onChange={(e) => setFilter("periodFrom", e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {allPeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span className="text-gray-400 self-center text-xs">—</span>
            <select
              value={filters.periodTo}
              onChange={(e) => setFilter("periodTo", e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {allPeriods.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Category filter */}
      <ChipSelect
        label="Категорія послуги"
        options={allCategories}
        selected={filters.categories}
        onChange={(v) => setFilter("categories", v)}
      />

      {/* Service filter (cascading) */}
      {availableServices.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Послуга
          </label>
          <select
            value={filters.services[0] || ""}
            onChange={(e) => setFilter("services", e.target.value ? [e.target.value] : [])}
            className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="">Всі послуги ({availableServices.length})</option>
            {availableServices.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Speciality filter */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Спеціальність лікаря
        </label>
        <select
          multiple
          value={filters.specialities}
          onChange={(e) => {
            const values = Array.from(e.target.selectedOptions, o => o.value);
            setFilter("specialities", values);
          }}
          className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 h-32"
        >
          {allSpecialities.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {filters.specialities.length > 0 && (
          <button
            onClick={() => setFilter("specialities", [])}
            className="text-xs text-cyan-600 mt-1"
          >
            Очистити ({filters.specialities.length})
          </button>
        )}
      </div>

      {/* Priority */}
      <RadioToggle
        label="Пріоритет"
        options={["Всі", "Планове", "Ургентне"]}
        value={filters.priority}
        onChange={(v) => setFilter("priority", v)}
      />

      {/* Age groups */}
      <ChipSelect
        label="Вікова група"
        options={AGE_GROUPS_ORDER}
        selected={filters.ageGroups}
        onChange={(v) => setFilter("ageGroups", v)}
      />

      {/* Gender */}
      <RadioToggle
        label="Стать пацієнта"
        options={["Всі", "Жіноча", "Чоловіча"]}
        value={filters.gender}
        onChange={(v) => setFilter("gender", v)}
      />
    </div>
  );
}
