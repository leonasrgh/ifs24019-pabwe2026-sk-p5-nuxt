<template>
  <div v-if="!profile || !cashFlow" class="flex flex-col items-center justify-center py-20">
    <h1 class="sr-only">Memuat detail arus kas...</h1>
    <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>

  <div v-else class="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <RouterLink
        to="/"
        data-testid="back-to-cash-flows-link"
        class="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft :size="18" />
        Kembali ke Ringkasan
      </RouterLink>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="edit-detail-btn"
          @click="showEditModal = true"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 transition-colors"
        >
          <Edit3 :size="16" />
          Ubah
        </button>
        <button
          type="button"
          data-testid="delete-detail-btn"
          @click="handleDelete"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 transition-colors"
        >
          <Trash2 :size="16" />
          Hapus
        </button>
      </div>
    </div>

    <article class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
      <div class="flex flex-wrap items-center gap-2">
        <span
          data-testid="detail-type-badge"
          class="inline-flex px-3 py-1 rounded-full text-xs font-bold border"
          :class="
            cashFlow.type === 'inflow'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
              : 'bg-red-50 text-red-700 border-red-200/60'
          "
        >
          {{ typeLabel(cashFlow.type) }}
        </span>
        <span data-testid="detail-source" class="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {{ sourceLabel(cashFlow.source) }}
        </span>
      </div>

      <h1 data-testid="detail-title" class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        {{ cashFlow.label }}
      </h1>

      <p
        data-testid="detail-nominal"
        class="text-3xl font-black"
        :class="cashFlow.type === 'inflow' ? 'text-emerald-700' : 'text-red-700'"
      >
        {{ cashFlow.type === "inflow" ? "+" : "-" }}{{ formatRupiah(cashFlow.nominal) }}
      </p>

      <p data-testid="detail-description" class="text-base text-slate-700 leading-relaxed whitespace-pre-line">
        {{ cashFlow.description || "Tidak ada keterangan." }}
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
        <p class="inline-flex items-center gap-2">
          <Calendar :size="16" />
          Dibuat: <span data-testid="detail-created-at" class="font-semibold">{{ formatDate(cashFlow.created_at) }}</span>
        </p>
        <p class="inline-flex items-center gap-2">
          <Calendar :size="16" />
          Diperbarui: <span data-testid="detail-updated-at" class="font-semibold">{{ formatDate(cashFlow.updated_at) }}</span>
        </p>
      </div>
    </article>

    <ChangeModal :show="showEditModal" :cash-flow="cashFlow" @close="showEditModal = false" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import ChangeModal from "../modals/ChangeModal.vue";
import { useCashFlowsStore } from "../states/cashFlowsStore";
import { useUsersStore } from "../../users/states/usersStore";
import { formatDate, formatRupiah, showConfirmDialog } from "../../../helpers/toolsHelper";
import { sourceLabel, typeLabel } from "../labels";
import { ArrowLeft, Edit3, Trash2, Calendar } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const cashFlowsStore = useCashFlowsStore();
const usersStore = useUsersStore();

const cashFlowId = computed(() => route.params.cashFlowId as string);
const profile = computed(() => usersStore.profile);
const cashFlow = computed(() => cashFlowsStore.cashFlow);

const showEditModal = ref(false);

onMounted(() => {
  cashFlowsStore.asyncSetCashFlow(cashFlowId.value);
});

watch(cashFlowId, (newId) => {
  cashFlowsStore.asyncSetCashFlow(newId);
});

watch(
  () => [cashFlowsStore.isCashFlow, cashFlowsStore.cashFlow] as const,
  ([isCashFlow, current]) => {
    if (isCashFlow) {
      cashFlowsStore.setIsCashFlow(false);
      if (!current) {
        router.push("/");
      }
    }
  }
);

watch(
  () => [cashFlowsStore.isCashFlowDelete, cashFlowsStore.isCashFlowDeleted] as const,
  ([isDelete, isDeleted]) => {
    if (isDelete) {
      cashFlowsStore.setIsCashFlowDelete(false);
      if (isDeleted) {
        cashFlowsStore.setIsCashFlowDeleted(false);
        router.push("/");
      }
    }
  }
);

function refresh() {
  cashFlowsStore.asyncSetCashFlow(cashFlowId.value);
}

async function handleDelete() {
  const result = await showConfirmDialog("Apakah Anda yakin ingin menghapus transaksi ini?");
  if (result.isConfirmed) {
    cashFlowsStore.asyncSetIsCashFlowDelete(cashFlow.value!.id);
  }
}
</script>
