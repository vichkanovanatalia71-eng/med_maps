"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

interface NavigationViewProps {
  route: {
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
    legs: { steps: RouteStep[] }[];
  };
  userLocation: { lat: number; lng: number };
  facilityName: string;
  facilityLocation: { lat: number; lng: number };
  onExit: () => void;
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} м`;
  return `${(m / 1000).toFixed(1)} км`;
}

function formatDuration(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} хв`;
  return `${Math.floor(min / 60)} год ${min % 60} хв`;
}

function getManeuverIcon(type: string, modifier?: string): string {
  if (type === "turn") {
    if (modifier === "left" || modifier === "sharp left" || modifier === "slight left") return "↰";
    if (modifier === "right" || modifier === "sharp right" || modifier === "slight right") return "↱";
    return "↑";
  }
  if (type === "roundabout" || type === "rotary") return "↻";
  if (type === "arrive") return "⚑";
  if (type === "depart") return "▶";
  if (type === "merge") return "⤨";
  if (type === "fork") return modifier?.includes("left") ? "↰" : "↱";
  return "↑";
}

function getManeuverText(type: string, modifier?: string): string {
  if (type === "depart") return "Почніть рух";
  if (type === "arrive") return "Ви прибули";
  if (type === "turn") {
    if (modifier === "left") return "Поверніть ліворуч";
    if (modifier === "sharp left") return "Різко ліворуч";
    if (modifier === "slight left") return "Плавно ліворуч";
    if (modifier === "right") return "Поверніть праворуч";
    if (modifier === "sharp right") return "Різко праворуч";
    if (modifier === "slight right") return "Плавно праворуч";
    if (modifier === "uturn") return "Розворот";
    return "Продовжуйте рух";
  }
  if (type === "roundabout" || type === "rotary") return "Кільцевий рух";
  if (type === "merge") return "З'єднайтеся з дорогою";
  if (type === "fork") return modifier?.includes("left") ? "Тримайтесь лівіше" : "Тримайтесь правіше";
  if (type === "new name") return "Продовжуйте рух";
  if (type === "end of road") return modifier?.includes("left") ? "Поверніть ліворуч" : "Поверніть праворуч";
  return "Продовжуйте рух";
}

