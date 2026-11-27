import type * as D from "@/types/domain";
import type {
  PosApiClient,
  CategoryInput,
  MenuItemInput,
  InventoryInput,
  BillInput,
  CheckoutInput,
  PurchaseInput,
  DailyEntryInput,
  AdjustmentInput,
  ExpenseInput,
} from "./types";
import { ApiError } from "@/types/api";
import { notifySessionExpired } from "./session";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  ignoreSessionExpiry?: boolean;
  skipRefresh?: boolean;
  response?: "blob";
  signal?: AbortSignal;
};

function csrfCookie() {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("XSRF-TOKEN="));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice("XSRF-TOKEN=".length));
  } catch {
    return null;
  }
}

function query(range?: D.ReportDateRange) {
  const p = new URLSearchParams();
  if (range?.from) p.set("from", range.from);
  if (range?.to) p.set("to", range.to);
  const s = p.toString();
  return s ? `?${s}` : "";
}

type WireBillDetail = D.BillDetail & { client_bill_id?: string | null };

function mapBillDetail(raw: WireBillDetail): D.BillDetail {
  if (!raw || typeof raw !== "object") return raw;
  const clientBillId = raw.clientBillId ?? raw.client_bill_id ?? undefined;
  if (clientBillId === undefined) return raw;
  return { ...raw, clientBillId };
}

function serializeCheckoutBody(input: CheckoutInput) {
  const { clientBillId, clientBillNumber, clientCreatedAt, ...rest } = input;
  return {
    ...rest,
    ...(clientBillId !== undefined ? { client_bill_id: clientBillId } : {}),
    ...(clientBillNumber !== undefined ? { client_bill_number: clientBillNumber } : {}),
    ...(clientCreatedAt !== undefined ? { client_created_at: clientCreatedAt } : {}),
  };
}

export class HttpPosApiClient implements PosApiClient {
  private refreshInFlight: Promise<boolean> | null = null;
  private csrfInFlight: Promise<string> | null = null;
  private csrfToken: string | null = null;
  private expiryNotified = false;
  private loggingOut = false;

  constructor(
    private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ||
      "/api/v1",
  ) {
    this.baseUrl = this.baseUrl.replace(/\/+$/, "");
  }

