export type TransactionType = 'Entrada' | 'Saída';
export type TransactionStatus = 'Confirmado' | 'Pendente';

export type Transaction = {
  id: string;
  date: string;
  dueDate: string;
  description: string;
  category: string;
  type: TransactionType;
  value: number;
  account: string;
  status: TransactionStatus;
  observations: string;
};

export type UserProfile = {
  name: string;
  email: string;
  photo: string | null;
};

export type PageKey =
  | 'dashboard'
  | 'cash-flow'
  | 'cash-book'
  | 'forecasts'
  | 'repasses'
  | 'investments'
  | 'investment-evolution'
  | 'closing'
  | 'reports'
  | 'settings'
  | 'profile';
