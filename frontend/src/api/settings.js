import { apiFetch } from "./apiClient";

export async function getPrograms() {
  try {
    const res = await apiFetch(`/settings/programs`);
    return res && res.list ? res.list : [];
  } catch (err) {
    if (err.message.includes('404')) return [];
    throw err;
  }
}

export async function savePrograms(programs) {
  await apiFetch(`/settings/programs`, { method: 'PUT', body: JSON.stringify({ _docId: 'programs', list: programs }) });
}

export async function getBranches() {
  try {
    const res = await apiFetch(`/settings/branches`);
    return res && res.list ? res.list : [];
  } catch (err) {
    if (err.message.includes('404')) return [];
    throw err;
  }
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
