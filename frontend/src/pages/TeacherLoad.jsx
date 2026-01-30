import React, { useState, useEffect, useRef } from "react";
import { Users, Plus, Trash2, Save, CheckCircle, Search } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { teacherService } from "../firebase/services";

const TeacherLoad = () => {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [newFaculty, setNewFaculty] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  
  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    id: "",
    name: ""
  });

  const teacherIdRef = useRef(null);
  const teacherNameRef = useRef(null);

  const handleTeacherModalKeyDown = (e, currentField) => {
    const fields = [teacherIdRef, teacherNameRef];
    const currentIndex = fields.findIndex(ref => ref.current === e.target);
    
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % fields.length;
      fields[nextIndex].current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
      fields[prevIndex].current?.focus();
    }
  };


  useEffect(() => {
    fetchFaculties(); // Load faculties on page load
  }, []);

  const fetchFaculties = async () => {
    try {
      const data = await teacherService.listFaculties();
      setFaculties(data);
    } catch (error) {
      console.error("Error fetching faculties:", error);
    }
  };

  const fetchDepartments = async (faculty) => {
    try {
      const data = await teacherService.listDepartments(faculty);
      setDepartments(data);
      setSelectedDepartment("");
      setTeachers([]);
      setFilteredTeachers([]);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchTeachers = async (faculty, department) => {
    try {
      const data = await teacherService.listTeachers({ faculty, department });
      const formattedTeachers = data.map((teacher) => ({
        unid: teacher.unid || Date.now(),
        id: teacher.ID,
        name: teacher.name,
        isModified: false,
      }));
      setTeachers(formattedTeachers);
      setFilteredTeachers(formattedTeachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTeachers(teachers);
    } else {
      const filtered = teachers.filter(
        (teacher) =>
          teacher.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTeachers(filtered);
    }
  }, [searchQuery, teachers]);
  
  

  const handleAddFaculty = () => {
    if (newFaculty.trim() && !faculties.includes(newFaculty.trim())) {
      setFaculties([...faculties, newFaculty.trim()]);
      setSelectedFaculty(newFaculty.trim());
      setNewFaculty("");
      setIsAddingFaculty(false);
      setDepartments([]);
      setSelectedDepartment("");
      setTeachers([]);
      setFilteredTeachers([]);
    }
  };

  const cancelAddFaculty = () => {
    setIsAddingFaculty(false);
    setNewFaculty("");
  };

  const handleAddDepartment = () => {
    if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
      setSelectedDepartment(newDepartment.trim());
      setNewDepartment("");
      setIsAddingDepartment(false);
      setTeachers([]);
      setFilteredTeachers([]);
    }
  };

  const cancelAddDepartment = () => {
    setIsAddingDepartment(false);
    setNewDepartment("");
  };

  const handleUpdateAll = async () => {
    if (!selectedFaculty || !selectedDepartment) {
      alert("Please select Faculty and Department first!");
      return;
    }

    const modifiedTeachers = teachers.filter(t => t.isModified || !t.unid);
    
    if (modifiedTeachers.length === 0) {
      alert("No changes to save!");
      return;
    }

    const invalidTeachers = modifiedTeachers.filter(t => !t.id.trim() || !t.name.trim());
    if (invalidTeachers.length > 0) {
      alert("Please fill in all Teacher ID and Name fields!");
      return;
    }

    if (!window.confirm(`Save ${modifiedTeachers.length} teacher(s)?`)) {
      return;
    }

    try {
      setSaving(true);
      
      for (const teacher of modifiedTeachers) {
        await teacherService.upsertTeacher({
          unid: teacher.unid,
          ID: teacher.id,
          name: teacher.name,
          faculty: selectedFaculty,
          department: selectedDepartment,
        });
      }

      setSuccessMessage(`Successfully saved ${modifiedTeachers.length} teacher(s)!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchTeachers(selectedFaculty, selectedDepartment);
    } catch (error) {
      console.error("Error updating teachers:", error);
      alert("Failed to save teachers. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveTeacher = async (index) => {
    const teacher = teachers[index];
    
    if (!selectedFaculty || !selectedDepartment) {
      alert("Please select Faculty and Department first!");
      return;
    }

    if (!teacher.id.trim() || !teacher.name.trim()) {
      alert("Please fill in Teacher ID and Name!");
      return;
    }

    try {
      const unid = await teacherService.upsertTeacher({
        unid: teacher.unid,
        ID: teacher.id,
        name: teacher.name,
        faculty: selectedFaculty,
        department: selectedDepartment,
      });

      const updatedTeachers = [...teachers];
      updatedTeachers[index].unid = unid;
      updatedTeachers[index].isModified = false;
      setTeachers(updatedTeachers);
      
      setSuccessMessage("Teacher saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving teacher:", error);
      alert("Failed to save teacher.");
    }
  };

  const deleteTeacher = async (index) => {
    const teacher = teachers[index];
  
    if (!teacher.unid) {
      const updatedTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(updatedTeachers);
      return;
    }

    if (!window.confirm("Delete this teacher?")) {
      return;
    }
  
    try {
      await teacherService.deleteTeacher(teacher.unid);
      const updatedTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(updatedTeachers);
      setSuccessMessage("Teacher deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting teacher:", error);
      alert("Failed to delete teacher.");
    }
  };

  const openAddTeacherModal = () => {
    setNewTeacher({
      id: "",
      name: ""
    });
    setIsAddTeacherModalOpen(true);
  };

  const closeAddTeacherModal = () => {
    setIsAddTeacherModalOpen(false);
    setNewTeacher({
      id: "",
      name: ""
    });
  };

  const saveNewTeacher = async (addMore = false) => {
    if (!selectedFaculty || !selectedDepartment) {
      alert("Please select Faculty and Department first!");
      return;
    }

    if (!newTeacher.id?.trim() || !newTeacher.name?.trim()) {
      alert("Please fill in Teacher ID and Name!");
      return;
    }

    try {
      const unid = await teacherService.upsertTeacher({
        unid: null,
        ID: newTeacher.id,
        name: newTeacher.name,
        faculty: selectedFaculty,
        department: selectedDepartment,
      });

      setSuccessMessage("Teacher added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchTeachers(selectedFaculty, selectedDepartment);

      if (addMore) {
        setNewTeacher({
          id: "",
          name: ""
        });
      } else {
        closeAddTeacherModal();
      }
    } catch (error) {
      console.error("Error adding teacher:", error);
      alert("Failed to add teacher.");
    }
  };
  
  const updateTeacherField = (index, field, value) => {
    const updatedTeachers = [...teachers];
    updatedTeachers[index][field] = value;
    updatedTeachers[index].isModified = true;
    setTeachers(updatedTeachers);
  };
  
  

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 text-gray-700" />
              <h1 className="text-2xl font-semibold text-gray-900">
                Teacher Management
              </h1>
            </div>
            <p className="text-sm text-gray-600">Manage teachers by faculty and department</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 text-sm">
              {successMessage}
            </div>
          )}

          {/* Selection Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Faculty Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Faculty</label>
                {!isAddingFaculty ? (
                  <>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={selectedFaculty}
                      onChange={(e) => {
                        setSelectedFaculty(e.target.value);
                        fetchDepartments(e.target.value);
                      }}
                    >
                      <option value="">Select Faculty</option>
                      {faculties.map((faculty, index) => (
                        <option key={index} value={faculty}>{faculty}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsAddingFaculty(true)}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Faculty
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="Enter new faculty name"
                      value={newFaculty}
                      onChange={(e) => setNewFaculty(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddFaculty()}
                      autoFocus
                    />
                    <button
                      onClick={handleAddFaculty}
                      className="px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelAddFaculty}
                      className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Department Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Department</label>
                {!isAddingDepartment ? (
                  <>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        fetchTeachers(selectedFaculty, e.target.value);
                      }}
                      disabled={!selectedFaculty}
                    >
                      <option value="">Select Department</option>
                      {departments.map((department, index) => (
                        <option key={index} value={department}>{department}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsAddingDepartment(true)}
                      disabled={!selectedFaculty}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Department
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="Enter new department name"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
                      autoFocus
                    />
                    <button
                      onClick={handleAddDepartment}
                      className="px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelAddDepartment}
                      className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search and Actions */}
          {selectedFaculty && selectedDepartment && (
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers by ID or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openAddTeacherModal}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Teacher
                </button>
                <button
                  onClick={handleUpdateAll}
                  disabled={saving || teachers.filter(t => t.isModified || !t.unid).length === 0}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : `Update All ${teachers.filter(t => t.isModified || !t.unid).length > 0 ? `(${teachers.filter(t => t.isModified || !t.unid).length})` : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* Teachers Table */}
          {selectedFaculty && selectedDepartment && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Teacher ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Teacher Name</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTeachers.map((teacher, index) => {
                      const actualIndex = teachers.findIndex(t => t.unid === teacher.unid || (t.id === teacher.id && t.name === teacher.name));
                      return (
                        <tr key={teacher.unid || index} className={teacher.isModified ? "bg-amber-50" : ""}>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={teacher.id}
                              onChange={(e) => updateTeacherField(actualIndex, "id", e.target.value)}
                              placeholder="Teacher ID"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={teacher.name}
                              onChange={(e) => updateTeacherField(actualIndex, "name", e.target.value)}
                              placeholder="Teacher Name"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveTeacher(actualIndex)}
                                className="inline-flex items-center justify-center px-2 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                                title={teacher.unid ? "Update" : "Save"}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteTeacher(actualIndex)}
                                className="inline-flex items-center justify-center p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTeachers.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">
                          {searchQuery ? "No teachers match your search." : "No teachers found. Click 'Add Row' to create a new teacher."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Add Teacher Modal */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Teacher</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Teacher ID *</label>
                <input
                  ref={teacherIdRef}
                  type="text"
                  value={newTeacher.id}
                  onChange={(e) => setNewTeacher({ ...newTeacher, id: e.target.value })}
                  onKeyDown={handleTeacherModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter teacher ID"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Teacher Name *</label>
                <input
                  ref={teacherNameRef}
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  onKeyDown={handleTeacherModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter teacher name"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeAddTeacherModal}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveNewTeacher(true)}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Save and Add More
              </button>
              <button
                onClick={() => saveNewTeacher(false)}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
              >
                Save and Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLoad;
