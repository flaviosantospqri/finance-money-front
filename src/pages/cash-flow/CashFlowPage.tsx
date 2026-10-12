import { useMemo, useState } from 'react'
import { TransactionsTable } from '../../components/cash-flow/TransactionsTable'
import { SelectField } from '../../components/ui/SelectField'
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
        <label className="filter-select"><span>Tipo</span><SelectField ariaLabel="Filtrar tipo" value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'Todos' | TransactionType)} options={[{ value: 'Todos', label: 'Todos' }, { value: 'Entrada', label: 'Entrada' }, { value: 'Saída', label: 'Saída' }]} /></label>
        <label className="filter-select"><span>Status</span><SelectField ariaLabel="Filtrar status" value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'Todos' | TransactionStatus)} options={[{ value: 'Todos', label: 'Todos' }, { value: 'Confirmado', label: 'Confirmado' }, { value: 'Pendente', label: 'Pendente' }]} /></label>
      </div>
      <TransactionsTable transactions={filteredTransactions} showActions onEdit={onEdit} onDelete={onDelete} onView={onView} onConfirm={onConfirm} />
    </div>
  )
}
