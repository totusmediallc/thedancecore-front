import type { UserInfo } from '@vben/types';

import type { AuthApi } from '#/api';

import { preferences } from '@vben/preferences';

const DEFAULT_AVATAR = '';

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = atob(padded);
  try {
    const percentEncoded = Array.from(decoded)
      .map((char) => {
        const codePoint = char.codePointAt(0) ?? 0;
        return `%${codePoint.toString(16).padStart(2, '0')}`;
      })
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch (error) {
    console.warn('Failed to decode JWT payload.', error);
    return decoded;
  }
}

export function decodeJwtPayload<
  T extends Record<string, any> = Record<string, any>,
>(token: string): null | T {
  const segments = token.split('.');
  if (segments.length < 2) return null;
  try {
    const payload = decodeBase64Url(segments[1]);
    return JSON.parse(payload) as T;
  } catch (error) {
    console.warn('Invalid JWT token received.', error);
    return null;
  }
}

export function getTokenExpiration(
  token: null | string | undefined,
): null | number {
  if (!token) return null;
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function isTokenExpiringSoon(
  expiresAt: null | number | undefined,
  thresholdMs: number,
): boolean {
  if (!expiresAt) return false;
  return expiresAt - Date.now() <= thresholdMs;
}

function getFullName(user: AuthApi.AuthenticatedUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function mapBackendUserToUserInfo(
  user: AuthApi.AuthenticatedUser,
  accessToken: string,
  homePath: string,
): UserInfo {
  const fullName = getFullName(user);
  return {
    avatar: user.avatarUrl ?? DEFAULT_AVATAR,
    desc: user.role,
    homePath,
    realName: fullName || user.email,
    roles: [user.role],
    token: accessToken,
    userId: user.id,
    username: user.email,
  } satisfies UserInfo;
}

export function deriveAccessCodes(roles: null | string[] | undefined) {
  if (!roles?.length) return [] as string[];
  return [...new Set(roles)];
}

export function resolveUserHomePath(homePath?: null | string) {
  return homePath || preferences.app.defaultHomePath;
}
