import { apiFetch } from "./apiClient";

export async function getPrograms() {
  const res = await apiFetch(`/settings/programs`);
  return res && res.list ? res.list : [];
}

export async function savePrograms(programs) {
  await apiFetch(`/settings/programs`, { method: 'PUT', body: JSON.stringify({ _docId: 'programs', list: programs }) });
}

export async function getBranches() {
  const res = await apiFetch(`/settings/branches`);
  return res && res.list ? res.list : [];
}

export async function saveBranches(branches) {
  await apiFetch(`/settings/branches`, { method: 'PUT', body: JSON.stringify({ _docId: 'branches', list: branches }) });
}

export async function getAllSettings() {
  const [programs, branches] = await Promise.all([
    getPrograms(),
    getBranches(),
  ]);
  return { programs, branches };
}
