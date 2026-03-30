"use client";

import { useState } from "react";
import { useStore } from "@/store";
import FilterPanel from "./FilterPanel";
import Dashboard from "./Dashboard";

export default function Sidebar() {
  const { sidebarOpen } = useStore();
  const [activeTab, setActiveTab] = useState<"filters" | "stats">("filters");

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => useStore.getState().toggleSidebar()}
        />
      )}

      <aside
        className={`
          fixed lg:relative top-12 lg:top-0 left-0 h-[calc(100vh-48px)] lg:h-full
          w-[360px] bg-white border-r border-gray-200 z-40
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-[360px]"}
        `}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab("filters")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors
              ${activeTab === "filters"
                ? "text-cyan-700 border-b-2 border-cyan-600"
                : "text-gray-400 hover:text-gray-600"
              }`}
          >
            Фільтри
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors
              ${activeTab === "stats"
                ? "text-cyan-700 border-b-2 border-cyan-600"
                : "text-gray-400 hover:text-gray-600"
              }`}
          >
            Статистика
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "filters" ? <FilterPanel /> : <Dashboard />}
        </div>
      </aside>
    </>
  );
}
