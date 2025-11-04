import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    email: string;
    password: string;
  }

  export interface AuthenticatedUser {
    id: string;
    email: string;
    firstName: string;
    lastName?: string | null;
    role: 'admin' | 'client';
    isActive: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
    avatarUrl?: string | null;
    homePath?: string | null;
  }

  export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
    user: AuthenticatedUser;
  }

  export type RefreshTokenParams = {
    refreshToken: string;
  };

  export type RefreshTokenResult = LoginResult;

  export interface LogoutResponse {
    message: string;
  }
}

export async function loginApi(data: AuthApi.LoginParams) {
  const payload: Record<string, any> = { ...data };
  if (import.meta.env.VITE_NITRO_MOCK === 'true') {
    payload.username = data.email;
  }
  return requestClient.post<AuthApi.LoginResult>('/auth/login', payload);
}

export async function refreshTokenApi(refreshToken: string) {
  const response = await baseRequestClient.post('/auth/refresh', {
    refreshToken,
  });
  return (response as { data: AuthApi.RefreshTokenResult }).data;
}

export async function logoutApi() {
  return requestClient.post<AuthApi.LogoutResponse>('/auth/logout');
}

export async function getAccessCodesApi() {
  return [] as string[];
}
