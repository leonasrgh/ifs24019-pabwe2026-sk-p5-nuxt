import { describe, it, expect } from "vitest";
import { sourceLabel, typeLabel } from "./labels";

describe("labels", () => {
  it("sourceLabel should translate known sources and fall back for others", () => {
    expect(sourceLabel("cash")).toBe("Tunai");
    expect(sourceLabel("savings")).toBe("Tabungan");
    expect(sourceLabel("loans")).toBe("Pinjaman");
    expect(sourceLabel("lainnya")).toBe("lainnya");
    expect(sourceLabel(null)).toBe("-");
    expect(sourceLabel(undefined)).toBe("-");
  });

  it("typeLabel should translate inflow and treat everything else as outflow", () => {
    expect(typeLabel("inflow")).toBe("Pemasukan");
    expect(typeLabel("outflow")).toBe("Pengeluaran");
    expect(typeLabel(undefined)).toBe("Pengeluaran");
  });
});
