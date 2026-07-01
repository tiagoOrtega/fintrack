import { useForm } from 'react-hook-form'
import type { Investment, InvestmentType } from '../types'
import { todayISO } from '../utils/format'

type FormData = Omit<Investment, 'id'>

interface Props {
  initial?: Investment
  currency: string
  onSave: (data: FormData) => void
  onCancel: () => void
}

const TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'etf', label: 'ETF' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'fixed_income', label: 'Fixed Income' },
  { value: 'other', label: 'Other' },
]

const input =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const label = 'block text-xs font-medium text-gray-600 mb-1'

export default function InvestmentForm({ initial, currency, onSave, onCancel }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: initial
      ? { ...initial }
      : { currency, purchaseDate: todayISO(), type: 'stock' },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={label}>Asset Name *</label>
          <input {...register('name', { required: true })} className={input} placeholder="e.g. Apple" />
          {errors.name && <span className="text-xs text-red-500">Required</span>}
        </div>
        <div>
          <label className={label}>Ticker / Symbol</label>
          <input {...register('ticker')} className={input} placeholder="e.g. AAPL" />
        </div>
        <div>
          <label className={label}>Type *</label>
          <select {...register('type', { required: true })} className={input}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Quantity *</label>
          <input
            {...register('quantity', { required: true, valueAsNumber: true, min: 0 })}
            type="number"
            step="any"
            className={input}
            placeholder="0"
          />
        </div>
        <div>
          <label className={label}>Purchase Price *</label>
          <input
            {...register('purchasePrice', { required: true, valueAsNumber: true, min: 0 })}
            type="number"
            step="any"
            className={input}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={label}>Current Price *</label>
          <input
            {...register('currentPrice', { required: true, valueAsNumber: true, min: 0 })}
            type="number"
            step="any"
            className={input}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={label}>Purchase Date *</label>
          <input {...register('purchaseDate', { required: true })} type="date" className={input} />
        </div>
        <div>
          <label className={label}>Broker</label>
          <input {...register('broker')} className={input} placeholder="e.g. XP, Clear" />
        </div>
        <div className="col-span-2">
          <label className={label}>Notes</label>
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