  private async ensureCsrf(): Promise<string> {
    const existing = csrfCookie() ?? this.csrfToken;
    if (existing) return existing;
    if (!this.csrfInFlight) {
      this.csrfInFlight = (async () => {
        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}/auth/csrf`, {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
        } catch {
          throw new ApiError(
            "NETWORK_ERROR",
            "Could not reach the server. Check your connection and retry.",
            0,
          );
        }
        if (!response.ok)
          throw new ApiError(
            "CSRF_UNAVAILABLE",
            "Could not establish a secure session. Please retry.",
            response.status,
          );
        const body = (await response.json()) as { token?: string };
        const token = csrfCookie() ?? body.token;
        if (!token)
          throw new ApiError(
            "CSRF_UNAVAILABLE",
            "Could not establish a secure session. Please retry.",
            502,
          );
        this.csrfToken = token;
        return token;
      })().finally(() => {
        this.csrfInFlight = null;
      });
    }
    return this.csrfInFlight;
  }

  private async refreshSession(): Promise<boolean> {
    if (!this.refreshInFlight) {
      const refresh = async () => {
        const token = await this.ensureCsrf();
        let response: Response;
        try {
          response = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json", "X-XSRF-TOKEN": token },
          });
        } catch {
          throw new ApiError(
            "NETWORK_ERROR",
            "Could not reach the server. Check your connection and retry.",
            0,
          );
        }
        if (response.status === 401) return false;
        if (!response.ok)
          throw new ApiError(
            "REFRESH_FAILED",
            "Could not restore the session. Please retry.",
            response.status,
          );
        this.expiryNotified = false;
        return true;
      };
      this.refreshInFlight = this.withSessionLock(refresh).finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async withSessionLock<T>(action: () => Promise<T>): Promise<T> {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request(
        "sambar-spicy-session-refresh",
        action,
      );
    }
    return action();
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      Accept: options.response === "blob" ? "*/*" : "application/json",
      ...options.headers,
    };
    if (method !== "GET" && method !== "HEAD") {
      headers["X-XSRF-TOKEN"] = await this.ensureCsrf();
    }
    const multipart =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    if (options.body !== undefined && !multipart) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        credentials: "include",
        headers,
        signal: options.signal,
        body:
          options.body === undefined
            ? undefined
            : multipart
              ? (options.body as FormData)
              : JSON.stringify(options.body),
      });
    } catch {
      throw new ApiError(
        "NETWORK_ERROR",
        "Could not reach the server. Check your connection and retry.",
        0,
      );
    }

    if (
      res.status === 401 &&
      !options.skipRefresh &&
      !this.loggingOut &&
      path !== "/auth/login" &&
      path !== "/auth/logout"
    ) {
      if (await this.refreshSession()) {
        return this.request<T>(path, { ...options, skipRefresh: true });
      }
    }

    if (!res.ok) {
      let body: {
        code?: string;
        error?: string;
        message?: string;
        fieldErrors?: Record<string, string>;
        requestId?: string;
      } = {};
      try {
        body = await res.json();
      } catch {}
      if (
        res.status === 401 &&
        !options.ignoreSessionExpiry &&
        !this.loggingOut &&
        !this.expiryNotified
      ) {
        this.expiryNotified = true;
        notifySessionExpired();
      }
      const message =
        body.message?.trim() ||
        body.error?.trim() ||
        "The request could not be completed.";
      throw new ApiError(
        body.code ?? `HTTP_${res.status}`,
        message,
        res.status,
        body.fieldErrors,
        body.requestId ?? res.headers.get("x-request-id") ?? undefined,
      );
    }

    if (options.response === "blob") {
      return (await res.blob()) as T;
    }
    if (res.status === 204) {
      return undefined as T;
    }

    const text = await res.text();
    try {
      return (text ? JSON.parse(text) : undefined) as T;
    } catch {
      throw new ApiError(
        "INVALID_RESPONSE",
        "The server returned an invalid response.",
        502,
      );
    }
  }

  async login(username: string, password: string) {
    const res = await this.request<D.User | { user: D.User }>("/auth/login", {
      method: "POST",
      body: { username, password },
      ignoreSessionExpiry: true,
    });
    const user = (
      res && typeof res === "object" && "user" in res ? res.user : res
    ) as D.User;
    this.expiryNotified = false;
    this.loggingOut = false;
    return user;
  }

  async logout() {
    this.loggingOut = true;
    try {
      if (this.refreshInFlight) await this.refreshInFlight.catch(() => false);
      await this.withSessionLock(() =>
        this.request<void>("/auth/logout", {
          method: "POST",
          ignoreSessionExpiry: true,
          skipRefresh: true,
        }),
      );
    } catch (error) {
      this.loggingOut = false;
      throw error;
    }
  }

  async getMe() {
    try {
      const user = await this.request<D.User>("/auth/me", {
        ignoreSessionExpiry: true,
      });
      return user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        return null;
      }
      throw e;
    }
  }

  // --- Real MySQL Menu & Category Integration ---
  async getPublicMenu() {
    try {
      return await this.request<D.PublicMenu>("/public/menu", { ignoreSessionExpiry: true, skipRefresh: true });
    } catch (error) {
      // A guest must never be redirected to staff login if this endpoint is
      // unavailable or an older backend rejects anonymous access.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403))
        throw new ApiError("PUBLIC_MENU_UNAVAILABLE", "The customer menu is unavailable.", 503);
      throw error;
    }
  }
  getCategories() {
    return this.request<D.Category[]>("/categories");
  }
  createCategory(input: CategoryInput) {
    return this.request<D.Category>("/categories", {
      method: "POST",
      body: input,
    });
  }
  updateCategory(id: number, input: Partial<CategoryInput>) {
    return this.request<D.Category>(`/categories/${id}`, {
      method: "PATCH",
      body: input,
    });
  }
  deleteCategory(id: number) {
    return this.request<void>(`/categories/${id}`, { method: "DELETE" });
  }

  getMenuItems(params?: { categoryId?: number; search?: string }) {
    const p = new URLSearchParams();
    if (params?.categoryId) p.set("categoryId", String(params.categoryId));
    if (params?.search) p.set("search", params.search);
    const qs = p.toString();
    return this.request<D.MenuItem[]>(`/menu-items${qs ? `?${qs}` : ""}`);
  }
  getMenuItemById(id: number) {
    return this.request<D.MenuItem>(`/menu-items/${id}`);
  }
  getMenuItemsByCategory(categoryId: number) {
    return this.request<D.MenuItem[]>(`/menu-items/category/${categoryId}`);
  }
  searchMenuItems(query: string) {
    return this.request<D.MenuItem[]>(
      `/menu-items/search?name=${encodeURIComponent(query)}`,
    );
  }
  createMenuItem(input: MenuItemInput) {
    return this.request<D.MenuItem>("/menu-items", {
      method: "POST",
      body: input,
    });
  }
  updateMenuItem(id: number, input: Partial<MenuItemInput>) {
    return this.request<D.MenuItem>(`/menu-items/${id}`, {
      method: "PATCH",
      body: input,
    });
  }
  deleteMenuItem(id: number) {
    return this.request<void>(`/menu-items/${id}`, { method: "DELETE" });
  }

  // --- Phased Fallback for Modules Pending Backend Controller Development ---
  async holdBill(input: BillInput) {
    return mapBillDetail(
      await this.request<WireBillDetail>("/bills/hold", {
        method: "POST",
        body: input,
      }),
    );
  }
  async getHeldBills() {
    const bills = await this.request<WireBillDetail[]>("/bills/held");
    return bills.map(mapBillDetail);
  }
  async getBillById(id: number) {
    return mapBillDetail(await this.request<WireBillDetail>(`/bills/${id}`));
  }
  getBillingCapabilities() {
    return this.request<{ round_off: boolean }>("/bills/capabilities");
  }
  async listBills(range?: D.ReportDateRange) {
    const bills = await this.request<WireBillDetail[]>(`/bills${query(range)}`);
    return bills.map(mapBillDetail);
  }
  async cancelBill(id: number, reason: string) {
    return mapBillDetail(
      await this.request<WireBillDetail>(`/bills/${id}/cancel`, {
        method: "POST",
        body: { reason },
      }),
    );
  }
  async cancelHeldBill(id: number, reason: string) {
    return this.cancelBill(id, reason);
  }
  async deleteBill(id: number) {
    return this.request<void>(`/bills/${id}`, { method: "DELETE" });
  }
  async checkoutBill(input: CheckoutInput) {
    // The server deduplicates this key. A lost response may mean the payment
    // committed, so repeat exactly the same request once before asking the
    // cashier to intervene.
    const body = serializeCheckoutBody(input);
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const raw = await Promise.race([
          this.request<WireBillDetail>("/bills/checkout", {
            method: "POST",
            body,
            headers: { "Idempotency-Key": input.checkout_key },
            signal: controller.signal,
          }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              controller.abort();
              reject(new ApiError("NETWORK_ERROR", "Checkout response timed out.", 0));
            }, 12_000);
          }),
        ]);
        return mapBillDetail(raw);
      } catch (error) {
        const retryable = !(error instanceof ApiError) || error.status === 0 || error.status >= 500;
        if (attempt > 0 || !retryable) throw error;
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    }
    throw new ApiError("NETWORK_ERROR", "Could not confirm checkout. Retry the same request.", 0);
  }
  logBillReprint(id: number) {
    return this.request<void>(`/bills/${id}/reprint`, { method: "POST" });
  }

  getInventoryItems() {
    return this.request<D.InventoryItem[]>("/inventory/items");
  }
  createInventoryItem(input: InventoryInput) {
    return this.request<D.InventoryItem>("/inventory/items", {
      method: "POST",
      body: input,
    });
  }
  updateInventoryItem(
    id: number,
    input: Partial<Omit<InventoryInput, "current_qty" | "avg_unit_cost">>,
  ) {
    return this.request<D.InventoryItem>(`/inventory/items/${id}`, {
      method: "PATCH",
      body: input,
    });
  }
  getPurchases() {
    return this.request<(D.StockPurchase & { lines: D.StockPurchaseLine[] })[]>(
      "/inventory/purchases",
    );
  }
  createPurchase(input: PurchaseInput) {
    return this.request<D.StockPurchase>("/inventory/purchases", {
      method: "POST",
      body: input,
    });
  }
  getDailyEntries() {
    return this.request<D.StockDailyEntry[]>("/inventory/daily-entries");
  }
  createDailyEntry(input: DailyEntryInput) {
    return this.request<D.StockDailyEntry>("/inventory/daily-entries", {
      method: "POST",
      body: input,
      headers: input.request_key
        ? { "Idempotency-Key": input.request_key }
        : undefined,
    });
  }
  getStockMovements() {
    return this.request<D.StockMovement[]>("/inventory/movements");
  }
  createStockAdjustment(input: AdjustmentInput) {
    return this.request<D.StockMovement>("/inventory/adjustments", {
      method: "POST",
      body: input,
    });
  }

  getFinancialSummary(range: D.ReportDateRange) {
    return this.request<
      D.FinancialSummaryReport & { trend: D.SalesTrendPoint[] }
    >(`/reports/summary${query(range)}`);
  }
  getSalesLedger(range: D.ReportDateRange) {
    return this.request<D.SalesLedgerRow[]>(`/reports/sales${query(range)}`);
  }
  getMenuItemSales(range: D.ReportDateRange) {
    return this.request<D.MenuItemSalesRow[]>(`/reports/items${query(range)}`);
  }
  getInventorySummary(range: D.ReportDateRange) {
    return this.request<D.InventorySummaryRow[]>(
      `/reports/inventory${query(range)}`,
    );
  }
  getWasteAnalysis(range: D.ReportDateRange) {
    return this.request<D.WasteAnalysisRow[]>(`/reports/waste${query(range)}`);
  }
  getOperatingExpenses(range: D.ReportDateRange) {
    return this.request<D.OperatingExpense[]>(
      `/operating-expenses${query(range)}`,
    );
  }
  createOperatingExpense(input: ExpenseInput) {
    return this.request<D.OperatingExpense>("/operating-expenses", {
      method: "POST",
      body: input,
    });
  }

  getStoreSettings() {
    return this.request<D.StoreSettings>("/store");
  }
  updateStoreSettings(
    input: Partial<
      Pick<
        D.StoreSettings,
        "store_name" | "address" | "phone" | "receipt_footer"
      >
    >,
  ) {
    return this.request<D.StoreSettings>("/admin/store", {
      method: "PATCH",
      body: input,
    });
  }
  getUsers() {
    return this.request<D.User[]>("/admin/users");
  }
  updateUser(
    id: number,
    input: Partial<Pick<D.User, "username" | "full_name" | "is_active">>,
  ) {
    return this.request<D.User>(`/admin/users/${id}`, {
      method: "PATCH",
      body: input,
    });
  }
  resetUserPassword(id: number, password: string) {
    return this.request<void>(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: { password },
    });
  }
  getNotifications() {
    return this.request<D.Notification[]>("/notifications");
  }
  markNotificationRead(id: number) {
    return this.request<D.Notification>(`/notifications/${id}/read`, {
      method: "POST",
    });
  }
  getAuditLogs() {
    return this.request<D.AuditLog[]>("/admin/audit-logs");
  }

  private upload(path: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ image_path: string }>(path, {
      method: "POST",
      body: form,
    });
  }
  uploadCategoryImage(id: number, file: File) {
    return this.upload(`/categories/${id}/image`, file);
  }
  uploadMenuItemImage(id: number, file: File) {
    return this.upload(`/menu-items/${id}/image`, file);
  }
  downloadReport(
    type: string,
    format: "xlsx" | "pdf",
    range: D.ReportDateRange,
  ) {
    const params = new URLSearchParams({ type, format });
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    return this.request<Blob>(`/reports/export?${params}`, {
      response: "blob",
    });
  }
}
