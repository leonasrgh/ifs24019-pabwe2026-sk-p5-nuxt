import { describe, it, expect } from "vitest";
import routerOptions from "./router.options";
import { routes } from "./routes";

describe("router.options", () => {
  it("should supply the routes declared in routes.ts", () => {
    expect((routerOptions as any).routes()).toBe(routes);
  });

  it("should declare auth routes wrapped by the auth layout", () => {
    const auth = routes.find((route) => route.path === "/auth")!;
    expect(auth.children!.map((child) => child.path)).toEqual(["login", "register"]);
    expect(auth.children!.map((child) => child.name)).toEqual(["login", "register"]);
  });

  it("should declare protected dashboard routes including the cash flow detail", () => {
    const dashboard = routes.find((route) => route.path === "/")!;
    expect(dashboard.children!.map((child) => child.path)).toEqual([
      "",
      "cash-flows/:cashFlowId",
      "users",
      "profile",
    ]);
    expect(dashboard.children!.find((child) => child.name === "cash-flow-detail")).toBeDefined();
  });

  it("should end with a catch-all 404 route", () => {
    const last = routes[routes.length - 1];
    expect(last.name).toBe("not-found");
    expect(last.path).toBe("/:pathMatch(.*)*");
  });
});
