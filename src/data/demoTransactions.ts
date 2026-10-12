import type { Transaction } from '../types'

export const demoTransactions: Transaction[] = [
  {
    id: 'tx-1', date: '2024-10-28', dueDate: '2024-10-28',
    description: 'Pagamento de Cliente — Projeto Apex Enterprise',
    category: 'Vendas & Serviços', type: 'Entrada', value: 12500,
    account: 'Itaú PJ Principal', status: 'Confirmado',
    observations: 'Ref. contrato #2024-08. Nota fiscal emitida e enviada para o financeiro.',
  },
  {
    id: 'tx-2', date: '2024-10-26', dueDate: '2024-10-26',
    description: 'Assinaturas de Software (AWS Cloud, GitHub, Figma)',
    category: 'Tecnologia & Ferramentas', type: 'Saída', value: 2340.5,
    account: 'Cartão de Crédito Nubank', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-3', date: '2024-10-25', dueDate: '2024-10-25',
    description: 'Consultoria Financeira Mensal — Startup Hub',
    category: 'Serviços Prestados', type: 'Entrada', value: 8000,
    account: 'Bradesco PJ', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-4', date: '2024-10-24', dueDate: '2024-10-24',
    description: 'Aluguel do Escritório Central (Outubro)',
    category: 'Instalações & Infra', type: 'Saída', value: 4500,
    account: 'Itaú PJ Principal', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-5', date: '2024-10-30', dueDate: '2024-11-05',
    description: 'Fatura de Marketing Digital — Google Ads & Meta',
    category: 'Marketing & Vendas', type: 'Saída', value: 3200,
    account: 'Cartão de Crédito Nubank', status: 'Pendente', observations: '',
  },
  {
    id: 'tx-6', date: '2024-10-18', dueDate: '2024-10-18',
    description: 'Reembolso de Despesas de Viagem Comercial',
    category: 'Viagens & Logística', type: 'Saída', value: 890,
    account: 'Itaú PJ Principal', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-7', date: '2024-10-15', dueDate: '2024-10-15',
    description: 'Licenciamento de Software Anual',
    category: 'Tecnologia & Ferramentas', type: 'Entrada', value: 14300,
    account: 'Itaú PJ Principal', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-8', date: '2024-10-10', dueDate: '2024-10-10',
    description: 'Honorários Contábeis Mensais',
    category: 'Serviços Terceirizados', type: 'Saída', value: 1200,
    account: 'Bradesco PJ', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-9', date: '2024-10-08', dueDate: '2024-10-08',
    description: 'Projeto de identidade visual — Cliente Orion',
    category: 'Vendas & Serviços', type: 'Entrada', value: 9800,
    account: 'Itaú PJ Principal', status: 'Confirmado', observations: '',
  },
  {
    id: 'tx-10', date: '2024-10-04', dueDate: '2024-10-04',
    description: 'Internet e telefonia empresarial',
    category: 'Instalações & Infra', type: 'Saída', value: 680,
    account: 'Bradesco PJ', status: 'Confirmado', observations: '',
  },
]
