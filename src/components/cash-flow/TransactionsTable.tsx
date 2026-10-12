import { useState } from 'react'
import type { Transaction } from '../../types'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { Icon } from '../ui/Icon'

type TransactionsTableProps = {
  transactions: Transaction[]
  pageSize?: number
  showActions?: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  onView?: (transaction: Transaction) => void
  onConfirm?: (transaction: Transaction) => void
}

export function TransactionsTable({ transactions, pageSize = 8, showActions = false, onEdit, onDelete, onView, onConfirm }: TransactionsTableProps) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize))
  const visibleTransactions = transactions.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <section className="panel transactions-panel">
      <div className="panel-heading transactions-heading">
        <div><h2>{showActions ? 'Lançamentos' : 'Últimos Lançamentos'}</h2><p>{showActions ? 'Gerencie as movimentações financeiras da empresa' : 'Acompanhe as movimentações financeiras recentes'}</p></div>
        {!showActions && <button className="text-link" onClick={() => onView?.(transactions[0])}>Visualizar todos os lançamentos <span>→</span></button>}
      </div>
      <div className="table-scroll">
        <table className={`transactions-table ${showActions ? 'table-operations' : 'table-compact'}`}>
          <thead><tr>
            <th>Data{showActions && ' / Venc.'}</th>
            <th>Descrição{showActions && ' / Conta'}</th>
            <th>Categoria</th><th>Tipo</th><th>Valor</th><th>Status</th>
            {showActions && <th className="actions-heading-cell">Ações</th>}
          </tr></thead>
          <tbody>
            {visibleTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="date-cell"><strong>{formatDate(transaction.date)}</strong>{showActions && <small>Venc: {formatDate(transaction.dueDate)}</small>}</td>
                <td className="description-cell"><strong>{transaction.description}</strong>{showActions && <small><Icon name="bank" size={12} />{transaction.account}</small>}</td>
                <td><span className="category-chip">{transaction.category}</span></td>
                <td><span className={`type-chip ${transaction.type === 'Entrada' ? 'type-income' : 'type-expense'}`}><Icon name={transaction.type === 'Entrada' ? 'arrow-down' : 'arrow-up'} size={11} />{transaction.type}</span></td>
                <td className={`value-cell ${transaction.type === 'Entrada' ? 'value-income' : 'value-expense'}`}>{transaction.type === 'Entrada' ? '+' : '-'} {formatCurrency(transaction.value)}</td>
                <td><span className={`status-chip ${transaction.status === 'Confirmado' ? 'status-confirmed' : 'status-pending'}`}><i />{transaction.status}</span></td>
                {showActions && <td className="row-actions">
                  {transaction.status === 'Pendente' && <button className="row-action confirm-action" title="Confirmar lançamento" aria-label="Confirmar lançamento" onClick={() => onConfirm?.(transaction)}><Icon name="check" size={17} /></button>}
                  <button className="row-action" title="Ver lançamento" aria-label="Ver lançamento" onClick={() => onView?.(transaction)}><Icon name="eye" size={17} /></button>
                  <button className="row-action" title="Editar lançamento" aria-label="Editar lançamento" onClick={() => onEdit?.(transaction)}><Icon name="edit" size={17} /></button>
                  <button className="row-action delete-action" title="Excluir lançamento" aria-label="Excluir lançamento" onClick={() => onDelete?.(transaction)}><Icon name="trash" size={17} /></button>
                </td>}
              </tr>
            ))}
            {visibleTransactions.length === 0 && <tr><td className="empty-table" colSpan={showActions ? 7 : 6}>Nenhum lançamento encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      {showActions && <div className="table-footer">
        <span>Exibindo {transactions.length ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, transactions.length)} de {transactions.length} lançamentos</span>
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Anterior</button>
          <span>{page + 1} / {pageCount}</span>
          <button disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Próxima</button>
        </div>
      </div>}
    </section>
  )
}
