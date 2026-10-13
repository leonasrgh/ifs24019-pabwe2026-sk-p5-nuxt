import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import ChangeModal from "./ChangeModal.vue";
import { renderWithProviders } from "../../../test-utils";
import * as toolsHelper from "../../../helpers/toolsHelper";

const TID = (id: string) => `[data-testid="${id}"]`;
const item: any = { id: 5, type: "outflow", source: "savings", label: "makan", nominal: 25000, description: "Makan siang" };

describe("ChangeModal", () => {
  let errorSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    errorSpy = vi.spyOn(toolsHelper, "showErrorDialog").mockImplementation(() => Promise.resolve({} as any));
  });

  it("should not render when hidden or without a cash flow", () => {
    expect(renderWithProviders(ChangeModal, { props: { show: false, cashFlow: item } }).wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(false);
    expect(renderWithProviders(ChangeModal, { props: { show: true, cashFlow: null } }).wrapper.find(TID("edit-cash-flow-modal")).exists()).toBe(false);
  });

  it("should prefill every field from the cash flow", () => {
    const { wrapper } = renderWithProviders(ChangeModal, { props: { show: true, cashFlow: item } });
    expect(wrapper.find(TID("edit-cash-flow-type-select")).element.value).toBe("outflow");
    expect(wrapper.find(TID("edit-cash-flow-source-select")).element.value).toBe("savings");
    expect(wrapper.find(TID("edit-cash-flow-label-input")).element.value).toBe("makan");
    expect(wrapper.find(TID("edit-cash-flow-nominal-input")).element.value).toBe("25000");
    expect(wrapper.find(TID("edit-cash-flow-description-input")).element.value).toBe("Makan siang");
  });

  it("should suggest existing labels", () => {
    const { wrapper } = renderWithProviders(ChangeModal, {
      props: { show: true, cashFlow: item },
      preloadedState: { labels: ["gaji", "makan"] },
    });
    expect(wrapper.findAll("datalist option").map((o: any) => o.attributes("value"))).toEqual(["gaji", "makan"]);
  });

  it("should fall back to empty strings for missing label and description", () => {
    const { wrapper } = renderWithProviders(ChangeModal, {
      props: { show: true, cashFlow: { ...item, label: null, description: null } },
    });
    expect(wrapper.find(TID("edit-cash-flow-label-input")).element.value).toBe("");
    expect(wrapper.find(TID("edit-cash-flow-description-input")).element.value).toBe("");
  });

  it("should refill when the cash flow changes and toggle body scroll lock", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(ChangeModal, { props: { show: false, cashFlow: item } });
    const labels = vi.spyOn(cashFlowsStore, "asyncSetLabels").mockImplementation(async () => {});

    await wrapper.setProps({ show: true });
    expect(document.body.style.overflow).toBe("hidden");
    expect(labels).toHaveBeenCalled();

    await wrapper.setProps({ cashFlow: { ...item, label: "baru" } });
    expect(wrapper.find(TID("edit-cash-flow-label-input")).element.value).toBe("baru");

    await wrapper.setProps({ show: false });
    expect(document.body.style.overflow).toBe("auto");
  });

  it("should validate label, nominal and description in order", async () => {
    const { wrapper } = renderWithProviders(ChangeModal, { props: { show: true, cashFlow: item } });
    const submit = () => wrapper.find("form").trigger("submit");

    await wrapper.find(TID("edit-cash-flow-label-input")).setValue("  ");
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Label tidak boleh kosong");

    await wrapper.find(TID("edit-cash-flow-label-input")).setValue("makan");
    await wrapper.find(TID("edit-cash-flow-nominal-input")).setValue("-5");
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Nominal harus lebih dari 0");

    await wrapper.find(TID("edit-cash-flow-nominal-input")).setValue("");
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Nominal harus lebih dari 0");

    await wrapper.find(TID("edit-cash-flow-nominal-input")).setValue("100");
    await wrapper.find(TID("edit-cash-flow-description-input")).setValue(" ");
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Keterangan tidak boleh kosong");
  });

  it("should submit edited values and show loading", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(ChangeModal, { props: { show: true, cashFlow: item } });
    const changeSpy = vi.spyOn(cashFlowsStore, "asyncSetIsCashFlowChange").mockImplementation(async () => {});

    await wrapper.find(TID("edit-cash-flow-type-select")).setValue("inflow");
    await wrapper.find(TID("edit-cash-flow-source-select")).setValue("loans");
    await wrapper.find(TID("edit-cash-flow-nominal-input")).setValue("30000");
    await wrapper.find("form").trigger("submit");

    expect(changeSpy).toHaveBeenCalledWith(5, {
      type: "inflow", source: "loans", label: "makan", nominal: 30000, description: "Makan siang",
    });
    expect(wrapper.text()).toContain("Menyimpan...");
  });

  it("should emit saved and close when change succeeded, and stay open on failure", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(ChangeModal, { props: { show: true, cashFlow: item } });

    cashFlowsStore.setIsCashFlowChanged(false);
    cashFlowsStore.setIsCashFlowChange(true);
    await nextTick();
    expect(wrapper.emitted("saved")).toBeUndefined();

    cashFlowsStore.setIsCashFlowChanged(true);
    cashFlowsStore.setIsCashFlowChange(true);
    await nextTick();
    expect(wrapper.emitted("saved")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(cashFlowsStore.isCashFlowChanged).toBe(false);
  });

  it("should emit close from close and cancel buttons", async () => {
    const { wrapper } = renderWithProviders(ChangeModal, { props: { show: true, cashFlow: item } });
    await wrapper.find(TID("close-edit-modal-btn")).trigger("click");
    await wrapper.find(TID("cancel-edit-modal-btn")).trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });
});
