import { lazy, Suspense } from 'react'
import { ClosingBanner } from '../../components/dashboard/ClosingBanner'
import { SummaryCards } from '../../components/dashboard/SummaryCards'
import { TransactionsTable } from '../../components/cash-flow/TransactionsTable'
import type { Transaction } from '../../types'

const FinanceChart = lazy(() => import('../../components/dashboard/FinanceChart').then(({ FinanceChart: chart }) => ({ default: chart })))

type DashboardPageProps = {
  transactions: Transaction[]
  onOpenCashFlow: () => void
  onOpenClosing: () => void
}

export function DashboardPage({ transactions, onOpenCashFlow, onOpenClosing }: DashboardPageProps) {
  return (
    <div className="page-content dashboard-page">
      <ClosingBanner onClose={onOpenClosing} />
      <SummaryCards />
      <Suspense fallback={<section className="panel chart-panel chart-loading"><div className="panel-heading"><div><h2>Evolução Financeira</h2><p>Carregando comparativo mensal…</p></div></div></section>}>
        <FinanceChart />
      </Suspense>
      <TransactionsTable transactions={transactions.slice(0, 5)} pageSize={5} onView={onOpenCashFlow} />
    </div>
  )
}
