import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { reactive } from "vue";
import DetailPage from "./DetailPage.vue";
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
    },
  };
});

const mockRouter = { push: vi.fn() };
const mockRoute = reactive({ params: { cashFlowId: "5" } as Record<string, string> });

vi.mock("vue-router", async () => {
  const actual: any = await vi.importActual("vue-router");
  return {
    ...actual,
    useRouter: () => mockRouter,
    useRoute: () => mockRoute,
  };
});

const api = cashFlowApi as any;
const TID = (id: string) => `[data-testid="${id}"]`;
const profile = { id: 1, name: "Abdullah", email: "abdul@del.org" };
const base = {
  id: 5, type: "inflow", source: "cash", label: "gaji", nominal: 1000000, description: "Gaji bulanan",
  created_at: "2026-10-05T08:34:04.000000Z", updated_at: "2026-10-06T09:00:00.000000Z",
};

async function renderPage(cashFlow: any, preloadedState: Record<string, any> = { profile }) {
  api.getCashFlowById.mockResolvedValue(cashFlow);
  const result = renderWithProviders(DetailPage, { preloadedState });
  await flushPromises();
  return result;
}

describe("DetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoute.params.cashFlowId = "5";
    api.getLabels.mockResolvedValue([]);
  });

  describe("loading and redirects", () => {
    it("should show a spinner while the cash flow is loading", async () => {
      api.getCashFlowById.mockReturnValue(new Promise(() => {}));
      const { wrapper } = renderWithProviders(DetailPage, { preloadedState: { profile } });
      await flushPromises();
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
      expect(wrapper.find("h1").text()).toBe("Memuat detail arus kas...");
    });

    it("should show a spinner when profile is missing", async () => {
      const { wrapper } = await renderPage(base, { profile: null });
      expect(wrapper.find(".animate-spin").exists()).toBe(true);
    });

    it("should fetch by route id and refetch when the id changes", async () => {
      await renderPage(base);
      expect(api.getCashFlowById).toHaveBeenCalledWith("5");
      mockRoute.params.cashFlowId = "9";
      await flushPromises();
      expect(api.getCashFlowById).toHaveBeenLastCalledWith("9");
    });

    it("should redirect home when the cash flow cannot be loaded", async () => {
      api.getCashFlowById.mockRejectedValue(new Error("not found"));
      renderWithProviders(DetailPage, { preloadedState: { profile } });
      await flushPromises();
      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });

    it("should stay when the cash flow is loaded", async () => {
      await renderPage(base);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe("content", () => {
    it("should render an inflow with green styling and sign", async () => {
      const { wrapper } = await renderPage(base);
      expect(wrapper.find(TID("detail-title")).text()).toBe("gaji");
      expect(wrapper.find(TID("detail-type-badge")).text()).toBe("Pemasukan");
      expect(wrapper.find(TID("detail-type-badge")).classes()).toContain("bg-emerald-50");
      expect(wrapper.find(TID("detail-source")).text()).toBe("Tunai");
      expect(wrapper.find(TID("detail-nominal")).text().replace(/\s/g, " ")).toBe("+Rp 1.000.000");
      expect(wrapper.find(TID("detail-nominal")).classes()).toContain("text-emerald-700");
      expect(wrapper.find(TID("detail-description")).text()).toBe("Gaji bulanan");
      expect(wrapper.find(TID("detail-created-at")).text()).not.toBe("-");
      expect(wrapper.find(TID("detail-updated-at")).text()).not.toBe("-");
      expect(wrapper.find(TID("back-to-cash-flows-link")).attributes("href")).toBe("/");
    });

    it("should render an outflow with red styling and a fallback description", async () => {
      const { wrapper } = await renderPage({ ...base, type: "outflow", source: "loans", description: null });
      expect(wrapper.find(TID("detail-type-badge")).text()).toBe("Pengeluaran");
      expect(wrapper.find(TID("detail-type-badge")).classes()).toContain("bg-red-50");
      expect(wrapper.find(TID("detail-source")).text()).toBe("Pinjaman");
      expect(wrapper.find(TID("detail-nominal")).text().replace(/\s/g, " ")).toBe("-Rp 1.000.000");
      expect(wrapper.find(TID("detail-nominal")).classes()).toContain("text-red-700");
      expect(wrapper.find(TID("detail-description")).text()).toBe("Tidak ada keterangan.");
    });
  });

  describe("edit", () => {
    it("should open and close the edit modal", async () => {
      const { wrapper } = await renderPage(base);
      await wrapper.find(TID("edit-detail-btn")).trigger("click");
      expect(wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(true);
      await wrapper.find(TID("close-edit-modal-btn")).trigger("click");
      expect(wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(false);
    });

    it("should refresh the detail after a successful change", async () => {
      const { wrapper, cashFlowsStore } = await renderPage(base);
      await wrapper.find(TID("edit-detail-btn")).trigger("click");
      expect(api.getCashFlowById).toHaveBeenCalledTimes(1);

      cashFlowsStore.setIsCashFlowChanged(true);
      cashFlowsStore.setIsCashFlowChange(true);
      await flushPromises();
      expect(api.getCashFlowById).toHaveBeenCalledTimes(2);
    });
  });

  describe("delete", () => {
    it("should delete after confirmation and skip when cancelled", async () => {
      const confirm = vi.spyOn(toolsHelper, "showConfirmDialog");
      const { wrapper, cashFlowsStore } = await renderPage(base);
      const del = vi.spyOn(cashFlowsStore, "asyncSetIsCashFlowDelete").mockImplementation(async () => {});

      confirm.mockResolvedValueOnce({ isConfirmed: false } as any);
      await wrapper.find(TID("delete-detail-btn")).trigger("click");
      await flushPromises();
      expect(del).not.toHaveBeenCalled();

      confirm.mockResolvedValueOnce({ isConfirmed: true } as any);
      await wrapper.find(TID("delete-detail-btn")).trigger("click");
      await flushPromises();
      expect(del).toHaveBeenCalledWith(5);
    });

    it("should go home after deletion and stay when deletion failed", async () => {
      const { cashFlowsStore } = await renderPage(base);

      cashFlowsStore.setIsCashFlowDeleted(false);
      cashFlowsStore.setIsCashFlowDelete(true);
      await flushPromises();
      expect(mockRouter.push).not.toHaveBeenCalled();

      cashFlowsStore.setIsCashFlowDeleted(true);
      cashFlowsStore.setIsCashFlowDelete(true);
      await flushPromises();
      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(cashFlowsStore.isCashFlowDeleted).toBe(false);
    });
  });
});
