import { useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CashBookEntry, CashBookPageResult } from '../../features/cash-book/cashBookApi'
import { formatCurrencyDecimal, formatDate } from '../../lib/formatters'
import { Icon } from '../ui/Icon'

type CashBookTableProps = {
  entries: CashBookEntry[]
  pagination: CashBookPageResult['pagination'] | null
  onPageChange: (page: number) => void
  onView: (entry: CashBookEntry) => void
  onEdit: (entry: CashBookEntry) => void
  onDelete: (entry: CashBookEntry) => void
  canReorder: boolean
  isReordering: boolean
  isRefreshing: boolean
  onReorder: (ids: string[]) => void
}

function entryTypeLabel(entry: CashBookEntry) {
  if (entry.type === 'transfer_debit') return `Transferência para ${entry.destinationAccountName ?? 'outra conta'}`
  if (entry.type === 'transfer_credit') return `Transferência de ${entry.sourceAccountName ?? 'outra conta'}`
  return entry.categoryName ?? '—'
}

function SortableEntryRow({ entry, canReorder, isBusy, onView, onEdit, onDelete }: {
  entry: CashBookEntry
  canReorder: boolean
  isBusy: boolean
  onView: (entry: CashBookEntry) => void
  onEdit: (entry: CashBookEntry) => void
  onDelete: (entry: CashBookEntry) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id, disabled: !canReorder || isBusy })
  const isIncome = entry.type === 'income' || entry.type === 'transfer_credit'
  const isTransfer = entry.type.startsWith('transfer_')
  return (
    <tr ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}>
      <td className="date-cell cash-book-date-with-handle">
        {canReorder ? <button className="cash-book-drag-handle" title="Arraste para mudar a ordem" aria-label={`Reordenar ${entry.description}`} {...attributes} {...listeners}>⠿</button> : <span className="cash-book-drag-spacer" />}
        <strong>{formatDate(entry.occurredAt)}</strong>
      </td>
      <td className="description-cell"><strong>{entry.description}</strong>{isTransfer && <small>{entryTypeLabel(entry)}</small>}</td>
      <td className="cash-book-category-cell">
        <span className={isTransfer ? 'cash-book-transfer-chip' : 'category-chip'}>{isTransfer ? 'Transferência' : entryTypeLabel(entry)}</span>
        {!isTransfer && entry.destinationName && <small>{entry.destinationName}</small>}
      </td>
      <td className="cash-book-money income">{isIncome ? formatCurrencyDecimal(entry.amount) : '—'}</td>
      <td className="cash-book-money expense">{!isIncome ? formatCurrencyDecimal(entry.amount) : '—'}</td>
      <td className="cash-book-money balance">{entry.balance ? formatCurrencyDecimal(entry.balance) : '—'}</td>
      <td className="row-actions">
        <button className="row-action" title="Ver movimentação" aria-label="Ver movimentação" onClick={() => onView(entry)}><Icon name="eye" size={17} /></button>
        <button className="row-action" title="Editar movimentação" aria-label="Editar movimentação" onClick={() => onEdit(entry)}><Icon name="edit" size={17} /></button>
        <button className="row-action delete-action" title="Excluir movimentação" aria-label="Excluir movimentação" onClick={() => onDelete(entry)}><Icon name="trash" size={17} /></button>
      </td>
    </tr>
  )
}

export function CashBookTable({ entries, pagination, onPageChange, onView, onEdit, onDelete, canReorder, isReordering, isRefreshing, onReorder }: CashBookTableProps) {
  const [dragging, setDragging] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  function finishDrag(event: DragEndEvent) {
    setDragging(false)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = entries.findIndex((entry) => entry.id === active.id)
    const newIndex = entries.findIndex((entry) => entry.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(entries, oldIndex, newIndex).map((entry) => entry.id))
  }
  return (
    <section className="panel cash-book-table-panel" aria-busy={isRefreshing || isReordering}>
      <div className="cash-book-table-heading">
        <div><h2>Movimentações</h2><p>Ordem padrão por criação; saldo recalculado conforme a ordem exibida.</p></div>
        <div className="cash-book-table-status-area">
          {(isRefreshing || isReordering) && <span className="cash-book-request-status" role="status" aria-live="polite"><span className="loading-spinner" />{isReordering ? 'Salvando ordem…' : 'Atualizando movimentações…'}</span>}
          {!isRefreshing && !isReordering && canReorder && entries.length > 1 && <span className="cash-book-reorder-hint">Arraste pelo ⠿ para reorganizar</span>}
        </div>
      </div>
      <div className="table-scroll">
        <table className="transactions-table cash-book-table">
          <thead><tr><th>Data</th><th>Descrição</th><th>Origem / Categoria</th><th className="cash-book-money-heading">Entrada</th><th className="cash-book-money-heading">Saída</th><th className="cash-book-balance-heading">Saldo</th><th className="actions-heading-cell">Ações</th></tr></thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setDragging(true)} onDragCancel={() => setDragging(false)} onDragEnd={finishDrag}>
            <SortableContext items={entries.map((entry) => entry.id)} strategy={verticalListSortingStrategy}>
              <tbody className={dragging ? 'cash-book-dragging' : ''}>
                {entries.map((entry) => <SortableEntryRow key={entry.id} entry={entry} canReorder={canReorder} isBusy={isRefreshing || isReordering} onView={onView} onEdit={onEdit} onDelete={onDelete} />)}
                {entries.length === 0 && <tr><td className="empty-table" colSpan={7}>Nenhuma movimentação encontrada para esta conta e competência.</td></tr>}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
      {pagination && <div className="table-footer">
        <span>Exibindo {pagination.total ? (pagination.page - 1) * pagination.pageSize + 1 : 0}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total} movimentações</span>
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Anterior</button>
          <span>{pagination.page} / {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Próxima</button>
        </div>
      </div>}
    </section>
  )
}
