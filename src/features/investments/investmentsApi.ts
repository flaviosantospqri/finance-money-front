import type { FinancialAccount } from "../cash-book/cashBookApi";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let message = `Falha na comunicação com o servidor (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      message = Array.isArray(body.message)
        ? body.message.join(" ")
        : (body.message ?? message);
    } catch {
      /* Keep the HTTP status message. */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
function query(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export type InvestmentApplication = {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  investmentType: string;
  institution: string | null;
  notes: string | null;
  active: boolean;
  balance?: string;
};
export type InvestmentMovement = {
  id: string;
  occurredAt: string;
  type: "contribution" | "withdrawal" | "income" | "adjustment";
  amount: string;
  origin: string | null;
  notes: string | null;
  balance: string;
  transferId: string | null;
};
export type InvestmentSummary = {
  investedBalance: string;
  contributions: string;
  withdrawals: string;
  income: string;
  month: string;
  asOf: string;
};
export type InvestmentApplicationInput = {
  name: string;
  accountId: string;
  investmentType: string;
  institution?: string;
  notes?: string;
};

export const investmentsApi = {
  getApplications: () => request<InvestmentApplication[]>("/investments"),
  getSummary: (month: string, accountId?: string, applicationId?: string) =>
    request<InvestmentSummary>(
      `/investments/summary?${query({ month, accountId, applicationId })}`,
    ),
  getMovements: (applicationId: string, month?: string) =>
    request<InvestmentMovement[]>(
      `/investments/${applicationId}/transactions${month ? `?month=${month}` : ""}`,
    ),
  createApplication: (input: InvestmentApplicationInput) =>
    request<InvestmentApplication>("/investments", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateApplication: (
    id: string,
    input: Partial<InvestmentApplicationInput> & { active?: boolean },
  ) =>
    request<InvestmentApplication>(`/investments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteApplication: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/investments/${id}`, {
      method: 'DELETE',
    }),
  createMovement: (
    id: string,
    input: {
      occurredAt: string;
      type: "contribution" | "withdrawal" | "income" | "adjustment";
      amount: string;
      origin?: string;
      notes?: string;
    },
  ) =>
    request(`/investments/${id}/transactions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMovement: (
    id: string,
    input: {
      occurredAt: string;
      type: "contribution" | "withdrawal" | "income" | "adjustment";
      amount: string;
      origin?: string;
      notes?: string;
    },
  ) =>
    request(`/investments/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteMovement: (id: string) =>
    request(`/investments/transactions/${id}`, { method: "DELETE" }),
};

export type { FinancialAccount };
