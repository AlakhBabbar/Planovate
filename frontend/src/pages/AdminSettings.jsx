import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Save, Settings, BookOpen, GitBranch, Loader2, Calendar, ToggleLeft, ToggleRight, ChevronRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { settingsService } from "../api";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const ODD_SEMS = [1, 3, 5, 7];
const EVEN_SEMS = [2, 4, 6, 8];

const TABS = [
  { id: "semesters", label: "Active Semesters", icon: Calendar, color: "text-amber-600" },
  { id: "programs", label: "Programs", icon: BookOpen, color: "text-blue-600" },
  { id: "branches", label: "Branches", icon: GitBranch, color: "text-green-600" },
];

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("semesters");
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeSemesters, setActiveSemesters] = useState([]); // array of numbers e.g. [1,3,5,7]
  const [activeSession, setActiveSession] = useState("odd"); // 'odd' | 'even' — for quick toggle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New program form
  const [newProgram, setNewProgram] = useState("");
  const [addingProgram, setAddingProgram] = useState(false);

  // New branch form
  const [newBranch, setNewBranch] = useState({ name: "", programs: [] });
  const [addingBranch, setAddingBranch] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await settingsService.getAllSettings();
      setPrograms(settings.programs || []);
      setBranches(settings.branches || []);

      if (settings.activeSemesters) {
        setActiveSemesters(settings.activeSemesters.active || []);
        setActiveSession(settings.activeSemesters.session || "odd");
      } else {
        // Default: odd session active
        setActiveSemesters([...ODD_SEMS]);
        setActiveSession("odd");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Semester Management ────────────────────────────────────────────────────
  const handleSessionSwitch = async (session) => {
    const newActive = session === "odd" ? [...ODD_SEMS] : [...EVEN_SEMS];
    setActiveSession(session);
    setActiveSemesters(newActive);
    await saveSemesters(newActive, session);
  };

  const handleToggleSemester = async (sem) => {
    const newActive = activeSemesters.includes(sem)
      ? activeSemesters.filter((s) => s !== sem)
      : [...activeSemesters, sem].sort((a, b) => a - b);
    setActiveSemesters(newActive);

    // Determine if it's a custom configuration
    const isOdd = ODD_SEMS.every((s) => newActive.includes(s)) && newActive.length === 4;
    const isEven = EVEN_SEMS.every((s) => newActive.includes(s)) && newActive.length === 4;
    const session = isOdd ? "odd" : isEven ? "even" : "custom";
    setActiveSession(session);

    await saveSemesters(newActive, session);
  };

  const saveSemesters = async (active, session) => {
    try {
      setSaving(true);
      await settingsService.saveActiveSemesters({ active, session });
    } catch (error) {
      console.error("Error saving semesters:", error);
    } finally {
      setSaving(false);
    }
  };

  // ── Program Management ─────────────────────────────────────────────────────
  const handleAddProgram = async () => {
    if (!newProgram.trim()) return;
    if (programs.includes(newProgram.trim())) { alert("Program already exists"); return; }

    try {
      setSaving(true);
      const updated = [...programs, newProgram.trim()];
      await settingsService.savePrograms(updated);
      setPrograms(updated);
      setNewProgram("");
      setAddingProgram(false);
    } catch (error) {
      console.error("Error adding program:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async (p) => {
    if (!confirm(`Delete program "${p}"?`)) return;
    try {
      setSaving(true);
      const updatedPrograms = programs.filter((x) => x !== p);
      const updatedBranches = branches.map((b) => ({ ...b, programs: b.programs.filter((x) => x !== p) }));
      await Promise.all([settingsService.savePrograms(updatedPrograms), settingsService.saveBranches(updatedBranches)]);
      setPrograms(updatedPrograms);
      setBranches(updatedBranches);
    } catch (error) {
      console.error("Error deleting program:", error);
    } finally {
      setSaving(false);
    }
  };

  // ── Branch Management ──────────────────────────────────────────────────────
  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) return;
    if (newBranch.programs.length === 0) { alert("Select at least one program"); return; }
    if (branches.some((b) => b.name === newBranch.name.trim())) { alert("Branch already exists"); return; }

    try {
      setSaving(true);
      const updated = [...branches, { name: newBranch.name.trim(), programs: newBranch.programs }];
      await settingsService.saveBranches(updated);
      setBranches(updated);
      setNewBranch({ name: "", programs: [] });
      setAddingBranch(false);
    } catch (error) {
      console.error("Error adding branch:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (name) => {
    if (!confirm(`Delete branch "${name}"?`)) return;
    try {
      setSaving(true);
      const updated = branches.filter((b) => b.name !== name);
      await settingsService.saveBranches(updated);
      setBranches(updated);
    } catch (error) {
      console.error("Error deleting branch:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleProgramForBranch = (program) => {
    setNewBranch((prev) => {
      const progs = prev.programs.includes(program)
        ? prev.programs.filter((p) => p !== program)
        : [...prev.programs, program];
      return { ...prev, programs: progs };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Settings className="w-7 h-7 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-500 text-sm ml-10">Configure semesters, programs and branches</p>
        </div>

        <div className="flex gap-6">
          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <nav className="w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition-colors border-l-[3px] ${
                      active
                        ? "bg-gray-50 text-gray-900 border-gray-900"
                        : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? tab.color : "text-gray-400"}`} />
                    {tab.label}
                    <ChevronRight className={`w-3.5 h-3.5 ml-auto transition-transform ${active ? "rotate-90 text-gray-400" : "text-gray-300"}`} />
                  </button>
                );
              })}
            </div>

            {/* Quick semester status */}
            <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Active Session</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeSession === "custom" ? "bg-amber-400" : "bg-green-400"} animate-pulse`} />
                <span className="text-sm font-medium text-gray-900 capitalize">{activeSession === "custom" ? "Custom" : `${activeSession} Semester`}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {activeSemesters.length} of 8 active
              </p>
            </div>
          </nav>

          {/* ── Content ───────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ═══ SEMESTERS TAB ═══════════════════════════════════════════ */}
            {activeTab === "semesters" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Session toggle */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Session Type</h2>
                  <p className="text-sm text-gray-500 mb-5">Switch between odd and even semester sessions. You can also manually toggle individual semesters below.</p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSessionSwitch("odd")}
                      disabled={saving}
                      className={`flex-1 px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
                        activeSession === "odd"
                          ? "border-gray-900 bg-gray-900 text-white shadow-md"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-center">
                        <span className="block text-base font-semibold">Odd Session</span>
                        <span className={`text-xs mt-0.5 block ${activeSession === "odd" ? "text-gray-300" : "text-gray-400"}`}>
                          Sem 1, 3, 5, 7
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSessionSwitch("even")}
                      disabled={saving}
                      className={`flex-1 px-5 py-3.5 rounded-xl border-2 font-medium text-sm transition-all ${
                        activeSession === "even"
                          ? "border-gray-900 bg-gray-900 text-white shadow-md"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-center">
                        <span className="block text-base font-semibold">Even Session</span>
                        <span className={`text-xs mt-0.5 block ${activeSession === "even" ? "text-gray-300" : "text-gray-400"}`}>
                          Sem 2, 4, 6, 8
                        </span>
                      </div>
                    </button>
                  </div>

                  {activeSession === "custom" && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                      <Calendar className="w-3.5 h-3.5" />
                      Custom configuration — semesters were manually toggled
                    </div>
                  )}
                </div>

                {/* Individual semester toggles */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Individual Semesters</h2>
                  <p className="text-sm text-gray-500 mb-5">Manually activate or deactivate specific semesters. Only active semesters are considered for conflict detection and suggestions.</p>

                  <div className="grid grid-cols-4 gap-3">
                    {SEMESTERS.map((sem) => {
                      const isActive = activeSemesters.includes(sem);
                      const isOdd = ODD_SEMS.includes(sem);
                      return (
                        <button
                          key={sem}
                          onClick={() => handleToggleSemester(sem)}
                          disabled={saving}
                          className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${
                            isActive
                              ? "border-green-300 bg-green-50 hover:border-green-400"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300 opacity-60 hover:opacity-80"
                          }`}
                        >
                          <div className="text-left">
                            <span className={`block text-lg font-bold ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                              Sem {sem}
                            </span>
                            <span className={`text-[10px] uppercase tracking-wide font-medium ${isOdd ? "text-blue-500" : "text-purple-500"}`}>
                              {isOdd ? "Odd" : "Even"}
                            </span>
                          </div>
                          {isActive ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-gray-300" />
                          )}
                          {/* Active indicator dot */}
                          {isActive && (
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-xs text-gray-400 flex items-center gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Inactive</span>
                    <span className="ml-auto">{saving && <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />}{saving ? "Saving…" : "Auto-saved"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PROGRAMS TAB ════════════════════════════════════════════ */}
            {activeTab === "programs" && (
              <div className="animate-fadeIn">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Programs</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Degree programs offered by the institution</p>
                    </div>
                    {!addingProgram && (
                      <button
                        onClick={() => setAddingProgram(true)}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" /> Add Program
                      </button>
                    )}
                  </div>

                  {/* Add form */}
                  {addingProgram && (
                    <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProgram}
                          onChange={(e) => setNewProgram(e.target.value)}
                          placeholder="e.g. B.Tech, M.Tech, BCA"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          onKeyDown={(e) => e.key === "Enter" && handleAddProgram()}
                          autoFocus
                        />
                        <button onClick={handleAddProgram} disabled={saving} className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setAddingProgram(false); setNewProgram(""); }} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List */}
                  {programs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No programs defined yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {programs.map((program, i) => (
                        <div key={program} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="font-medium text-gray-900 text-sm">{program}</span>
                          </div>
                          <button onClick={() => handleDeleteProgram(program)} disabled={saving} className="text-gray-300 group-hover:text-red-500 transition-colors disabled:opacity-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    {programs.length} program{programs.length !== 1 ? "s" : ""} configured
                  </div>
                </div>
              </div>
            )}

            {/* ═══ BRANCHES TAB ════════════════════════════════════════════ */}
            {activeTab === "branches" && (
              <div className="animate-fadeIn">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
                      <p className="text-sm text-gray-500 mt-0.5">Branches/specializations linked to programs</p>
                    </div>
                    {!addingBranch && (
                      <button
                        onClick={() => setAddingBranch(true)}
                        disabled={saving || programs.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title={programs.length === 0 ? "Add programs first" : ""}
                      >
                        <Plus className="w-4 h-4" /> Add Branch
                      </button>
                    )}
                  </div>

                  {/* Add form */}
                  {addingBranch && (
                    <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        value={newBranch.name}
                        onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                        placeholder="e.g. Computer Science, Mechanical"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-3"
                        autoFocus
                      />
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Link to Programs</label>
                        <div className="flex flex-wrap gap-2">
                          {programs.map((program) => (
                            <button
                              key={program}
                              type="button"
                              onClick={() => toggleProgramForBranch(program)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                                newBranch.programs.includes(program)
                                  ? "bg-gray-900 text-white border-gray-900"
                                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              {program}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleAddBranch} disabled={saving} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                          Save Branch
                        </button>
                        <button onClick={() => { setAddingBranch(false); setNewBranch({ name: "", programs: [] }); }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List */}
                  {branches.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No branches defined yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {branches.map((branch, i) => (
                        <div key={branch.name} className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                              <span className="font-medium text-gray-900 text-sm">{branch.name}</span>
                            </div>
                            <button onClick={() => handleDeleteBranch(branch.name)} disabled={saving} className="text-gray-300 group-hover:text-red-500 transition-colors disabled:opacity-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-9">
                            {branch.programs.map((p) => (
                              <span key={p} className="px-2 py-0.5 text-[11px] bg-blue-100 text-blue-700 rounded-full font-medium">{p}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    {branches.length} branch{branches.length !== 1 ? "es" : ""} configured
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminSettings;
