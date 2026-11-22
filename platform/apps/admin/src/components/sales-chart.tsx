'use client'

import { useId } from 'react'
import { formatMoney } from '@maxseller/shared'
import { cn } from '@/lib/utils'

export interface SalesChartPoint {
  date: string
  orders: number
  revenue: number
}

export function SalesChart({ data, className }: { data: SalesChartPoint[]; className?: string }) {
  const gradientId = useId().replace(/:/g, '')
  const width = 800
  const height = 240
  const padX = 24
  const padTop = 20
  const padBottom = 34
  const chartHeight = height - padTop - padBottom
  const maxRevenue = Math.max(...data.map((point) => Number(point.revenue) || 0), 1)

  const x = (index: number) =>
    padX + (index * (width - padX * 2)) / Math.max(data.length - 1, 1)
  const y = (value: number) => padTop + chartHeight - (value / maxRevenue) * chartHeight

  const points = data.map((point, index) => `${x(index)},${y(Number(point.revenue) || 0)}`).join(' ')
  const areaPath = data.length
    ? `M ${x(0)} ${padTop + chartHeight} L ${data
        .map((point, index) => `${x(index)} ${y(Number(point.revenue) || 0)}`)
        .join(' L ')} L ${x(data.length - 1)} ${padTop + chartHeight} Z`
    : ''

  const labelIndexes = data.length <= 6
    ? data.map((_, index) => index)
    : [0, Math.floor((data.length - 1) / 3), Math.floor(((data.length - 1) * 2) / 3), data.length - 1]

  if (!data.length) {
    return (
      <div className={cn('grid h-60 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02]', className)}>
        <p className="text-sm text-[#8ba397]">Hozircha sotuv ma\'lumotlari yo\'q</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-950/40 p-3 sm:p-5', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-60 w-full" role="img" aria-label="Sotuvlar grafigi">
        <defs>
          <linearGradient id={`area-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00E676" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`line-${gradientId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00B95E" />
            <stop offset="100%" stopColor="#52F5A1" />
          </linearGradient>
        </defs>

        {Array.from({ length: 5 }).map((_, index) => {
          const gridY = padTop + (index * chartHeight) / 4
          return (
            <g key={index}>
              <line x1={padX} x2={width - padX} y1={gridY} y2={gridY} className="chart-grid" />
              <text x={padX - 6} y={gridY + 4} textAnchor="end" fill="#5f796b" fontSize="10">
                {Math.round((maxRevenue * (4 - index)) / 4 / 1000)}k
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill={`url(#area-${gradientId})`} />
        <polyline
          points={points}
          fill="none"
          stroke={`url(#line-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={x(index)} cy={y(Number(point.revenue) || 0)} r="3" fill="#00E676">
              <title>{`${point.date}: ${point.orders} buyurtma, ${formatMoney(point.revenue)}`}</title>
            </circle>
          </g>
        ))}

        {labelIndexes.map((index) => (
          <text
            key={`label-${index}`}
            x={x(index)}
            y={height - 10}
            textAnchor="middle"
            fill="#7f998b"
            fontSize="10"
          >
            {data[index].date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  )
}
