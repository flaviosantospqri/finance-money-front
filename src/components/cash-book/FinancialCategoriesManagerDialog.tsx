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
  onSave: (changes: { id: string; destinationId: string }[]) => Promise<void>
}) {
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const activeDestinations = destinations.filter((destination) => destination.active)
  const dirtyCategories = categories.filter(
    (category) => changes[category.id] && changes[category.id] !== category.destinationId,
  )

  async function save() {
    setSaving(true)
    setError('')
    try {
      await onSave(dirtyCategories.map((category) => ({ id: category.id, destinationId: changes[category.id] })))
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
            <h2 id="categories-manager-title">Categorias e repasses</h2>
            <p>Vincule cada categoria ao repasse que deve acompanhar seus gastos.</p>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}><Icon name="close" size={17} /></button>
        </header>
        <div className="financial-categories-list">
          <table className="transactions-table">
            <thead><tr><th>Categoria</th><th>Natureza</th><th>Repasse</th></tr></thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td>{category.nature === 'income' ? 'Receita' : 'Despesa'}</td>
                  <td>
                    <SelectField
                      ariaLabel={`Repasse da categoria ${category.name}`}
                      value={changes[category.id] ?? category.destinationId}
                      options={activeDestinations.map((destination) => ({ value: destination.id, label: destination.name }))}
                      onValueChange={(value) => setChanges((current) => ({ ...current, [category.id]: value }))}
                    />
                  </td>
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