function bearingBetween(from: [number, number], to: [number, number]): number {
  const dLng = ((to[0] - from[0]) * Math.PI) / 180;
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function NavigationView({
  route,
  userLocation,
  facilityName,
  facilityLocation,
  onExit,
}: NavigationViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(route.distance);
  const [durationRemaining, setDurationRemaining] = useState(route.duration);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentPos, setCurrentPos] = useState(userLocation);

  const steps = route.legs[0]?.steps || [];
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  // Find initial bearing from route
  const coords = route.geometry.coordinates;
  const initialBearing = coords.length >= 2 ? bearingBetween(coords[0], coords[1]) : 0;

  // Initialize 3D map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm-raster": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          },
          "openmaptiles": {
            type: "vector",
            tiles: [
              "https://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf",
            ],
            maxzoom: 14,
          },
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#e8e0d8" },
          },
          {
            id: "osm-raster-layer",
            type: "raster",
            source: "osm-raster",
            minzoom: 0,
            maxzoom: 20,
          },
          {
            id: "3d-buildings",
            type: "fill-extrusion",
            source: "openmaptiles",
            "source-layer": "building",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": [
                "interpolate", ["linear"], ["get", "render_height"],
                0, "#d4cdc5",
                20, "#c0b8ae",
                50, "#a89e94",
              ],
              "fill-extrusion-height": [
                "interpolate", ["linear"], ["zoom"],
                14, 0,
                15.5, ["coalesce", ["get", "render_height"], 10],
              ],
              "fill-extrusion-base": [
                "coalesce", ["get", "render_min_height"], 0,
              ],
              "fill-extrusion-opacity": 0.75,
            },
          },
        ],
      },
      center: [userLocation.lng, userLocation.lat],
      zoom: 17,
      pitch: 60,
      bearing: initialBearing,
      maxPitch: 70,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), "top-right");

    map.on("load", () => {
      // Route line
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString" as const, coordinates: route.geometry.coordinates },
        },
      });

      // Route outline (glow)
      map.addLayer({
        id: "route-outline",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#0e7490",
          "line-width": 12,
          "line-opacity": 0.3,
          "line-blur": 4,
        },
      });

      // Route line main
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#0891b2",
          "line-width": 6,
          "line-opacity": 0.9,
        },
      });

      // Destination marker
      const destEl = document.createElement("div");
      destEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#dc2626,#991b1b);border:3px solid white;border-radius:50%;box-shadow:0 4px 12px rgba(220,38,38,0.5);display:flex;align-items:center;justify-content:center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #991b1b;margin-top:-2px"></div>
        </div>`;

      new maplibregl.Marker({ element: destEl, anchor: "bottom" })
        .setLngLat([facilityLocation.lng, facilityLocation.lat])
        .addTo(map);

      // User marker (arrow)
      const userEl = document.createElement("div");
      userEl.className = "nav-user-marker";
      userEl.innerHTML = `
        <div class="nav-user-arrow">
          <svg width="28" height="28" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.3L12 16.5L19.5 20.3L12 2Z" fill="#3b82f6" stroke="white" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="nav-user-glow"></div>`;

      const userMarker = new maplibregl.Marker({
        element: userEl,
        rotationAlignment: "map",
        pitchAlignment: "map",
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setRotation(initialBearing)
        .addTo(map);

      userMarkerRef.current = userMarker;
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        setCurrentPos({ lat: latitude, lng: longitude });
        setCurrentSpeed(speed ? Math.round(speed * 3.6) : 0); // m/s to km/h

        const map = mapRef.current;
        const marker = userMarkerRef.current;
        if (!map || !marker) return;

        marker.setLngLat([longitude, latitude]);

        // Find closest point on route to update bearing
        const routeCoords = route.geometry.coordinates;
        let minDist = Infinity;
        let closestIdx = 0;
        for (let i = 0; i < routeCoords.length; i++) {
          const d = (routeCoords[i][0] - longitude) ** 2 + (routeCoords[i][1] - latitude) ** 2;
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }

        // Calculate bearing towards next route point
        if (closestIdx < routeCoords.length - 1) {
          const bearing = bearingBetween(routeCoords[closestIdx], routeCoords[closestIdx + 1]);
          marker.setRotation(bearing);

          map.easeTo({
            center: [longitude, latitude],
            bearing,
            pitch: 60,
            duration: 1000,
          });
        }

        // Update distance remaining (approximate)
        let remainingDist = 0;
        for (let i = closestIdx; i < routeCoords.length - 1; i++) {
          const dx = routeCoords[i + 1][0] - routeCoords[i][0];
          const dy = routeCoords[i + 1][1] - routeCoords[i][1];
          remainingDist += Math.sqrt(dx * dx + dy * dy) * 111000; // rough degrees to meters
        }
        setDistanceRemaining(remainingDist);
        const avgSpeed = speed && speed > 1 ? speed : 13.9; // 50 km/h default
        setDurationRemaining(remainingDist / avgSpeed);

        // Update current step
        if (steps.length > 0) {
          let bestStep = 0;
          let bestDist = Infinity;
          for (let i = 0; i < steps.length; i++) {
            const loc = steps[i].maneuver.location;
            const d = (loc[0] - longitude) ** 2 + (loc[1] - latitude) ** 2;
            if (d < bestDist) {
              bestDist = d;
              bestStep = i;
            }
          }
          setCurrentStepIndex(bestStep);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    watchIdRef.current = watchId;
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center camera
  const recenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      center: [currentPos.lng, currentPos.lat],
      zoom: 17,
      pitch: 60,
      duration: 500,
    });
  }, [currentPos]);

  return (
    <div className="fixed inset-0 z-[2000] bg-black">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Current maneuver panel (top) */}
      {currentStep && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="bg-[#0e7490] text-white px-4 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="text-3xl w-12 text-center flex-shrink-0">
                {getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold leading-tight">
                  {getManeuverText(currentStep.maneuver.type, currentStep.maneuver.modifier)}
                </div>
                <div className="text-sm text-cyan-200 mt-0.5">
                  через {formatDist(currentStep.distance)}
                </div>
              </div>
            </div>
            {/* Next maneuver preview */}
            {nextStep && (
              <div className="mt-2 pt-2 border-t border-cyan-600/50 flex items-center gap-2 text-xs text-cyan-300">
                <span>{getManeuverIcon(nextStep.maneuver.type, nextStep.maneuver.modifier)}</span>
                <span>Потім: {getManeuverText(nextStep.maneuver.type, nextStep.maneuver.modifier)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom info panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-t-2xl shadow-2xl px-5 py-4">
          {/* Destination */}
          <div className="text-xs text-gray-500 truncate mb-2">{facilityName}</div>

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {formatDist(distanceRemaining)}
                </div>
                <div className="text-xs text-gray-400">залишилось</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-cyan-700">
                  {formatDuration(durationRemaining)}
                </div>
                <div className="text-xs text-gray-400">час прибуття</div>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {currentSpeed}
                </div>
                <div className="text-xs text-gray-400">км/год</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={recenter}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                title="Центрувати"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </svg>
              </button>
              <button
                onClick={onExit}
                className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-md"
                title="Завершити навігацію"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
