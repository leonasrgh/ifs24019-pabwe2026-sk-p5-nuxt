import { describe, it, expect } from "vitest";
import { flushPromises } from "@vue/test-utils";
import SidebarComponent from "./SidebarComponent.vue";
import { renderWithProviders } from "../../../test-utils";

async function renderAt(path: string, props: Record<string, any> = {}) {
  const result = renderWithProviders(SidebarComponent, { props });
  await result.router.push(path);
  await flushPromises();
  return result;
}

function activeLabels(wrapper: any) {
  return wrapper
    .findAll("a")
    .filter((a: any) => a.classes().includes("bg-indigo-600"))
    .map((a: any) => a.text());
}

describe("SidebarComponent", () => {
  it("should render all navigation items with correct hrefs", async () => {
    const { wrapper } = await renderAt("/");
    expect(wrapper.findAll("a").map((a: any) => a.attributes("href"))).toEqual(["/", "/users", "/profile"]);
    expect(wrapper.text()).toContain("Ringkasan Arus Kas");
    expect(wrapper.text()).toContain("Direktori Pengguna");
    expect(wrapper.text()).toContain("Profil Saya");
    expect(wrapper.find('[data-testid="sidebar-backdrop"]').exists()).toBe(false);
  });

  it.each([
    ["/", "Ringkasan Arus Kas"],
    ["/cash-flows/5", "Ringkasan Arus Kas"],
    ["/users", "Direktori Pengguna"],
    ["/profile", "Profil Saya"],
  ])("should mark the right item active for %s", async (path, label) => {
    const { wrapper } = await renderAt(path);
    expect(activeLabels(wrapper)).toEqual([label]);
  });

  it("should show backdrop when open and emit close-mobile on backdrop and link click", async () => {
    const { wrapper } = await renderAt("/", { isSidebarOpen: true });

    await wrapper.find('[data-testid="sidebar-backdrop"]').trigger("click");
    expect(wrapper.emitted("close-mobile")).toHaveLength(1);

    await wrapper.findAll("a")[2].trigger("click");
    await flushPromises();
    expect(wrapper.emitted("close-mobile")).toHaveLength(2);
  });
});
