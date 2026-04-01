"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useStore } from "@/store";
import { ukraineOblastsGeoJSON } from "@/data/ukraine-oblasts";
import { EnrichedFacility } from "@/types";

const UKRAINE_CENTER: L.LatLngExpression = [48.9, 31.2];
const UKRAINE_ZOOM = 6;

function getMarkerSize(count: number): number {
  if (count < 100) return 20;
  if (count < 500) return 26;
  if (count < 1000) return 30;
  if (count < 5000) return 36;
  if (count < 20000) return 40;
  return 46;
}

function getHeatColor(value: number, max: number): string {
  const ratio = max > 0 ? value / max : 0;
  if (ratio < 0.2) return "#e0f7fa";
  if (ratio < 0.4) return "#80deea";
  if (ratio < 0.6) return "#26c6da";
  if (ratio < 0.8) return "#0097a7";
  return "#006064";
}

function formatNumber(n: number): string {
  return n.toLocaleString("uk-UA");
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapView() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatLayerRef = useRef<L.GeoJSON | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeMarkersRef = useRef<L.LayerGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EnrichedFacility[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; facility: string } | null>(null);
  const [locating, setLocating] = useState(false);

  const { facilities, oblastData, mapMode } = useStore();

  // Search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = facilities
      .filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.edrpou.includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q)
      )
      .slice(0, 10);
    setSearchResults(results);
  }, [facilities]);

  const flyToFacility = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([lat, lng], 16, { duration: 1 });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  const resetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo(UKRAINE_CENTER, UKRAINE_ZOOM, { duration: 0.8 });
  }, []);

  // Clear route
  const clearRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    if (routeMarkersRef.current) {
      map.removeLayer(routeMarkersRef.current);
      routeMarkersRef.current = null;
    }
    setRouteInfo(null);
  }, []);

  // Build route using OSRM (free, no API key)
  const buildRoute = useCallback(async (facilityLat: number, facilityLng: number, facilityName: string) => {
    if (!userLocation) return;
    const map = mapRef.current;
    if (!map) return;

    clearRoute();

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${facilityLng},${facilityLat}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        // Fallback: straight line with haversine distance
        const dist = haversineDistance(userLocation.lat, userLocation.lng, facilityLat, facilityLng);
        const line = L.polyline(
          [[userLocation.lat, userLocation.lng], [facilityLat, facilityLng]],
          { color: "#0891b2", weight: 3, dashArray: "8, 8", opacity: 0.8 }
        ).addTo(map);
        routeLineRef.current = line;

        setRouteInfo({
          distance: formatDistance(dist),
          duration: "~" + Math.round(dist / 1000 / 50 * 60) + " хв",
          facility: facilityName,
        });

        map.fitBounds(line.getBounds(), { padding: [60, 60] });
        return;
      }

      const route = data.routes[0];
      const coords: [number, number][] = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );

      const line = L.polyline(coords, {
        color: "#0891b2",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      routeLineRef.current = line;

      // Route turn-by-turn markers
      const turnGroup = L.layerGroup().addTo(map);
      routeMarkersRef.current = turnGroup;

      // Destination marker
      const destIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#dc2626;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: "",
        iconSize: L.point(14, 14),
        iconAnchor: L.point(7, 7),
      });
      L.marker([facilityLat, facilityLng], { icon: destIcon }).addTo(turnGroup);

      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.round(route.duration / 60);

      setRouteInfo({
        distance: route.distance < 1000 ? `${Math.round(route.distance)} м` : `${distanceKm} км`,
        duration: durationMin < 60 ? `${durationMin} хв` : `${Math.floor(durationMin / 60)} год ${durationMin % 60} хв`,
        facility: facilityName,
      });

      map.fitBounds(line.getBounds(), { padding: [60, 60] });
    } catch {
      // Network error — fallback to straight line
      const dist = haversineDistance(userLocation.lat, userLocation.lng, facilityLat, facilityLng);
      const line = L.polyline(
        [[userLocation.lat, userLocation.lng], [facilityLat, facilityLng]],
        { color: "#0891b2", weight: 3, dashArray: "8, 8", opacity: 0.8 }
      ).addTo(map);
      routeLineRef.current = line;

      setRouteInfo({
        distance: formatDistance(dist) + " (по прямій)",
        duration: "~" + Math.round(dist / 1000 / 50 * 60) + " хв",
        facility: facilityName,
      });

      map.fitBounds(line.getBounds(), { padding: [60, 60] });
    }
  }, [userLocation, clearRoute]);

  // Locate user
  const locateUser = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);

    map.locate({ setView: true, maxZoom: 14, enableHighAccuracy: true });

    map.once("locationfound", (e: L.LocationEvent) => {
      setLocating(false);
      const { lat, lng } = e.latlng;
      const accuracy = e.accuracy;
      setUserLocation({ lat, lng });

      // Remove previous user marker/circle
      if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
      if (userCircleRef.current) map.removeLayer(userCircleRef.current);

      // Accuracy circle
      const circle = L.circle([lat, lng], {
        radius: Math.min(accuracy, 2000),
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "4, 4",
      }).addTo(map);
      userCircleRef.current = circle;

      // User marker — pulsing blue dot
      const userIcon = L.divIcon({
        html: `<div class="user-location-marker">
          <div class="user-location-pulse"></div>
          <div class="user-location-dot"></div>
        </div>`,
        className: "",
        iconSize: L.point(24, 24),
        iconAnchor: L.point(12, 12),
      });

      const userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(
          `<div style="padding:8px;font-size:13px;text-align:center">
            <div style="font-weight:600;color:#3b82f6;margin-bottom:4px">Ваше розташування</div>
            <div style="font-size:11px;color:#64748b">Точність: ~${Math.round(accuracy)} м</div>
          </div>`,
          { className: "custom-popup" }
        );
      userMarkerRef.current = userMarker;
    });

    map.once("locationerror", () => {
      setLocating(false);
      alert("Не вдалося визначити розташування. Перевірте дозволи геолокації у браузері.");
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: UKRAINE_CENTER,
      zoom: UKRAINE_ZOOM,
      minZoom: 5,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: true,
    });

    const cartoVoyager = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    );

    const osmStandard = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }
    );

    const cartoLight = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    );

    cartoVoyager.addTo(map);

    const baseLayers = {
      "Детальна (Voyager)": cartoVoyager,
      "OpenStreetMap": osmStandard,
      "Світла": cartoLight,
    };
    L.control.layers(baseLayers, {}, { position: "topright" }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false, metric: true }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Markers mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markersRef.current) {
      map.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    if (mapMode !== "markers") return;

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: (zoom: number) => {
        if (zoom >= 15) return 20;
        if (zoom >= 13) return 30;
        if (zoom >= 11) return 40;
        return 60;
      },
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getChildCount();
        let totalCompleted = 0;
        for (const marker of cluster.getAllChildMarkers()) {
          totalCompleted += (marker.options as { completedCount?: number }).completedCount || 0;
        }

        let size = 40;
        let bgColor = "rgba(8, 145, 178, 0.7)";
        let borderColor = "rgba(8, 145, 178, 0.9)";

        if (childCount > 100) {
          size = 70; bgColor = "rgba(14, 116, 144, 0.8)"; borderColor = "rgba(14, 116, 144, 1)";
        } else if (childCount > 50) {
          size = 58; bgColor = "rgba(6, 182, 212, 0.75)"; borderColor = "rgba(6, 182, 212, 0.95)";
        } else if (childCount > 10) {
          size = 48;
        }

        return L.divIcon({
          html: `<div class="cluster-marker" style="width:${size}px;height:${size}px;background:${bgColor};border-color:${borderColor}">
            <div style="text-align:center;line-height:1.2">
              <div style="font-size:${size > 55 ? 15 : 13}px">${childCount}</div>
              <div style="font-size:9px;opacity:0.85">${totalCompleted >= 1000000 ? (totalCompleted / 1000000).toFixed(1) + 'M' : totalCompleted >= 1000 ? Math.round(totalCompleted / 1000) + 'K' : totalCompleted}</div>
            </div>
          </div>`,
          className: "",
          iconSize: L.point(size, size),
        });
      },
    });

    for (const facility of facilities) {
      const size = getMarkerSize(facility.totalCompleted);
      const icon = L.divIcon({
        html: `<div class="facility-marker" style="width:${size}px;height:${size}px">
          <span style="font-size:${size > 30 ? 10 : 8}px">${facility.totalCompleted >= 1000 ? Math.round(facility.totalCompleted / 1000) + 'K' : facility.totalCompleted}</span>
        </div>`,
        className: "",
        iconSize: L.point(size, size),
      });

      const categoryRows = Object.entries(facility.categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `<tr><td style="padding:2px 8px 2px 0;color:#475569">${cat}</td><td style="text-align:right;font-weight:600">${formatNumber(count)}</td></tr>`)
        .join("");

      const topServices = facility.services
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5)
        .map(s => `<tr><td style="padding:2px 8px 2px 0;color:#475569;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</td><td style="text-align:right;font-weight:600;white-space:nowrap">${formatNumber(s.completed)}</td></tr>`)
        .join("");

      // Distance info if user location is available
      let distanceHtml = "";
      if (userLocation) {
        const dist = haversineDistance(userLocation.lat, userLocation.lng, facility.latitude, facility.longitude);
        distanceHtml = `
          <div style="background:#eff6ff;border-radius:6px;padding:6px 8px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
            <div>
              <span style="font-size:11px;color:#3b82f6;font-weight:600">${formatDistance(dist)}</span>
              <span style="font-size:10px;color:#64748b"> від вас</span>
            </div>
            <button onclick="window.__buildRoute(${facility.latitude},${facility.longitude},'${facility.name.replace(/'/g, "\\'")}')"
              style="background:#0891b2;color:white;border:none;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer">
              Маршрут
            </button>
          </div>`;
      }

      const popupContent = `
        <div style="padding:12px;font-size:13px;line-height:1.5;max-height:400px;overflow-y:auto">
          <div style="font-weight:700;font-size:14px;color:#0e7490;margin-bottom:4px">${facility.name}</div>
          <div style="color:#64748b;font-size:12px;margin-bottom:8px">
            ЄДРПОУ: ${facility.edrpou}<br/>
            ${facility.address}
          </div>
          ${distanceHtml}
          <div style="background:#f0fdfa;border-radius:6px;padding:8px;margin-bottom:8px">
            <div style="font-size:22px;font-weight:700;color:#0e7490">${formatNumber(facility.totalCompleted)}</div>
            <div style="color:#64748b;font-size:11px">погашених направлень</div>
          </div>
          <div style="font-weight:600;font-size:12px;color:#334155;margin-bottom:4px">За категоріями:</div>
          <table style="width:100%;font-size:12px;margin-bottom:8px">${categoryRows}</table>
          ${topServices ? `<div style="font-weight:600;font-size:12px;color:#334155;margin-bottom:4px">Топ послуги:</div><table style="width:100%;font-size:11px">${topServices}</table>` : ""}
        </div>
      `;

      const marker = L.marker([facility.latitude, facility.longitude], {
        icon,
        completedCount: facility.totalCompleted,
      } as L.MarkerOptions & { completedCount: number })
        .bindPopup(popupContent, { className: "custom-popup", maxWidth: 350, maxHeight: 450 });

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);
    markersRef.current = clusterGroup;
  }, [facilities, mapMode, userLocation, buildRoute]);

  // Expose buildRoute to popup buttons via window
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__buildRoute = (lat: number, lng: number, name: string) => {
      buildRoute(lat, lng, name);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__buildRoute;
    };
  }, [buildRoute]);

  // Heatmap (choropleth) mode
  const maxCompleted = useMemo(() => {
    return Math.max(...Object.values(oblastData).map(d => d.totalCompleted), 1);
  }, [oblastData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (mapMode !== "heatmap") return;

    const geoJsonLayer = L.geoJSON(ukraineOblastsGeoJSON, {
      style: (feature) => {
        const name = feature?.properties?.name || "";
        const data = oblastData[name];
        const value = data?.totalCompleted || 0;
        return {
          fillColor: getHeatColor(value, maxCompleted),
          weight: 1.5, opacity: 1, color: "#0e7490", fillOpacity: 0.7,
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature?.properties?.name || "";
        const data = oblastData[name];
        const total = data?.totalCompleted || 0;
        const count = data?.facilitiesCount || 0;

        layer.bindTooltip(
          `<div style="font-weight:600;font-size:13px">${name} область</div>
           <div style="font-size:12px;margin-top:4px">
             Погашено: <b>${formatNumber(total)}</b><br/>
             Закладів: <b>${count}</b>
           </div>`,
          { sticky: true }
        );

        layer.on({
          mouseover: (e) => { e.target.setStyle({ weight: 3, fillOpacity: 0.85 }); },
          mouseout: (e) => { geoJsonLayer.resetStyle(e.target); },
        });
      },
    });

    geoJsonLayer.addTo(map);
    heatLayerRef.current = geoJsonLayer;
  }, [oblastData, mapMode, maxCompleted]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} id="map-container" className="w-full h-full" />

      {/* Map controls overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        {/* Search */}
        <div className="relative">
          <div className="flex items-center bg-white rounded-lg shadow-md">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 text-gray-500 hover:text-cyan-600 transition-colors"
              title="Пошук закладу"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </button>
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Назва, ЄДРПОУ або місто..."
                className="w-64 pr-3 py-2 text-sm border-none outline-none rounded-r-lg"
                autoFocus
              />
            )}
          </div>

          {searchResults.length > 0 && showSearch && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-100 max-h-72 overflow-y-auto z-[1001]">
              {searchResults.map(f => {
                let distLabel = "";
                if (userLocation) {
                  const dist = haversineDistance(userLocation.lat, userLocation.lng, f.latitude, f.longitude);
                  distLabel = ` | ${formatDistance(dist)}`;
                }
                return (
                  <button
                    key={f.id}
                    onClick={() => flyToFacility(f.latitude, f.longitude)}
                    className="w-full text-left px-3 py-2.5 hover:bg-cyan-50 border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <div className="text-xs font-semibold text-gray-800 truncate">{f.name}</div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {f.city}, {f.oblast} | {formatNumber(f.totalCompleted)} направлень{distLabel}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex flex-col gap-1">
          <button
            onClick={resetView}
            className="bg-white rounded-lg shadow-md p-2.5 text-gray-500 hover:text-cyan-600 transition-colors"
            title="Вся Україна"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M12 3v18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
            </svg>
          </button>
          <button
            onClick={locateUser}
            className={`bg-white rounded-lg shadow-md p-2.5 transition-colors ${
              userLocation ? "text-blue-500" : "text-gray-500 hover:text-cyan-600"
            } ${locating ? "animate-pulse" : ""}`}
            title={userLocation ? "Оновити розташування" : "Моє розташування"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={userLocation ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Route info panel */}
      {routeInfo && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 px-5 py-3 flex items-center gap-4">
          <div>
            <div className="text-xs text-gray-500 truncate max-w-52">{routeInfo.facility}</div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm font-bold text-cyan-700">{routeInfo.distance}</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-sm font-semibold text-gray-600">{routeInfo.duration}</span>
            </div>
          </div>
          <button
            onClick={clearRoute}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Закрити маршрут"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
