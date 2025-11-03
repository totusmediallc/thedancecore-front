import { requestClient } from '@/api/request';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsersQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  email?: string;
  role?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export async function listUsers(params: UsersQuery) {
  return requestClient.get<Paginated<User>>('/users', { params });
}

export async function createUser(data: Partial<User>) {
  return requestClient.post<User>('/users', data);
}

export async function updateUser(id: number, data: Partial<User>) {
  return requestClient.put<User>(`/users/${id}`, data);
}

export async function deleteUser(id: number) {
  // Avoid using `void` as a generic per eslint rule; use `unknown`
  return requestClient.delete<unknown>(`/users/${id}`);
}
