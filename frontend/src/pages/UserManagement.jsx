import React, { useState, useEffect } from 'react';
import { Search, Filter, Trash2, Edit3, Plus, X, Loader2, Users, AlertCircle, ChevronDown, Eye, EyeOff, Save } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { listUsers, createUser, updateUser, deleteUser } from '../api/auth';
import useAuthStore from '../store/authStore';

const ROLES = [
  { value: 'admin',       label: 'Admin',        color: 'bg-red-100 text-red-700' },
  { value: 'hod',         label: 'HOD',           color: 'bg-purple-100 text-purple-700' },
  { value: 'teacher',     label: 'Teacher',       color: 'bg-blue-100 text-blue-700' },
  { value: 'tt_incharge', label: 'TT Incharge',   color: 'bg-amber-100 text-amber-700' },
  { value: 'student',     label: 'Student',       color: 'bg-green-100 text-green-700' },
];

const roleBadge = (role) => {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return <span className="text-xs text-gray-500">{role}</span>;
  return <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${r.color}`}>{r.label}</span>;
};

const UserManagement = () => {
  const token = useAuthStore((s) => s.token);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [modalForm, setModalForm] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Faculties for filter dropdown (derived from users)
  const faculties = [...new Set(users.map((u) => u.faculty).filter(Boolean))].sort();

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listUsers(token, { search, role: filterRole, faculty: filterFaculty });
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, filterRole, filterFaculty]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode('create');
    setEditingUser(null);
    setModalForm({ email: '', password: '', name: '', role: '', faculty: '', department: '', program: '', branch: '', semester: '', rollNo: '' });
    setModalError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setModalMode('edit');
    setEditingUser(user);
    setModalForm({ name: user.name, role: user.role, faculty: user.faculty || '', department: user.department || '', program: user.program || '', branch: user.branch || '', semester: user.semester || '', rollNo: user.rollNo || '' });
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      if (modalMode === 'create') {
        await createUser(token, modalForm);
      } else {
        await updateUser(token, editingUser._id, modalForm);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err.message || 'Operation failed';
      setModalError(msg.replace(/API Error.*?:\s*/, '').replace(/[{}"]/g, '').replace('error:', '').trim());
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}" (${user.email})?\n\nThis cannot be undone.`)) return;
    try {
      await deleteUser(token, user._id);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch {
      alert('Failed to delete user');
    }
  };

  const mf = (field, value) => setModalForm((f) => ({ ...f, [field]: value }));
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-700 uppercase tracking-wide mb-1';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">User Management</h1>
            <p className="text-gray-600 text-sm">Manage users, roles and permissions</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          {/* Role filter */}
          <div className="relative">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {/* Faculty filter */}
          {faculties.length > 0 && (
            <div className="relative">
              <select value={filterFaculty} onChange={(e) => setFilterFaculty(e.target.value)} className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent">
                <option value="">All Faculties</option>
                {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
          {/* Clear */}
          {(search || filterRole || filterFaculty) && (
            <button onClick={() => { setSearch(''); setFilterRole(''); setFilterFaculty(''); }} className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1">
              Clear filters
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Faculty / Dept</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.faculty && u.department ? `${u.faculty} / ${u.department}` : u.faculty || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {u.role === 'student' ? `${u.program} · ${u.branch} · Sem ${u.semester} · ${u.rollNo}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Add New User' : 'Edit User'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleModalSubmit} className="px-6 py-5 space-y-4">
              {modalError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" required value={modalForm.name || ''} onChange={(e) => mf('name', e.target.value)} className={inputCls} placeholder="Full name" />
              </div>

              {/* Email + Password (create only) */}
              {modalMode === 'create' && (
                <>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" required value={modalForm.email || ''} onChange={(e) => mf('email', e.target.value)} className={inputCls} placeholder="user@example.com" />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} required minLength={6} value={modalForm.password || ''} onChange={(e) => mf('password', e.target.value)} className={`${inputCls} pr-10`} placeholder="Min 6 chars" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Role */}
              <div>
                <label className={labelCls}>Role</label>
                <div className="grid grid-cols-5 gap-2">
                  {ROLES.map((r) => (
                    <button key={r.value} type="button" onClick={() => mf('role', r.value)}
                      className={`px-2 py-2 text-xs font-medium rounded-lg border transition-all ${
                        modalForm.role === r.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}>{r.label}</button>
                  ))}
                </div>
              </div>

              {/* Faculty + Department */}
              {['hod', 'teacher', 'tt_incharge'].includes(modalForm.role) && (
                <div className="grid grid-cols-2 gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div>
                    <label className={labelCls}>Faculty</label>
                    <input type="text" required value={modalForm.faculty || ''} onChange={(e) => mf('faculty', e.target.value)} className={inputCls} placeholder="Faculty" />
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <input type="text" required value={modalForm.department || ''} onChange={(e) => mf('department', e.target.value)} className={inputCls} placeholder="Department" />
                  </div>
                </div>
              )}

              {/* Student fields */}
              {modalForm.role === 'student' && (
                <div className="grid grid-cols-2 gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div>
                    <label className={labelCls}>Program</label>
                    <input type="text" required value={modalForm.program || ''} onChange={(e) => mf('program', e.target.value)} className={inputCls} placeholder="BTech" />
                  </div>
                  <div>
                    <label className={labelCls}>Branch</label>
                    <input type="text" required value={modalForm.branch || ''} onChange={(e) => mf('branch', e.target.value)} className={inputCls} placeholder="CSE" />
                  </div>
                  <div>
                    <label className={labelCls}>Semester</label>
                    <input type="text" required value={modalForm.semester || ''} onChange={(e) => mf('semester', e.target.value)} className={inputCls} placeholder="4" />
                  </div>
                  <div>
                    <label className={labelCls}>Roll No</label>
                    <input type="text" required value={modalForm.rollNo || ''} onChange={(e) => mf('rollNo', e.target.value)} className={inputCls} placeholder="21CSE001" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={modalLoading || !modalForm.role} className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors">
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
