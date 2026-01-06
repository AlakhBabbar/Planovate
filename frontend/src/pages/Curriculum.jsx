import React, { useState, useEffect } from "react";
import { Plus, X, List, Grid, Save, Trash2, Search } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { courseService } from "../firebase/services";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const Curriculum = () => {
  const [viewMode, setViewMode] = useState("cards");
  const [curriculum, setCurriculum] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state for new curriculum
  const [newCurriculum, setNewCurriculum] = useState({
    className: "",
    branch: "",
    semester: "",
    type: "",
    totalCreditsInput: "",
    courses: []
  });

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCurriculum();
    fetchAllCourses();
  }, []);

  const fetchCurriculum = async () => {
    try {
      const snapshot = await getDocs(collection(db, "curriculum"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCurriculum(data);
    } catch (error) {
      console.error("Error fetching curriculum:", error);
    }
  };

  const fetchAllCourses = async () => {
    try {
      const courses = await courseService.listCourses({});
      setAvailableCourses(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const generateCurriculumId = (className, branch, semester, type) => {
    return `curr_${className}_${branch}_${semester}_${type}`.toLowerCase().replace(/\s+/g, "_");
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedCurriculum(null);
    setNewCurriculum({
      className: "",
      branch: "",
      semester: "",
      type: "",
      totalCreditsInput: "",
      courses: []
    });
  };

  const handleSaveCurriculum = async () => {
    const { className, branch, semester, type, courses, totalCreditsInput } = newCurriculum;
    
    if (!className.trim() || !branch.trim() || !semester.trim() || !type.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!totalCreditsInput || totalCreditsInput.trim() === "") {
      alert("Please enter total credits");
      return;
    }

    const inputCredits = parseFloat(totalCreditsInput);
    const calculatedCredits = calculateTotalCredits(courses);

    if (isNaN(inputCredits) || inputCredits <= 0) {
      alert("Please enter a valid positive number for total credits");
      return;
    }

    if (inputCredits !== calculatedCredits) {
      const confirmed = confirm(
        `Warning: Total credits mismatch!\n\nEntered: ${inputCredits}\nCalculated from courses: ${calculatedCredits}\n\nDo you want to save anyway?`
      );
      if (!confirmed) return;
    }

    try {
      const curriculumId = generateCurriculumId(className, branch, semester, type);
      const curriculumData = {
        className,
        branch,
        semester,
        type,
        courses,
        totalCredits: calculatedCredits,
        expectedCredits: inputCredits,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "curriculum", curriculumId), curriculumData);
      
      setIsCreating(false);
      setNewCurriculum({
        className: "",
        branch: "",
        semester: "",
        type: "",
        totalCreditsInputster: "",
        courses: []
      });
      
      fetchCurriculum();
      alert("Curriculum saved successfully!");
    } catch (error) {
      console.error("Error saving curriculum:", error);
      alert("Failed to save curriculum");
    }
  };

  const handleDeleteCurriculum = async (id) => {
    if (!confirm("Are you sure you want to delete this curriculum?")) return;

    try {
      await deleteDoc(doc(db, "curriculum", id));
      fetchCurriculum();
      alert("Curriculum deleted successfully!");
    } catch (error) {
      console.error("Error deleting curriculum:", error);
      alert("Failed to delete curriculum");
    }
  };

  const handleEditCurriculum = (curriculum) => {
    setNewCurriculum({
      className: curriculum.className,
      branch: curriculum.branch,
      semester: curriculum.semester,
      type: curriculum.type,
      courses: curriculum.courses || []
    });
    setIsCreating(true);
    setSelectedCurriculum(curriculum.id);
  };

  const toggleCourseSelection = (course) => {
    const isSelected = newCurriculum.courses.some(c => c.unid === course.unid);
    
    if (isSelected) {
      setNewCurriculum({
        ...newCurriculum,
        courses: newCurriculum.courses.filter(c => c.unid !== course.unid)
      });
    } else {
      setNewCurriculum({
        ...newCurriculum,
        courses: [...newCurriculum.courses, {
          unid: course.unid,
          name: course.name,
          code: course.code,
          credits: course.credits
        }]
      });
    }
  };

  const calculateTotalCredits = (courses) => {
    return courses.reduce((total, course) => {
      const credits = parseFloat(course.credits) || 0;
      return total + credits;
    }, 0);
  };

  const filteredCourses = availableCourses.filter(course => {
    const search = searchTerm.toLowerCase();
    return (
      course.name?.toLowerCase().includes(search) ||
      course.code?.toLowerCase().includes(search) ||
      course.ID?.toLowerCase().includes(search)
    );
  });

  const filteredCurriculum = curriculum.filter(curr => {
    const search = searchTerm.toLowerCase();
    return (
      curr.className?.toLowerCase().includes(search) ||
      curr.branch?.toLowerCase().includes(search) ||
      curr.semester?.toLowerCase().includes(search) ||
      curr.type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Curriculum Management</h1>
              <p className="text-gray-600 mt-1">Assign courses to classes</p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex bg-white border border-gray-200 rounded-lg">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-2 rounded-l-lg transition-colors ${
                    viewMode === "cards" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Grid size={20} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-r-lg transition-colors ${
                    viewMode === "list" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <List size={20} />
                </button>
              </div>
              
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create New
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {!isCreating && (
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search curriculum..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Create/Edit Form */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedCurriculum ? "Edit Curriculum" : "Create New Curriculum"}
              </h2>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <input
                type="text"
                placeholder="Class"
                value={newCurriculum.className}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, className: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Branch/Batch"
                value={newCurriculum.branch}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, branch: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Semester"
                value={newCurriculum.semester}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, semester: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newCurriculum.type}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, type: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Type</option>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
              </select>
              <input
                type="number"
                step="0.5"
                placeholder="Total Credits"
                value={newCurriculum.totalCreditsInput}
                onChange={(e) => setNewCurriculum({ ...newCurriculum, totalCreditsInput: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Credits Comparison */}
            {newCurriculum.totalCreditsInput && (
              <div className="mb-6 p-3 rounded-lg border">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-gray-600">Expected Credits: </span>
                    <span className="font-semibold">{parseFloat(newCurriculum.totalCreditsInput) || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Course Credits: </span>
                    <span className={`font-semibold ${
                      parseFloat(newCurriculum.totalCreditsInput) === calculateTotalCredits(newCurriculum.courses)
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {calculateTotalCredits(newCurriculum.courses)}
                    </span>
                  </div>
                  <div>
                    {parseFloat(newCurriculum.totalCreditsInput) === calculateTotalCredits(newCurriculum.courses) ? (
                      <span className="text-green-600 text-sm font-medium">Match</span>
                    ) : (
                      <span className="text-red-600 text-sm font-medium">
                        Mismatch ({(calculateTotalCredits(newCurriculum.courses) - parseFloat(newCurriculum.totalCreditsInput)).toFixed(1)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selected Courses */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-900">Selected Courses</h3>
                <div className="text-sm">
                  <span className="text-gray-600">Course Credits: </span>
                  <span className="font-semibold text-blue-600">
                    {calculateTotalCredits(newCurriculum.courses)}
                  </span>
                </div>
              </div>

              {newCurriculum.courses.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">No courses selected yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newCurriculum.courses.map((course) => (
                    <div
                      key={course.unid}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{course.name}</span>
                        <span className="text-gray-500 ml-2">({course.code})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">{course.credits} Credits</span>
                        <button
                          onClick={() => toggleCourseSelection(course)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowCourseSelector(true)}
                className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                + Add Courses
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveCurriculum}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={20} />
              Save Curriculum
            </button>
          </div>
        )}

        {/* Curriculum Display */}
        {!isCreating && (
          <>
            {viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCurriculum.map((curriculum) => (
                  <div
                    key={curriculum.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {curriculum.className}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {curriculum.branch} - Sem {curriculum.semester}
                        </p>
                        <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {curriculum.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCurriculum(curriculum)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCurriculum(curriculum.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-700">Courses</span>
                        <span className="text-sm text-gray-600">
                          {curriculum.totalCredits || 0} Credits
                        </span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {curriculum.courses?.map((course) => (
                          <div
                            key={course.unid}
                            className="text-sm p-2 bg-gray-50 rounded border border-gray-100"
                          >
                            <div className="font-medium text-gray-900">{course.name}</div>
                            <div className="text-gray-500 text-xs">
                              {course.code} - {course.credits} Credits
                            </div>
                          </div>
                        ))}
                        {(!curriculum.courses || curriculum.courses.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">No courses assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Courses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credits</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCurriculum.map((curriculum) => (
                      <tr key={curriculum.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{curriculum.className}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{curriculum.branch}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{curriculum.semester}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {curriculum.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {curriculum.courses?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{curriculum.totalCredits || 0}</td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => handleEditCurriculum(curriculum)}
                            className="text-blue-600 hover:text-blue-700 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCurriculum(curriculum.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCurriculum.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No curriculum found
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Course Selector Modal */}
      {showCourseSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select Courses</h3>
              <button
                onClick={() => setShowCourseSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                {filteredCourses.map((course) => {
                  const isSelected = newCurriculum.courses.some(c => c.unid === course.unid);
                  
                  return (
                    <div
                      key={course.unid}
                      onClick={() => toggleCourseSelection(course)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{course.name}</div>
                          <div className="text-sm text-gray-500">
                            {course.code} - {course.credits} Credits
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {course.department} - Sem {course.semester}
                          </div>
                        </div>
                        <div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredCourses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No courses found
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {newCurriculum.courses.length} courses selected - 
                <span className="font-semibold text-blue-600 ml-1">
                  {calculateTotalCredits(newCurriculum.courses)} Credits
                </span>
              </div>
              <button
                onClick={() => {
                  setShowCourseSelector(false);
                  setSearchTerm("");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Curriculum;
