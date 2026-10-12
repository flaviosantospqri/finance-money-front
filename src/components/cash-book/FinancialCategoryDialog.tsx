import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CategoryNature } from '../../features/cash-book/cashBookApi'
import { Icon } from '../ui/Icon'

type FinancialCategoryDialogProps = {
  onClose: () => void
  onSave: (input: { name: string; nature: CategoryNature }) => Promise<void>
}

export function FinancialCategoryDialog({ onClose, onSave }: FinancialCategoryDialogProps) {
  const [name, setName] = useState('')
  const [nature, setNature] = useState<CategoryNature>('expense')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('O nome da categoria é obrigatório.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), nature })
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
        <p>As categorias se aplicam somente a entradas ou a saídas.</p>
        <label className="form-field"><span>Nome da categoria</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Manutenção" /></label>
        <label className="form-field"><span>Natureza</span><select value={nature} onChange={(event) => setNature(event.target.value as CategoryNature)}><option value="income">Receita</option><option value="expense">Despesa</option></select></label>
        {error && <p className="cash-book-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}><Icon name="check" size={15} />{saving ? 'Salvando…' : 'Criar categoria'}</button></div>
      </form>
    </div>
  )
}
