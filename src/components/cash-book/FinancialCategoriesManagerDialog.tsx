import { useState } from 'react'
import type { FinancialCategory } from '../../features/cash-book/cashBookApi'
import { Icon } from '../ui/Icon'
import { SelectField } from '../ui/SelectField'

type DestinationOption = { id: string; name: string; active: boolean }

export function FinancialCategoriesManagerDialog({
  categories,
  destinations,
  onClose,
  onSave,
}: {
  categories: FinancialCategory[]
  destinations: DestinationOption[]
  onClose: () => void
  onSave: (changes: { id: string; destinationId?: string; parentCategoryId?: string | null; name?: string; active?: boolean }[]) => Promise<void>
}) {
  const [changes, setChanges] = useState<Record<string, { name?: string; destinationId?: string; parentCategoryId?: string | null; active?: boolean }>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activeDestinations = destinations.filter((destination) => destination.active)
  const dirtyCategories = categories.filter((category) => {
    const change = changes[category.id]
    return change && Object.keys(change).some((key) => {
      const value = change[key as keyof typeof change]
      return value !== undefined && value !== category[key as keyof FinancialCategory]
    })
  })

  async function save() {
    setSaving(true)
    setError('')
    try {
      await onSave(dirtyCategories.map((category) => ({ id: category.id, ...changes[category.id] })))
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as categorias.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="confirm-dialog financial-categories-dialog" role="dialog" aria-modal="true" aria-labelledby="categories-manager-title">
        <header className="financial-categories-heading">
          <div>
            <h2 id="categories-manager-title">Origens, categorias e subcategorias</h2>
            <p>O percentual fica na origem (repasse principal). Categorias e subcategorias herdam esse orçamento.</p>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}><Icon name="close" size={17} /></button>
        </header>
        <div className="financial-categories-list">
          <table className="transactions-table">
            <thead><tr><th>Categoria</th><th>Natureza</th><th>Categoria-pai</th><th>Origem / repasse</th><th>Situação</th></tr></thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td><input className="category-name-input" aria-label={`Nome de ${category.name}`} value={changes[category.id]?.name ?? category.name} onChange={(event) => setChanges((current) => ({ ...current, [category.id]: { ...current[category.id], name: event.target.value } }))} />{category.parentCategoryId && <small className="category-hierarchy-parent">↳ {category.parentCategoryName}</small>}</td>
                  <td>{category.nature === 'income' ? 'Receita' : 'Despesa'}</td>
                  <td><SelectField ariaLabel={`Categoria-pai de ${category.name}`} value={changes[category.id] && 'parentCategoryId' in changes[category.id] ? changes[category.id].parentCategoryId ?? '' : category.parentCategoryId ?? ''} options={[{ value: '', label: 'Origem principal' }, ...categories.filter((parent) => parent.active && !parent.parentCategoryId && parent.nature === category.nature && parent.id !== category.id).map((parent) => ({ value: parent.id, label: parent.name }))]} onValueChange={(value) => setChanges((current) => ({ ...current, [category.id]: { ...current[category.id], parentCategoryId: value || null, ...(value ? {} : { destinationId: category.destinationId }) } }))} /></td>
                  <td>
                    <SelectField
                      ariaLabel={`Repasse da categoria ${category.name}`}
                      value={changes[category.id]?.destinationId ?? category.destinationId}
                      disabled={Boolean(changes[category.id] && 'parentCategoryId' in changes[category.id] ? changes[category.id].parentCategoryId : category.parentCategoryId)}
                      options={activeDestinations.map((destination) => ({ value: destination.id, label: destination.name }))}
                      onValueChange={(value) => setChanges((current) => ({ ...current, [category.id]: { ...current[category.id], destinationId: value } }))}
                    />
                  </td>
                  <td><button className="text-link" onClick={() => setChanges((current) => ({ ...current, [category.id]: { ...current[category.id], active: !(current[category.id]?.active ?? category.active) } }))}>{(changes[category.id]?.active ?? category.active) ? 'Ativa · desativar' : 'Inativa · ativar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="cash-book-error" role="alert">{error}</p>}
        <footer className="dialog-actions">
          <button className="secondary-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" disabled={saving || !dirtyCategories.length} onClick={() => void save()}>
            <Icon name="check" size={15} />{saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </footer>
      </section>
    </div>
  )
}
