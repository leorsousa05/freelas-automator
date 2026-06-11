import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'

interface ProposalComposerProps {
  onSubmit: (data: { offerValue: string; finalValue: string; durationDays: string; details: string }) => void
  onCancel: () => void
  isLoading: boolean
  error: string
}

export default function ProposalComposer({ onSubmit, onCancel, isLoading, error }: ProposalComposerProps) {
  const [form, setForm] = useState({
    offerValue: '',
    finalValue: '',
    durationDays: '',
    details: '',
  })

  const handleSubmit = () => {
    onSubmit(form)
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Nova Proposta</h3>
      {error && (
        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          label="Sua oferta (R$)"
          value={form.offerValue}
          onChange={(e) => setForm((f) => ({ ...f, offerValue: e.target.value }))}
          placeholder="0,00"
        />
        <Input
          label="Oferta final (R$)"
          value={form.finalValue}
          onChange={(e) => setForm((f) => ({ ...f, finalValue: e.target.value }))}
          placeholder="0,00"
        />
        <Input
          label="Prazo (dias)"
          type="number"
          value={form.durationDays}
          onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
          placeholder="7"
        />
      </div>
      <Textarea
        label="Detalhes da proposta"
        value={form.details}
        onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
        rows={4}
        placeholder="Descreva sua proposta..."
      />
      <p className="text-xs text-slate-400 dark:text-slate-500">{form.details.length}/3000</p>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isLoading} isLoading={isLoading}>
          Enviar
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
