const SOURCE_LABELS: Record<string, string> = {
  cash: "Tunai",
  savings: "Tabungan",
  loans: "Pinjaman",
};

export function sourceLabel(source: string | null | undefined): string {
  return SOURCE_LABELS[source as string] || source || "-";
}

export function typeLabel(type: string | null | undefined): string {
  return type === "inflow" ? "Pemasukan" : "Pengeluaran";
}
