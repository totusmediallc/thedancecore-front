<script setup lang="ts">
import type { SettingsPayload } from '@/api/admin/settings';

import { onMounted, reactive, ref } from 'vue';

import { getSettings, saveSettings } from '@/api/admin/settings';
import { notification } from 'ant-design-vue';

const loading = ref(false);
const formState = reactive<SettingsPayload>({
  siteTitle: 'The Dance Core Admin',
  notifications: true,
  timezone: 'UTC',
});

async function load() {
  loading.value = true;
  try {
    const data = await getSettings();
    Object.assign(formState, data);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function onSubmit() {
  loading.value = true;
  try {
    await saveSettings(formState);
    notification.success({
      message: 'Guardado',
      description: 'Configuración guardada',
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="bg-card max-w-3xl rounded-md p-4">
    <a-form layout="vertical">
      <a-form-item
        label="Título del sitio"
        name="siteTitle"
        :rules="[{ required: true, message: 'Requerido' }]"
      >
        <a-input v-model:value="formState.siteTitle" />
      </a-form-item>
      <a-form-item label="Notificaciones" name="notifications">
        <a-switch v-model:checked="formState.notifications" />
      </a-form-item>
      <a-form-item label="Zona horaria" name="timezone">
        <a-select
          v-model:value="formState.timezone"
          :options="[
            { label: 'UTC', value: 'UTC' },
            { label: 'America/Bogota', value: 'America/Bogota' },
            { label: 'America/Mexico_City', value: 'America/Mexico_City' },
            { label: 'Europe/Madrid', value: 'Europe/Madrid' },
          ]"
        />
      </a-form-item>
      <div class="flex justify-end">
        <a-button type="primary" :loading="loading" @click="onSubmit">
          Guardar
        </a-button>
      </div>
    </a-form>
  </div>
</template>

<style scoped></style>
