import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { teacherService } from "../firebase/services";

const TeacherLoad = () => {
  const [faculties, setFaculties] = useState([]); // Fetched faculty list
  const [departments, setDepartments] = useState([]); // Fetched department list
  const [teachers, setTeachers] = useState([]); // Fetched teacher list

  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [isAddingFaculty, setIsAddingFaculty] = useState(false);
  const [newFaculty, setNewFaculty] = useState("");

  const [isFacultyEntered, setIsFacultyEntered] = useState(false);
  const [isDepartmentEntered, setIsDepartmentEntered] = useState(false);

  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");


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
      setSelectedDepartment(""); // Ensure "Select Department" is the default
      setIsDepartmentEntered(false); // Reset department selection state
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
        isAdded: true,
      }));
      setTeachers(formattedTeachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };
  
  

  const handleAddFaculty = () => {
    setIsAddingFaculty(true); // Show input box for new faculty
  };

  const handleEnterFaculty = (e) => {
    if (e.key === "Enter" && newFaculty.trim() !== "") {
      setSelectedFaculty(newFaculty); // Set new faculty immediately
      setFaculties((prevFaculties) => [...prevFaculties, newFaculty]); // Add to dropdown dynamically
      setIsFacultyEntered(true);
      setIsAddingFaculty(false);
      setNewFaculty("");
  
      // Since this is a new Faculty, show the Department input field
      setSelectedDepartment("");
      setDepartments([]); // Clear department list since it's a new Faculty
      setIsAddingDepartment(true); // Force Department input box to appear
    }
  };
  

  const handleEnterDepartment = (e) => {
    if (e.key === "Enter" && newDepartment.trim() !== "") {
      setSelectedDepartment(newDepartment); // Set the new department
      setDepartments((prevDepartments) => [...prevDepartments, newDepartment]); // Add to dropdown dynamically
      setIsDepartmentEntered(true);
      setIsAddingDepartment(false);
      setNewDepartment("");
  
      // Reset teachers **only if switching to a new department**
      setTeachers([]); 
    }
  };
  
  
  

  const addTeacher = async (index) => {
    const teacher = teachers[index];
  
    if (!teacher.id.trim() || !teacher.name.trim()) {
      return alert("Please enter Teacher ID and Name!");
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
      updatedTeachers[index].isAdded = true;
      updatedTeachers[index].unid = unid;
      setTeachers(updatedTeachers);

      fetchTeachers(selectedFaculty, selectedDepartment);
    } catch (error) {
      console.error("Error adding teacher:", error);
    }
  };
  
  

  const updateTeacher = async (index) => {
    const teacher = teachers[index];
  
    if (!teacher.id.trim() || !teacher.name.trim()) {
      return alert("Please enter Teacher ID and Name!");
    }
  
    try {
      await teacherService.upsertTeacher({
        unid: teacher.unid,
        ID: teacher.id,
        name: teacher.name,
        faculty: selectedFaculty,
        department: selectedDepartment,
      });
      alert("Teacher updated successfully!");
      fetchTeachers(selectedFaculty, selectedDepartment);
    } catch (error) {
      console.error("Error updating teacher:", error);
    }
  };


  const deleteTeacher = async (index) => {
    const teacher = teachers[index];
  
    if (!teacher.unid) {
      return alert("Error: Unable to delete teacher without a valid unid.");
    }
  
    try {
      await teacherService.deleteTeacher(teacher.unid);
      alert("Teacher deleted successfully!");
      const updatedTeachers = teachers.filter((_, i) => i !== index);
      setTeachers(updatedTeachers);
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };
  
  
  
  const addTeacherRow = () => {
    setTeachers([...teachers, { unid: Date.now(), id: "", name: "", isAdded: false }]);
  };
  
  const updateTeacherField = (index, field, value) => {
    const updatedTeachers = [...teachers];
    updatedTeachers[index][field] = value;
    setTeachers(updatedTeachers);
  };

  const deleteTeacherRow = (index) => {
    const updatedTeachers = teachers.filter((_, i) => i !== index);
    setTeachers(updatedTeachers);
  };
  
  

  return (
    <Layout
      leftSection={
        <div>
          <h2 className="text-2xl font-bold mb-4">Select or Add Faculty</h2>

          {/* Faculty Selection Dropdown */}
          {!isAddingFaculty ? (
            <div className="flex items-center gap-2">
              <select
                className="p-2 border rounded w-full"
                value={selectedFaculty}
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setIsFacultyEntered(true);
                  fetchDepartments(e.target.value);
                }}
              >
                <option value="" disabled>Select Faculty</option>
                {faculties.map((faculty, index) => (
                  <option key={index} value={faculty}>{faculty}</option>
                ))}
              </select>

              {/* "+" Button to Add New Faculty */}
              <button
                onClick={handleAddFaculty}
                className="p-2 bg-blue-500 text-white rounded"
              >
                +
              </button>
            </div>
          ) : (
            /* Input Box for Adding New Faculty */
            <input
              type="text"
              className="p-2 border rounded w-full"
              placeholder="Enter new faculty"
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
              onKeyDown={handleEnterFaculty}
            />
          )}


          {/* Department Section */}

          <h2 className="text-2xl font-bold mb-4">Select or Add Department</h2>

          {isFacultyEntered && !isAddingDepartment ? (
            <div className="flex items-center gap-2">
              <select
                className="p-2 border rounded w-full"
                value={selectedDepartment}
                onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setIsDepartmentEntered(true);
                fetchTeachers(selectedFaculty, e.target.value);
                }}
              >
              <option value="" disabled selected>Select Department</option>
              {departments.map((department, index) => (
                <option key={index} value={department}>{department}</option>
              ))}
              </select>


              {/* "+" Button to Add New Department */}
              <button
                onClick={() => setIsAddingDepartment(true)}
                className="p-2 bg-blue-500 text-white rounded"
              >
                +
              </button>
            </div>
          ) : (
                /* Input Box for Adding New Department */
                <input
                  type="text"
                  className="p-2 border rounded w-full"
                  placeholder="Enter new department"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDepartment.trim() !== "") {
                      setSelectedDepartment(newDepartment);
                      setIsDepartmentEntered(true);
                      handleEnterDepartment(e);
                      setIsAddingDepartment(false);
                      setNewDepartment("");
        
                    }
                  }}
                  disabled={!selectedFaculty} // ✅ Disable input if no faculty is selected
                />
              )}
        </div>
      }
      rightSection={
        <div>
        
          {/* Teacher Section */}
          {isDepartmentEntered && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Add Teacher Details</h2>

              {/* Teacher Table */}
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 p-2">Teacher ID</th>
                    <th className="border border-gray-300 p-2">Teacher Name</th>
                    <th className="border border-gray-300 p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher, index) => (
                      <tr key={teacher.unid} className="border border-gray-300">
                        <td className="p-2">
                          <input
                            type="text"
                            className="p-2 border rounded w-full"
                            value={teacher.id}
                            onChange={(e) => updateTeacherField(index, "id", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            className="p-2 border rounded w-full"
                            value={teacher.name}
                            onChange={(e) => updateTeacherField(index, "name", e.target.value)}
                          />
                        </td>
                        <td className="p-2 flex gap-2">
                          <button
                            onClick={() => teacher.isAdded ? updateTeacher(index) : addTeacher(index)}
                            className={`p-2 rounded ${teacher.isAdded ? "bg-blue-500" : "bg-green-500"} text-white`}
                          >
                            {teacher.isAdded ? "UPDATE" : "ADD"}
                          </button>
                          <button
                            onClick={() => deleteTeacher(index)}
                            className="p-2 bg-red-500 text-white rounded"
                          >
                            DELETE
                          </button>
                        </td>


                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Add Row Button */}
              <button
                onClick={addTeacherRow}
                className="mt-4 p-2 bg-gray-800 text-white rounded"
              >
                Add Row
              </button>
            </div>
          )}
        </div>
      }
    />
  );
};

export default TeacherLoad;
