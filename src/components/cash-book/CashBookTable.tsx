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
}

function entryTypeLabel(entry: CashBookEntry) {
  if (entry.type === 'transfer_debit') return `Transferência para ${entry.destinationAccountName ?? 'outra conta'}`
  if (entry.type === 'transfer_credit') return `Transferência de ${entry.sourceAccountName ?? 'outra conta'}`
  return entry.categoryName ?? '—'
}

export function CashBookTable({ entries, pagination, onPageChange, onView, onEdit, onDelete }: CashBookTableProps) {
  return (
    <section className="panel cash-book-table-panel">
      <div className="cash-book-table-heading">
        <div><h2>Movimentações</h2><p>Saldo calculado na ordem cronológica, incluindo transferências da conta</p></div>
      </div>
      <div className="table-scroll">
        <table className="transactions-table cash-book-table">
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria / repasse</th><th className="cash-book-money-heading">Entrada</th><th className="cash-book-money-heading">Saída</th><th className="cash-book-balance-heading">Saldo</th><th className="actions-heading-cell">Ações</th></tr></thead>
          <tbody>
            {entries.map((entry) => {
              const isIncome = entry.type === 'income' || entry.type === 'transfer_credit'
              const isTransfer = entry.type.startsWith('transfer_')
              return (
                <tr key={entry.id}>
                  <td className="date-cell"><strong>{formatDate(entry.occurredAt)}</strong></td>
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
            })}
            {entries.length === 0 && <tr><td className="empty-table" colSpan={7}>Nenhuma movimentação encontrada para esta conta e competência.</td></tr>}
          </tbody>
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
