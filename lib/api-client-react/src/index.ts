import { useMutation, useQuery, type QueryKey, type UseMutationOptions, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
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
  HealthStatus,
  RecurringPayment,
  Transaction,
} from "./generated/api.schemas";

export * from "./generated/api.schemas";

export interface CreateCategoryInput {
  name: string;
  icon?: string | null;
  color?: string | null;
}

export type ErrorType<T = unknown> = Error & { data?: T };
export type BodyType<T> = T;

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<T> = T extends AwaitedInput<infer U> ? U : never;
type QueryOptions<TFn extends (...args: any[]) => Promise<any>, TData = Awaited<ReturnType<TFn>>, TError = ErrorType<unknown>> = {
  query?: UseQueryOptions<Awaited<ReturnType<TFn>>, TError, TData>;
};
type MutationOptions<TFn extends (...args: any[]) => Promise<any>, TVariables, TError = ErrorType<unknown>, TContext = unknown> = {
  mutation?: UseMutationOptions<Awaited<ReturnType<TFn>>, TError, TVariables, TContext>;
};

type FintrackData = {
  version: 1;
  updatedAt: string;
  nextIds: {
    transactions: number;
    budgets: number;
    accounts: number;
    goals: number;
    recurring: number;
    categories: number;
  };
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  goals: Goal[];
  recurring: RecurringPayment[];
  categories: Category[];
};

type DriveStatus = {
  configured: boolean;
  signedIn: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  email: string | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

const STORAGE_KEY = "fintrack.data.v1";
const DRIVE_FILE_NAME = "fintrack-data.json";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
const DEFAULT_CATEGORY_NAMES = [
  "Comida",
  "Transporte",
  "Salud",
  "Casa",
  "Entretenimiento",
  "Ahorro",
  "Pago fijo",
  "Otros",
];
const GOAL_COLORS = ["#1D9E75", "#378ADD", "#D85A30", "#BA7517", "#D4537E", "#888780", "#7F77DD", "#E24B4A"];
const BUDGET_COLORS = ["#1D9E75", "#378ADD", "#D85A30", "#BA7517", "#D4537E", "#888780", "#7F77DD", "#E24B4A"];

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function buildDefaultData(): FintrackData {
  const categories: Category[] = DEFAULT_CATEGORY_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    icon: null,
    color: null,
  }));

  return {
    version: 1,
    updatedAt: nowIso(),
    nextIds: {
      transactions: 1,
      budgets: 1,
      accounts: 1,
      goals: 1,
      recurring: 1,
      categories: categories.length + 1,
    },
    transactions: [],
    budgets: [],
    accounts: [],
    goals: [],
    recurring: [],
    categories,
  };
}

function normalizeData(input: Partial<FintrackData> | null | undefined): FintrackData {
  const base = buildDefaultData();
  const merged: FintrackData = {
    ...base,
    ...input,
    nextIds: {
      ...base.nextIds,
      ...(input?.nextIds ?? {}),
    },
    transactions: (input?.transactions ?? []).map((item) => ({ ...item, amount: Number(item.amount), accountId: item.accountId ?? null })),
    budgets: (input?.budgets ?? []).map((item) => ({ ...item, limit: Number(item.limit) })),
    accounts: (input?.accounts ?? []).map((item) => ({ ...item, bal: Number(item.bal) })),
    goals: (input?.goals ?? []).map((item) => ({ ...item, saved: Number(item.saved), target: Number(item.target) })),
    recurring: (input?.recurring ?? []).map((item) => ({ ...item, amount: Number(item.amount), accountId: item.accountId ?? null })),
    categories: input?.categories?.length ? input.categories : base.categories,
    updatedAt: input?.updatedAt ?? base.updatedAt,
  };

  merged.nextIds.transactions = Math.max(merged.nextIds.transactions, ...merged.transactions.map((x) => x.id + 1), 1);
  merged.nextIds.budgets = Math.max(merged.nextIds.budgets, ...merged.budgets.map((x) => x.id + 1), 1);
  merged.nextIds.accounts = Math.max(merged.nextIds.accounts, ...merged.accounts.map((x) => x.id + 1), 1);
  merged.nextIds.goals = Math.max(merged.nextIds.goals, ...merged.goals.map((x) => x.id + 1), 1);
  merged.nextIds.recurring = Math.max(merged.nextIds.recurring, ...merged.recurring.map((x) => x.id + 1), 1);
  merged.nextIds.categories = Math.max(merged.nextIds.categories, ...merged.categories.map((x) => x.id + 1), 1);

  return merged;
}

