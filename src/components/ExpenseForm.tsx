import { useForm } from 'react-hook-form'
import type { Expense, ExpenseCategory, ExpenseFrequency } from '../types'
import { todayISO } from '../utils/format'

type FormData = Omit<Expense, 'id'>

interface Props {
  initial?: Expense
  currency: string
  onSave: (data: FormData) => void
  onCancel: () => void
}

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'housing', label: 'Housing' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'other', label: 'Other' },
]

const FREQUENCIES: { value: ExpenseFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' },
]

const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl = 'block text-xs font-medium text-gray-600 mb-1'

export default function ExpenseForm({ initial, currency, onSave, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: initial
      ? { ...initial }
      : { currency, date: todayISO(), category: 'other', frequency: 'monthly' },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={lbl}>Description *</label>
          <input
            {...register('description', { required: true })}
            className={input}
            placeholder="e.g. Rent, Netflix..."
          />
          {errors.description && <span className="text-xs text-red-500">Required</span>}
        </div>
        <div>
          <label className={lbl}>Amount *</label>
          <input
            {...register('amount', { required: true, valueAsNumber: true, min: 0 })}
            type="number"
            step="any"
            className={input}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={lbl}>Frequency *</label>
          <select {...register('frequency', { required: true })} className={input}>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Category *</label>
          <select {...register('category', { required: true })} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Date *</label>
          <input {...register('date', { required: true })} type="date" className={input} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Notes</label>
          <textarea {...register('notes')} className={`${input} resize-none`} rows={2} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Save
        </button>
      </div>
    </form>
  )
}
