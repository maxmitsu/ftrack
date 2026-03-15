import { useMutation, useQuery, type QueryKey, type UseMutationOptions, type UseMutationResult, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import type {
  Account,
  Budget,
  Category,
  CreateAccountInput,
  CreateBudgetInput,
  CreateGoalInput,
  CreateRecurringInput,
  CreateTransactionInput,
  Goal,
  RecurringPayment,
  Transaction,
} from "./generated/api.schemas";

export * from "./generated/api.schemas";

export interface CreateCategoryInput {
  name: string;
  icon?: string | null;
  color?: string | null;
}

const STORAGE_KEY = "fintrack_state_v1";
const DRIVE_FILE_ID_KEY = "fintrack_drive_file_id";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FILE_NAME = "fintrack-data.json";
const DRIVE_MIME_TYPE = "application/json";

declare global {
  interface Window {
    google?: any;
  }
}

type FinState = {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  goals: Goal[];
  recurring: RecurringPayment[];
  categories: Category[];
  counters: Record<string, number>;
  updatedAt: string;
};

type CloudStatus = {
  connected: boolean;
  hasFile: boolean;
  fileId: string | null;
};

type MutationOptions<TData, TVariables, TError = Error, TContext = unknown> = {
  mutation?: UseMutationOptions<TData, TError, TVariables, TContext>;
};

const DEFAULT_CATEGORIES = [
  "Comida",
  "Transporte",
  "Casa",
  "Salud",
  "Entretenimiento",
  "Servicios",
  "Salario",
  "Ahorro",
].map((name, index) => ({
  id: index + 1,
  name,
  icon: null,
  color: null,
} satisfies Category));

function defaultState(): FinState {
  return {
    transactions: [],
    budgets: [],
    accounts: [],
    goals: [],
    recurring: [],
    categories: DEFAULT_CATEGORIES,
    counters: {
      transaction: 1,
      budget: 1,
      account: 1,
      goal: 1,
      recurring: 1,
      category: DEFAULT_CATEGORIES.length + 1,
    },
    updatedAt: new Date().toISOString(),
  };
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readState(): FinState {
  if (!isBrowser()) return defaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = defaultState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<FinState>;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : base.categories,
      counters: { ...base.counters, ...parsed.counters },
      transactions: parsed.transactions ?? [],
      budgets: parsed.budgets ?? [],
      accounts: parsed.accounts ?? [],
      goals: parsed.goals ?? [],
      recurring: parsed.recurring ?? [],
      updatedAt: parsed.updatedAt ?? base.updatedAt,
    };
  } catch {
    return defaultState();
  }
}

function writeState(next: FinState) {
  if (!isBrowser()) return;
  const state = { ...next, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateState<T>(updater: (state: FinState) => T): T {
  const current = readState();
  const cloned = structuredClone(current);
  const result = updater(cloned);
  writeState(cloned);
  return result;
}

function nextId(state: FinState, key: keyof FinState["counters"]) {
  const value = state.counters[key] ?? 1;
  state.counters[key] = value + 1;
  return value;
}

function adjustAccountBalance(state: FinState, accountId: number | null | undefined, delta: number) {
  if (accountId == null) return;
  const account = state.accounts.find((entry) => entry.id === accountId);
  if (account) account.bal += delta;
}

function transactionSignedAmount(input: { amount: number; type: string }) {
  return input.type === "ingreso" ? Math.abs(input.amount) : -Math.abs(input.amount);
}

export const getListTransactionsQueryKey = () => ["transactions"] as const;
export const getListBudgetsQueryKey = () => ["budgets"] as const;
export const getListAccountsQueryKey = () => ["accounts"] as const;
export const getListGoalsQueryKey = () => ["goals"] as const;
export const getListRecurringQueryKey = () => ["recurring"] as const;
export const getListCategoriesQueryKey = () => ["categories"] as const;

function queryHook<TData>(queryKey: QueryKey, getter: () => TData, options?: { query?: UseQueryOptions<TData, Error, TData> }) {
  const query = useQuery({
    queryKey,
    queryFn: async () => getter(),
    ...options?.query,
  }) as UseQueryResult<TData, Error> & { queryKey: QueryKey };

  return { ...query, queryKey };
}

function mutationHook<TData, TVariables>(mutationFn: (variables: TVariables) => TData | Promise<TData>, options?: MutationOptions<TData, TVariables>) {
  return useMutation({
    mutationFn,
    ...(options?.mutation ?? {}),
  }) as UseMutationResult<TData, Error, TVariables>;
}

export function useListTransactions<TData = Transaction[]>(options?: { query?: UseQueryOptions<Transaction[], Error, TData> }): UseQueryResult<TData, Error> & { queryKey: QueryKey } {
  return queryHook(getListTransactionsQueryKey(), () => readState().transactions.sort((a, b) => b.date.localeCompare(a.date)), options as any) as any;
}

export function useCreateTransaction(options?: MutationOptions<Transaction, { data: CreateTransactionInput }>) {
  return mutationHook(({ data }) => updateState((state) => {
    const transaction: Transaction = {
      id: nextId(state, "transaction"),
      name: data.name,
      cat: data.cat,
      amount: Math.abs(data.amount),
      type: data.type,
      date: data.date,
      accountId: data.accountId ?? null,
      createdAt: new Date().toISOString(),
    };
    state.transactions.unshift(transaction);
    adjustAccountBalance(state, transaction.accountId, transactionSignedAmount(transaction));
    return transaction;
  }), options);
}

export function useDeleteTransaction(options?: MutationOptions<{ success: true }, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    const index = state.transactions.findIndex((item) => item.id === id);
    if (index >= 0) {
      const [removed] = state.transactions.splice(index, 1);
      adjustAccountBalance(state, removed.accountId, -transactionSignedAmount(removed));
    }
    return { success: true as const };
  }), options);
}