function readLocalData(): FintrackData {
  if (typeof window === "undefined") return buildDefaultData();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = buildDefaultData();
    writeLocalData(initial);
    return initial;
  }

  try {
    return normalizeData(JSON.parse(raw));
  } catch {
    const initial = buildDefaultData();
    writeLocalData(initial);
    return initial;
  }
}

function writeLocalData(data: FintrackData): void {
  if (typeof window === "undefined") return;
  const next = normalizeData({ ...data, updatedAt: nowIso() });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

const driveState: DriveStatus = {
  configured: Boolean(GOOGLE_CLIENT_ID),
  signedIn: false,
  syncing: false,
  lastSyncedAt: null,
  error: null,
  email: null,
};

let googleToken: string | null = null;
let driveFileId: string | null = null;
let gisScriptPromise: Promise<void> | null = null;
const driveListeners = new Set<() => void>();

function emitDriveStatus(): void {
  driveListeners.forEach((listener) => listener());
}

function setDriveState(patch: Partial<DriveStatus>): void {
  Object.assign(driveState, patch);
  emitDriveStatus();
}

function subscribeDriveStatus(listener: () => void): () => void {
  driveListeners.add(listener);
  return () => driveListeners.delete(listener);
}

function getDriveStatusSnapshot(): DriveStatus {
  return { ...driveState };
}

async function loadGoogleIdentityServices(): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Falta VITE_GOOGLE_CLIENT_ID. Configúralo antes de conectar Google Drive.");
  }
  if (typeof window === "undefined") {
    throw new Error("Google Drive solo está disponible en el navegador.");
  }
  if (window.google?.accounts?.oauth2) return;
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-fintrack-gis="true"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Identity Services.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.fintrackGis = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
      document.head.appendChild(script);
    });
  }
  await gisScriptPromise;
}

async function requestGoogleAccessToken(prompt: "consent" | "" = "consent"): Promise<string> {
  await loadGoogleIdentityServices();
  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response: { access_token?: string; error?: string; error_description?: string }) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error("Google no devolvió un token de acceso."));
          return;
        }
        googleToken = response.access_token;
        setDriveState({ signedIn: true, error: null });
        resolve(response.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt });
  });
}

async function driveRequest<T>(input: string, init: RequestInit = {}): Promise<T> {
  const token = googleToken ?? (await requestGoogleAccessToken("")).catch(() => requestGoogleAccessToken("consent"));
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      googleToken = null;
      setDriveState({ signedIn: false });
    }
    throw new Error(`Google Drive devolvió ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function resolveDriveFileId(): Promise<string | null> {
  if (driveFileId) return driveFileId;
  const query = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name,modifiedTime)`;
  const result = await driveRequest<{ files?: Array<{ id: string }> }>(url, { method: "GET" });
  driveFileId = result.files?.[0]?.id ?? null;
  return driveFileId;
}

async function uploadDriveData(data: FintrackData): Promise<void> {
  const payload = JSON.stringify(normalizeData(data));
  const fileId = await resolveDriveFileId();

  if (fileId) {
    await driveRequest<void>(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });
    return;
  }

  const boundary = `fintrack-${Math.random().toString(36).slice(2)}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({ name: DRIVE_FILE_NAME, parents: ["appDataFolder"] }),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    payload,
    `--${boundary}--`,
  ].join("\r\n");

  const created = await driveRequest<{ id: string }>("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  driveFileId = created.id;
}

async function downloadDriveData(): Promise<FintrackData | null> {
  const fileId = await resolveDriveFileId();
  if (!fileId) return null;
  const token = googleToken ?? (await requestGoogleAccessToken(""));
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo descargar fintrack-data.json (${response.status}).`);
  }
  return normalizeData(await response.json());
}

async function syncToDrive(): Promise<DriveStatus> {
  setDriveState({ syncing: true, error: null });
  try {
    await requestGoogleAccessToken(googleToken ? "" : "consent");
    const localData = readLocalData();
    await uploadDriveData(localData);
    const status = { lastSyncedAt: nowIso(), syncing: false, signedIn: true, error: null };
    setDriveState(status);
    return getDriveStatusSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar con Google Drive.";
    setDriveState({ syncing: false, error: message });
    throw error;
  }
}

