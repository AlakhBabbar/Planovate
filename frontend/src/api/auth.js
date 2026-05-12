import { apiFetch } from './apiClient';

export async function registerUser(data) {
  return await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginUser(email, password) {
  return await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function forgotPassword(email) {
  return await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email, otp, newPassword) {
  return await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

export async function getCurrentUser(token) {
  return await apiFetch('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listUsers(token, query = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(query).filter(([, v]) => v))
  ).toString();
  return await apiFetch(`/auth/users${params ? `?${params}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createUser(token, data) {
  return await apiFetch('/auth/users', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateUser(token, id, data) {
  return await apiFetch(`/auth/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteUser(token, id) {
  return await apiFetch(`/auth/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
