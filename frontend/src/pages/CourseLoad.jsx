import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

const CourseLoad = () => {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  const [isAddingSemester, setIsAddingSemester] = useState(false);
  const [newSemester, setNewSemester] = useState("");

  const [selectedCourseIndex, setSelectedCourseIndex] = useState(null);


  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const response = await fetch("http://localhost:5000/teacher/faculty");
      const data = await response.json();
      setFaculties(data);
    } catch (error) {
      console.error("Error fetching faculties:", error);
    }
  };

  const fetchDepartments = async (faculty) => {
    try {
      const response = await fetch(`http://localhost:5000/teacher/department?faculty=${faculty}`);
      const data = await response.json();
      setDepartments(data);
      setSelectedDepartment("");
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSemesters = async (faculty, department) => {
    try {
      const response = await fetch(`http://localhost:5000/course/semester?faculty=${faculty}&department=${department}`);
      const data = await response.json();
      setSemesters(data);
      setSelectedSemester("");
    } catch (error) {
      console.error("Error fetching semesters:", error);
    }
  };

  const fetchTeachers = async (faculty, department) => {
    try {
      const response = await fetch(`http://localhost:5000/teacher?faculty=${faculty}&department=${department}`);
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const handleEnterSemester = (e) => {
    if (e.key === "Enter" && newSemester.trim() !== "") {
      setSelectedSemester(newSemester);
      setSemesters((prevSemesters) => [...prevSemesters, newSemester]);
      setIsAddingSemester(false);
      setNewSemester("");
    }
  };

  const fetchCourses = async (faculty, department, semester) => {
    try {
      const response = await fetch(`http://localhost:5000/course/fetchCourse?faculty=${faculty}&department=${department}&semester=${semester}`);
      const data = await response.json();
      fetchTeachers(faculty, department);
      // setCourses(data);
      console.log("Courses:", data); // ✅ Debugging log
      // ✅ Ensure that fetched courses retain the isAdded flag
    const updatedCourses = data.map(course => ({
      ...course,
      isAdded: true, // Mark as added so button shows "UPDATE"
    }));

    setCourses(updatedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const updateCourseField = (index, field, value) => {
    const updatedCourses = [...courses];
    updatedCourses[index][field] = value;
    setCourses(updatedCourses);
  };

  const addCourse = async (index) => {
    const course = courses[index];
  
    if (!course.ID.trim() || !course.name.trim()) {
      return alert("Please enter Course ID and Name!");
    }
  
    console.log("Sending Course Data:", course); // ✅ Debugging log
  
    try {
      const response = await fetch("http://localhost:5000/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ID: course.ID,
          name: course.name,
          unid: course.unid,
          code: course.code,
          credits: course.credits,
          teachers: course.teachers,
          faculty: selectedFaculty,
          semester: selectedSemester,
          department: selectedDepartment,
        }),
      });
  
      const data = await response.json();
      console.log("API Response (POST):", data); // ✅ Debugging log
  
      if (data.success) {
        console.log("Course added successfully!");
        
        const updatedCourses = [...courses];
        updatedCourses[index].isAdded = true;
        updatedCourses[index].unid = data.unid;
        setCourses(updatedCourses);
        fetchCourses(selectedFaculty, selectedDepartment, selectedSemester); // Reload courses
      } else {
        alert("Error adding course: " + data.error);
      }
    } catch (error) {
      console.error("Error adding course:", error);
    }
  };
  

  const updateCourse = async (index) => {
    const course = courses[index];
    try {
        const response = await fetch(`http://localhost:5000/course/${course.unid}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                unid: course.unid,
                ID: course.ID,
                name: course.name,
                code: course.code,
                credits: course.credits,
                teachers: course.teachers,
                faculty: selectedFaculty,
                semester: selectedSemester,
                department: selectedDepartment,
            }),
        });
        const data = await response.json();
        if (data.success) {
            alert("Course updated successfully!");
            fetchCourses(selectedFaculty, selectedDepartment, selectedSemester);
        } else {
            alert("Error updating course: " + data.message);
        }
    } catch (error) {
        console.error("Error updating course:", error);
    }
};

const deleteCourse = async (index) => {
  const course = courses[index];

  try {
      const response = await fetch(`http://localhost:5000/course/${course.unid}`, {
          method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
          alert("Course deleted successfully!");

          // ✅ Remove course from local state immediately
          const updatedCourses = courses.filter((_, i) => i !== index);
          setCourses(updatedCourses);

          // ✅ Fetch updated list (optional, but ensures consistency)
          fetchCourses(selectedFaculty, selectedDepartment, selectedSemester);
      } else {
          alert("else Error deleting course: " + data.message);
      }
  } catch (error) {
      console.error("Error deleting course:", error);
  }
};


  const addCourseRow = () => {
    setCourses([...courses, { id: "", name: "", code: "", credits: "", teachers: [], isAdded: false }]);
  };

  return (
    <Layout
      leftSection={
        <div>
          <h2 className="text-2xl font-bold mb-4">Select Faculty</h2>
          <select
            className="p-2 border rounded w-full"
            value={selectedFaculty}
            onChange={(e) => {
              setSelectedFaculty(e.target.value);
              fetchDepartments(e.target.value);
            }}
          >
            <option value="" disabled>Select Faculty</option>
            {faculties.map((faculty, index) => (
              <option key={index} value={faculty}>{faculty}</option>
            ))}
          </select>

          <h2 className="text-2xl font-bold mb-4">Select Department</h2>
          <select
            className="p-2 border rounded w-full"
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              fetchSemesters(selectedFaculty, e.target.value);
            }}
            disabled={!selectedFaculty}
          >
            <option value="" disabled>Select Department</option>
            {departments.map((department, index) => (
              <option key={index} value={department}>{department}</option>
            ))}
          </select>

          <h2 className="text-2xl font-bold mb-4">Select or Add Semester</h2>
          {!isAddingSemester ? (
            <div className="flex items-center gap-2">
              <select
                className="p-2 border rounded w-full"
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  fetchCourses(selectedFaculty, selectedDepartment, e.target.value);
                }}
                disabled={!selectedFaculty || !selectedDepartment}
              >
                <option value="" disabled>Select Semester</option>
                {semesters.map((sem, index) => (
                  <option key={index} value={sem}>{sem}</option>
                ))}
              </select>
              <button
                onClick={() => setIsAddingSemester(true)}
                className="p-2 bg-blue-500 text-white rounded"
              >
                +
              </button>
            </div>
          ) : (
            <input
              type="text"
              className="p-2 border rounded w-full"
              placeholder="Enter new semester"
              value={newSemester}
              onChange={(e) => {setNewSemester(e.target.value);
                fetchCourses(selectedFaculty, selectedDepartment, e.target.value);
              }}
              onKeyDown={handleEnterSemester}
            />
          )}
        </div>
      }
      rightSection={
        <div>
          <h2 className="text-2xl font-bold mb-4">Course Details</h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 p-2">Course ID</th>
                <th className="border border-gray-300 p-2">Course Name</th>
                <th className="border border-gray-300 p-2">Course Code</th>
                <th className="border border-gray-300 p-2">Credits</th>
                <th className="border border-gray-300 p-2">Teachers</th>
                <th className="border border-gray-300 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, index) => (
                <tr key={course.unid} className="border border-gray-300">
                  <td className="p-2">
                    <input
                      type="text"
                      className="p-2 border rounded w-full"
                      value={course.ID || ""}
                      onChange={(e) => updateCourseField(index, "ID", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="p-2 border rounded w-full"
                      value={course.name || ""}
                      onChange={(e) => updateCourseField(index, "name", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="p-2 border rounded w-full"
                      value={course.code || ""}
                      onChange={(e) => updateCourseField(index, "code", e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      className="p-2 border rounded w-full"
                      value={course.credits || ""}
                      onChange={(e) => updateCourseField(index, "credits", e.target.value)}
                    />
                  </td>
                  <td className="p-2 relative">
                    <button
                      className="p-2 bg-gray-500 text-white rounded w-full"
                      onClick={() => setSelectedCourseIndex(index)}
                    >
                      Select Teachers
                    </button>

                    {selectedCourseIndex === index && (
                      <div
                      className="absolute top-10 left-0 w-48 bg-white shadow-lg p-3 border rounded z-50"
                      style={{ maxHeight: "200px", overflowY: "auto" }} // Scroll enabled
                      >
                        <h3 className="text-sm font-bold mb-2">Select Teachers</h3>
                        {teachers.map((teacher, idx) => (
                          <label key={idx} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={course.teachers.includes(teacher)}
                            onChange={(e) => {
                              let updatedTeachers = [...course.teachers];
                              if (e.target.checked) {
                                updatedTeachers.push(teacher);
                              } else {
                                updatedTeachers = updatedTeachers.filter(t => t !== teacher);
                              }
                              updateCourseField(index, "teachers", updatedTeachers);
                            }}
                          />
                          {teacher}
                          </label>
                        ))}
                        <button
                          className="mt-2 p-1 bg-red-500 text-white rounded w-full text-sm"
                          onClick={() => setSelectedCourseIndex(null)}
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => course.isAdded ? updateCourse(index) : addCourse(index)}
                      className={`p-2 rounded ${course.isAdded ? "bg-blue-500" : "bg-green-500"} text-white`}
                    >
                      {course.isAdded ? "UPDATE" : "ADD"}
                    </button>
                    <button
                      onClick={() => deleteCourse(index)}
                      className="p-2 bg-red-500 text-white rounded"
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addCourseRow}
            disabled={!selectedFaculty || !selectedDepartment || !selectedSemester}
            className="mt-4 p-2 bg-gray-800 text-white rounded"
          >
            Add Row
          </button>
        </div>
      }
    />
  );
};

export default CourseLoad;
