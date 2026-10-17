import type {
  FinancialAccount,
  FinancialCategory,
} from '../cash-book/cashBookApi';

export type Forecast = {
  id: string;
  seriesId: string;
  occurrenceIndex: number;
  occurrenceCount: number;
  kind: 'income' | 'expense';
  description: string;
  amount: string;
  amountType: 'fixed' | 'income_percentage';
  percentage: string | null;
  dueDate: string;
  categoryId: string;
  categoryName: string;
  categoryDestinationName: string;
  accountId: string | null;
  accountName: string | null;
  destinationId: string | null;
  destinationName: string | null;
  groupId: string | null;
  groupName: string | null;
  notes: string | null;
  realized: string;
  pending: string;
  realizedAt: string | null;
  divergence: boolean;
  closed: boolean;
  status: 'pending' | 'partial' | 'realized' | 'overdue' | 'cancelled';
};
export type ForecastSummary = {
  period: string;
  incomePlanned: string;
  expensePlanned: string;
  resultProjected: string;
  committedPending: string;
  realBalance: string;
  projectedBalance: string;
  futureNet: string;
  futureCashMovements: string;
  pendingIncome: string;
  pendingExpenses: string;
  projectionOpen: boolean;
};
export type Destination = { id: string; name: string; active: boolean };
export type Distribution = Destination & {
  percentage: string;
  valueType: 'percentage' | 'fixed';
  value: string;
  budget: string;
  consumed: string;
};
export type Reconciliation = {
  id: string;
  entryId: string;
  description: string;
  entryAmount: string;
  linkedAmount: string | null;
  occurredAt: string;
};
export type ForecastDetails = Forecast & { reconciliations: Reconciliation[] };
export type ForecastInput = {
  kind: 'income' | 'expense';
  description: string;
  amount: string;
  amountType?: 'fixed' | 'income_percentage';
  percentage?: string;
  dueDate: string;
  categoryId: string;
  accountId?: string;
  recurrence: 'once' | 'monthly' | 'weekly' | 'yearly';
  occurrenceCount: number;
  destinationId?: string;
  notes?: string;
  groupId?: string | null;
};
export type ForecastUpdateInput = Partial<
  Omit<ForecastInput, 'kind' | 'recurrence' | 'occurrenceCount'>
>;
export type ForecastGroup = { id: string; name: string };
export type FinancialRepasse = {
  id: string;
  destinationId: string;
  name: string;
  valueType: 'percentage' | 'fixed';
  value: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};
export type FinancialRepasseInput = Omit<FinancialRepasse, 'id' | 'destinationId'>;
const base = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let message = `Falha na comunicação com o servidor (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message || message;
    } catch {
      /* Keep the HTTP error when the body is not JSON. */
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
function query(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}
export const forecastsApi = {
  groups: () => request<ForecastGroup[]>('/financial-forecasts/groups'),
  createGroup: (name: string) =>
    request<ForecastGroup>('/financial-forecasts/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  updateGroup: (id: string, name: string) =>
    request<ForecastGroup>(`/financial-forecasts/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  deleteGroup: (id: string) =>
    request<{ deleted: boolean }>(`/financial-forecasts/groups/${id}`, {
      method: 'DELETE',
    }),
  getAccounts: () =>
    request<FinancialAccount[]>('/financial-accounts?active=true'),
  getCategories: () =>
    request<FinancialCategory[]>('/financial-categories?active=true'),
  getAll: (filters: {
    period?: string;
    kind?: string;
    categoryId?: string;
    status?: string;
    search?: string;
  }) => request<Forecast[]>(`/financial-forecasts?${query(filters)}`),
  summary: (period: string) =>
    request<ForecastSummary>(`/financial-forecasts/summary?period=${period}`),
  create: (data: ForecastInput) =>
    request('/financial-forecasts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  copyMonth: (period: string, targetPeriod: string) =>
    request<{ copied: number; skipped: number; sourceCount: number }>('/financial-forecasts/copy-month', {
      method: 'POST',
      body: JSON.stringify({ period, targetPeriod }),
    }),
  update: (
    id: string,
    data: ForecastUpdateInput,
    scope: 'occurrence' | 'future',
  ) =>
    request(`/financial-forecasts/${id}?scope=${scope}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string, scope: 'occurrence' | 'future') =>
    request(`/financial-forecasts/${id}?scope=${scope}`, { method: 'DELETE' }),
  duplicate: (id: string) =>
    request(`/financial-forecasts/${id}/duplicate`, { method: 'POST' }),
  details: (id: string) =>
    request<ForecastDetails>(`/financial-forecasts/${id}`),
  matches: (id: string) =>
    request<
      {
        id: string;
        description: string;
        amount: string;
        occurredAt: string;
        type: string;
        accountName: string;
        categoryName: string | null;
        forecastCategoryName: string;
        categoryMatch: boolean;
        nameMatch: number;
        difference: string;
        daysDifference: number;
      }[]
    >(`/financial-forecasts/${id}/matches`),
  reconcile: (id: string, entryIds: string[]) =>
    request(`/financial-forecasts/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ entryIds }),
    }),
  unlink: (id: string, reconciliationId: string) =>
    request(`/financial-forecasts/${id}/reconciliations/${reconciliationId}`, {
      method: 'DELETE',
    }),
  close: (id: string, reason: string) =>
    request(`/financial-forecasts/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  destinations: () =>
    request<Destination[]>('/financial-forecasts/destinations'),
  createDestination: (name: string) =>
    request<Destination>('/financial-forecasts/destinations', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  distributions: (period: string) =>
    request<Distribution[]>(
      `/financial-forecasts/distributions?period=${period}`,
    ),
  saveDistributions: (
    period: string,
    entries: { destinationId: string; percentage?: string; valueType?: 'percentage' | 'fixed'; value?: string }[],
  ) =>
    request<Distribution[]>(`/financial-forecasts/distributions/${period}`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    }),
  copyDistributions: (period: string, targetPeriod: string) =>
    request<Distribution[]>('/financial-forecasts/distributions/copy', {
      method: 'POST',
      body: JSON.stringify({ period, targetPeriod }),
    }),
  repasses: () => request<FinancialRepasse[]>('/financial-repasses'),
  createRepasse: (input: FinancialRepasseInput) =>
    request<FinancialRepasse>('/financial-repasses', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateRepasse: (id: string, input: FinancialRepasseInput) =>
    request<FinancialRepasse>(`/financial-repasses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteRepasse: (id: string) =>
    request<{ deleted: boolean }>(`/financial-repasses/${id}`, { method: 'DELETE' }),
};
