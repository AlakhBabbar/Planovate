import React, { useState, useEffect } from "react";
import { Plus, X, Trash2, Save, Settings, BookOpen, GitBranch, Loader2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { settingsService } from "../firebase/services";

const AdminSettings = () => {
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New program form
  const [newProgram, setNewProgram] = useState("");
  const [addingProgram, setAddingProgram] = useState(false);
  
  // New branch form
  const [newBranch, setNewBranch] = useState({
    name: "",
    programs: [],
  });
  const [addingBranch, setAddingBranch] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await settingsService.getAllSettings();
      setPrograms(settings.programs || []);
      setBranches(settings.branches || []);
    } catch (error) {
      console.error("Error loading settings:", error);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Program Management
  const handleAddProgram = async () => {
    if (!newProgram.trim()) {
      alert("Please enter a program name");
      return;
    }

    if (programs.includes(newProgram.trim())) {
      alert("This program already exists");
      return;
    }

    try {
      setSaving(true);
      const updatedPrograms = [...programs, newProgram.trim()];
      await settingsService.savePrograms(updatedPrograms);
      setPrograms(updatedPrograms);
      setNewProgram("");
      setAddingProgram(false);
    } catch (error) {
      console.error("Error adding program:", error);
      alert("Failed to add program");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async (programToDelete) => {
    if (!confirm(`Are you sure you want to delete "${programToDelete}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const updatedPrograms = programs.filter((p) => p !== programToDelete);
      
      // Also remove this program from branches
      const updatedBranches = branches.map((branch) => ({
        ...branch,
        programs: branch.programs.filter((p) => p !== programToDelete),
      }));

      await Promise.all([
        settingsService.savePrograms(updatedPrograms),
        settingsService.saveBranches(updatedBranches),
      ]);

      setPrograms(updatedPrograms);
      setBranches(updatedBranches);
    } catch (error) {
      console.error("Error deleting program:", error);
      alert("Failed to delete program");
    } finally {
      setSaving(false);
    }
  };

  // Branch Management
  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) {
      alert("Please enter a branch name");
      return;
    }

    if (newBranch.programs.length === 0) {
      alert("Please select at least one program");
      return;
    }

    if (branches.some((b) => b.name === newBranch.name.trim())) {
      alert("This branch already exists");
      return;
    }

    try {
      setSaving(true);
      const updatedBranches = [
        ...branches,
        {
          name: newBranch.name.trim(),
          programs: newBranch.programs,
        },
      ];
      await settingsService.saveBranches(updatedBranches);
      setBranches(updatedBranches);
      setNewBranch({ name: "", programs: [] });
      setAddingBranch(false);
    } catch (error) {
      console.error("Error adding branch:", error);
      alert("Failed to add branch");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (branchName) => {
    if (!confirm(`Are you sure you want to delete "${branchName}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const updatedBranches = branches.filter((b) => b.name !== branchName);
      await settingsService.saveBranches(updatedBranches);
      setBranches(updatedBranches);
    } catch (error) {
      console.error("Error deleting branch:", error);
      alert("Failed to delete branch");
    } finally {
      setSaving(false);
    }
  };

  const toggleProgramForBranch = (program) => {
    setNewBranch((prev) => {
      const programs = prev.programs.includes(program)
        ? prev.programs.filter((p) => p !== program)
        : [...prev.programs, program];
      return { ...prev, programs };
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
          </div>
          <p className="text-gray-600">Manage programs and branches</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Programs Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Programs</h2>
              </div>
              {!addingProgram && (
                <button
                  onClick={() => setAddingProgram(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Program
                </button>
              )}
            </div>

            {/* Add Program Form */}
            {addingProgram && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value)}
                    placeholder="e.g., B.Tech, M.Tech, BCA"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === "Enter" && handleAddProgram()}
                  />
                  <button
                    onClick={handleAddProgram}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setAddingProgram(false);
                      setNewProgram("");
                    }}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Programs List */}
            <div className="space-y-2">
              {programs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No programs defined yet
                </div>
              ) : (
                programs.map((program) => (
                  <div
                    key={program}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{program}</span>
                    <button
                      onClick={() => handleDeleteProgram(program)}
                      disabled={saving}
                      className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Branches Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Branches</h2>
              </div>
              {!addingBranch && (
                <button
                  onClick={() => setAddingBranch(true)}
                  disabled={saving || programs.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  title={programs.length === 0 ? "Add programs first" : ""}
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </button>
              )}
            </div>

            {/* Add Branch Form */}
            {addingBranch && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, name: e.target.value })
                  }
                  placeholder="e.g., Computer Science, Mechanical"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-3"
                />

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Programs
                  </label>
                  <div className="space-y-2">
                    {programs.map((program) => (
                      <label
                        key={program}
                        className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newBranch.programs.includes(program)}
                          onChange={() => toggleProgramForBranch(program)}
                          className="h-4 w-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{program}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAddBranch}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setAddingBranch(false);
                      setNewBranch({ name: "", programs: [] });
                    }}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Branches List */}
            <div className="space-y-3">
              {branches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No branches defined yet
                </div>
              ) : (
                branches.map((branch) => (
                  <div
                    key={branch.name}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {branch.name}
                      </span>
                      <button
                        onClick={() => handleDeleteBranch(branch.name)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {branch.programs.map((program) => (
                        <span
                          key={program}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {program}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminSettings;
