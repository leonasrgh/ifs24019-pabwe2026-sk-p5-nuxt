import apiHelper from "../../../helpers/apiHelper";

/*
 * Asumsi kontrak API Cash Flows (perlu dicocokkan dengan dokumentasi Delcom):
 * - GET /cash-flows        -> data.cash_flows (array) dan ringkasan saldo pada data.stats (opsional)
 * - GET /cash-flows/:id    -> data.cash_flow
 * - POST/PUT body JSON     -> { type, source, label, nominal, description }
 * - GET /cash-flows/labels -> data.labels (array string atau array objek { label })
 * - GET /cash-flows/stats/daily | monthly -> data
 * Jika data.stats tidak ada pada daftar, ringkasan saldo dihitung dari daftar transaksi.
 */

export type CashFlowType = "inflow" | "outflow";
export type CashFlowSource = "cash" | "savings" | "loans";

export interface CashFlow {
  id: number;
  user_id?: number;
  type: CashFlowType;
  source: CashFlowSource;
  label: string;
  nominal: number;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CashFlowStats {
  total_inflow: number;
  total_outflow: number;
  cash: number;
  savings: number;
  loans: number;
}

export interface CashFlowQueryParams {
  type?: string;
  source?: string;
  label?: string;
  start_date?: string;
  end_date?: string;
}

export interface CashFlowInput {
  type: CashFlowType;
  source: CashFlowSource;
  label: string;
  nominal: number;
  description: string;
}

export interface CashFlowListResult {
  cashFlows: CashFlow[];
  stats: CashFlowStats;
}

export function emptyStats(): CashFlowStats {
  return { total_inflow: 0, total_outflow: 0, cash: 0, savings: 0, loans: 0 };
}

function toNumber(value: unknown): number {
  return Number(value) || 0;
}

function pick(raw: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) {
      return toNumber(raw[key]);
    }
  }
  return 0;
}

export function computeStats(list: CashFlow[]): CashFlowStats {
  const stats = emptyStats();
  for (const item of list) {
    const nominal = toNumber(item.nominal);
    const signed = item.type === "outflow" ? -nominal : nominal;
    if (item.type === "outflow") {
      stats.total_outflow += nominal;
    } else {
      stats.total_inflow += nominal;
    }
    if (item.source === "cash" || item.source === "savings" || item.source === "loans") {
      stats[item.source] += signed;
    }
  }
  return stats;
}

export function normalizeStats(raw: unknown, list: CashFlow[]): CashFlowStats {
  if (raw && typeof raw === "object") {
    const source = raw as Record<string, unknown>;
    return {
      total_inflow: pick(source, ["total_inflow", "inflow"]),
      total_outflow: pick(source, ["total_outflow", "outflow"]),
      cash: pick(source, ["cash"]),
      savings: pick(source, ["savings"]),
      loans: pick(source, ["loans"]),
    };
  }
  return computeStats(list);
}

const cashFlowApi = (() => {
  const BASE_URL = `${DELCOM_BASEURL}/cash-flows`;

  function _url(path: string): string {
    return BASE_URL + path;
  }

  async function _parse(response: Response, fallbackMessage: string): Promise<any> {
    const result = await response.json();
    if (result.status !== "success" && !result.success) {
      throw new Error(result.message || fallbackMessage);
    }
    return result;
  }

  // GET /cash-flows?type=&source=&label=&start_date=&end_date=
  async function getCashFlows(params: CashFlowQueryParams = {}): Promise<CashFlowListResult> {
    const query = new URLSearchParams();
    (["type", "source", "label", "start_date", "end_date"] as const).forEach((key) => {
      if (params[key]) query.append(key, params[key] as string);
    });

    const queryString = query.toString();
    const response = await apiHelper.fetchData(_url(queryString ? `/?${queryString}` : "/"), {
      method: "GET",
    });

    const result = await _parse(response, "Gagal mengambil data arus kas");
    const cashFlows: CashFlow[] = result.data?.cash_flows || [];
    return { cashFlows, stats: normalizeStats(result.data?.stats, cashFlows) };
  }

  // GET /cash-flows/:id
  async function getCashFlowById(cashFlowId: number | string): Promise<CashFlow | undefined> {
    const response = await apiHelper.fetchData(_url(`/${cashFlowId}`), { method: "GET" });
    const result = await _parse(response, "Gagal mengambil detail arus kas");
    return result.data?.cash_flow;
  }

  // POST /cash-flows
  async function postCashFlow(input: CashFlowInput): Promise<any> {
    const response = await apiHelper.fetchData(_url("/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const result = await _parse(response, "Gagal menambahkan arus kas");
    return result.data;
  }

  // PUT /cash-flows/:id
  async function putCashFlow(cashFlowId: number | string, input: CashFlowInput): Promise<string> {
    const response = await apiHelper.fetchData(_url(`/${cashFlowId}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const result = await _parse(response, "Gagal mengubah arus kas");
    return result.message;
  }

  // DELETE /cash-flows/:id
  async function deleteCashFlow(cashFlowId: number | string): Promise<string> {
    const response = await apiHelper.fetchData(_url(`/${cashFlowId}`), { method: "DELETE" });
    const result = await _parse(response, "Gagal menghapus arus kas");
    return result.message;
  }

  // GET /cash-flows/labels
  async function getLabels(): Promise<string[]> {
    const response = await apiHelper.fetchData(_url("/labels"), { method: "GET" });
    const result = await _parse(response, "Gagal mengambil daftar label");
    const labels: unknown[] = result.data?.labels || [];
    return labels
      .map((item: any) => (typeof item === "string" ? item : item?.label ?? ""))
      .filter(Boolean);
  }

  // GET /cash-flows/stats/daily | monthly
  async function getStats(period: "daily" | "monthly" = "daily"): Promise<any> {
    const response = await apiHelper.fetchData(_url(`/stats/${period}`), { method: "GET" });
    const result = await _parse(response, "Gagal mengambil data statistik");
    return result.data || {};
  }

  // DELETE /cash-flows (reset seluruh catatan milik pengguna)
  async function deleteAllCashFlows(): Promise<string> {
    const response = await apiHelper.fetchData(_url("/"), { method: "DELETE" });
    const result = await _parse(response, "Gagal menghapus semua arus kas");
    return result.message;
  }

  return {
    getCashFlows,
    getCashFlowById,
    postCashFlow,
    putCashFlow,
    deleteCashFlow,
    getLabels,
    getStats,
    deleteAllCashFlows,
  };
})();

export default cashFlowApi;