export function useListBudgets<TData = Budget[]>(options?: { query?: UseQueryOptions<Budget[], Error, TData> }): UseQueryResult<TData, Error> & { queryKey: QueryKey } {
  return queryHook(getListBudgetsQueryKey(), () => readState().budgets, options as any) as any;
}

export function useCreateBudget(options?: MutationOptions<Budget, { data: CreateBudgetInput }>) {
  return mutationHook(({ data }) => updateState((state) => {
    const budget: Budget = {
      id: nextId(state, "budget"),
      cat: data.cat,
      limit: data.limit,
      color: data.color ?? "#6366f1",
    };
    state.budgets.push(budget);
    return budget;
  }), options);
}

export function useDeleteBudget(options?: MutationOptions<{ success: true }, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    state.budgets = state.budgets.filter((item) => item.id !== id);
    return { success: true as const };
  }), options);
}

export function useListAccounts<TData = Account[]>(options?: { query?: UseQueryOptions<Account[], Error, TData> }): UseQueryResult<TData, Error> & { queryKey: QueryKey } {
  return queryHook(getListAccountsQueryKey(), () => readState().accounts, options as any) as any;
}

export function useCreateAccount(options?: MutationOptions<Account, { data: CreateAccountInput }>) {
  return mutationHook(({ data }) => updateState((state) => {
    const account: Account = {
      id: nextId(state, "account"),
      name: data.name,
      bank: data.bank ?? "",
      bal: data.bal,
      color: ["#6366f1", "#14b8a6", "#f59e0b", "#ec4899"][state.accounts.length % 4],
    };
    state.accounts.push(account);
    return account;
  }), options);
}

export function useDeleteAccount(options?: MutationOptions<{ success: true }, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    state.accounts = state.accounts.filter((item) => item.id !== id);
    state.transactions = state.transactions.map((item) => item.accountId === id ? { ...item, accountId: null } : item);
    state.recurring = state.recurring.map((item) => item.accountId === id ? { ...item, accountId: null } : item);
    return { success: true as const };
  }), options);
}

export function useListGoals<TData = Goal[]>(options?: { query?: UseQueryOptions<Goal[], Error, TData> }): UseQueryResult<TData, Error> & { queryKey: QueryKey } {
  return queryHook(getListGoalsQueryKey(), () => readState().goals, options as any) as any;
}

export function useCreateGoal(options?: MutationOptions<Goal, { data: CreateGoalInput }>) {
  return mutationHook(({ data }) => updateState((state) => {
    const goal: Goal = {
      id: nextId(state, "goal"),
      name: data.name,
      saved: data.saved ?? 0,
      target: data.target,
      color: data.color ?? "#6366f1",
    };
    state.goals.push(goal);
    return goal;
  }), options);
}

export function useUpdateGoal(options?: MutationOptions<Goal, { id: number; data: CreateGoalInput }>) {
  return mutationHook(({ id, data }) => updateState((state) => {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) throw new Error("Meta no encontrada");
    goal.name = data.name;
    goal.target = data.target;
    goal.saved = data.saved ?? goal.saved;
    goal.color = data.color ?? goal.color;
    return goal;
  }), options);
}

export function useDeleteGoal(options?: MutationOptions<{ success: true }, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    state.goals = state.goals.filter((item) => item.id !== id);
    return { success: true as const };
  }), options);
}

export function useListRecurring<TData = RecurringPayment[]>(options?: { query?: UseQueryOptions<RecurringPayment[], Error, TData> }): UseQueryResult<TData, Error> & { queryKey: QueryKey } {
  return queryHook(getListRecurringQueryKey(), () => readState().recurring, options as any) as any;
}

export function useCreateRecurring(options?: MutationOptions<RecurringPayment, { data: CreateRecurringInput }>) {
  return mutationHook(({ data }) => updateState((state) => {
    const recurring: RecurringPayment = {
      id: nextId(state, "recurring"),
      name: data.name,
      amount: data.amount,
      dayOfMonth: data.dayOfMonth,
      accountId: data.accountId ?? null,
    };
    state.recurring.push(recurring);
    return recurring;
  }), options);
}

export function useDeleteRecurring(options?: MutationOptions<{ success: true }, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    state.recurring = state.recurring.filter((item) => item.id !== id);
    return { success: true as const };
  }), options);
}

