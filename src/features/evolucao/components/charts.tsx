"use client"

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatNumber, monthShort, type MonthFrequency } from "../lib"

// Marcas finas, grade em linha fina e discreta, uma só cor (laranja da marca).
const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" }
const dayMonth = (t: number) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })

type Point = { t: number; value: number }

/** Linha de uma medida ao longo do tempo (peso, cintura, abdômen ou IMC). */
export function MetricLineChart({ data, unit, label }: { data: Point[]; unit: string; label: string }) {
  if (data.length === 0) return null
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(1, (max - min) * 0.25)
  const lastIndex = data.length - 1
  const fmt = (v: number) => `${formatNumber(v)}${unit ? ` ${unit}` : ""}`

  return (
    <div
      role="img"
      aria-label={`${label}: de ${fmt(data[0]!.value)} em ${dayMonth(data[0]!.t)} para ${fmt(data[lastIndex]!.value)} em ${dayMonth(data[lastIndex]!.t)}. Os valores estão no histórico abaixo.`}
      className="h-64 w-full md:h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 28, right: 28, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={dayMonth}
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={24}
          />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => formatNumber(v, 0)}
          />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload as Point | undefined
              if (!p) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                  <p className="font-display text-xl font-bold">{fmt(p.value)}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-0.5 w-3 rounded-full bg-brand" aria-hidden /> {label} · {dayMonth(p.t)}
                  </p>
                </div>
              )
            }}
          />
          <Area type="monotone" dataKey="value" stroke="none" fill="var(--brand)" fillOpacity={0.1} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--brand)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            isAnimationActive={false}
            activeDot={{ r: 6, fill: "var(--brand)", stroke: "var(--card)", strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; index?: number; payload?: Point }) => {
              const { cx, cy, index, payload } = props
              if (cx === undefined || cy === undefined) return <g key={index} />
              const isLast = index === lastIndex
              return (
                <g key={index}>
                  <circle cx={cx} cy={cy} r={isLast ? 5 : 4} fill="var(--brand)" stroke="var(--card)" strokeWidth={2} />
                  {isLast && payload && (
                    <text x={cx} y={cy - 12} textAnchor="end" fontSize={13} fontWeight={700} fill="var(--foreground)">
                      {fmt(payload.value)}
                    </text>
                  )}
                </g>
              )
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Frequência mensal (% de presença nas aulas que já aconteceram). */
export function FrequencyChart({ data }: { data: MonthFrequency[] }) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month), value: d.rate ?? 0 }))
  return (
    <div
      role="img"
      aria-label={`Frequência por mês: ${rows.map((r) => `${r.label} ${r.rate === null ? "sem aulas" : `${r.rate}%`}`).join(", ")}.`}
      className="h-56 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 4, left: 8 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const r = active && (payload?.[0]?.payload as (typeof rows)[number] | undefined)
              if (!r) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
                  <p className="font-display text-xl font-bold">{r.rate === null ? "Sem aulas" : `${r.rate}%`}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.present} {r.present === 1 ? "presença" : "presenças"} · {r.absent} {r.absent === 1 ? "falta" : "faltas"}
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="value" fill="var(--brand)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="rate"
              position="top"
              fontSize={12}
              fontWeight={700}
              fill="var(--foreground)"
              formatter={(v: unknown) => (v === null || v === undefined ? "—" : `${v}%`)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
