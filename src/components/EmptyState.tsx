"use client";

import { useStore } from "@/store";

export default function EmptyState() {
  const { facilities, isLoaded, resetFilters } = useStore();

  if (!isLoaded || facilities.length > 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="bg-white/95 rounded-xl shadow-lg p-6 text-center max-w-sm pointer-events-auto">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-800 mb-1">
          Дані не знайдено
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          За обраними фільтрами немає закладів з погашеними направленнями.
        </p>
        <button
          onClick={resetFilters}
          className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium hover:bg-cyan-700 transition-colors"
        >
          Скинути фільтри
        </button>
      </div>
    </div>
  );
}
