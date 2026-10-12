import { useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { SummaryCards } from '../../components/dashboard/SummaryCards';
import { cashBookApi, type CashBookSummary } from '../../features/cash-book/cashBookApi';

type Props = {
  month: string;
  onOpenCashBook: () => void;
  onOpenClosing: () => void;
};

type DashboardTotals = Pick<
  CashBookSummary,
  'closingBalance' | 'incomeTotal' | 'expenseTotal' | 'netMovement'
>;

const zeroTotals: DashboardTotals = {
  closingBalance: '0.00',
  incomeTotal: '0.00',
  expenseTotal: '0.00',
  netMovement: '0.00',
};

function sumMoney(values: string[]) {
  const cents = values.reduce((total, value) => {
    const normalized = value.trim();
    const negative = normalized.startsWith('-');
    const [whole = '0', fraction = ''] = normalized.replace(/^[+-]/, '').split('.');
    const amount = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
    return total + (negative ? -amount : amount);
  }, 0n);
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

function periodLabel(period: string) {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));
}

export function DashboardPage({ month, onOpenCashBook, onOpenClosing }: Props) {
  const [totals, setTotals] = useState<DashboardTotals>(zeroTotals);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(async () => {
        if (active) setLoading(true);
        const accounts = await cashBookApi.getAccounts();
        const summaries = await Promise.all(
          accounts.map((account) => cashBookApi.getSummary(account.id, month)),
        );
        if (!active) return;
        setHasAccounts(accounts.length > 0);
        setTotals({
          closingBalance: sumMoney(summaries.map((summary) => summary.closingBalance)),
          incomeTotal: sumMoney(summaries.map((summary) => summary.incomeTotal)),
          expenseTotal: sumMoney(summaries.map((summary) => summary.expenseTotal)),
          netMovement: sumMoney(summaries.map((summary) => summary.netMovement)),
        });
        setError('');
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados do Livro Caixa.');
          setHasAccounts(false);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [month, retryKey]);

  return (
    <main className="page-content dashboard-page">
      <section className="panel dashboard-overview">
        <div>
          <h2>Resumo do Livro Caixa</h2>
          <p>Valores registrados em {periodLabel(month)}. Transferências não entram como receitas ou despesas.</p>
        </div>
        <div className="dashboard-actions">
          <button className="secondary-button" onClick={onOpenClosing}>Fechamento</button>
          <button className="primary-button" onClick={onOpenCashBook}>
            <Icon name="book" size={16} /> Abrir Livro Caixa
          </button>
        </div>
      </section>

      {error ? (
        <section className="panel dashboard-state" role="alert">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>Tentar novamente</button>
        </section>
      ) : loading ? (
        <section className="panel dashboard-state"><span className="loading-spinner" /> Carregando valores do Livro Caixa…</section>
      ) : !hasAccounts ? (
        <section className="panel dashboard-empty">
          <span className="placeholder-icon"><Icon name="bank" size={22} /></span>
          <h2>Comece pelo Livro Caixa</h2>
          <p>Cadastre uma conta financeira para ver aqui os saldos e resultados registrados.</p>
          <button className="primary-button" onClick={onOpenCashBook}>Abrir Livro Caixa</button>
        </section>
      ) : (
        <>
          <SummaryCards totals={totals} />
          <section className="panel dashboard-note">
            <h2>Dados baseados em registros reais</h2>
            <p>O saldo consolidado soma os saldos finais das contas ativas. Entradas, saídas e resultado consideram somente os lançamentos efetivos do mês.</p>
          </section>
        </>
      )}
    </main>
  );
}
