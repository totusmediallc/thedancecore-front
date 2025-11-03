import { requestClient } from '@/api/request';

export interface SalesReportPoint {
  date: string;
  value: number;
}

export interface CategoryReport {
  name: string;
  value: number;
}

export async function getSalesReport() {
  return requestClient.get<SalesReportPoint[]>('/reports/sales');
}

export async function getUsersByRoleReport() {
  return requestClient.get<CategoryReport[]>('/reports/users-by-role');
}

export async function getActiveUsersReport() {
  return requestClient.get<SalesReportPoint[]>('/reports/active-users');
}
