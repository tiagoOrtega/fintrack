import { useState } from 'react'
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react'
import { useStoreCtx } from '../context/StoreContext'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import ExpenseForm from '../components/ExpenseForm'
import type { Expense, ExpenseCategory } from '../types'
import { monthlyExpenses, expensesByCategory } from '../utils/calculations'
import { formatCurrency, formatDate } from '../utils/format'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'Housing',
  food: 'Food',
  transport: 'Transport',
  health: 'Health',
  education: 'Education',
  entertainment: 'Entertainment',
  clothing: 'Clothing',
  utilities: 'Utilities',
  insurance: 'Insurance',
  subscriptions: 'Subscriptions',
  other: 'Other',
}

export default function Expenses() {
  const { expenses, settings, addExpense, updateExpense, deleteExpense } = useStoreCtx()
  const currency = settings.baseCurrency
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const monthly = monthlyExpenses(expenses)
  const byCategory = expensesByCategory(expenses)
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

  const filtered =
    filterCategory === 'all' ? expenses : expenses.filter((e) => e.category === filterCategory)

  function handleSave(data: Omit<Expense, 'id'>) {
    if (editing) {
      updateExpense(editing.id, data)
    } else {
      addExpense(data)
    }
    setShowModal(false)
    setEditing(null)
  }

  function handleEdit(exp: Expense) {
    setEditing(exp)
    setShowModal(true)
  }

  function handleDelete(id: string) {
    if (confirm('Delete this expense?')) deleteExpense(id)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''} tracked`}
        action={
          <button
            onClick={() => { setEditing(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="text-xs text-gray-500 font-medium">Monthly Total</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(monthly, currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="text-xs text-gray-500 font-medium">Yearly Estimate</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {formatCurrency(monthly * 12, currency)}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
          <div className="text-xs text-gray-500 font-medium">Top Category</div>
          <div className="text-xl font-bold text-gray-900 mt-1">
            {topCategory
              ? `${CATEGORY_LABELS[topCategory[0] as ExpenseCategory] ?? topCategory[0]}`
              : '-'}
          </div>
          {topCategory && (
            <div className="text-xs text-gray-400 mt-0.5">
              {formatCurrency(topCategory[1], currency)}/mo
            </div>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Receipt className="w-10 h-10 text-gray-200" />
            <p className="text-sm">No expenses found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-medium uppercase tracking-wide">
                <tr>
                  {['Description', 'Category', 'Amount', 'Frequency', 'Date', 'Notes', ''].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{exp.description}</td>
                    <td className="px-4 py-3">
                      <Badge value={exp.category} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={exp.frequency} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-32 truncate">
                      {exp.notes ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Edit Expense' : 'Add Expense'}
          onClose={() => { setShowModal(false); setEditing(null) }}
        >
          <ExpenseForm
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
