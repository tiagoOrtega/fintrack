import { TrendingUp, TrendingDown, Wallet, Receipt, PiggyBank, Activity } from 'lucide-react'
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useStoreCtx } from '../context/StoreContext'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import {
  totalPortfolioValue,
  totalPortfolioPnL,
  monthlyExpenses,
  portfolioAllocation,
} from '../utils/calculations'
import { formatCurrency, formatPercent } from '../utils/format'

const TYPE_COLORS: Record<string, string> = {
  stock: '#3b82f6',
  crypto: '#8b5cf6',
  etf: '#06b6d4',
  real_estate: '#f97316',
  fixed_income: '#eab308',
  other: '#9ca3af',
}

const TYPE_LABELS: Record<string, string> = {
  stock: 'Stock',
  crypto: 'Crypto',
  etf: 'ETF',
  real_estate: 'Real Estate',
  fixed_income: 'Fixed Income',
  other: 'Other',
}

export default function Dashboard() {
  const { investments, expenses, settings } = useStoreCtx()
  const currency = settings.baseCurrency

  const portfolioValue = totalPortfolioValue(investments)
  const pnl = totalPortfolioPnL(investments)
  const monthly = monthlyExpenses(expenses)
  const allocation = portfolioAllocation(investments)

  const allocationData = Object.entries(allocation).map(([type, value]) => ({
    name: TYPE_LABELS[type] ?? type,
    value: Number(value.toFixed(2)),
    color: TYPE_COLORS[type] ?? '#9ca3af',
  }))

  const savingsRate =
    settings.monthlyIncomeGoal > 0
      ? ((settings.monthlyIncomeGoal - monthly) / settings.monthlyIncomeGoal) * 100
      : null

  const recentInvestments = [...investments]
    .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
    .slice(0, 5)

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Your financial overview at a glance"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Portfolio Value"
          value={formatCurrency(portfolioValue, currency)}
          icon={<Wallet className="w-4 h-4" />}
          color="blue"
          trend={
            pnl !== 0
              ? {
                  value: formatCurrency(Math.abs(pnl), currency),
                  positive: pnl >= 0,
                }
              : undefined
          }
        />
        <StatCard
          title="Total P&L"
          value={formatCurrency(pnl, currency)}
          icon={pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          color={pnl >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(monthly, currency)}
          subtitle="recurring costs / month"
          icon={<Receipt className="w-4 h-4" />}
          color="orange"
        />
        <StatCard
          title="Savings Rate"
          value={savingsRate !== null ? formatPercent(savingsRate) : 'Set goal'}
          subtitle={
            settings.monthlyIncomeGoal > 0
              ? `Goal: ${formatCurrency(settings.monthlyIncomeGoal, currency)}/mo`
              : 'Set monthly income in Settings'
          }
          icon={<PiggyBank className="w-4 h-4" />}
          color="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Portfolio allocation */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Portfolio Allocation</h3>
          {allocationData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No investments yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => formatCurrency(Number(val), currency)}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent activity summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {recentInvestments.length === 0 && recentExpenses.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
            )}
            {recentInvestments.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-800">{inv.name}</span>
                  <span className="ml-2 text-xs text-gray-400">Investment</span>
                </div>
                <span className="text-sm font-medium text-blue-600">
                  {formatCurrency(inv.currentPrice * inv.quantity, currency)}
                </span>
              </div>
            ))}
            {recentExpenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <div>
                  <span className="text-sm font-medium text-gray-800">{exp.description}</span>
                  <span className="ml-2 text-xs text-gray-400">Expense</span>
                </div>
                <span className="text-sm font-medium text-red-500">
                  -{formatCurrency(exp.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
