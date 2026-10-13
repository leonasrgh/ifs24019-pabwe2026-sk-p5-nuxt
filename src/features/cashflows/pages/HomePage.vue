<template>
  <div v-if="profile" class="space-y-6 animate-in fade-in duration-300">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ringkasan Arus Kas</h1>
        <p class="text-sm text-slate-600 mt-1">Pantau pemasukan, pengeluaran, dan saldo dari setiap sumber dana.</p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          type="button"
          data-testid="reset-cash-flows-btn"
          @click="handleResetAll"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
        >
          <RotateCcw :size="16" />
          <span>Reset Semua</span>
        </button>
        <button
          type="button"
          data-testid="add-cash-flow-btn"
          @click="showAddModal = true"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all"
        >
          <Plus :size="18" :stroke-width="2.5" />
          <span>Catat Transaksi</span>
        </button>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="card in cards"
        :key="card.id"
        class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-600">{{ card.label }}</p>
        <p :data-testid="`stat-${card.id}`" class="text-xl sm:text-2xl font-black mt-1" :class="card.color">
          {{ formatRupiah(card.value) }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label for="filter-type" class="block text-xs font-semibold text-slate-600 mb-1">Jenis</label>
          <select
            id="filter-type"
            data-testid="filter-type-select"
            v-model="filters.type"
            class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Semua Jenis</option>
            <option value="inflow">Pemasukan</option>
            <option value="outflow">Pengeluaran</option>
          </select>
        </div>
        <div>
          <label for="filter-source" class="block text-xs font-semibold text-slate-600 mb-1">Sumber Dana</label>
          <select
            id="filter-source"
            data-testid="filter-source-select"
            v-model="filters.source"
            class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Semua Sumber</option>
            <option value="cash">Tunai</option>
            <option value="savings">Tabungan</option>
            <option value="loans">Pinjaman</option>
          </select>
        </div>
        <div>
          <label for="filter-label" class="block text-xs font-semibold text-slate-600 mb-1">Label</label>
          <select
            id="filter-label"
            data-testid="filter-label-select"
            v-model="filters.label"
            class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Semua Label</option>
            <option v-for="item in cashFlowsStore.labels" :key="item" :value="item">{{ item }}</option>
          </select>
        </div>
        <div>
          <label for="filter-start-date" class="block text-xs font-semibold text-slate-600 mb-1">Dari Tanggal</label>
          <input
            id="filter-start-date"
            type="date"
            data-testid="filter-start-date-input"
            v-model="filters.start_date"
            class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label for="filter-end-date" class="block text-xs font-semibold text-slate-600 mb-1">Sampai Tanggal</label>
          <input
            id="filter-end-date"
            type="date"
            data-testid="filter-end-date-input"
            v-model="filters.end_date"
            class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <button
          type="button"
          data-testid="clear-filters-btn"
          @click="clearFilters"
          class="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Hapus Filter
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50/80 text-xs uppercase tracking-wider font-semibold text-slate-600 border-b border-slate-100">
            <tr>
              <th class="px-5 py-3.5">Label</th>
              <th class="px-5 py-3.5">Jenis</th>
              <th class="px-5 py-3.5 hidden md:table-cell">Sumber</th>
              <th class="px-5 py-3.5">Nominal</th>
              <th class="px-5 py-3.5 hidden lg:table-cell">Tanggal</th>
              <th class="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading && cashFlows.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-600">
                <Loader2 :size="36" class="mx-auto text-indigo-600 animate-spin mb-2" />
                <p class="font-medium">Memuat arus kas...</p>
              </td>
            </tr>
            <tr v-else-if="cashFlows.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-slate-600">
                <Wallet :size="40" class="mx-auto text-slate-400 mb-2" />
                <p class="font-medium">Belum ada catatan arus kas.</p>
              </td>
            </tr>
            <template v-else>
            <tr
              v-for="item in cashFlows"
              :key="`cash-flow-${item.id}`"
              :data-testid="`cash-flow-row-${item.id}`"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <td class="px-5 py-4">
                <p class="font-semibold text-slate-800">{{ item.label }}</p>
                <p v-if="item.description" class="text-xs text-slate-600 line-clamp-1 mt-0.5">{{ item.description }}</p>
              </td>
              <td class="px-5 py-4">
                <span
                  :data-testid="`type-badge-${item.id}`"
                  class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border"
                  :class="
                    item.type === 'inflow'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      : 'bg-red-50 text-red-700 border-red-200/60'
                  "
                >
                  {{ typeLabel(item.type) }}
                </span>
              </td>
              <td class="px-5 py-4 hidden md:table-cell text-xs">{{ sourceLabel(item.source) }}</td>
              <td
                :data-testid="`nominal-${item.id}`"
                class="px-5 py-4 font-bold"
                :class="item.type === 'inflow' ? 'text-emerald-700' : 'text-red-700'"
              >
                {{ item.type === "inflow" ? "+" : "-" }}{{ formatRupiah(item.nominal) }}
              </td>
              <td class="px-5 py-4 hidden lg:table-cell text-xs">{{ formatDate(item.created_at) }}</td>
              <td class="px-5 py-4 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    :data-testid="`view-cash-flow-${item.id}`"
                    aria-label="Lihat detail"
                    @click="router.push(`/cash-flows/${item.id}`)"
                    class="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Eye :size="18" />
                  </button>
                  <button
                    type="button"
                    :data-testid="`edit-cash-flow-${item.id}`"
                    aria-label="Ubah transaksi"
                    @click="selectedCashFlow = item"
                    class="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Pencil :size="18" />
                  </button>
                  <button
                    type="button"
                    :data-testid="`delete-cash-flow-${item.id}`"
                    aria-label="Hapus transaksi"
                    @click="handleDelete(item.id)"
                    class="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 :size="18" />
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <AddModal :show="showAddModal" @close="showAddModal = false" @saved="onSaved" />
    <ChangeModal
      :show="Boolean(selectedCashFlow)"
      :cash-flow="selectedCashFlow"
      @close="selectedCashFlow = null"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import AddModal from "../modals/AddModal.vue";
import ChangeModal from "../modals/ChangeModal.vue";
import { useCashFlowsStore, type CashFlow } from "../states/cashFlowsStore";
import { useUsersStore } from "../../users/states/usersStore";
import { formatDate, formatRupiah, showConfirmDialog } from "../../../helpers/toolsHelper";
import { sourceLabel, typeLabel } from "../labels";
import { Plus, Wallet, Eye, Pencil, Trash2, Loader2, RotateCcw } from "lucide-vue-next";

const router = useRouter();
const cashFlowsStore = useCashFlowsStore();
const usersStore = useUsersStore();

const profile = computed(() => usersStore.profile);
const cashFlows = computed(() => cashFlowsStore.cashFlows);
const stats = computed(() => cashFlowsStore.stats);

const loading = ref(false);
const showAddModal = ref(false);
const selectedCashFlow = ref<CashFlow | null>(null);
const filters = reactive({ type: "", source: "", label: "", start_date: "", end_date: "" });

let isMounted = true;
onBeforeUnmount(() => {
  isMounted = false;
});

const cards = computed(() => [
  { id: "balance", label: "Saldo Bersih", value: stats.value.total_inflow - stats.value.total_outflow, color: "text-slate-900" },
  { id: "inflow", label: "Total Pemasukan", value: stats.value.total_inflow, color: "text-emerald-700" },
  { id: "outflow", label: "Total Pengeluaran", value: stats.value.total_outflow, color: "text-red-700" },
  { id: "cash", label: "Saldo Tunai", value: stats.value.cash, color: "text-slate-900" },
  { id: "savings", label: "Saldo Tabungan", value: stats.value.savings, color: "text-slate-900" },
  { id: "loans", label: "Saldo Pinjaman", value: stats.value.loans, color: "text-slate-900" },
]);

function load() {
  loading.value = true;
  return Promise.resolve(cashFlowsStore.asyncSetCashFlows({ ...filters })).finally(() => {
    if (isMounted) loading.value = false;
  });
}

watch(filters, load, { deep: true, immediate: true });

onMounted(() => {
  cashFlowsStore.asyncSetLabels();
});

watch(
  () => [cashFlowsStore.isCashFlowDelete, cashFlowsStore.isCashFlowDeleted] as const,
  ([isDelete, isDeleted]) => {
    if (isDelete) {
      cashFlowsStore.setIsCashFlowDelete(false);
      if (isDeleted) {
        cashFlowsStore.setIsCashFlowDeleted(false);
        cashFlowsStore.asyncReloadCashFlows();
        cashFlowsStore.asyncSetLabels();
      }
    }
  }
);

watch(
  () => [cashFlowsStore.isCashFlowDeleteAll, cashFlowsStore.isCashFlowDeletedAll] as const,
  ([isDeleteAll, isDeletedAll]) => {
    if (isDeleteAll) {
      cashFlowsStore.setIsCashFlowDeleteAll(false);
      if (isDeletedAll) {
        cashFlowsStore.setIsCashFlowDeletedAll(false);
        cashFlowsStore.asyncReloadCashFlows();
        cashFlowsStore.asyncSetLabels();
      }
    }
  }
);

function onSaved() {
  cashFlowsStore.asyncReloadCashFlows();
  cashFlowsStore.asyncSetLabels();
}

function clearFilters() {
  filters.type = "";
  filters.source = "";
  filters.label = "";
  filters.start_date = "";
  filters.end_date = "";
}

async function handleDelete(cashFlowId: number) {
  const result = await showConfirmDialog("Apakah Anda yakin ingin menghapus transaksi ini?");
  if (result.isConfirmed) {
    cashFlowsStore.asyncSetIsCashFlowDelete(cashFlowId);
  }
}

async function handleResetAll() {
  const result = await showConfirmDialog(
    "Apakah Anda yakin ingin mereset SEMUA catatan arus kas Anda? Tindakan ini tidak dapat dibatalkan."
  );
  if (result.isConfirmed) {
    cashFlowsStore.asyncSetIsCashFlowDeleteAll();
  }
}
</script>
