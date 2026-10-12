import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const monthlyCashFlow = [
  { month: 'Mai', income: 38_000, expenses: 22_000 },
  { month: 'Jun', income: 41_500, expenses: 19_800 },
  { month: 'Jul', income: 39_000, expenses: 21_500 },
  { month: 'Ago', income: 45_200, expenses: 24_000 },
  { month: 'Set', income: 40_800, expenses: 17_600 },
  { month: 'Out', income: 42_800, expenses: 18_300 },
]

const chartTicks = [0, 12_500, 25_000, 37_500, 50_000]

function formatAxisValue(value: number) {
  if (value === 0) return 'R$ 0'
  return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function FinanceChart() {
  const [range, setRange] = useState(6)
  const visibleMonths = monthlyCashFlow.slice(-range)

  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading">
        <div>
          <h2>Evolução Financeira</h2>
          <p>Comparativo de entradas e saídas nos últimos {range} meses</p>
        </div>
        <div className="chart-tools">
          <span className="chart-legend"><i className="legend-income" /> Receitas (Entradas)</span>
          <span className="chart-legend"><i className="legend-expenses" /> Despesas (Saídas)</span>
          <label className="chart-range">
            <select aria-label="Período do gráfico" value={range} onChange={(event) => setRange(Number(event.target.value))}>
              <option value={6}>Últimos 6 meses</option>
              <option value={3}>Últimos 3 meses</option>
            </select>
            <span aria-hidden="true">⌄</span>
          </label>
        </div>
      </div>

      <div className="chart-wrap" role="img" aria-label={`Gráfico de barras comparando receitas e despesas dos últimos ${range} meses`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleMonths}
            margin={{ top: 8, right: 12, bottom: 2, left: 2 }}
            barCategoryGap="28%"
            barGap={5}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-soft)', fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis
              width={78}
              domain={[0, 50_000]}
              ticks={chartTicks}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-soft)', fontSize: 11 }}
              tickFormatter={formatAxisValue}
            />
            <Tooltip
              cursor={{ fill: 'var(--table-hover)' }}
              formatter={(value, name) => [formatCurrency(Number(value)), name === 'Receitas' || name === 'income' ? 'Receitas' : 'Despesas']}
              contentStyle={{
                border: '1px solid var(--panel-border)',
                borderRadius: 9,
                background: 'var(--surface)',
                color: 'var(--text)',
                boxShadow: '0 4px 14px rgb(16 24 40 / 12%)',
                fontSize: 12,
              }}
              labelStyle={{ color: 'var(--text)', fontWeight: 700, marginBottom: 4 }}
            />
            <Bar dataKey="income" name="Receitas" fill="#00966a" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" name="Despesas" fill="#dc7884" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