export function usePayRecurring(options?: MutationOptions<Transaction, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    const recurring = state.recurring.find((item) => item.id === id);
    if (!recurring) throw new Error("Pago fijo no encontrado");
    const today = new Date().toISOString().slice(0, 10);
    const transaction: Transaction = {
      id: nextId(state, "transaction"),
      name: recurring.name,
      cat: "Servicios",
      amount: Math.abs(recurring.amount),
      type: "gasto",
      date: today,
      accountId: recurring.accountId ?? null,
      createdAt: new Date().toISOString(),
    };
    state.transactions.unshift(transaction);
    adjustAccountBalance(state, transaction.accountId, -Math.abs(transaction.amount));
    return transaction;
  }), options);
}

export function useListCategories<TData = Category[]>(options?: { query?: UseQueryOptions<Category[], Error, TData> }): UseQueryResult<TData, Error> & { queryKey: QueryKey } {
  return queryHook(getListCategoriesQueryKey(), () => readState().categories, options as any) as any;
}

export function useCreateCategory(options?: MutationOptions<Category, { data: CreateCategoryInput }>) {
  return mutationHook(({ data }) => updateState((state) => {
    const category: Category = {
      id: nextId(state, "category"),
      name: data.name,
      icon: data.icon ?? null,
      color: data.color ?? null,
    };
    state.categories.push(category);
    return category;
  }), options);
}

export function useDeleteCategory(options?: MutationOptions<{ success: true }, { id: number }>) {
  return mutationHook(({ id }) => updateState((state) => {
    state.categories = state.categories.filter((item) => item.id !== id);
    return { success: true as const };
  }), options);
}

function ensureGoogleClient() {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Falta VITE_GOOGLE_CLIENT_ID en el proyecto");
  if (!window.google?.accounts?.oauth2) throw new Error("Google Identity Services no cargó todavía");
  return clientId;
}

let accessToken: string | null = null;
let tokenClient: any = null;

export function initGoogleDriveAuth() {
  const clientId = ensureGoogleClient();
  if (tokenClient) return;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: (response: { access_token?: string }) => {
      if (response.access_token) accessToken = response.access_token;
    },
  });
}

export async function loginWithGoogleDrive() {
  initGoogleDriveAuth();
  await new Promise<void>((resolve, reject) => {
    tokenClient.callback = (response: { access_token?: string; error?: string }) => {
      if (response?.access_token) {
        accessToken = response.access_token;
        resolve();
      } else {
        reject(new Error(response?.error || "No se pudo iniciar sesión con Google"));
      }
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

function getDriveFileId() {
  return isBrowser() ? localStorage.getItem(DRIVE_FILE_ID_KEY) : null;
}

function setDriveFileId(fileId: string) {
  if (isBrowser()) localStorage.setItem(DRIVE_FILE_ID_KEY, fileId);
}

function authHeaders(extra: Record<string, string> = {}) {
  if (!accessToken) throw new Error("Primero inicia sesión con Google Drive");
  return { Authorization: `Bearer ${accessToken}`, ...extra };
}

async function findDriveFile() {
  const query = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("No se pudo buscar el archivo en Google Drive");
  const data = await response.json();
  return data.files?.[0]?.id ?? null;
}

async function createDriveFile() {
  const state = readState();
  const metadata = { name: DRIVE_FILE_NAME, mimeType: DRIVE_MIME_TYPE };
  const boundary = "fintrack_boundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${DRIVE_MIME_TYPE}\r\n\r\n${JSON.stringify(state)}\r\n` +
    `--${boundary}--`;

  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: authHeaders({ "Content-Type": `multipart/related; boundary=${boundary}` }),
    body,
  });
  if (!response.ok) throw new Error("No se pudo crear el archivo en Google Drive");
  const data = await response.json();
  return data.id as string;
}

async function ensureDriveFile() {
  const existing = getDriveFileId() || (await findDriveFile());
  if (existing) {
    setDriveFileId(existing);
    return existing;
  }
  const created = await createDriveFile();
  setDriveFileId(created);
  return created;
}

export async function syncStateToGoogleDrive() {
  await loginWithGoogleDrive();
  const fileId = await ensureDriveFile();
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": DRIVE_MIME_TYPE }),
    body: JSON.stringify(readState()),
  });
  if (!response.ok) throw new Error("No se pudieron guardar los datos en Google Drive");
  return fileId;
}

export async function syncStateFromGoogleDrive() {
  await loginWithGoogleDrive();
  const fileId = await ensureDriveFile();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("No se pudieron leer los datos desde Google Drive");
  const remote = (await response.json()) as FinState;
  writeState({ ...defaultState(), ...remote, counters: { ...defaultState().counters, ...(remote.counters ?? {}) } });
  return fileId;
}

export function getGoogleDriveStatus(): CloudStatus {
  return {
    connected: !!accessToken,
    hasFile: !!getDriveFileId(),
    fileId: getDriveFileId(),
  };
}

export function exportLocalState() {
  return readState();
}
