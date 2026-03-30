"use client";

import { useStore } from "@/store";
import { exportToCSV, exportMapScreenshot, generateShareableURL } from "@/lib/export";
import { useState } from "react";

export default function Header() {
  const { mapMode, setMapMode, toggleSidebar, facilities, filters } = useStore();
  const [showCopied, setShowCopied] = useState(false);

  const handleShareURL = () => {
    const url = generateShareableURL(filters);
    navigator.clipboard.writeText(url).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 z-20">
      {/* Left: Logo & Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-none">МедКарта ЕСОЗ</h1>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Погашені направлення</p>
          </div>
        </div>
      </div>

      {/* Center: Map mode toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setMapMode("markers")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5
            ${mapMode === "markers" ? "bg-white text-cyan-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          Точки
        </button>
        <button
          onClick={() => setMapMode("heatmap")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5
            ${mapMode === "heatmap" ? "bg-white text-cyan-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/>
          </svg>
          Теплова карта
        </button>
      </div>

      {/* Right: Export buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => exportToCSV(facilities)}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
          title="Експорт CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          CSV
        </button>
        <button
          onClick={exportMapScreenshot}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
          title="Скріншот карти"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          PNG
        </button>
        <button
          onClick={handleShareURL}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1 relative"
          title="Поширити посилання"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
          {showCopied ? "Скопійовано!" : "URL"}
        </button>
      </div>
    </header>
  );
}
