<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import VChart from 'vue-echarts';

import {
  getActiveUsersReport,
  getSalesReport,
  getUsersByRoleReport,
} from '@/api/admin/reports';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent,
]);

const sales = ref<{ date: string; value: number }[]>([]);
const usersByRole = ref<{ name: string; value: number }[]>([]);
const active = ref<{ date: string; value: number }[]>([]);

onMounted(async () => {
  [sales.value, usersByRole.value, active.value] = await Promise.all([
    getSalesReport(),
    getUsersByRoleReport(),
    getActiveUsersReport(),
  ]);
});

const salesOptions = computed(() => ({
  title: { text: 'Ventas' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: sales.value.map((d) => d.date) },
  yAxis: { type: 'value' },
  series: [
    { name: 'Ventas', type: 'line', data: sales.value.map((d) => d.value) },
  ],
}));

const usersByRoleOptions = computed(() => ({
  title: { text: 'Usuarios por rol' },
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: '60%',
      data: usersByRole.value,
    },
  ],
}));

const activeOptions = computed(() => ({
  title: { text: 'Usuarios activos' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: active.value.map((d) => d.date) },
  yAxis: { type: 'value' },
  series: [
    { name: 'Activos', type: 'bar', data: active.value.map((d) => d.value) },
  ],
}));
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div class="bg-card col-span-1 rounded-md p-4 lg:col-span-2">
      <VChart :option="salesOptions" style="height: 360px" />
    </div>
    <div class="bg-card rounded-md p-4">
      <VChart :option="usersByRoleOptions" style="height: 360px" />
    </div>
    <div class="bg-card rounded-md p-4 lg:col-span-3">
      <VChart :option="activeOptions" style="height: 360px" />
    </div>
  </div>
</template>

<style scoped></style>
