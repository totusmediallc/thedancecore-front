import type { UserInfo } from '@vben/types';

import type { AuthApi } from '#/api';

import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import { getUserInfoApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';
import {
  deriveAccessCodes,
  getTokenExpiration,
  mapBackendUserToUserInfo,
  resolveUserHomePath,
} from '#/utils/auth';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);

  /**
   * 异步处理登录操作
   * Asynchronously handle the login process
   * @param params 登录表单数据
   */
  async function authLogin(
    params: AuthApi.LoginParams,
    onSuccess?: () => Promise<void> | void,
  ) {
    // Dev bypass: permite entrar sin backend para evaluar la plantilla
    if (import.meta.env.VITE_BYPASS_LOGIN === 'true') {
      const demoUser = {
        id: 0,
        realName: 'Demo User',
        roles: ['admin'],
        homePath: '/admin/users',
      } as unknown as UserInfo;

      accessStore.setAccessToken('dev-token');
      accessStore.setRefreshToken?.('dev-refresh');
      accessStore.setAccessTokenExpiresAt(Date.now() + 60 * 60 * 1000);
      accessStore.setRefreshTokenExpiresAt(Date.now() + 24 * 60 * 60 * 1000);
      userStore.setUserInfo(demoUser);
      accessStore.setAccessCodes?.([]);

      if (accessStore.loginExpired) accessStore.setLoginExpired(false);

      await router.push(demoUser.homePath || preferences.app.defaultHomePath);
      notification.success({
        message: $t('authentication.loginSuccess'),
        description: `${$t('authentication.loginSuccessDesc')}: ${demoUser.realName}`,
      });
      return { userInfo: demoUser };
    }

    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const { accessToken, refreshToken, user } = await loginApi(params);

      // 如果成功获取到 accessToken
      if (accessToken) {
        accessStore.setAccessToken(accessToken);
        if (refreshToken) {
          accessStore.setRefreshToken(refreshToken);
        }

        accessStore.setAccessTokenExpiresAt(getTokenExpiration(accessToken));
        accessStore.setRefreshTokenExpiresAt(getTokenExpiration(refreshToken));

        userInfo = mapBackendUserToUserInfo(
          user,
          accessToken,
          resolveUserHomePath(user?.homePath),
        );

        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(deriveAccessCodes(userInfo.roles));

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                resolveUserHomePath(userInfo.homePath),
              );
        }

        if (userInfo?.realName) {
          notification.success({
            description: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            duration: 3,
            message: $t('authentication.loginSuccess'),
          });
        }
      }
    } finally {
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    try {
      await logoutApi();
    } catch {
      // 不做任何处理
    }
    resetAllStores();
    accessStore.setLoginExpired(false);
    accessStore.setAccessTokenExpiresAt(null);
    accessStore.setRefreshTokenExpiresAt(null);

    // 回登录页带上当前路由地址
    await router.replace({
      path: LOGIN_PATH,
      query: redirect
        ? {
            redirect: encodeURIComponent(router.currentRoute.value.fullPath),
          }
        : {},
    });
  }

  async function fetchUserInfo() {
    let userInfo: null | UserInfo = null;
    userInfo = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    accessStore.setAccessCodes(deriveAccessCodes(userInfo?.roles));
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
