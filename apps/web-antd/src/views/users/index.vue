<script setup lang="ts">
import type { VbenFormProps } from '@/adapter/form';

import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { reactive, ref } from 'vue';

import { useVbenVxeGrid } from '@/adapter/vxe-table';
import { createUser, listUsers, updateUser } from '@/api/admin/users';

import UserModal from './UserModal.vue';

interface RowType {
  id: number;
  name: string;
  email: string;
  role: string;
}

const showModal = ref(false);
const modalTitle = ref('');
const editing = ref<null | Partial<RowType>>(null);

function openCreate() {
  modalTitle.value = 'Crear usuario';
  editing.value = null;
  showModal.value = true;
}

function openEdit(row: RowType) {
  modalTitle.value = 'Editar usuario';
  editing.value = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
  showModal.value = true;
}

async function handleSubmit(payload: Partial<RowType>) {
  await (editing.value?.id
    ? updateUser(editing.value.id, payload)
    : createUser(payload));
  showModal.value = false;
  gridApi.reload();
}

const formOptions: VbenFormProps = {
  collapsed: false,
  showCollapseButton: false,
  schema: [
    { fieldName: 'name', label: 'Nombre', component: 'Input' },
    { fieldName: 'email', label: 'Email', component: 'Input' },
    {
      fieldName: 'role',
      label: 'Rol',
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Manager', value: 'manager' },
          { label: 'User', value: 'user' },
        ],
      },
    },
  ],
};

const gridOptions = reactive<VxeTableGridOptions<RowType>>({
  columns: [
    { type: 'checkbox', width: 48 },
    { type: 'seq', width: 60, title: '#' },
    { field: 'name', title: 'Nombre', minWidth: 160 },
    { field: 'email', title: 'Email', minWidth: 200 },
    { field: 'role', title: 'Rol', width: 120 },
  ],
  pagerConfig: {},
  toolbarConfig: {
    buttons: [
      {
        content: 'Crear usuario',
        buttonRender: {
          name: 'AButton',
          props: { type: 'primary' },
          events: { click: openCreate },
        },
      },
    ],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues: Record<string, any>) => {
        const { items, total } = await listUsers({
          page: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        });
        return { items, total };
      },
    },
  },
});

const gridEvents = {
  // Editar con doble click en el nombre
  cellDblclick({ column, row }: any) {
    if (column.field === 'name') openEdit(row as RowType);
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions,
  formOptions,
  gridEvents,
});
</script>

<template>
  <Grid class="bg-background" />
  <UserModal
    :open="showModal"
    :title="modalTitle"
    :model="editing"
    @submit="handleSubmit"
    @cancel="() => (showModal = false)"
  />
</template>

<style scoped></style>
