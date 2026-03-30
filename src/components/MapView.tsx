"use client";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useStore } from "@/store";
import { ukraineOblastsGeoJSON } from "@/data/ukraine-oblasts";

const UKRAINE_CENTER: L.LatLngExpression = [48.9, 31.2];
const UKRAINE_ZOOM = 6;

function getMarkerSize(count: number): number {
  if (count < 100) return 18;
  if (count < 500) return 24;
  if (count < 1000) return 30;
  if (count < 5000) return 36;
  return 42;
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

export default function MapView() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatLayerRef = useRef<L.GeoJSON | null>(null);

  const { facilities, oblastData, mapMode } = useStore();

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: UKRAINE_CENTER,
      zoom: UKRAINE_ZOOM,
      minZoom: 5,
      maxZoom: 16,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

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

    // Clear previous markers
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
      markersRef.current = null;
    }

    if (mapMode !== "markers") return;

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 40;
        if (count > 50) size = 55;
        if (count > 100) size = 70;
        return L.divIcon({
          html: `<div class="cluster-marker" style="width:${size}px;height:${size}px;font-size:${size > 55 ? 14 : 12}px">${count}</div>`,
          className: "",
          iconSize: L.point(size, size),
        });
      },
    });

    for (const facility of facilities) {
      const size = getMarkerSize(facility.totalCompleted);
      const icon = L.divIcon({
        html: `<div class="facility-marker" style="width:${size}px;height:${size}px"></div>`,
        className: "",
        iconSize: L.point(size, size),
      });

      const categoryRows = Object.entries(facility.categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `<tr><td style="padding:2px 8px 2px 0;color:#475569">${cat}</td><td style="text-align:right;font-weight:600">${formatNumber(count)}</td></tr>`)
        .join("");

      const popupContent = `
        <div style="padding:12px;font-size:13px;line-height:1.5">
          <div style="font-weight:700;font-size:14px;color:#0e7490;margin-bottom:4px">${facility.name}</div>
          <div style="color:#64748b;font-size:12px;margin-bottom:8px">
            ЄДРПОУ: ${facility.edrpou} | ${facility.type}<br/>
            ${facility.address}
          </div>
          <div style="background:#f0fdfa;border-radius:6px;padding:8px;margin-bottom:8px">
            <div style="font-size:22px;font-weight:700;color:#0e7490">${formatNumber(facility.totalCompleted)}</div>
            <div style="color:#64748b;font-size:11px">погашених направлень</div>
          </div>
          <table style="width:100%;font-size:12px">${categoryRows}</table>
        </div>
      `;

      const marker = L.marker([facility.latitude, facility.longitude], { icon })
        .bindPopup(popupContent, { className: "custom-popup", maxWidth: 320 });

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);
    markersRef.current = clusterGroup;
  }, [facilities, mapMode]);

  // Heatmap (choropleth) mode
  const maxCompleted = useMemo(() => {
    return Math.max(...Object.values(oblastData).map(d => d.totalCompleted), 1);
  }, [oblastData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous heatmap
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
          weight: 1.5,
          opacity: 1,
          color: "#0e7490",
          fillOpacity: 0.7,
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
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({ weight: 3, fillOpacity: 0.85 });
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target);
          },
        });
      },
    });

    geoJsonLayer.addTo(map);
    heatLayerRef.current = geoJsonLayer;
  }, [oblastData, mapMode, maxCompleted]);

  return (
    <div
      ref={containerRef}
      id="map-container"
      className="w-full h-full"
    />
  );
}
