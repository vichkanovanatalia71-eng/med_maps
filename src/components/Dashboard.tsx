"use client";

import { useStore } from "@/store";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, ResponsiveContainer, CartesianGrid,
} from "recharts";

const COLORS = ["#0891b2", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc", "#0e7490", "#155e75", "#164e63", "#0c4a6e", "#083344", "#2dd4bf"];
const BAR_COLORS = ["#0891b2", "#f59e0b"];

function formatNumber(n: number): string {
  return n.toLocaleString("uk-UA");
}

const AGE_LABELS: Record<string, string> = {
  "y0-5": "0-5",
  "y06-17": "6-17",
  "y18-39": "18-39",
  "y40-64": "40-64",
  "y65+": "65+",
  "Уточнюється": "?",
};

export default function Dashboard() {
  const { stats, facilities } = useStore();

  if (!stats) return null;

  const categoryData = Object.entries(stats.categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const ageGenderData = Object.entries(stats.ageGroupCounts)
    .sort(([a], [b]) => {
      const order = ["y0-5", "y06-17", "y18-39", "y40-64", "y65+", "Уточнюється"];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(([age, count]) => ({
      name: AGE_LABELS[age] || age,
      value: count,
    }));

  const monthlyData = Object.entries(stats.monthlyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }));

  const genderData = Object.entries(stats.genderCounts)
    .filter(([name]) => name !== "Уточнюється")
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 overflow-y-auto h-full">
      <h2 className="text-sm font-bold text-gray-800 mb-4">Статистика</h2>

      {/* Total stats */}
      <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 mb-4">
        <div className="text-3xl font-bold text-cyan-800">
          {formatNumber(stats.totalCompleted)}
        </div>
        <div className="text-xs text-cyan-600 font-medium">Погашених направлень</div>
        <div className="text-xs text-gray-500 mt-1">
          Закладів-виконавців: {facilities.length}
        </div>
      </div>

      {/* Category distribution - Donut */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          За категоріями
        </h3>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                dataKey="value"
                stroke="none"
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatNumber(Number(value))}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {categoryData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-gray-600 truncate">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-800 whitespace-nowrap ml-2">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Age groups */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          За віковими групами
        </h3>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={ageGenderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip
                formatter={(value) => formatNumber(Number(value))}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gender */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          За статтю
        </h3>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <div className="flex gap-3">
            {genderData.map((item, i) => (
              <div key={item.name} className="flex-1 text-center">
                <div className="text-lg font-bold" style={{ color: BAR_COLORS[i] }}>
                  {formatNumber(item.value)}
                </div>
                <div className="text-xs text-gray-500">{item.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Динаміка по місяцях
          </h3>
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip
                  formatter={(value) => formatNumber(Number(value))}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#0891b2" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top services */}
      {stats.topServices.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Топ-15 послуг
          </h3>
          <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
            {stats.topServices.map((svc, i) => (
              <div key={svc.code} className="px-3 py-2 flex items-start gap-2">
                <span className="text-xs font-bold text-cyan-600 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 leading-snug">
                    {svc.name}
                  </div>
                  <div className="text-xs text-gray-400">{svc.code}</div>
                </div>
                <span className="text-xs font-bold text-cyan-700 whitespace-nowrap">
                  {formatNumber(svc.completed)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 10 facilities */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Топ-10 закладів
        </h3>
        <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
          {stats.top10.map((facility, i) => (
            <div key={facility.id} className="px-3 py-2 flex items-start gap-2">
              <span className="text-xs font-bold text-cyan-600 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-800 truncate">
                  {facility.name}
                </div>
                <div className="text-xs text-gray-400">{facility.oblast}, {facility.city}</div>
              </div>
              <span className="text-xs font-bold text-cyan-700 whitespace-nowrap">
                {formatNumber(facility.totalCompleted)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
