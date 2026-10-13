import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import HomePage from "./HomePage.vue";
import { renderWithProviders } from "../../../test-utils";
import cashFlowApi from "../api/cashFlowApi";
import * as toolsHelper from "../../../helpers/toolsHelper";

vi.mock("../api/cashFlowApi", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    default: {
      getCashFlows: vi.fn(),
      getCashFlowById: vi.fn(),
      getLabels: vi.fn(),
      getStats: vi.fn(),
    },
  };
});

const api = cashFlowApi as any;
const TID = (id: string) => `[data-testid="${id}"]`;
const profile = { id: 1, name: "Abdullah", email: "abdul@del.org" };
const stats = { total_inflow: 1000000, total_outflow: 400000, cash: 500000, savings: 300000, loans: -200000 };
const rows = [
  { id: 1, type: "inflow", source: "cash", label: "gaji", nominal: 1000000, description: "Gaji bulanan", created_at: "2026-10-05T08:34:04.000000Z" },
  { id: 2, type: "outflow", source: "savings", label: "makan", nominal: 400000, description: null, created_at: "2026-10-06T08:34:04.000000Z" },
  { id: 3, type: "outflow", source: "lainnya", label: "misc", nominal: 1000, description: "x", created_at: "2026-10-07T08:34:04.000000Z" },
];
const EMPTY_FILTERS = { type: "", source: "", label: "", start_date: "", end_date: "" };

