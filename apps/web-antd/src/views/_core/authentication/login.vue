<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const isBypass = import.meta.env.VITE_BYPASS_LOGIN === 'true';

const formSchema = computed((): VbenFormSchema[] => {
  const isMock = import.meta.env.VITE_NITRO_MOCK === 'true';
  return [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: isMock ? 'Email o usuario' : 'Email',
      },
      fieldName: 'email',
      label: isMock ? 'Email o usuario' : 'Email',
      rules: isMock
        ? z.string().min(1, { message: 'Campo requerido' })
        : z
            .string()
            .min(1, { message: 'Email requerido' })
            .email('Email inválido'),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="
      (values: any) =>
        authStore.authLogin({ email: values.email, password: values.password })
    "
  />
  <div v-if="isBypass" class="mt-4 text-center">
    <a-button
      type="link"
      @click="authStore.authLogin({ email: 'demo@local', password: 'demo' })"
    >
      Entrar demo (sin backend)
    </a-button>
  </div>
</template>
