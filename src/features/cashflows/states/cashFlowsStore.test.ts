import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCashFlowsStore } from "./cashFlowsStore";
import cashFlowApi, { emptyStats } from "../api/cashFlowApi";
import * as toolsHelper from "../../../helpers/toolsHelper";

const silent = () => Promise.resolve({} as any);
const input: any = { type: "inflow", source: "cash", label: "gaji", nominal: 1000, description: "x" };

describe("cashFlowsStore", () => {
  let store: ReturnType<typeof useCashFlowsStore>;

  beforeEach(() => {
    vi.restoreAllMocks();
    setActivePinia(createPinia());
    store = useCashFlowsStore();
  });

  it("should have the expected initial state", () => {
    expect(store.cashFlows).toEqual([]);
    expect(store.cashFlow).toBeNull();
    expect(store.stats).toEqual(emptyStats());
    expect(store.labels).toEqual([]);
    expect(store.dailyStats).toBeNull();
    expect(store.monthlyStats).toBeNull();
    expect(store.query).toEqual({});
    expect(store.isCashFlow).toBe(false);
    [
      "isCashFlowAdd", "isCashFlowAdded", "isCashFlowChange", "isCashFlowChanged",
      "isCashFlowDelete", "isCashFlowDeleted", "isCashFlowDeleteAll", "isCashFlowDeletedAll",
    ].forEach((key) => expect((store as any)[key]).toBe(false));
  });

  it("should set list, detail, stats and labels", () => {
    store.setCashFlows([{ id: 1 } as any]);
    store.setCashFlow({ id: 2 } as any);
    store.setStats({ ...emptyStats(), cash: 5 });
    store.setLabels(["gaji"]);
    expect(store.cashFlows).toEqual([{ id: 1 }]);
    expect(store.cashFlow).toEqual({ id: 2 });
    expect(store.stats.cash).toBe(5);
    expect(store.labels).toEqual(["gaji"]);
  });

  it.each([
    ["setIsCashFlow", "isCashFlow"],
    ["setIsCashFlowAdd", "isCashFlowAdd"],
    ["setIsCashFlowAdded", "isCashFlowAdded"],
    ["setIsCashFlowChange", "isCashFlowChange"],
    ["setIsCashFlowChanged", "isCashFlowChanged"],
    ["setIsCashFlowDelete", "isCashFlowDelete"],
    ["setIsCashFlowDeleted", "isCashFlowDeleted"],
    ["setIsCashFlowDeleteAll", "isCashFlowDeleteAll"],
    ["setIsCashFlowDeletedAll", "isCashFlowDeletedAll"],
  ])("%s should set %s", (setter, key) => {
    (store as any)[setter](true);
    expect((store as any)[key]).toBe(true);
    (store as any)[setter](false);
    expect((store as any)[key]).toBe(false);
  });

  describe("asyncSetCashFlows", () => {
    it("should load list and stats and remember the query", async () => {
      const stats = { ...emptyStats(), total_inflow: 9 };
      const spy = vi.spyOn(cashFlowApi, "getCashFlows").mockResolvedValue({ cashFlows: [{ id: 1 } as any], stats });
      await store.asyncSetCashFlows({ type: "inflow" });
      expect(spy).toHaveBeenCalledWith({ type: "inflow" });
      expect(store.cashFlows).toEqual([{ id: 1 }]);
      expect(store.stats).toEqual(stats);
      expect(store.query).toEqual({ type: "inflow" });
    });

    it("should default to empty params and reset list and stats on failure", async () => {
      const spy = vi.spyOn(cashFlowApi, "getCashFlows").mockRejectedValue(new Error("fail"));
      store.setCashFlows([{ id: 1 } as any]);
      store.setStats({ ...emptyStats(), cash: 5 });
      await store.asyncSetCashFlows();
      expect(spy).toHaveBeenCalledWith({});
      expect(store.cashFlows).toEqual([]);
      expect(store.stats).toEqual(emptyStats());
    });

    it("asyncReloadCashFlows should reuse the last query", async () => {
      const spy = vi.spyOn(cashFlowApi, "getCashFlows").mockResolvedValue({ cashFlows: [], stats: emptyStats() });
      await store.asyncSetCashFlows({ label: "gaji" });
      await store.asyncReloadCashFlows();
      expect(spy).toHaveBeenLastCalledWith({ label: "gaji" });
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe("asyncSetCashFlow", () => {
    it("should load detail and flag isCashFlow", async () => {
      vi.spyOn(cashFlowApi, "getCashFlowById").mockResolvedValue({ id: 7 } as any);
      await store.asyncSetCashFlow(7);
      expect(store.cashFlow).toEqual({ id: 7 });
      expect(store.isCashFlow).toBe(true);
    });

    it("should set null when the API returns nothing or fails", async () => {
      const spy = vi.spyOn(cashFlowApi, "getCashFlowById").mockResolvedValue(undefined);
      store.setCashFlow({ id: 1 } as any);
      await store.asyncSetCashFlow(7);
      expect(store.cashFlow).toBeNull();

      spy.mockRejectedValue(new Error("fail"));
      store.setCashFlow({ id: 1 } as any);
      await store.asyncSetCashFlow(7);
      expect(store.cashFlow).toBeNull();
      expect(store.isCashFlow).toBe(true);
    });
  });

  it("asyncSetLabels should load labels and fall back to empty on failure", async () => {
    const spy = vi.spyOn(cashFlowApi, "getLabels").mockResolvedValue(["gaji", "makan"]);
    await store.asyncSetLabels();
    expect(store.labels).toEqual(["gaji", "makan"]);

    spy.mockRejectedValue(new Error("fail"));
    await store.asyncSetLabels();
    expect(store.labels).toEqual([]);
  });

  describe("asyncSetStats", () => {
    it("should store daily (default) and monthly statistics separately", async () => {
      const spy = vi.spyOn(cashFlowApi, "getStats").mockResolvedValue({ a: 1 });
      await store.asyncSetStats();
      expect(spy).toHaveBeenLastCalledWith("daily");
      expect(store.dailyStats).toEqual({ a: 1 });

      spy.mockResolvedValue({ b: 2 });
      await store.asyncSetStats("monthly");
      expect(spy).toHaveBeenLastCalledWith("monthly");
      expect(store.monthlyStats).toEqual({ b: 2 });
    });

    it("should reset the matching statistics on failure", async () => {
      vi.spyOn(cashFlowApi, "getStats").mockRejectedValue(new Error("fail"));
      store.dailyStats = { a: 1 };
      store.monthlyStats = { b: 2 };
      await store.asyncSetStats("daily");
      expect(store.dailyStats).toBeNull();
      expect(store.monthlyStats).toEqual({ b: 2 });
      await store.asyncSetStats("monthly");
      expect(store.monthlyStats).toBeNull();
    });
  });

  describe("asyncSetIsCashFlowAdd", () => {
    it("should show success dialog and flag added", async () => {
      const spy = vi.spyOn(cashFlowApi, "postCashFlow").mockResolvedValue({ cash_flow_id: 1 });
      const success = vi.spyOn(toolsHelper, "showSuccessDialog").mockImplementation(silent);
      await store.asyncSetIsCashFlowAdd(input);
      expect(spy).toHaveBeenCalledWith(input);
      expect(success).toHaveBeenCalledWith("Arus kas berhasil ditambahkan!");
      expect(store.isCashFlowAdded).toBe(true);
      expect(store.isCashFlowAdd).toBe(true);
    });

    it("should show error dialog and flag not added on failure", async () => {
      vi.spyOn(cashFlowApi, "postCashFlow").mockRejectedValue(new Error("Data tidak valid"));
      const error = vi.spyOn(toolsHelper, "showErrorDialog").mockImplementation(silent);
      await store.asyncSetIsCashFlowAdd(input);
      expect(error).toHaveBeenCalledWith("Data tidak valid");
      expect(store.isCashFlowAdded).toBe(false);
      expect(store.isCashFlowAdd).toBe(true);
    });
  });

  describe.each([
    ["asyncSetIsCashFlowChange", "putCashFlow", [1, input], "Arus kas berhasil diperbarui!", "isCashFlowChanged", "isCashFlowChange"],
    ["asyncSetIsCashFlowDelete", "deleteCashFlow", [1], "Arus kas berhasil dihapus!", "isCashFlowDeleted", "isCashFlowDelete"],
    ["asyncSetIsCashFlowDeleteAll", "deleteAllCashFlows", [], "Semua arus kas berhasil direset!", "isCashFlowDeletedAll", "isCashFlowDeleteAll"],
  ])("%s", (action, apiFn, args, defaultMessage, doneKey, finishKey) => {
    it("should show API message and flag done on success", async () => {
      vi.spyOn(cashFlowApi, apiFn as any).mockResolvedValue("Pesan API" as never);
      const success = vi.spyOn(toolsHelper, "showSuccessDialog").mockImplementation(silent);
      await (store as any)[action as string](...(args as any[]));
      expect(success).toHaveBeenCalledWith("Pesan API");
      expect((store as any)[doneKey as string]).toBe(true);
      expect((store as any)[finishKey as string]).toBe(true);
    });

    it("should use default message when API message is empty", async () => {
      vi.spyOn(cashFlowApi, apiFn as any).mockResolvedValue(undefined as never);
      const success = vi.spyOn(toolsHelper, "showSuccessDialog").mockImplementation(silent);
      await (store as any)[action as string](...(args as any[]));
      expect(success).toHaveBeenCalledWith(defaultMessage);
    });

    it("should show error dialog and flag failure when request fails", async () => {
      vi.spyOn(cashFlowApi, apiFn as any).mockRejectedValue(new Error("Gagal") as never);
      const error = vi.spyOn(toolsHelper, "showErrorDialog").mockImplementation(silent);
      await (store as any)[action as string](...(args as any[]));
      expect(error).toHaveBeenCalledWith("Gagal");
      expect((store as any)[doneKey as string]).toBe(false);
      expect((store as any)[finishKey as string]).toBe(true);
    });
  });
});
