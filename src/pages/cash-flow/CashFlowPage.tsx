import { useMemo, useState } from 'react'
import { TransactionsTable } from '../../components/cash-flow/TransactionsTable'
import { Icon } from '../../components/ui/Icon'
import type { Transaction, TransactionStatus, TransactionType } from '../../types'

type CashFlowPageProps = {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onView: (transaction: Transaction) => void
  onConfirm: (transaction: Transaction) => void
}

export function CashFlowPage({ transactions, onEdit, onDelete, onView, onConfirm }: CashFlowPageProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'Todos' | TransactionType>('Todos')
  const [statusFilter, setStatusFilter] = useState<'Todos' | TransactionStatus>('Todos')
  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const matchesQuery = `${transaction.description} ${transaction.category} ${transaction.account}`.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))
    return matchesQuery && (typeFilter === 'Todos' || transaction.type === typeFilter) && (statusFilter === 'Todos' || transaction.status === statusFilter)
  }), [transactions, query, typeFilter, statusFilter])

  return (
    <div className="page-content cash-flow-page">
      <div className="cash-flow-tools">
        <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Buscar lançamentos" placeholder="Buscar por descrição, categoria ou conta..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="filter-select"><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'Todos' | TransactionType)}><option>Todos</option><option>Entrada</option><option>Saída</option></select><Icon name="chevron" size={13} /></label>
        <label className="filter-select"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'Todos' | TransactionStatus)}><option>Todos</option><option>Confirmado</option><option>Pendente</option></select><Icon name="chevron" size={13} /></label>
      </div>
      <TransactionsTable transactions={filteredTransactions} showActions onEdit={onEdit} onDelete={onDelete} onView={onView} onConfirm={onConfirm} />
    </div>
  )
}
