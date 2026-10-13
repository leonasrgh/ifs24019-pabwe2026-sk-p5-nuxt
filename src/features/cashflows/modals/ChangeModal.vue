<template>
  <div
    v-if="show && cashFlow"
    data-testid="edit-cash-flow-modal"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
  >
    <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden" @click.stop>
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <Edit3 :size="18" :stroke-width="2.5" />
          </div>
          <h2 class="text-base font-bold text-slate-800">Ubah Transaksi Arus Kas</h2>
        </div>
        <button
          type="button"
          data-testid="close-edit-modal-btn"
          aria-label="Tutup"
          @click="onClose"
          class="p-1.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <X :size="18" />
        </button>
      </div>

      <form @submit.prevent="handleSave" class="p-6 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="edit-cash-flow-type" class="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Arus Kas</label>
            <select
              id="edit-cash-flow-type"
              data-testid="edit-cash-flow-type-select"
              v-model="type"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            >
              <option value="inflow">Inflow (Pemasukan)</option>
              <option value="outflow">Outflow (Pengeluaran)</option>
            </select>
          </div>
          <div>
            <label for="edit-cash-flow-source" class="block text-sm font-semibold text-slate-700 mb-1.5">Sumber Dana</label>
            <select
              id="edit-cash-flow-source"
              data-testid="edit-cash-flow-source-select"
              v-model="source"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            >
              <option value="cash">Tunai</option>
              <option value="savings">Tabungan</option>
              <option value="loans">Pinjaman</option>
            </select>
          </div>
        </div>

        <div>
          <label for="edit-cash-flow-label" class="block text-sm font-semibold text-slate-700 mb-1.5">
            Label Kategori <span class="text-red-500">*</span>
          </label>
          <input
            id="edit-cash-flow-label"
            type="text"
            list="edit-cash-flow-labels"
            data-testid="edit-cash-flow-label-input"
            v-model="label"
            placeholder="Contoh: gaji, makan, transport"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            required
          />
          <datalist id="edit-cash-flow-labels">
            <option v-for="item in cashFlowsStore.labels" :key="item" :value="item" />
          </datalist>
        </div>

        <div>
          <label for="edit-cash-flow-nominal" class="block text-sm font-semibold text-slate-700 mb-1.5">
            Nominal (Rp) <span class="text-red-500">*</span>
          </label>
          <input
            id="edit-cash-flow-nominal"
            type="number"
            min="0"
            data-testid="edit-cash-flow-nominal-input"
            v-model="nominal"
            placeholder="50000"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm"
            required
          />
        </div>

        <div>
          <label for="edit-cash-flow-description" class="block text-sm font-semibold text-slate-700 mb-1.5">
            Keterangan <span class="text-red-500">*</span>
          </label>
          <textarea
            id="edit-cash-flow-description"
            data-testid="edit-cash-flow-description-input"
            v-model="description"
            rows="3"
            placeholder="Catatan singkat transaksi"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm resize-none"
            required
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            data-testid="cancel-edit-modal-btn"
            @click="onClose"
            :disabled="loading"
            class="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            data-testid="submit-edit-modal-btn"
            :disabled="loading"
            class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition-all disabled:opacity-60"
          >
            <template v-if="loading">
              <Loader2 :size="18" class="animate-spin" />
              <span>Menyimpan...</span>
            </template>
            <template v-else>
              <Save :size="18" :stroke-width="2.5" />
              <span>Simpan Perubahan</span>
            </template>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Edit3, Save, X, Loader2 } from "lucide-vue-next";
import { useCashFlowsStore } from "../states/cashFlowsStore";
import { showErrorDialog } from "../../../helpers/toolsHelper";
import type { CashFlow, CashFlowSource, CashFlowType } from "../api/cashFlowApi";

const props = defineProps<{
  show?: boolean;
  cashFlow?: CashFlow | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const cashFlowsStore = useCashFlowsStore();

const loading = ref(false);
const type = ref<CashFlowType>("inflow");
const source = ref<CashFlowSource>("cash");
const label = ref("");
const nominal = ref<number | string>("");
const description = ref("");

function onClose() {
  emit("close");
}

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      document.body.style.overflow = "hidden";
      cashFlowsStore.asyncSetLabels();
    } else {
      document.body.style.overflow = "auto";
    }
  }
);

watch(
  () => [props.cashFlow, props.show] as const,
  ([cashFlow, show]) => {
    if (cashFlow && show) {
      type.value = cashFlow.type;
      source.value = cashFlow.source;
      label.value = cashFlow.label || "";
      nominal.value = cashFlow.nominal;
      description.value = cashFlow.description || "";
    }
  },
  { immediate: true }
);

watch(
  () => [cashFlowsStore.isCashFlowChange, cashFlowsStore.isCashFlowChanged] as const,
  ([isChange, isChanged]) => {
    if (isChange) {
      loading.value = false;
      cashFlowsStore.setIsCashFlowChange(false);
      if (isChanged) {
        cashFlowsStore.setIsCashFlowChanged(false);
        emit("saved");
        onClose();
      }
    }
  }
);

function handleSave() {
  if (!label.value.trim()) {
    showErrorDialog("Label tidak boleh kosong");
    return;
  }

  if (nominal.value === "" || !(Number(nominal.value) > 0)) {
    showErrorDialog("Nominal harus lebih dari 0");
    return;
  }

  if (!description.value.trim()) {
    showErrorDialog("Keterangan tidak boleh kosong");
    return;
  }

  loading.value = true;
  cashFlowsStore.asyncSetIsCashFlowChange(props.cashFlow!.id, {
    type: type.value,
    source: source.value,
    label: label.value.trim(),
    nominal: Number(nominal.value),
    description: description.value.trim(),
  });
}
</script>
