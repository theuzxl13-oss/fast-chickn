"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/misc";
import { formatCurrency } from "@/utils/format";

// Série única: uma cor (laranja da marca), sem legenda — o título nomeia a série.
const MARK = "#FF5A1F";
const GRID = "#EDE9E5";
const AXIS = "#91857A";

export function BarChartCard({
  title,
  description,
  data,
  currency = false,
  horizontal = false,
  height = 260,
}: {
  title: string;
  description?: string;
  data: { label: string; value: number }[];
  currency?: boolean;
  horizontal?: boolean;
  height?: number;
}) {
  const fmt = (v: number) => (currency ? formatCurrency(v) : v.toLocaleString("pt-BR"));
  const empty = data.every((d) => !d.value);

  return (
    <Card className="p-5">
      <h3 className="font-bold text-ink-900">{title}</h3>
      {description && <p className="text-xs text-ink-500">{description}</p>}
      <div className="mt-4" style={{ height }}>
        {empty ? (
          <div className="grid h-full place-items-center rounded-2xl bg-ink-50 text-sm text-ink-400">Sem dados no período</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 8 : -8 }}
              barCategoryGap={2}
            >
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={horizontal} horizontal={!horizontal} />
              {horizontal ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt(Number(v))} />
                  <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11, fill: "#3D3631" }} axisLine={false} tickLine={false} />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} tickFormatter={(v) => (currency ? `R$${v}` : String(v))} />
                </>
              )}
              <Tooltip
                cursor={{ fill: "rgba(255,90,31,0.08)" }}
                formatter={(v) => [fmt(Number(v)), title]}
                contentStyle={{ borderRadius: 16, border: "1px solid #EDE9E5", fontSize: 12, boxShadow: "0 12px 32px -8px rgba(23,19,15,.18)" }}
                labelStyle={{ fontWeight: 700, color: "#17130F" }}
              />
              <Bar dataKey="value" fill={MARK} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Tabela acessível equivalente ao gráfico */}
      <details className="mt-3 text-xs text-ink-500">
        <summary className="cursor-pointer font-semibold">Ver dados em tabela</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-ink-100">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right font-semibold text-ink-700">{fmt(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
