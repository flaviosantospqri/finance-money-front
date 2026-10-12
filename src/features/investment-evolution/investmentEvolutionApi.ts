import type { FinancialAccount } from "../cash-book/cashBookApi";
import type { InvestmentApplication } from "../investments/investmentsApi";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    let message = `Falha ao consultar a API (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message.join(" ") : (body.message ?? message);
    } catch { /* Keep the HTTP status message. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function query(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}

export type MonthlyInvestmentEvolution = {
  month: string;
  contributions: string;
  withdrawals: string;
  income: string;
  endingBalance: string;
};

export type InvestmentEvolutionSummary = {
  fromMonth: string;
  toMonth: string;
  openingBalance: string;
  endingBalance: string;
  contributions: string;
  income: string;
  variation: string;
};

export type EvolutionFilters = {
  fromMonth: string;
  toMonth: string;
  accountId?: string;
  applicationId?: string;
};

export const investmentEvolutionApi = {
  getMonthly: (filters: EvolutionFilters) => request<MonthlyInvestmentEvolution[]>(`/investment-evolution/monthly?${query(filters)}`),
  getSummary: (filters: EvolutionFilters) => request<InvestmentEvolutionSummary>(`/investment-evolution/summary?${query(filters)}`),
  getAccounts: () => request<FinancialAccount[]>("/financial-accounts?active=true"),
  getApplications: () => request<InvestmentApplication[]>("/investments"),
};
