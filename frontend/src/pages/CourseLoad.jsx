import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, Trash2, Save, Search, Users } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { courseService, teacherService } from "../firebase/services";

const CourseLoad = () => {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [newFaculty, setNewFaculty] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newSemester, setNewSemester] = useState("");

  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [isAddingSemester, setIsAddingSemester] = useState(false);

  const [selectedCourseIndex, setSelectedCourseIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    ID: "",
    name: "",
    code: "",
    credits: "",
    teachers: []
  });

  const courseIdRef = useRef(null);
  const courseNameRef = useRef(null);
  const courseCodeRef = useRef(null);
  const courseCreditsRef = useRef(null);

  const handleCourseModalKeyDown = (e, currentField) => {
    const fields = [courseIdRef, courseNameRef, courseCodeRef, courseCreditsRef];
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
    fetchFaculties();
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
      setSemesters([]);
      setSelectedSemester("");
      setCourses([]);
      setFilteredCourses([]);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSemesters = async (faculty, department) => {
    try {
      const data = await courseService.listSemesters({ faculty, department });
      setSemesters(data);
      setSelectedSemester("");
      setCourses([]);
      setFilteredCourses([]);
    } catch (error) {
      console.error("Error fetching semesters:", error);
    }
  };

  const fetchTeachers = async (faculty, department) => {
    try {
      const data = await teacherService.listTeachers({ faculty, department });
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const fetchCourses = async (faculty, department, semester) => {
    try {
      const data = await courseService.listCourses({ faculty, department, semester });
      fetchTeachers(faculty, department);
      const updatedCourses = data.map((course) => ({
        ...course,
        isModified: false,
      }));
      setCourses(updatedCourses);
      setFilteredCourses(updatedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(
        (course) =>
          course.ID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.code?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCourses(filtered);
    }
  }, [searchQuery, courses]);

  const saveCourse = async (index) => {
    const course = courses[index];
    
    if (!selectedFaculty || !selectedDepartment || !selectedSemester) {
      alert("Please select Faculty, Department, and Semester first!");
      return;
    }

    if (!course.ID?.trim() || !course.name?.trim()) {
      alert("Please fill in Course ID and Name!");
      return;
    }

    try {
      const unid = await courseService.upsertCourse({
        unid: course.unid,
        ID: course.ID,
        name: course.name,
        code: course.code,
        credits: course.credits,
        teachers: course.teachers || [],
        faculty: selectedFaculty,
        semester: selectedSemester,
        department: selectedDepartment,
      });

      const updatedCourses = [...courses];
      updatedCourses[index].unid = unid;
      updatedCourses[index].isModified = false;
      setCourses(updatedCourses);
      
      setSuccessMessage("Course saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course.");
    }
  };

  const handleUpdateAll = async () => {
    if (!selectedFaculty || !selectedDepartment || !selectedSemester) {
      alert("Please select Faculty, Department, and Semester first!");
      return;
    }

    const modifiedCourses = courses.filter(c => c.isModified || !c.unid);
    
    if (modifiedCourses.length === 0) {
      alert("No changes to save!");
      return;
    }

    const invalidCourses = modifiedCourses.filter(c => !c.ID?.trim() || !c.name?.trim());
    if (invalidCourses.length > 0) {
      alert("Please fill in all Course ID and Name fields!");
      return;
    }

    if (!window.confirm(`Save ${modifiedCourses.length} course(s)?`)) {
      return;
    }

    try {
      setSaving(true);
      
      for (const course of modifiedCourses) {
        await courseService.upsertCourse({
          unid: course.unid,
          ID: course.ID,
          name: course.name,
          code: course.code,
          credits: course.credits,
          teachers: course.teachers || [],
          faculty: selectedFaculty,
          semester: selectedSemester,
          department: selectedDepartment,
        });
      }

      setSuccessMessage(`Successfully saved ${modifiedCourses.length} course(s)!`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchCourses(selectedFaculty, selectedDepartment, selectedSemester);
    } catch (error) {
      console.error("Error updating courses:", error);
      alert("Failed to save courses. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (index) => {
    const course = courses[index];
  
    if (!course.unid) {
      const updatedCourses = courses.filter((_, i) => i !== index);
      setCourses(updatedCourses);
      return;
    }

    if (!window.confirm("Delete this course?")) {
      return;
    }
  
    try {
      await courseService.deleteCourse(course.unid);
      const updatedCourses = courses.filter((_, i) => i !== index);
      setCourses(updatedCourses);
      setSuccessMessage("Course deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course.");
    }
  };

  const openAddCourseModal = () => {
    setNewCourse({
      ID: "",
      name: "",
      code: "",
      credits: "",
      teachers: []
    });
    setIsAddCourseModalOpen(true);
  };

  const closeAddCourseModal = () => {
    setIsAddCourseModalOpen(false);
    setNewCourse({
      ID: "",
      name: "",
      code: "",
      credits: "",
      teachers: []
    });
  };

  const saveNewCourse = async (addMore = false) => {
    if (!selectedFaculty || !selectedDepartment || !selectedSemester) {
      alert("Please select Faculty, Department, and Semester first!");
      return;
    }

    if (!newCourse.ID?.trim() || !newCourse.name?.trim()) {
      alert("Please fill in Course ID and Name!");
      return;
    }

    try {
      const unid = await courseService.upsertCourse({
        unid: null,
        ID: newCourse.ID,
        name: newCourse.name,
        code: newCourse.code,
        credits: newCourse.credits,
        teachers: newCourse.teachers || [],
        faculty: selectedFaculty,
        semester: selectedSemester,
        department: selectedDepartment,
      });

      setSuccessMessage("Course added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchCourses(selectedFaculty, selectedDepartment, selectedSemester);

      if (addMore) {
        setNewCourse({
          ID: "",
          name: "",
          code: "",
          credits: "",
          teachers: []
        });
      } else {
        closeAddCourseModal();
      }
    } catch (error) {
      console.error("Error adding course:", error);
      alert("Failed to add course.");
    }
  };

  const updateCourseField = (index, field, value) => {
    const updatedCourses = [...courses];
    updatedCourses[index][field] = value;
    updatedCourses[index].isModified = true;
    setCourses(updatedCourses);
  };

  const handleAddFaculty = async () => {
    if (!newFaculty.trim()) {
      alert("Please enter a faculty name!");
      return;
    }
    
    setSelectedFaculty(newFaculty);
    setFaculties([...faculties, newFaculty]);
    setNewFaculty("");
    setIsAddingFaculty(false);
    fetchDepartments(newFaculty);
  };

  const cancelAddFaculty = () => {
    setNewFaculty("");
    setIsAddingFaculty(false);
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) {
      alert("Please enter a department name!");
      return;
    }
    
    setSelectedDepartment(newDepartment);
    setDepartments([...departments, newDepartment]);
    setNewDepartment("");
    setIsAddingDepartment(false);
    fetchSemesters(selectedFaculty, newDepartment);
  };

  const cancelAddDepartment = () => {
    setNewDepartment("");
    setIsAddingDepartment(false);
  };

  const handleAddSemester = async () => {
    if (!newSemester.trim()) {
      alert("Please enter a semester!");
      return;
    }
    
    setSelectedSemester(newSemester);
    setSemesters([...semesters, newSemester]);
    setNewSemester("");
    setIsAddingSemester(false);
    fetchCourses(selectedFaculty, selectedDepartment, newSemester);
  };

  const cancelAddSemester = () => {
    setNewSemester("");
    setIsAddingSemester(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6 text-gray-700" />
              <h1 className="text-2xl font-semibold text-gray-900">
                Courses Management
              </h1>
            </div>
            <p className="text-sm text-gray-600">Manage courses by faculty, department, and semester</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 text-sm">
              {successMessage}
            </div>
          )}

          {/* Selection Card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        fetchSemesters(selectedFaculty, e.target.value);
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

              {/* Semester Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">Semester</label>
                {!isAddingSemester ? (
                  <>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={selectedSemester}
                      onChange={(e) => {
                        setSelectedSemester(e.target.value);
                        fetchCourses(selectedFaculty, selectedDepartment, e.target.value);
                      }}
                      disabled={!selectedFaculty || !selectedDepartment}
                    >
                      <option value="">Select Semester</option>
                      {semesters.map((sem, index) => (
                        <option key={index} value={sem}>{sem}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsAddingSemester(true)}
                      disabled={!selectedFaculty || !selectedDepartment}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Semester
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      placeholder="Enter new semester"
                      value={newSemester}
                      onChange={(e) => setNewSemester(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSemester()}
                      autoFocus
                    />
                    <button
                      onClick={handleAddSemester}
                      className="px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelAddSemester}
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
          {selectedFaculty && selectedDepartment && selectedSemester && (
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search courses by ID, name, or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openAddCourseModal}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Course
                </button>
                <button
                  onClick={handleUpdateAll}
                  disabled={saving || courses.filter(c => c.isModified || !c.unid).length === 0}
                  className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : `Update All ${courses.filter(c => c.isModified || !c.unid).length > 0 ? `(${courses.filter(c => c.isModified || !c.unid).length})` : ""}`}
                </button>
              </div>
            </div>
          )}

          {/* Courses Table */}
          {selectedFaculty && selectedDepartment && selectedSemester && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Course ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Course Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20">Credits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Teachers</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCourses.map((course, index) => {
                      const actualIndex = courses.findIndex(c => c.unid === course.unid || (c.ID === course.ID && c.name === course.name));
                      return (
                        <tr key={course.unid || index} className={course.isModified ? "bg-amber-50" : ""}>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={course.ID || ""}
                              onChange={(e) => updateCourseField(actualIndex, "ID", e.target.value)}
                              placeholder="Course ID"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={course.name || ""}
                              onChange={(e) => updateCourseField(actualIndex, "name", e.target.value)}
                              placeholder="Course Name"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={course.code || ""}
                              onChange={(e) => updateCourseField(actualIndex, "code", e.target.value)}
                              placeholder="Code"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                              value={course.credits || ""}
                              onChange={(e) => updateCourseField(actualIndex, "credits", e.target.value)}
                              placeholder="Credits"
                            />
                          </td>
                          <td className="px-4 py-3 relative">
                            <button
                              className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                              onClick={() => setSelectedCourseIndex(actualIndex)}
                            >
                              <Users className="w-3.5 h-3.5" />
                              {Array.isArray(course.teachers) && course.teachers.length > 0
                                ? `${course.teachers.length} Selected`
                                : "Select Teachers"}
                            </button>

                            {selectedCourseIndex === actualIndex && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setSelectedCourseIndex(null)}
                                />
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50" style={{ maxHeight: "300px", overflowY: "auto" }}>
                                  <div className="p-3">
                                  <div className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Select Teachers</div>
                                  <div className="space-y-2">
                                    {teachers.map((teacher, idx) => {
                                      const teacherKey =
                                        typeof teacher === "string"
                                          ? teacher
                                          : (teacher?.unid ?? teacher?.ID ?? teacher?.name ?? "");
                                      const teacherLabel =
                                        typeof teacher === "string"
                                          ? teacher
                                          : (teacher?.name ?? teacher?.ID ?? teacher?.unid ?? "Unknown");
                                      const selectedTeachers = Array.isArray(course.teachers)
                                        ? course.teachers
                                        : [];

                                      return (
                                        <label key={teacherKey || idx} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                                          <input
                                            type="checkbox"
                                            checked={teacherKey ? selectedTeachers.includes(teacherKey) : false}
                                            onChange={(e) => {
                                              let updatedTeachers = [...selectedTeachers];
                                              if (!teacherKey) return;

                                              if (e.target.checked) {
                                                if (!updatedTeachers.includes(teacherKey)) {
                                                  updatedTeachers.push(teacherKey);
                                                }
                                              } else {
                                                updatedTeachers = updatedTeachers.filter((t) => t !== teacherKey);
                                              }
                                              updateCourseField(actualIndex, "teachers", updatedTeachers);
                                            }}
                                            className="rounded border-gray-300"
                                          />
                                          <span className="text-gray-700">{teacherLabel}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <button
                                    className="mt-3 w-full px-3 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                                    onClick={() => setSelectedCourseIndex(null)}
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                              </>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveCourse(actualIndex)}
                                className="inline-flex items-center justify-center px-2 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                                title={course.unid ? "Update" : "Save"}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteCourse(actualIndex)}
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
                    {filteredCourses.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                          {searchQuery ? "No courses match your search." : "No courses found. Click 'Add Row' to create a new course."}
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

      {/* Add Course Modal */}
      {isAddCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Course</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Course ID *</label>
                <input
                  ref={courseIdRef}
                  type="text"
                  value={newCourse.ID}
                  onChange={(e) => setNewCourse({ ...newCourse, ID: e.target.value })}
                  onKeyDown={handleCourseModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter course ID"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Course Name *</label>
                <input
                  ref={courseNameRef}
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  onKeyDown={handleCourseModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter course name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Code</label>
                <input
                  ref={courseCodeRef}
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  onKeyDown={handleCourseModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter course code"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Credits</label>
                <input
                  ref={courseCreditsRef}
                  type="text"
                  value={newCourse.credits}
                  onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                  onKeyDown={handleCourseModalKeyDown}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Enter credits"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeAddCourseModal}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveNewCourse(true)}
                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Save and Add More
              </button>
              <button
                onClick={() => saveNewCourse(false)}
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

export default CourseLoad;
