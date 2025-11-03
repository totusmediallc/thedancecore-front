import type { RouteRecordRaw } from 'vue-router';

// i18n disponible si se desea usar $t

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:settings-2',
      title: 'Administración',
    },
    name: 'Admin',
    path: '/admin',
    children: [
      {
        name: 'AdminUsers',
        path: '/admin/users',
        component: () => import('#/views/users/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: 'Usuarios',
        },
      },
      {
        name: 'AdminReports',
        path: '/admin/reports',
        component: () => import('#/views/reports/index.vue'),
        meta: {
          icon: 'lucide:chart-pie',
          title: 'Reportes',
        },
      },
      {
        name: 'AdminSettings',
        path: '/admin/settings',
        component: () => import('#/views/settings/index.vue'),
        meta: {
          icon: 'lucide:settings',
          title: 'Configuración',
        },
      },
    ],
  },
];

export default routes;
