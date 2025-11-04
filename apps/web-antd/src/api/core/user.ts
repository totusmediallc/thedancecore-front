import type { UserInfo } from '@vben/types';

import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';
import { mapBackendUserToUserInfo, resolveUserHomePath } from '#/utils/auth';

import type { AuthApi } from './auth';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const user = await requestClient.get<AuthApi.AuthenticatedUser>('/auth/profile');
  const accessStore = useAccessStore();
  const accessToken = accessStore.accessToken ?? '';
  return mapBackendUserToUserInfo(
    user,
    accessToken,
    resolveUserHomePath(user?.homePath),
  );
}
