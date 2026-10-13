import { describe, it, expect, vi, beforeEach } from "vitest";
import cashFlowApi, { computeStats, emptyStats, normalizeStats } from "./cashFlowApi";
import apiHelper from "../../../helpers/apiHelper";

function mockResponse(body: any) {
  return vi.spyOn(apiHelper, "fetchData").mockResolvedValue({
    json: async () => body,
  } as unknown as Response);
}

const input = { type: "inflow", source: "cash", label: "gaji", nominal: 100000, description: "Gaji" } as const;

describe("stats helpers", () => {
  const list: any[] = [
    { id: 1, type: "inflow", source: "cash", nominal: "100000" },
    { id: 2, type: "outflow", source: "cash", nominal: 30000 },
    { id: 3, type: "inflow", source: "savings", nominal: 500000 },
    { id: 4, type: "inflow", source: "loans", nominal: 200000 },
    { id: 5, type: "outflow", source: "other", nominal: 1000 },
    { id: 6, type: "inflow", source: "cash", nominal: "abc" },
  ];

  it("emptyStats should return zeros", () => {
    expect(emptyStats()).toEqual({ total_inflow: 0, total_outflow: 0, cash: 0, savings: 0, loans: 0 });
  });

  it("computeStats should sum by type and source and ignore unknown sources", () => {
    expect(computeStats(list)).toEqual({
      total_inflow: 800000,
      total_outflow: 31000,
      cash: 70000,
      savings: 500000,
      loans: 200000,
    });
    expect(computeStats([])).toEqual(emptyStats());
  });

  it("normalizeStats should read the API object, supporting alias keys and missing values", () => {
    expect(
      normalizeStats({ total_inflow: "10", total_outflow: 4, cash: 6, savings: null, loans: undefined }, [])
    ).toEqual({ total_inflow: 10, total_outflow: 4, cash: 6, savings: 0, loans: 0 });
    expect(normalizeStats({ inflow: 9, outflow: 3 }, [])).toEqual({
      total_inflow: 9, total_outflow: 3, cash: 0, savings: 0, loans: 0,
    });
  });

  it("normalizeStats should compute from the list when the API gives no stats", () => {
    expect(normalizeStats(undefined, list.slice(0, 2))).toEqual(computeStats(list.slice(0, 2)));
    expect(normalizeStats("x", [])).toEqual(emptyStats());
  });
});

