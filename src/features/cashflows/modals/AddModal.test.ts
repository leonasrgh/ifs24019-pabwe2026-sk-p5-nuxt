import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import AddModal from "./AddModal.vue";
import { renderWithProviders } from "../../../test-utils";
import * as toolsHelper from "../../../helpers/toolsHelper";

const TID = (id: string) => `[data-testid="${id}"]`;

async function fill(wrapper: any, v: { type?: string; source?: string; label?: string; nominal?: string; description?: string }) {
  if (v.type !== undefined) await wrapper.find(TID("add-cash-flow-type-select")).setValue(v.type);
  if (v.source !== undefined) await wrapper.find(TID("add-cash-flow-source-select")).setValue(v.source);
  if (v.label !== undefined) await wrapper.find(TID("add-cash-flow-label-input")).setValue(v.label);
  if (v.nominal !== undefined) await wrapper.find(TID("add-cash-flow-nominal-input")).setValue(v.nominal);
  if (v.description !== undefined) await wrapper.find(TID("add-cash-flow-description-input")).setValue(v.description);
}

describe("AddModal", () => {
  let errorSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    errorSpy = vi.spyOn(toolsHelper, "showErrorDialog").mockImplementation(() => Promise.resolve({} as any));
  });

  it("should not render when show is false", () => {
    const { wrapper } = renderWithProviders(AddModal, { props: { show: false } });
    expect(wrapper.find(TID("add-cash-flow-modal")).exists()).toBe(false);
  });

  it("should render defaults and toggle body scroll lock, loading labels when shown", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(AddModal, { props: { show: false } });
    const labels = vi.spyOn(cashFlowsStore, "asyncSetLabels").mockImplementation(async () => {});

    await wrapper.setProps({ show: true });
    expect(wrapper.find(TID("add-cash-flow-type-select")).element.value).toBe("inflow");
    expect(wrapper.find(TID("add-cash-flow-source-select")).element.value).toBe("cash");
    expect(document.body.style.overflow).toBe("hidden");
    expect(labels).toHaveBeenCalledTimes(1);

    await wrapper.setProps({ show: false });
    expect(document.body.style.overflow).toBe("auto");
  });

  it("should suggest existing labels", async () => {
    const { wrapper } = renderWithProviders(AddModal, { props: { show: true }, preloadedState: { labels: ["gaji", "makan"] } });
    expect(wrapper.findAll("datalist option").map((o: any) => o.attributes("value"))).toEqual(["gaji", "makan"]);
  });

  it("should validate label, nominal and description in order", async () => {
    const { wrapper } = renderWithProviders(AddModal, { props: { show: true } });
    const submit = () => wrapper.find("form").trigger("submit");

    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Label tidak boleh kosong");

    await fill(wrapper, { label: "gaji" });
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Nominal harus lebih dari 0");

    await fill(wrapper, { nominal: "0" });
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Nominal harus lebih dari 0");

    await fill(wrapper, { nominal: "50000" });
    await submit();
    expect(errorSpy).toHaveBeenLastCalledWith("Keterangan tidak boleh kosong");
  });

  it("should submit trimmed values with chosen type and source and show loading", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(AddModal, { props: { show: true } });
    const addSpy = vi.spyOn(cashFlowsStore, "asyncSetIsCashFlowAdd").mockImplementation(async () => {});

    await fill(wrapper, { type: "outflow", source: "savings", label: "  makan  ", nominal: "25000", description: "  Makan siang  " });
    await wrapper.find("form").trigger("submit");

    expect(addSpy).toHaveBeenCalledWith({
      type: "outflow", source: "savings", label: "makan", nominal: 25000, description: "Makan siang",
    });
    expect(wrapper.text()).toContain("Menyimpan...");
    expect(wrapper.find(TID("submit-add-modal-btn")).attributes("disabled")).toBeDefined();
  });

  it("should emit saved and close, and reset the form when add succeeded", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(AddModal, { props: { show: true } });
    vi.spyOn(cashFlowsStore, "asyncSetIsCashFlowAdd").mockImplementation(async () => {});

    await fill(wrapper, { type: "outflow", label: "x", nominal: "1", description: "y" });
    await wrapper.find("form").trigger("submit");

    cashFlowsStore.setIsCashFlowAdded(true);
    cashFlowsStore.setIsCashFlowAdd(true);
    await nextTick();

    expect(wrapper.emitted("saved")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
    expect(cashFlowsStore.isCashFlowAdd).toBe(false);
    expect(cashFlowsStore.isCashFlowAdded).toBe(false);
    expect(wrapper.find(TID("add-cash-flow-type-select")).element.value).toBe("inflow");
    expect(wrapper.find(TID("add-cash-flow-label-input")).element.value).toBe("");
  });

  it("should stay open when add finished but failed", async () => {
    const { wrapper, cashFlowsStore } = renderWithProviders(AddModal, { props: { show: true } });
    cashFlowsStore.setIsCashFlowAdded(false);
    cashFlowsStore.setIsCashFlowAdd(true);
    await nextTick();
    expect(wrapper.emitted("saved")).toBeUndefined();
    expect(wrapper.emitted("close")).toBeUndefined();
    expect(cashFlowsStore.isCashFlowAdd).toBe(false);
  });

  it("should emit close from close and cancel buttons and ignore panel clicks", async () => {
    const { wrapper } = renderWithProviders(AddModal, { props: { show: true } });
    await wrapper.find(TID("close-add-modal-btn")).trigger("click");
    await wrapper.find(TID("cancel-add-modal-btn")).trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);

    (wrapper.find(TID("add-cash-flow-modal")).element.firstElementChild as HTMLElement).click();
    expect(wrapper.emitted("close")).toHaveLength(2);
  });
});
