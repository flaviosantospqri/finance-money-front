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
  const [level, setLevel] = useState<'root' | 'child'>('root')
  const [destinationId, setDestinationId] = useState('')
  const [parentCategoryId, setParentCategoryId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const roots = categories.filter((c) => c.active && !c.parentCategoryId && c.nature === nature)
  const selectedParent = roots.find((c) => c.id === parentCategoryId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || (level === 'root' && !destinationId) || (level === 'child' && !parentCategoryId)) {
      setError(level === 'root' ? 'Informe o nome e selecione o repasse principal.' : 'Informe o nome e escolha a categoria-pai.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), nature, destinationId: level === 'child' ? selectedParent?.destinationId : destinationId, parentCategoryId: level === 'child' ? parentCategoryId : undefined })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível cadastrar a categoria.')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="confirm-dialog cash-book-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" onSubmit={handleSubmit}>
        <span className="placeholder-icon"><Icon name="reports" size={21} /></span>
        <h2 id="category-dialog-title">Nova categoria</h2>
        <p>Escolha primeiro o nível. Categorias principais ficam sob um repasse; subcategorias ficam sob uma categoria existente.</p>
        <label className="form-field"><span>Nome</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Moradia" /></label>
        <label className="form-field"><span>Natureza</span><SelectField ariaLabel="Natureza da categoria" value={nature} onValueChange={(value) => { setNature(value as CategoryNature); setParentCategoryId('') }} options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]} /></label>
        <fieldset className="category-level-fieldset">
          <legend>Tipo de categoria</legend>
          <div className="category-level-options" role="radiogroup" aria-label="Tipo de categoria">
            <button type="button" role="radio" aria-checked={level === 'root'} className={level === 'root' ? 'selected' : ''} onClick={() => { setLevel('root'); setParentCategoryId('') }}>
              <strong>Categoria principal</strong><small>Fica diretamente sob um repasse.</small>
            </button>
            <button type="button" role="radio" aria-checked={level === 'child'} className={level === 'child' ? 'selected' : ''} onClick={() => { setLevel('child'); setDestinationId('') }}>
              <strong>Subcategoria</strong><small>Fica dentro de uma categoria existente.</small>
            </button>
          </div>
        </fieldset>
        {level === 'root' ? (
          <label className="form-field"><span>Repasse principal</span><SelectField ariaLabel="Repasse principal" value={destinationId} placeholder="Selecione o repasse" options={destinations.map((destination) => ({ value: destination.id, label: destination.name }))} onValueChange={setDestinationId} /></label>
        ) : (
          <label className="form-field"><span>Categoria-pai</span><SelectField ariaLabel="Categoria-pai" value={parentCategoryId} placeholder="Selecione a categoria principal" options={roots.map((category) => ({ value: category.id, label: `${category.destinationName} · ${category.name}` }))} onValueChange={setParentCategoryId} />{roots.length === 0 && <small>Cadastre uma categoria principal antes de criar uma subcategoria.</small>}</label>
        )}
        {level === 'child' && selectedParent && <p className="cash-book-feedback">Esta subcategoria ficará em <strong>{selectedParent.name}</strong> e herdará o repasse <strong>{selectedParent.destinationName}</strong> (100% do orçamento continua definido no repasse).</p>}
        {error && <p className="cash-book-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}><Icon name="check" size={15} />{saving ? 'Salvando…' : 'Criar categoria'}</button></div>
      </form>
    </div>
  )
}
