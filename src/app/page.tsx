"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/store";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import EmptyState from "@/components/EmptyState";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Завантаження карти...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const { initialize, isLoaded } = useStore();

  useEffect(() => {
    if (!isLoaded) {
      initialize();
    }
  }, [initialize, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">Завантаження даних...</p>
          <p className="text-xs text-gray-400 mt-1">Обробка направлень ЕСОЗ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 relative">
          <MapView />
          <EmptyState />
        </main>
      </div>
    </div>
  );
}