async function connectToDrive(): Promise<DriveStatus> {
  setDriveState({ syncing: true, error: null });
  try {
    await requestGoogleAccessToken(googleToken ? "" : "consent");
    const remote = await downloadDriveData();
    if (remote) {
      writeLocalData(remote);
    } else {
      await uploadDriveData(readLocalData());
    }
    setDriveState({ syncing: false, signedIn: true, lastSyncedAt: nowIso(), error: null });
    return getDriveStatusSnapshot();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar Google Drive.";
    setDriveState({ syncing: false, error: message });
    throw error;
  }
}

function disconnectFromDrive(): DriveStatus {
  googleToken = null;
  driveFileId = null;
  setDriveState({ signedIn: false, syncing: false, error: null, email: null });
  return getDriveStatusSnapshot();
}

async function persistMutation<T>(mutator: (draft: FintrackData) => T | Promise<T>): Promise<T> {
  const draft = readLocalData();
  const result = await mutator(draft);
  writeLocalData(draft);
  if (driveState.signedIn) {
    try {
      await uploadDriveData(draft);
      setDriveState({ lastSyncedAt: nowIso(), error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo subir el cambio a Google Drive.";
      setDriveState({ error: message });
    }
  }
  return clone(result);
}

function getHealthCheckUrl() { return "/api/healthz" as const; }
function getListTransactionsUrl() { return "/api/transactions" as const; }
function getListBudgetsUrl() { return "/api/budgets" as const; }
function getListAccountsUrl() { return "/api/accounts" as const; }
function getListGoalsUrl() { return "/api/goals" as const; }
function getListRecurringUrl() { return "/api/recurring" as const; }
function getListCategoriesUrl() { return "/api/categories" as const; }

export { getHealthCheckUrl, getListTransactionsUrl, getListBudgetsUrl, getListAccountsUrl, getListGoalsUrl, getListRecurringUrl, getListCategoriesUrl };

export const getHealthCheckQueryKey = () => ["/api/healthz"] as const;
export const getListTransactionsQueryKey = () => ["/api/transactions"] as const;
export const getListBudgetsQueryKey = () => ["/api/budgets"] as const;
export const getListAccountsQueryKey = () => ["/api/accounts"] as const;
export const getListGoalsQueryKey = () => ["/api/goals"] as const;
export const getListRecurringQueryKey = () => ["/api/recurring"] as const;
export const getListCategoriesQueryKey = () => ["/api/categories"] as const;

export async function healthCheck(): Promise<HealthStatus> {
  return { status: "ok" };
}
export async function listTransactions(): Promise<Transaction[]> { return clone(readLocalData().transactions); }
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return persistMutation((draft) => {
    const amount = Number(input.amount);
    const tx: Transaction = {
      id: draft.nextIds.transactions++,
      name: input.name,
      cat: input.cat,
      amount,
      type: input.type,
      date: input.date,
      accountId: input.accountId ?? null,
      createdAt: nowIso(),
    };
    draft.transactions.push(tx);
    if (tx.accountId) {
      const account = draft.accounts.find((item) => item.id === tx.accountId);
      if (account) account.bal += amount;
    }
    return tx;
  });
}
export async function deleteTransaction(id: number): Promise<void> {
  return persistMutation((draft) => {
    draft.transactions = draft.transactions.filter((item) => item.id !== id);
  });
}

export async function listBudgets(): Promise<Budget[]> { return clone(readLocalData().budgets); }
export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  return persistMutation((draft) => {
    const budget: Budget = {
      id: draft.nextIds.budgets++,
      cat: input.cat,
      limit: Number(input.limit),
      color: input.color || BUDGET_COLORS[(draft.budgets.length) % BUDGET_COLORS.length],
    };
    draft.budgets.push(budget);
    return budget;
  });
}
export async function deleteBudget(id: number): Promise<void> {
  return persistMutation((draft) => { draft.budgets = draft.budgets.filter((item) => item.id !== id); });
}

