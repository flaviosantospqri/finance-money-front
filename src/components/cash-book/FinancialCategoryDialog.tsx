import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CategoryNature } from '../../features/cash-book/cashBookApi'
import { SelectField } from '../ui/SelectField'
import { Icon } from '../ui/Icon'

type FinancialCategoryDialogProps = {
  onClose: () => void
  destinations: { id: string; name: string }[]
  onSave: (input: { name: string; nature: CategoryNature; destinationId: string }) => Promise<void>
}

export function FinancialCategoryDialog({ onClose, destinations, onSave }: FinancialCategoryDialogProps) {
  const [name, setName] = useState('')
  const [nature, setNature] = useState<CategoryNature>('expense')
  const [destinationId, setDestinationId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !destinationId) {
      setError('Informe o nome da categoria e o repasse ao qual ela pertence.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), nature, destinationId })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar a categoria.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="confirm-dialog cash-book-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" onSubmit={handleSubmit}>
        <span className="placeholder-icon"><Icon name="reports" size={21} /></span>
        <h2 id="category-dialog-title">Nova categoria</h2>
        <p>A categoria ficará vinculada a um repasse para acompanhar os gastos por destinação.</p>
        <label className="form-field"><span>Nome da categoria</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Manutenção" /></label>
        <label className="form-field"><span>Natureza</span><SelectField ariaLabel="Natureza da categoria" value={nature} onValueChange={(value) => setNature(value as CategoryNature)} options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]} /></label>
        <label className="form-field"><span>Repasse</span><SelectField ariaLabel="Repasse da categoria" value={destinationId} placeholder="Selecione o repasse" options={destinations.map((destination) => ({ value: destination.id, label: destination.name }))} onValueChange={setDestinationId} /></label>
        {error && <p className="cash-book-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}><Icon name="check" size={15} />{saving ? 'Salvando…' : 'Criar categoria'}</button></div>
      </form>
    </div>
  )
}
