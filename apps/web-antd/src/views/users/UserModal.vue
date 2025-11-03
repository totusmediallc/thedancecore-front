<script setup lang="ts">
import { reactive, watch } from 'vue';

const props = defineProps<{
  loading?: boolean;
  model?: null | { email?: string; id?: number; name?: string; role?: string };
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  cancel: [];
  submit: [payload: { email: string; id?: number; name: string; role: string }];
}>();

const formState = reactive({
  id: undefined as number | undefined,
  name: '',
  email: '',
  role: 'user',
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      Object.assign(
        formState,
        props.model || { name: '', email: '', role: 'user', id: undefined },
      );
    }
  },
);

function onOk() {
  emit('submit', { ...formState });
}
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    :confirm-loading="loading"
    @ok="onOk"
    @cancel="() => emit('cancel')"
  >
    <a-form layout="vertical">
      <a-form-item
        label="Nombre"
        name="name"
        :rules="[{ required: true, message: 'Requerido' }]"
      >
        <a-input v-model:value="formState.name" />
      </a-form-item>
      <a-form-item
        label="Email"
        name="email"
        :rules="[{ type: 'email', required: true, message: 'Email inválido' }]"
      >
        <a-input v-model:value="formState.email" />
      </a-form-item>
      <a-form-item
        label="Rol"
        name="role"
        :rules="[{ required: true, message: 'Requerido' }]"
      >
        <a-select
          v-model:value="formState.role"
          :options="[
            { label: 'Admin', value: 'admin' },
            { label: 'Manager', value: 'manager' },
            { label: 'User', value: 'user' },
          ]"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped></style>
