import { Icon } from '../ui/Icon';
import type { CSSProperties } from 'react';
import type {
  Distribution,
  Forecast,
} from '../../features/forecasts/forecastsApi';
import { formatCurrencyDecimal } from '../../lib/formatters';
import { allocatedAmount, statusLabel } from './forecastUtils';

export function ForecastTable({
  title,
  description,
  items,
  distribution,
  mode,
  onView,
  onEdit,
  onDuplicate,
  onRetain,
  retainingId,
  onRemove,
}: {
  title: string;
  description: string;
  items: Forecast[];
  distribution: Distribution[];
  mode: 'income' | 'expense' | 'all';
  onView: (item: Forecast) => void;
  onEdit: (item: Forecast) => void;
  onDuplicate: (item: Forecast) => void;
  onRetain: (item: Forecast) => void;
  retainingId: string | null;
  onRemove: (item: Forecast) => void;
}) {
  const visibleDestinations = distribution.filter(
    (row) =>
      row.name !== 'Outras' ||
      Number(row.percentage) > 0 ||
      Number(row.budget) > 0,
  );
  const rows = items
    .filter((item) => mode === 'all' || item.kind === mode)
    .sort((a, b) => mode === 'all' ? a.dueDate.localeCompare(b.dueDate) : 0);
  return (
    <section className="panel cash-book-table-panel forecasts-list-panel">
      <header className="panel-heading cash-book-table-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="forecast-empty-state">
          {mode === 'income'
            ? 'Nenhum recebimento previsto nesta competência.'
            : mode === 'all'
              ? 'Nenhuma conta a pagar ou recebimento previsto nesta competência.'
              : 'Nenhuma conta a pagar nesta competência.'}
        </div>
      ) : (
        <div className="table-scroll cash-book-table-scroll">
          <table
            className={`transactions-table cash-book-table forecasts-table ${mode}`}
            style={{ '--forecast-destination-width': `${35 / Math.max(visibleDestinations.length, 1)}%` } as CSSProperties}
          >
            {mode === 'income' && (
              <colgroup>
                <col className="forecast-col-description" />
                <col className="forecast-col-date" />
                <col className="forecast-col-amount" />
                {visibleDestinations.map((row) => <col className="forecast-col-destination" key={row.id} />)}
                <col className="forecast-col-realized" />
                <col className="forecast-col-status" />
                <col className="forecast-col-actions" />
              </colgroup>
            )}
            <thead>
              <tr>
                {mode === 'expense' ? (
                  <>
                    <th>Vencimento</th>
                    <th>Pago em</th>
                    <th>Descrição / Conta</th>
                    <th>Categoria</th>
                    <th>Previsto</th>
                    <th>Realizado</th>
                    <th>Pendente</th>
                    <th>Situação</th>
                  </>
                ) : mode === 'all' ? (
                  <>
                    <th>Vencimento</th>
                    <th>Pago / recebido em</th>
                    <th>Descrição / Conta</th>
                    <th>Categoria / Distribuição</th>
                    <th>Tipo</th>
                    <th>Previsto</th>
                    <th>Realizado</th>
                    <th>Pendente</th>
                    <th>Situação</th>
                  </>
                ) : (
                  <>
                    <th className="forecast-table-description">Cliente / Descrição</th>
                    <th className="forecast-table-date">Data</th>
                    <th className="forecast-table-money">Valor</th>
                    {visibleDestinations.map((row) => (
                      <th className="forecast-table-money" key={row.id}>{row.name}</th>
                    ))}
                    <th className="forecast-table-money">Realizado</th>
                    <th className="forecast-table-status">Situação</th>
                  </>
                )}
                <th className={mode === 'income' ? 'forecast-table-actions' : undefined}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  {mode === 'expense' ? (
                    <>
                      <td>
                        {new Intl.DateTimeFormat('pt-BR').format(
                          new Date(`${item.dueDate}T12:00:00`),
                        )}
                      </td>
                      <td>
                        {item.realizedAt
                          ? new Intl.DateTimeFormat('pt-BR').format(
                              new Date(`${item.realizedAt}T12:00:00`),
                            )
                          : '—'}
                      </td>
                      <td className="description-cell forecast-table-description">
                        <strong>{item.description}</strong>
                        <small>
                          {item.occurrenceCount > 1
                            ? `Parcela ${item.occurrenceIndex}/${item.occurrenceCount}`
                            : item.accountName || 'Conta não definida'}
                        </small>
                        {item.amountType === 'income_percentage' && <small>{item.percentage}% dos recebimentos previstos</small>}
                      </td>
                      <td className="description-cell"><strong>{item.categoryName}</strong><small>{item.categoryDestinationName}</small></td>
                      <td>{formatCurrencyDecimal(item.amount)}</td>
                      <td>{formatCurrencyDecimal(item.realized)}</td>
                      <td>{formatCurrencyDecimal(item.pending)}</td>
                      <td className="forecast-table-date">
                        <span className={`forecast-status ${item.status}`}>
                          {statusLabel[item.status]}
                        </span>
                        {item.divergence && (
                          <small className="forecast-divergence">
                            Acima do previsto
                          </small>
                        )}
                      </td>
                    </>
                  ) : mode === 'all' ? (
                    <>
                      <td>
                        {new Intl.DateTimeFormat('pt-BR').format(new Date(`${item.dueDate}T12:00:00`))}
                      </td>
                      <td>
                        {item.realizedAt
                          ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${item.realizedAt}T12:00:00`))
                          : '—'}
                      </td>
                      <td className="description-cell forecast-table-description">
                        <strong>{item.description}</strong>
                        <small>
                          {item.occurrenceCount > 1
                            ? `Parcela ${item.occurrenceIndex}/${item.occurrenceCount}`
                            : item.accountName || 'Conta não definida'}
                        </small>
                        {item.amountType === 'income_percentage' && <small>{item.percentage}% dos recebimentos previstos</small>}
                      </td>
                      <td className="description-cell">
                        {item.kind === 'expense' ? (
                          <><strong>{item.categoryName}</strong><small>{item.categoryDestinationName}</small></>
                        ) : (
                          <div className="forecast-allocation-list">
                            {visibleDestinations.map((destination) => (
                              <span key={destination.id}>
                                {destination.name} <b>{formatCurrencyDecimal(destination.valueType === 'fixed' ? destination.value : allocatedAmount(item.amount, destination.value))}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td><span className={`forecast-kind ${item.kind}`}>{item.kind === 'income' ? 'Receita' : 'Despesa'}</span></td>
                      <td className="forecast-table-money">{formatCurrencyDecimal(item.amount)}</td>
                      <td className="forecast-table-money">{formatCurrencyDecimal(item.realized)}</td>
                      <td className="forecast-table-money">{formatCurrencyDecimal(item.pending)}</td>
                      <td className="forecast-table-status">
                        <span className={`forecast-status ${item.status}`}>{statusLabel[item.status]}</span>
                        {item.divergence && <small className="forecast-divergence">Acima do previsto</small>}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="description-cell">
                        <strong>{item.description}</strong>
                        {item.occurrenceCount > 1 && (
                          <small>
                            Parcela {item.occurrenceIndex}/
                            {item.occurrenceCount}
                          </small>
                        )}
                      </td>
                      <td>
                        {new Intl.DateTimeFormat('pt-BR').format(
                          new Date(`${item.dueDate}T12:00:00`),
                        )}
                      </td>
                      <td className="forecast-table-money">{formatCurrencyDecimal(item.amount)}</td>
                      {visibleDestinations.map((row) => (
                        <td className="forecast-table-money" key={row.id}>
                          {formatCurrencyDecimal(
                            row.valueType === 'fixed' ? row.value : allocatedAmount(item.amount, row.value),
                          )}
                        </td>
                      ))}
                      <td className="forecast-table-money">{formatCurrencyDecimal(item.realized)}</td>
                      <td className="forecast-table-status">
                        <span className={`forecast-status ${item.status}`}>
                          {statusLabel[item.status]}
                        </span>
                        {item.divergence && (
                          <small className="forecast-divergence">
                            Acima do previsto
                          </small>
                        )}
                      </td>
                    </>
                  )}
                  <td className={mode === 'income' ? 'forecast-table-actions' : undefined}>
                    <div className="forecast-row-actions">
                      <button
                        className="icon-button"
                        title="Detalhes e conciliação"
                        aria-label="Detalhes e conciliação"
                        onClick={() => onView(item)}
                        disabled={item.status === 'cancelled'}
                      >
                        <Icon name="eye" size={15} />
                      </button>
                      <button
                        className="icon-button"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => onEdit(item)}
                        disabled={item.status === 'cancelled'}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        className="icon-button"
                        title="Duplicar"
                        aria-label="Duplicar"
                        onClick={() => onDuplicate(item)}
                      >
                        <Icon name="copy" size={15} />
                      </button>
                      {item.kind === 'expense' && (() => {
                        const isRetaining = retainingId === item.id;
                        const isUnavailable = !item.retained && (item.hasReconciliation || item.closed || item.status === 'cancelled' || (item.status !== 'pending' && item.status !== 'overdue'));
                        const title = item.retained
                          ? 'Desfazer retenção: a previsão voltará a contar como despesa pendente ou atrasada.'
                          : item.hasReconciliation
                            ? 'Este lançamento já possui conciliação e não pode ser retido. Remova as conciliações antes de tentar novamente.'
                            : item.closed || item.status === 'cancelled'
                              ? 'Este lançamento está encerrado ou cancelado e não pode ser retido.'
                              : 'Reter na fonte: marcar como realizado sem criar uma saída no Livro Caixa; o valor permanece no caixa.';
                        return <button
                          className={`icon-button forecast-retain-action${item.retained ? ' is-retained' : ''}${!item.retained && (item.hasReconciliation || item.closed || item.status === 'cancelled') ? ' is-unavailable' : ''}`}
                          title={title}
                          aria-label={title}
                          aria-busy={isRetaining}
                          disabled={isUnavailable || isRetaining}
                          onClick={() => onRetain(item)}
                        >
                          {isRetaining ? <span className="loading-spinner" /> : <Icon name={item.retained ? 'unlock' : item.hasReconciliation ? 'lock-x' : 'lock'} size={15} />}
                        </button>;
                      })()}
                      <button
                        className="icon-button danger-icon"
                        title="Excluir da planilha"
                        aria-label="Excluir previsão da planilha"
                        onClick={() => onRemove(item)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
