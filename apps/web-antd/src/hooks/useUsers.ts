import type { User, UsersQuery } from '@/api/admin/users';

import { ref } from 'vue';

import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '@/api/admin/users';
import { message, Modal } from 'ant-design-vue';

export function useUsers() {
  const loading = ref(false);
  const items = ref<User[]>([]);
  const total = ref(0);
  const query = ref<UsersQuery>({ page: 1, pageSize: 10 });

  async function fetch() {
    loading.value = true;
    try {
      const { items: list, total: t } = await listUsers(query.value);
      items.value = list;
      total.value = t;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: Partial<User>) {
    await createUser(payload);
    message.success('Usuario creado');
    await fetch();
  }

  async function update(id: number, payload: Partial<User>) {
    await updateUser(id, payload);
    message.success('Usuario actualizado');
    await fetch();
  }

  async function remove(id: number) {
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: 'Eliminar usuario',
        content: '¿Seguro que deseas eliminar este usuario?',
        okText: 'Eliminar',
        okType: 'danger',
        cancelText: 'Cancelar',
        async onOk() {
          try {
            await deleteUser(id);
            message.success('Usuario eliminado');
            await fetch();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
      });
    });
  }

  return { loading, items, total, query, fetch, create, update, remove };
}
