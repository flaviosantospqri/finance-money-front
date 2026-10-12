export const transactionCategoryGroups = [
  {
    label: 'Empresariais',
    categories: [
      'Vendas & Serviços',
      'Tecnologia & Ferramentas',
      'Serviços Prestados',
      'Instalações & Infra',
      'Marketing & Vendas',
      'Viagens & Logística',
      'Serviços Terceirizados',
      'Impostos & Taxas',
    ],
  },
  {
    label: 'Pessoais e corriqueiras',
    categories: [
      'Alimentação & Mercado',
      'Moradia & Contas',
      'Transporte & Mobilidade',
      'Saúde & Bem-estar',
      'Educação',
      'Lazer & Entretenimento',
      'Compras Pessoais',
      'Cuidados Pessoais',
      'Pets',
      'Assinaturas & Serviços',
      'Viagens Pessoais',
    ],
  },
  {
    label: 'Outras',
    categories: ['Outros'],
  },
] as const

export const defaultTransactionCategory = transactionCategoryGroups[0].categories[0]
