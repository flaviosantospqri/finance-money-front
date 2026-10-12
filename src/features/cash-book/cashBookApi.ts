export type AccountType = "checking" | "payment" | "cash" | "investment";
export type CategoryNature = "income" | "expense";
export type CashBookType =
  "income" | "expense" | "transfer_debit" | "transfer_credit";

export type FinancialAccount = {
  id: string;
  name: string;
  type: AccountType;
  institution?: string | null;
  openingBalance: string;
  referenceDate: string;
  active: boolean;
};

export type FinancialCategory = {
  id: string;
  name: string;
  nature: CategoryNature;
  active: boolean;
  destinationId: string;
  destinationName: string;
  parentCategoryId?: string | null;
  parentCategoryName?: string | null;
};

export type CashBookEntry = {
  id: string;
  transferId: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  destinationName?: string | null;
  type: CashBookType;
  occurredAt: string;
  description: string;
  amount: string;
  balance?: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  sourceAccountId?: string | null;
  sourceAccountName?: string | null;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  sourceApplicationId?: string | null;
  destinationApplicationId?: string | null;
};

export type CashBookSummary = {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  openingBalance: string;
  incomeTotal: string;
  expenseTotal: string;
  netMovement: string;
  closingBalance: string;
  month: string;
  referenceDate: string;
};

export type CashBookPageResult = {
  entries: CashBookEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  period: { month: string; fromDate: string; toDate: string };
};

type ApiErrorResponse = { message?: string | string[] };

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(
  /\/$/,
  "",
);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    let message = `Falha na comunicação com o servidor (${response.status}).`;
    try {
      const payload = (await response.json()) as ApiErrorResponse;
      if (Array.isArray(payload.message)) message = payload.message.join(" ");
      else if (payload.message) message = payload.message;
    } catch {
      // Keep the HTTP status message when the response body isn't JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export const cashBookApi = {
  getAccounts: () =>
    request<FinancialAccount[]>("/financial-accounts?active=true"),
  getAllAccounts: () => request<FinancialAccount[]>("/financial-accounts"),
  createAccount: (input: {
    name: string;
    type: AccountType;
    institution?: string;
    openingBalance: string;
    referenceDate: string;
  }) =>
    request<FinancialAccount>("/financial-accounts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateAccount: (id: string, input: Partial<{
    name: string;
    type: AccountType;
    institution: string | null;
    openingBalance: string;
    referenceDate: string;
    active: boolean;
  }>) => request<FinancialAccount>(`/financial-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  }),
  getCategories: () =>
    request<FinancialCategory[]>("/financial-categories?active=true"),
  getAllCategories: () =>
    request<FinancialCategory[]>("/financial-categories"),
  getDestinations: () =>
    request<{ id: string; name: string; active: boolean }[]>("/financial-forecasts/destinations"),
  createCategory: (input: { name: string; nature: CategoryNature; destinationId?: string; parentCategoryId?: string }) =>
    request<FinancialCategory>("/financial-categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateCategory: (id: string, input: { destinationId?: string; parentCategoryId?: string | null; name?: string; active?: boolean }) =>
    request<FinancialCategory>(`/financial-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  getEntries: (filters: {
    accountId: string;
    month: string;
    page: number;
    pageSize: number;
    type?: string;
    categoryId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }) => request<CashBookPageResult>(`/cash-book?${queryString(filters)}`),
  reorderEntries: (input: { accountId: string; month: string; page: number; pageSize: number; orderedEntryIds: string[] }) =>
    request<{ reordered: boolean }>('/cash-book/order', { method: 'PATCH', body: JSON.stringify(input) }),
  getSummary: (accountId: string, month: string) =>
    request<CashBookSummary>(
      `/cash-book/summary?${queryString({ accountId, month })}`,
    ),
  createEntry: (input: {
    type: "income" | "expense";
    occurredAt: string;
    description: string;
    amount: string;
    accountId: string;
    categoryId: string;
    notes?: string;
  }) =>
    request<CashBookEntry>("/cash-book", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateEntry: (id: string, input: Record<string, unknown>) =>
    request<CashBookEntry>(`/cash-book/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteEntry: (id: string) =>
    request<{ deleted: boolean }>(`/cash-book/${id}`, { method: "DELETE" }),
  createTransfer: (input: {
    occurredAt: string;
    description: string;
    amount: string;
    sourceAccountId: string;
    destinationAccountId: string;
    sourceApplicationId?: string | null;
    destinationApplicationId?: string | null;
    notes?: string;
  }) => request("/transfers", { method: "POST", body: JSON.stringify(input) }),
  updateTransfer: (id: string, input: Record<string, unknown>) =>
    request(`/transfers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteTransfer: (id: string) =>
    request<{ deleted: boolean }>(`/transfers/${id}`, { method: "DELETE" }),
};