export async function listAccounts(): Promise<Account[]> { return clone(readLocalData().accounts); }
export async function createAccount(input: CreateAccountInput): Promise<Account> {
  return persistMutation((draft) => {
    const account: Account = {
      id: draft.nextIds.accounts++,
      name: input.name,
      bank: input.bank ?? "",
      bal: Number(input.bal),
      color: "#E6F1FB",
    };
    draft.accounts.push(account);
    return account;
  });
}
export async function deleteAccount(id: number): Promise<void> {
  return persistMutation((draft) => { draft.accounts = draft.accounts.filter((item) => item.id !== id); });
}

export async function listGoals(): Promise<Goal[]> { return clone(readLocalData().goals); }
export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  return persistMutation((draft) => {
    const goal: Goal = {
      id: draft.nextIds.goals++,
      name: input.name,
      saved: Number(input.saved ?? 0),
      target: Number(input.target),
      color: input.color || GOAL_COLORS[(draft.goals.length) % GOAL_COLORS.length],
    };
    draft.goals.push(goal);
    return goal;
  });
}
export async function updateGoal(id: number, input: CreateGoalInput): Promise<Goal> {
  return persistMutation((draft) => {
    const goal = draft.goals.find((item) => item.id === id);
    if (!goal) throw new Error("Meta no encontrada.");
    goal.name = input.name;
    goal.saved = Number(input.saved ?? 0);
    goal.target = Number(input.target);
    if (input.color) goal.color = input.color;
    return goal;
  });
}
export async function deleteGoal(id: number): Promise<void> {
  return persistMutation((draft) => { draft.goals = draft.goals.filter((item) => item.id !== id); });
}

export async function listRecurring(): Promise<RecurringPayment[]> { return clone(readLocalData().recurring); }
export async function createRecurring(input: CreateRecurringInput): Promise<RecurringPayment> {
  return persistMutation((draft) => {
    const recurring: RecurringPayment = {
      id: draft.nextIds.recurring++,
      name: input.name,
      amount: Number(input.amount),
      dayOfMonth: Number(input.dayOfMonth),
      accountId: input.accountId ?? null,
    };
    draft.recurring.push(recurring);
    return recurring;
  });
}
export async function deleteRecurring(id: number): Promise<void> {
  return persistMutation((draft) => { draft.recurring = draft.recurring.filter((item) => item.id !== id); });
}
export async function payRecurring(id: number): Promise<Transaction> {
  return persistMutation((draft) => {
    const recurring = draft.recurring.find((item) => item.id === id);
    if (!recurring) throw new Error("Pago recurrente no encontrado.");
    const tx: Transaction = {
      id: draft.nextIds.transactions++,
      name: recurring.name,
      cat: "Pago fijo",
      amount: -Math.abs(Number(recurring.amount)),
      type: "gasto",
      date: new Date().toISOString().split("T")[0],
      accountId: recurring.accountId ?? null,
      createdAt: nowIso(),
    };
    draft.transactions.push(tx);
    if (tx.accountId) {
      const account = draft.accounts.find((item) => item.id === tx.accountId);
      if (account) account.bal -= Math.abs(Number(recurring.amount));
    }
    return tx;
  });
}

export async function listCategories(): Promise<Category[]> { return clone(readLocalData().categories); }
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return persistMutation((draft) => {
    const category: Category = {
      id: draft.nextIds.categories++,
      name: input.name,
      icon: input.icon ?? null,
      color: input.color ?? null,
    };
    draft.categories.push(category);
    return category;
  });
}
export async function deleteCategory(id: number): Promise<void> {
  return persistMutation((draft) => { draft.categories = draft.categories.filter((item) => item.id !== id); });
}