async function renderPage(preloadedState: Record<string, any> = { profile }) {
  const result = renderWithProviders(HomePage, { preloadedState });
  await flushPromises();
  return result;
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCashFlows.mockResolvedValue({ cashFlows: rows, stats });
    api.getLabels.mockResolvedValue(["gaji", "makan"]);
  });

  it("should render nothing when profile is missing", async () => {
    const { wrapper } = await renderPage({ profile: null });
    expect(wrapper.find("h1").exists()).toBe(false);
  });

  it("should load cash flows without filters and load labels", async () => {
    const { wrapper } = await renderPage();
    expect(api.getCashFlows).toHaveBeenCalledWith(EMPTY_FILTERS);
    expect(api.getLabels).toHaveBeenCalled();
    expect(wrapper.find("h1").text()).toBe("Ringkasan Arus Kas");
    expect(wrapper.findAll("select#filter-label option").map((o: any) => o.text())).toEqual(["Semua Label", "gaji", "makan"]);
  });

  it("should show summary cards from the stats", async () => {
    const { wrapper } = await renderPage();
    const money = (id: string) => wrapper.find(TID(`stat-${id}`)).text().replace(/\s/g, " ");
    expect(money("balance")).toBe("Rp 600.000");
    expect(money("inflow")).toBe("Rp 1.000.000");
    expect(money("outflow")).toBe("Rp 400.000");
    expect(money("cash")).toBe("Rp 500.000");
    expect(money("savings")).toBe("Rp 300.000");
    expect(money("loans")).toContain("200.000");
  });

  it("should render rows with colored type badges, signed nominal and source labels", async () => {
    const { wrapper } = await renderPage();
    const inflow = wrapper.find(TID("cash-flow-row-1"));
    expect(inflow.text()).toContain("gaji");
    expect(inflow.text()).toContain("Gaji bulanan");
    expect(inflow.text()).toContain("Tunai");
    expect(wrapper.find(TID("type-badge-1")).text()).toBe("Pemasukan");
    expect(wrapper.find(TID("type-badge-1")).classes()).toContain("bg-emerald-50");
    expect(wrapper.find(TID("nominal-1")).text().replace(/\s/g, " ")).toBe("+Rp 1.000.000");

    const outflow = wrapper.find(TID("cash-flow-row-2"));
    expect(outflow.text()).toContain("Tabungan");
    expect(wrapper.find(TID("type-badge-2")).text()).toBe("Pengeluaran");
    expect(wrapper.find(TID("type-badge-2")).classes()).toContain("bg-red-50");
    expect(wrapper.find(TID("nominal-2")).text().replace(/\s/g, " ")).toBe("-Rp 400.000");

    expect(wrapper.find(TID("cash-flow-row-3")).text()).toContain("lainnya");
  });

  it("should reload with every filter and clear them again", async () => {
    const { wrapper } = await renderPage();

    await wrapper.find(TID("filter-type-select")).setValue("inflow");
    await wrapper.find(TID("filter-source-select")).setValue("cash");
    await wrapper.find(TID("filter-label-select")).setValue("gaji");
    await wrapper.find(TID("filter-start-date-input")).setValue("2026-10-01");
    await wrapper.find(TID("filter-end-date-input")).setValue("2026-10-31");
    await flushPromises();
    expect(api.getCashFlows).toHaveBeenLastCalledWith({
      type: "inflow", source: "cash", label: "gaji", start_date: "2026-10-01", end_date: "2026-10-31",
    });

    await wrapper.find(TID("clear-filters-btn")).trigger("click");
    await flushPromises();
    expect(api.getCashFlows).toHaveBeenLastCalledWith(EMPTY_FILTERS);
  });

  it("should show the loading state while loading and the empty state without data", async () => {
    api.getCashFlows.mockReturnValue(new Promise(() => {}));
    const loading = await renderPage();
    expect(loading.wrapper.text()).toContain("Memuat arus kas...");
    loading.wrapper.unmount();

    api.getCashFlows.mockResolvedValue({ cashFlows: [], stats });
    const empty = await renderPage();
    expect(empty.wrapper.text()).toContain("Belum ada catatan arus kas.");
  });

  it("should not update loading state after unmount", async () => {
    let resolveLoad: (v: any) => void = () => {};
    api.getCashFlows.mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));
    const { wrapper } = await renderPage();
    wrapper.unmount();
    resolveLoad({ cashFlows: [], stats });
    await flushPromises();
    expect(api.getCashFlows).toHaveBeenCalledTimes(1);
  });

  it("should navigate to the detail page", async () => {
    const { wrapper, router } = await renderPage();
    await wrapper.find(TID("view-cash-flow-2")).trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/cash-flows/2");
  });

  it("should open the add modal, close it, and reload after a successful add", async () => {
    const { wrapper, cashFlowsStore } = await renderPage();
    expect(wrapper.find(TID("add-cash-flow-modal")).exists()).toBe(false);
    await wrapper.find(TID("add-cash-flow-btn")).trigger("click");
    expect(wrapper.find(TID("add-cash-flow-modal")).exists()).toBe(true);
    await wrapper.find(TID("close-add-modal-btn")).trigger("click");
    expect(wrapper.find(TID("add-cash-flow-modal")).exists()).toBe(false);

    await wrapper.find(TID("add-cash-flow-btn")).trigger("click");
    const before = api.getCashFlows.mock.calls.length;
    cashFlowsStore.setIsCashFlowAdded(true);
    cashFlowsStore.setIsCashFlowAdd(true);
    await flushPromises();
    expect(api.getCashFlows.mock.calls.length).toBeGreaterThan(before);
    expect(wrapper.find(TID("add-cash-flow-modal")).exists()).toBe(false);
  });

  it("should open the edit modal with the selected row, close it, and reload after a change", async () => {
    const { wrapper, cashFlowsStore } = await renderPage();
    await wrapper.find(TID("edit-cash-flow-2")).trigger("click");
    expect(wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(true);
    expect(wrapper.find(TID("edit-cash-flow-label-input")).element.value).toBe("makan");
    await wrapper.find(TID("close-edit-modal-btn")).trigger("click");
    expect(wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(false);

    await wrapper.find(TID("edit-cash-flow-1")).trigger("click");
    const before = api.getCashFlows.mock.calls.length;
    cashFlowsStore.setIsCashFlowChanged(true);
    cashFlowsStore.setIsCashFlowChange(true);
    await flushPromises();
    expect(api.getCashFlows.mock.calls.length).toBeGreaterThan(before);
    expect(wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(false);
  });

  it("should delete a row after confirmation only", async () => {
    const confirm = vi.spyOn(toolsHelper, "showConfirmDialog");
    const { wrapper, cashFlowsStore } = await renderPage();
    const del = vi.spyOn(cashFlowsStore, "asyncSetIsCashFlowDelete").mockImplementation(async () => {});

    confirm.mockResolvedValueOnce({ isConfirmed: false } as any);
    await wrapper.find(TID("delete-cash-flow-1")).trigger("click");
    await flushPromises();
    expect(del).not.toHaveBeenCalled();

    confirm.mockResolvedValueOnce({ isConfirmed: true } as any);
    await wrapper.find(TID("delete-cash-flow-1")).trigger("click");
    await flushPromises();
    expect(del).toHaveBeenCalledWith(1);
  });

  it("should reload after a successful delete and not after a failed one", async () => {
    const { cashFlowsStore } = await renderPage();
    const base = api.getCashFlows.mock.calls.length;

    cashFlowsStore.setIsCashFlowDeleted(false);
    cashFlowsStore.setIsCashFlowDelete(true);
    await flushPromises();
    expect(api.getCashFlows.mock.calls.length).toBe(base);

    cashFlowsStore.setIsCashFlowDeleted(true);
    cashFlowsStore.setIsCashFlowDelete(true);
    await flushPromises();
    expect(api.getCashFlows.mock.calls.length).toBe(base + 1);
    expect(cashFlowsStore.isCashFlowDeleted).toBe(false);
  });

  it("should reset everything after confirmation only", async () => {
    const confirm = vi.spyOn(toolsHelper, "showConfirmDialog");
    const { wrapper, cashFlowsStore } = await renderPage();
    const resetAll = vi.spyOn(cashFlowsStore, "asyncSetIsCashFlowDeleteAll").mockImplementation(async () => {});

    confirm.mockResolvedValueOnce({ isConfirmed: false } as any);
    await wrapper.find(TID("reset-cash-flows-btn")).trigger("click");
    await flushPromises();
    expect(resetAll).not.toHaveBeenCalled();

    confirm.mockResolvedValueOnce({ isConfirmed: true } as any);
    await wrapper.find(TID("reset-cash-flows-btn")).trigger("click");
    await flushPromises();
    expect(resetAll).toHaveBeenCalledTimes(1);
  });

  it("should reload after a successful reset and not after a failed one", async () => {
    const { cashFlowsStore } = await renderPage();
    const base = api.getCashFlows.mock.calls.length;

    cashFlowsStore.setIsCashFlowDeletedAll(false);
    cashFlowsStore.setIsCashFlowDeleteAll(true);
    await flushPromises();
    expect(api.getCashFlows.mock.calls.length).toBe(base);

    cashFlowsStore.setIsCashFlowDeletedAll(true);
    cashFlowsStore.setIsCashFlowDeleteAll(true);
    await flushPromises();
    expect(api.getCashFlows.mock.calls.length).toBe(base + 1);
    expect(cashFlowsStore.isCashFlowDeletedAll).toBe(false);
  });
});
