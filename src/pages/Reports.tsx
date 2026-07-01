import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useStoreCtx } from '../context/StoreContext'
import PageHeader from '../components/PageHeader'
import {
  expensesByCategory,
  portfolioAllocation,
  totalPortfolioValue,
  monthlyExpenses,
} from '../utils/calculations'
import { formatCurrency } from '../utils/format'

const CAT_COLORS: Record<string, string> = {
  housing: '#3b82f6',
  food: '#22c55e',
  transport: '#eab308',
  health: '#ef4444',
  education: '#6366f1',
  entertainment: '#ec4899',
  clothing: '#f97316',
  utilities: '#14b8a6',
  insurance: '#64748b',
  subscriptions: '#8b5cf6',
  other: '#9ca3af',
}

const CAT_LABELS: Record<string, string> = {
  housing: 'Housing', food: 'Food', transport: 'Transport', health: 'Health',
  education: 'Education', entertainment: 'Entertainment', clothing: 'Clothing',
  utilities: 'Utilities', insurance: 'Insurance', subscriptions: 'Subscriptions', other: 'Other',
}

const TYPE_COLORS: Record<string, string> = {
  stock: '#3b82f6', crypto: '#8b5cf6', etf: '#06b6d4',
  real_estate: '#f97316', fixed_income: '#eab308', other: '#9ca3af',
}

const TYPE_LABELS: Record<string, string> = {
  stock: 'Stock', crypto: 'Crypto', etf: 'ETF',
  real_estate: 'Real Estate', fixed_income: 'Fixed Income', other: 'Other',
}

export default function Reports() {
  const { investments, expenses, settings } = useStoreCtx()
  const currency = settings.baseCurrency

  const byCategory = expensesByCategory(expenses)
  const expCategoryData = Object.entries(byCategory)
    .map(([cat, value]) => ({ name: CAT_LABELS[cat] ?? cat, value: Number(value.toFixed(2)), color: CAT_COLORS[cat] ?? '#9ca3af' }))
    .sort((a, b) => b.value - a.value)

  const allocation = portfolioAllocation(investments)
  const allocData = Object.entries(allocation)
    .map(([type, value]) => ({ name: TYPE_LABELS[type] ?? type, value: Number(value.toFixed(2)), color: TYPE_COLORS[type] ?? '#9ca3af' }))
    .sort((a, b) => b.value - a.value)

  const totalValue = totalPortfolioValue(investments)
  const monthly = monthlyExpenses(expenses)
  const netMonthly = settings.monthlyIncomeGoal > 0 ? settings.monthlyIncomeGoal - monthly : null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Reports" subtitle="Visual breakdown of your financial data" />

      {/* Net position */}
      {settings.monthlyIncomeGoal > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Cash Flow</h3>
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'Income Goal', value: settings.monthlyIncomeGoal, color: 'text-blue-600' },
              { label: 'Monthly Expenses', value: monthly, color: 'text-red-500' },
              { label: 'Net / Savings', value: netMonthly ?? 0, color: netMonthly && netMonthly >= 0 ? 'text-green-600' : 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="text-xs text-gray-500">{label}</div>
                <div className={`text-2xl font-bold ${color}`}>{formatCurrency(value, currency)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Expenses by category bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Expenses by Category (monthly)</h3>
          {expCategoryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No expense data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={expCategoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {expCategoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expenses pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense Distribution</h3>
          {expCategoryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No expense data</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expCategoryData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {expCategoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Portfolio allocation bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Portfolio Allocation</h3>
          {allocData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No investment data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={allocData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, currency)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {allocData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top assets table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Assets by Value</h3>
          {investments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No investments</p>
          ) : (
            <div className="space-y-2">
              {[...investments]
                .sort((a, b) => b.currentPrice * b.quantity - a.currentPrice * a.quantity)
                .slice(0, 6)
                .map((inv) => {
                  const val = inv.currentPrice * inv.quantity
                  const pct = totalValue > 0 ? (val / totalValue) * 100 : 0
                  return (
                    <div key={inv.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-800 truncate">{inv.name}</span>
                          <span className="text-gray-500 shrink-0 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 shrink-0">
                        {formatCurrency(val, currency)}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