function buildQueryHook<TData>(queryKey: readonly string[], queryFn: () => Promise<TData>, options?: { query?: UseQueryOptions<TData, ErrorType<unknown>, TData> }) {
  const queryOptions = { queryKey, queryFn, ...(options?.query ?? {}) } as UseQueryOptions<TData, ErrorType<unknown>, TData> & { queryKey: QueryKey };
  const query = useQuery(queryOptions) as UseQueryResult<TData, ErrorType<unknown>> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

export function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof healthCheck, TData, TError>) {
  return buildQueryHook(getHealthCheckQueryKey(), healthCheck as any, options as any);
}
export function useListTransactions<TData = Awaited<ReturnType<typeof listTransactions>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof listTransactions, TData, TError>) {
  return buildQueryHook(getListTransactionsQueryKey(), listTransactions as any, options as any);
}
export function useListBudgets<TData = Awaited<ReturnType<typeof listBudgets>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof listBudgets, TData, TError>) {
  return buildQueryHook(getListBudgetsQueryKey(), listBudgets as any, options as any);
}
export function useListAccounts<TData = Awaited<ReturnType<typeof listAccounts>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof listAccounts, TData, TError>) {
  return buildQueryHook(getListAccountsQueryKey(), listAccounts as any, options as any);
}
export function useListGoals<TData = Awaited<ReturnType<typeof listGoals>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof listGoals, TData, TError>) {
  return buildQueryHook(getListGoalsQueryKey(), listGoals as any, options as any);
}
export function useListRecurring<TData = Awaited<ReturnType<typeof listRecurring>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof listRecurring, TData, TError>) {
  return buildQueryHook(getListRecurringQueryKey(), listRecurring as any, options as any);
}
export function useListCategories<TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: QueryOptions<typeof listCategories, TData, TError>) {
  return buildQueryHook(getListCategoriesQueryKey(), listCategories as any, options as any);
}

function buildMutationHook<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>, options?: { mutation?: UseMutationOptions<TData, ErrorType<unknown>, TVariables, unknown> }) {
  return useMutation<TData, ErrorType<unknown>, TVariables, unknown>({
    mutationFn,
    ...(options?.mutation ?? {}),
  });
}

export function useCreateTransaction<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof createTransaction, { data: BodyType<CreateTransactionInput> }, TError, TContext>) {
  return buildMutationHook((variables) => createTransaction(variables.data), options as any);
}
export function useDeleteTransaction<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof deleteTransaction, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => deleteTransaction(variables.id), options as any);
}
export function useCreateBudget<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof createBudget, { data: BodyType<CreateBudgetInput> }, TError, TContext>) {
  return buildMutationHook((variables) => createBudget(variables.data), options as any);
}
export function useDeleteBudget<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof deleteBudget, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => deleteBudget(variables.id), options as any);
}
export function useCreateAccount<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof createAccount, { data: BodyType<CreateAccountInput> }, TError, TContext>) {
  return buildMutationHook((variables) => createAccount(variables.data), options as any);
}
export function useDeleteAccount<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof deleteAccount, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => deleteAccount(variables.id), options as any);
}
export function useCreateGoal<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof createGoal, { data: BodyType<CreateGoalInput> }, TError, TContext>) {
  return buildMutationHook((variables) => createGoal(variables.data), options as any);
}
export function useUpdateGoal<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof updateGoal, { id: number; data: BodyType<CreateGoalInput> }, TError, TContext>) {
  return buildMutationHook((variables) => updateGoal(variables.id, variables.data), options as any);
}
export function useDeleteGoal<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof deleteGoal, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => deleteGoal(variables.id), options as any);
}
export function useCreateRecurring<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof createRecurring, { data: BodyType<CreateRecurringInput> }, TError, TContext>) {
  return buildMutationHook((variables) => createRecurring(variables.data), options as any);
}
export function useDeleteRecurring<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof deleteRecurring, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => deleteRecurring(variables.id), options as any);
}
export function usePayRecurring<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof payRecurring, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => payRecurring(variables.id), options as any);
}
export function useCreateCategory<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof createCategory, { data: BodyType<CreateCategoryInput> }, TError, TContext>) {
  return buildMutationHook((variables) => createCategory(variables.data), options as any);
}
export function useDeleteCategory<TError = ErrorType<unknown>, TContext = unknown>(options?: MutationOptions<typeof deleteCategory, { id: number }, TError, TContext>) {
  return buildMutationHook((variables) => deleteCategory(variables.id), options as any);
}

export function useDriveStatus() {
  const data = useSyncExternalStore(subscribeDriveStatus, getDriveStatusSnapshot, getDriveStatusSnapshot);
  return { data };
}

export async function connectGoogleDrive() { return connectToDrive(); }
export async function syncGoogleDrive() { return syncToDrive(); }
export function disconnectGoogleDrive() { return disconnectFromDrive(); }
export function getDriveConfiguration() {
  return {
    configured: Boolean(GOOGLE_CLIENT_ID),
    clientId: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    fileName: DRIVE_FILE_NAME,
  };
}

