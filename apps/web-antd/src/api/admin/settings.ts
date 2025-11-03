import { requestClient } from '@/api/request';

export interface SettingsPayload {
  siteTitle?: string;
  notifications?: boolean;
  timezone?: string;
}

export async function getSettings() {
  return requestClient.get<SettingsPayload>('/settings');
}

export async function saveSettings(payload: SettingsPayload) {
  // Avoid using `void` as a generic per eslint rule; use `unknown` for no-content
  return requestClient.put<unknown>('/settings', payload);
}
