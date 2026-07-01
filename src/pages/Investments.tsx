import { useState } from 'react'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { useStoreCtx } from '../context/StoreContext'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import InvestmentForm from '../components/InvestmentForm'
import type { Investment } from '../types'
import {
  investmentCurrentValue,
  investmentPnL,
  investmentPnLPercent,
  totalPortfolioValue,
  totalPortfolioCost,
  totalPortfolioPnL,
} from '../utils/calculations'
import { formatCurrency, formatPercent, formatDate } from '../utils/format'

export default function Investments() {
  const { investments, settings, addInvestment, updateInvestment, deleteInvestment } = useStoreCtx()
  const currency = settings.baseCurrency
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)

  const totalValue = totalPortfolioValue(investments)
  const totalCost = totalPortfolioCost(investments)
  const totalPnL = totalPortfolioPnL(investments)
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

  function handleSave(data: Omit<Investment, 'id'>) {
    if (editing) {
      updateInvestment(editing.id, data)
    } else {
      addInvestment(data)
    }
    setShowModal(false)
    setEditing(null)
  }

  function handleEdit(inv: Investment) {
    setEditing(inv)
    setShowModal(true)
  }

  function handleDelete(id: string) {
    if (confirm('Delete this investment?')) deleteInvestment(id)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Investments"
        subtitle={`${investments.length} asset${investments.length !== 1 ? 's' : ''} tracked`}
        action={
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Investment
          </button>
        }
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Value', value: formatCurrency(totalValue, currency), sub: null },
          { label: 'Total Cost', value: formatCurrency(totalCost, currency), sub: null },
          {
            label: 'Total P&L',
            value: formatCurrency(totalPnL, currency),
            sub: formatPercent(totalPnLPct),
            positive: totalPnL >= 0,
          },
        ].map(({ label, value, sub, positive }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="text-xs text-gray-500 font-medium">{label}</div>
            <div
              className={`text-xl font-bold mt-1 ${
                sub !== null
                  ? positive
                    ? 'text-green-600'
                    : 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {value}
            </div>
            {sub && <div className="text-xs mt-0.5 text-gray-500">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {investments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <TrendingUp className="w-10 h-10 text-gray-200" />
            <p className="text-sm">No investments yet. Add your first asset.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-medium uppercase tracking-wide">
                <tr>
                  {['Asset', 'Type', 'Qty', 'Buy Price', 'Current Price', 'Value', 'P&L', 'Date', ''].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {investments.map((inv) => {
                  const value = investmentCurrentValue(inv)
                  const pnl = investmentPnL(inv)
                  const pnlPct = investmentPnLPercent(inv)
                  const positive = pnl >= 0
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{inv.name}</div>
                        {inv.ticker && (
                          <div className="text-xs text-gray-400">{inv.ticker}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={inv.type} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{inv.quantity}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatCurrency(inv.purchasePrice, currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatCurrency(inv.currentPrice, currency)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(value, currency)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`flex items-center gap-1 font-medium ${
                            positive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {formatCurrency(Math.abs(pnl), currency)}
                          <span className="text-xs text-gray-400">
                            ({formatPercent(pnlPct)})
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDate(inv.purchaseDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(inv)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Edit Investment' : 'Add Investment'}
          onClose={() => { setShowModal(false); setEditing(null) }}
        >
          <InvestmentForm
            initial={editing ?? undefined}
            currency={currency}
            onSave={handleSave}
            onCancel={() => { setShowModal(false); setEditing(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
