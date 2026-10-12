import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CategoryNature, FinancialCategory } from '../../features/cash-book/cashBookApi'
import { SelectField } from '../ui/SelectField'
import { Icon } from '../ui/Icon'

type FinancialCategoryDialogProps = {
  onClose: () => void
  categories: FinancialCategory[]
  destinations: { id: string; name: string }[]
  onSave: (input: { name: string; nature: CategoryNature; destinationId?: string; parentCategoryId?: string }) => Promise<void>
}

export function FinancialCategoryDialog({ onClose, destinations, categories, onSave }: FinancialCategoryDialogProps) {
  const [name, setName] = useState('')
  const [nature, setNature] = useState<CategoryNature>('expense')
  const [destinationId, setDestinationId] = useState('')
  const [parentCategoryId, setParentCategoryId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const roots = categories.filter((c) => c.active && !c.parentCategoryId && c.nature === nature)
  const selectedParent = roots.find((c) => c.id === parentCategoryId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || (!parentCategoryId && !destinationId)) {
      setError('Informe o nome e selecione o repasse principal ou a categoria-pai.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), nature, destinationId: selectedParent?.destinationId ?? destinationId, parentCategoryId: parentCategoryId || undefined })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar a categoria.')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="confirm-dialog cash-book-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" onSubmit={handleSubmit}>
        <span className="placeholder-icon"><Icon name="reports" size={21} /></span>
        <h2 id="category-dialog-title">Nova categoria</h2>
        <p>Associe a categoria a um repasse principal. Subcategorias herdam o orçamento e a destinação da categoria-pai.</p>
        <label className="form-field"><span>Nome</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Moradia" /></label>
        <label className="form-field"><span>Natureza</span><SelectField ariaLabel="Natureza da categoria" value={nature} onValueChange={(value) => { setNature(value as CategoryNature); setParentCategoryId('') }} options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]} /></label>
        <label className="form-field"><span>Categoria-pai <small>(opcional; para criar subcategoria)</small></span><SelectField ariaLabel="Categoria principal" value={parentCategoryId} placeholder="Categoria principal / nenhuma" options={[{ value: '', label: 'Categoria principal' }, ...roots.map((category) => ({ value: category.id, label: `${category.destinationName} · ${category.name}` }))]} onValueChange={(value) => { setParentCategoryId(value); if (value) setDestinationId('') }} /></label>
        {!parentCategoryId && <label className="form-field"><span>Repasse principal</span><SelectField ariaLabel="Repasse principal" value={destinationId} placeholder="Selecione o repasse" options={destinations.map((destination) => ({ value: destination.id, label: destination.name }))} onValueChange={setDestinationId} />{roots.length > 0 && <small>Ex.: crie “Despesas gerais” sob Casa/Lazer; depois adicione suas subcategorias.</small>}</label>}
        {selectedParent && <p className="cash-book-feedback">Herda o repasse <strong>{selectedParent.destinationName}</strong> de {selectedParent.name}.</p>}
        {error && <p className="cash-book-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}><Icon name="check" size={15} />{saving ? 'Salvando…' : 'Criar categoria'}</button></div>
      </form>
    </div>
  )
}
