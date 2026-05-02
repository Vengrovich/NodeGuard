import React from 'react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'

export function SparkLine({ data = [], color = '#39d353' }) {
  const chartData = data.map((v, i) => ({ v, i }))
  return (
    <ResponsiveContainer width="100%" height={42}>
      <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <YAxis domain={[0, 'auto']} hide />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={color} fillOpacity={0.12} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MetricCard({ label, value, sub, percent, color, sparkData }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <div className="text-xs text-muted tracking-widest mb-1.5">{label}</div>
      <div className="text-2xl font-mono font-medium mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-muted mb-2">{sub}</div>}
      {percent !== undefined && (
        <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden mb-1">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(percent, 100)}%`, background: color }} />
        </div>
      )}
      {sparkData?.length > 0 && <SparkLine data={sparkData} color={color} />}
    </div>
  )
}