describe("cashFlowApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCashFlows", () => {
    it("should fetch without filters and use stats from the API", async () => {
      const spy = mockResponse({
        status: "success",
        data: { cash_flows: [{ id: 1 }], stats: { total_inflow: 5, total_outflow: 1, cash: 4, savings: 0, loans: 0 } },
      });
      const result = await cashFlowApi.getCashFlows();
      expect(result.cashFlows).toEqual([{ id: 1 }]);
      expect(result.stats.total_inflow).toBe(5);
      expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\/cash-flows\/$/), { method: "GET" });
    });

    it("should send every filter as a query parameter and skip empty ones", async () => {
      const spy = mockResponse({ status: "success", data: { cash_flows: [] } });
      await cashFlowApi.getCashFlows({
        type: "inflow", source: "cash", label: "gaji", start_date: "2026-01-01", end_date: "2026-01-31",
      });
      const url = spy.mock.calls[0][0] as string;
      expect(url).toContain("type=inflow");
      expect(url).toContain("source=cash");
      expect(url).toContain("label=gaji");
      expect(url).toContain("start_date=2026-01-01");
      expect(url).toContain("end_date=2026-01-31");

      await cashFlowApi.getCashFlows({ type: "", label: "" });
      expect(spy.mock.calls[1][0]).not.toContain("?");
    });

    it("should compute stats from the list when data.stats is missing, and tolerate missing data", async () => {
      mockResponse({ status: "success", data: { cash_flows: [{ id: 1, type: "inflow", source: "cash", nominal: 100 }] } });
      expect((await cashFlowApi.getCashFlows()).stats.cash).toBe(100);

      mockResponse({ success: true });
      expect(await cashFlowApi.getCashFlows()).toEqual({ cashFlows: [], stats: emptyStats() });
    });

    it("should throw the API message or a fallback on failure", async () => {
      mockResponse({ status: "fail", message: "Unauthenticated." });
      await expect(cashFlowApi.getCashFlows()).rejects.toThrow("Unauthenticated.");
      mockResponse({ status: "fail" });
      await expect(cashFlowApi.getCashFlows()).rejects.toThrow("Gagal mengambil data arus kas");
    });
  });

  it("getCashFlowById should return the detail, undefined without data, and throw on failure", async () => {
    const spy = mockResponse({ status: "success", data: { cash_flow: { id: 9 } } });
    expect(await cashFlowApi.getCashFlowById(9)).toEqual({ id: 9 });
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\/cash-flows\/9$/), { method: "GET" });

    mockResponse({ status: "success" });
    expect(await cashFlowApi.getCashFlowById(9)).toBeUndefined();

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.getCashFlowById(9)).rejects.toThrow("Gagal mengambil detail arus kas");
  });

  it("postCashFlow should send the JSON body and return data", async () => {
    const spy = mockResponse({ status: "success", data: { cash_flow_id: 1 } });
    expect(await cashFlowApi.postCashFlow({ ...input })).toEqual({ cash_flow_id: 1 });
    expect(spy.mock.calls[0][0]).toMatch(/\/cash-flows\/$/);
    expect(spy.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual(input);

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.postCashFlow({ ...input })).rejects.toThrow("Gagal menambahkan arus kas");
  });

  it("putCashFlow should update and return the message", async () => {
    const spy = mockResponse({ status: "success", message: "Berhasil mengubah data" });
    expect(await cashFlowApi.putCashFlow(3, { ...input })).toBe("Berhasil mengubah data");
    expect(spy.mock.calls[0][0]).toMatch(/\/cash-flows\/3$/);
    expect((spy.mock.calls[0][1] as any).method).toBe("PUT");

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.putCashFlow(3, { ...input })).rejects.toThrow("Gagal mengubah arus kas");
  });

  it("deleteCashFlow should delete one record", async () => {
    const spy = mockResponse({ status: "success", message: "Berhasil menghapus data" });
    expect(await cashFlowApi.deleteCashFlow(4)).toBe("Berhasil menghapus data");
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\/cash-flows\/4$/), { method: "DELETE" });

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.deleteCashFlow(4)).rejects.toThrow("Gagal menghapus arus kas");
  });

  it("getLabels should return plain and object labels, dropping empty ones", async () => {
    const spy = mockResponse({ status: "success", data: { labels: ["gaji", { label: "makan" }, { label: "" }, {}, null] } });
    expect(await cashFlowApi.getLabels()).toEqual(["gaji", "makan"]);
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\/cash-flows\/labels$/), { method: "GET" });

    mockResponse({ status: "success" });
    expect(await cashFlowApi.getLabels()).toEqual([]);

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.getLabels()).rejects.toThrow("Gagal mengambil daftar label");
  });

  it("getStats should fetch daily by default and monthly on request", async () => {
    const spy = mockResponse({ status: "success", data: { stats: { a: 1 } } });
    expect(await cashFlowApi.getStats()).toEqual({ stats: { a: 1 } });
    expect(spy.mock.calls[0][0]).toMatch(/\/cash-flows\/stats\/daily$/);

    await cashFlowApi.getStats("monthly");
    expect(spy.mock.calls[1][0]).toMatch(/\/cash-flows\/stats\/monthly$/);

    mockResponse({ status: "success" });
    expect(await cashFlowApi.getStats()).toEqual({});

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.getStats()).rejects.toThrow("Gagal mengambil data statistik");
  });

  it("deleteAllCashFlows should reset all records", async () => {
    const spy = mockResponse({ status: "success", message: "Berhasil menghapus semua" });
    expect(await cashFlowApi.deleteAllCashFlows()).toBe("Berhasil menghapus semua");
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\/cash-flows\/$/), { method: "DELETE" });

    mockResponse({ status: "fail" });
    await expect(cashFlowApi.deleteAllCashFlows()).rejects.toThrow("Gagal menghapus semua arus kas");
  });
});
