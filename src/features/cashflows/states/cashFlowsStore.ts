import { defineStore } from "pinia";
import cashFlowApi, {
  emptyStats,
  type CashFlow,
  type CashFlowInput,
  type CashFlowQueryParams,
  type CashFlowStats,
} from "../api/cashFlowApi";
import { showErrorDialog, showSuccessDialog } from "../../../helpers/toolsHelper";

export type { CashFlow, CashFlowStats, CashFlowQueryParams };

export interface CashFlowsState {
  cashFlows: CashFlow[];
  cashFlow: CashFlow | null;
  stats: CashFlowStats;
  labels: string[];
  dailyStats: Record<string, any> | null;
  monthlyStats: Record<string, any> | null;
  query: CashFlowQueryParams;
  isCashFlow: boolean;
  isCashFlowAdd: boolean;
  isCashFlowAdded: boolean;
  isCashFlowChange: boolean;
  isCashFlowChanged: boolean;
  isCashFlowDelete: boolean;
  isCashFlowDeleted: boolean;
  isCashFlowDeleteAll: boolean;
  isCashFlowDeletedAll: boolean;
}

export const useCashFlowsStore = defineStore("cashFlows", {
  state: (): CashFlowsState => ({
    cashFlows: [],
    cashFlow: null,
    stats: emptyStats(),
    labels: [],
    dailyStats: null,
    monthlyStats: null,
    query: {},
    isCashFlow: false,
    isCashFlowAdd: false,
    isCashFlowAdded: false,
    isCashFlowChange: false,
    isCashFlowChanged: false,
    isCashFlowDelete: false,
    isCashFlowDeleted: false,
    isCashFlowDeleteAll: false,
    isCashFlowDeletedAll: false,
  }),
  actions: {
    setCashFlows(cashFlows: CashFlow[]) {
      this.cashFlows = cashFlows;
    },
    setCashFlow(cashFlow: CashFlow | null) {
      this.cashFlow = cashFlow;
    },
    setStats(stats: CashFlowStats) {
      this.stats = stats;
    },
    setLabels(labels: string[]) {
      this.labels = labels;
    },
    setIsCashFlow(status: boolean) {
      this.isCashFlow = status;
    },
    setIsCashFlowAdd(status: boolean) {
      this.isCashFlowAdd = status;
    },
    setIsCashFlowAdded(status: boolean) {
      this.isCashFlowAdded = status;
    },
    setIsCashFlowChange(status: boolean) {
      this.isCashFlowChange = status;
    },
    setIsCashFlowChanged(status: boolean) {
      this.isCashFlowChanged = status;
    },
    setIsCashFlowDelete(status: boolean) {
      this.isCashFlowDelete = status;
    },
    setIsCashFlowDeleted(status: boolean) {
      this.isCashFlowDeleted = status;
    },
    setIsCashFlowDeleteAll(status: boolean) {
      this.isCashFlowDeleteAll = status;
    },
    setIsCashFlowDeletedAll(status: boolean) {
      this.isCashFlowDeletedAll = status;
    },
    async asyncSetCashFlows(params: CashFlowQueryParams = {}): Promise<void> {
      this.query = params;
      try {
        const result = await cashFlowApi.getCashFlows(params);
        this.setCashFlows(result.cashFlows);
        this.setStats(result.stats);
      } catch (error) {
        this.setCashFlows([]);
        this.setStats(emptyStats());
      }
    },
    async asyncReloadCashFlows(): Promise<void> {
      await this.asyncSetCashFlows(this.query);
    },
    async asyncSetCashFlow(cashFlowId: number | string): Promise<void> {
      try {
        const cashFlow = await cashFlowApi.getCashFlowById(cashFlowId);
        this.setCashFlow(cashFlow || null);
      } catch (error) {
        this.setCashFlow(null);
      } finally {
        this.setIsCashFlow(true);
      }
    },
    async asyncSetLabels(): Promise<void> {
      try {
        this.setLabels(await cashFlowApi.getLabels());
      } catch (error) {
        this.setLabels([]);
      }
    },
    async asyncSetStats(period: "daily" | "monthly" = "daily"): Promise<void> {
      try {
        const data = await cashFlowApi.getStats(period);
        if (period === "daily") {
          this.dailyStats = data;
        } else {
          this.monthlyStats = data;
        }
      } catch (error) {
        if (period === "daily") {
          this.dailyStats = null;
        } else {
          this.monthlyStats = null;
        }
      }
    },
    async asyncSetIsCashFlowAdd(input: CashFlowInput): Promise<void> {
      try {
        await cashFlowApi.postCashFlow(input);
        showSuccessDialog("Arus kas berhasil ditambahkan!");
        this.setIsCashFlowAdded(true);
      } catch (error: any) {
        showErrorDialog(error.message);
        this.setIsCashFlowAdded(false);
      } finally {
        this.setIsCashFlowAdd(true);
      }
    },
    async asyncSetIsCashFlowChange(cashFlowId: number | string, input: CashFlowInput): Promise<void> {
      try {
        const message = await cashFlowApi.putCashFlow(cashFlowId, input);
        showSuccessDialog(message || "Arus kas berhasil diperbarui!");
        this.setIsCashFlowChanged(true);
      } catch (error: any) {
        showErrorDialog(error.message);
        this.setIsCashFlowChanged(false);
      } finally {
        this.setIsCashFlowChange(true);
      }
    },
    async asyncSetIsCashFlowDelete(cashFlowId: number | string): Promise<void> {
      try {
        const message = await cashFlowApi.deleteCashFlow(cashFlowId);
        showSuccessDialog(message || "Arus kas berhasil dihapus!");
        this.setIsCashFlowDeleted(true);
      } catch (error: any) {
        showErrorDialog(error.message);
        this.setIsCashFlowDeleted(false);
      } finally {
        this.setIsCashFlowDelete(true);
      }
    },
    async asyncSetIsCashFlowDeleteAll(): Promise<void> {
      try {
        const message = await cashFlowApi.deleteAllCashFlows();
        showSuccessDialog(message || "Semua arus kas berhasil direset!");
        this.setIsCashFlowDeletedAll(true);
      } catch (error: any) {
        showErrorDialog(error.message);
        this.setIsCashFlowDeletedAll(false);
      } finally {
        this.setIsCashFlowDeleteAll(true);
      }
    },
  },
});
