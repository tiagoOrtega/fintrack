import type { ReactNode } from 'react'

interface Props {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
  trend?: { value: string; positive: boolean }
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange'
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
}

export default function StatCard({ title, value, subtitle, icon, trend, color = 'blue' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        <span className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
      </div>
      {trend && (
        <div
          className={`text-xs font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}
        >
          {trend.positive ? '▲' : '▼'} {trend.value}
        </div>
      )}
    </div>
  )
}
