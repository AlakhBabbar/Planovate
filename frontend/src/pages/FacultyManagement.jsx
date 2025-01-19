// filepath: /c:/Users/anish/Desktop/DEI/Practice/pages/FacultyManagement.jsx
import React, { useState, useEffect } from 'react';

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFaculty, setNewFaculty] = useState({ faculty_id: '', name: '', email: '', department: '' });

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/faculty');
      if (!response.ok) {
        throw new Error('Failed to fetch faculties');
      }
      const data = await response.json();
      setFaculties(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching faculties:', error);
      setLoading(false);
    }
  };

  const handleAddFaculty = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFaculty),
      });
      if (!response.ok) {
        throw new Error('Failed to add faculty');
      }
      const data = await response.json();
      setFaculties([...faculties, data]);
      setNewFaculty({ faculty_id: '', name: '', email: '', department: '' });
    } catch (error) {
      console.error('Error adding faculty:', error);
    }
  };

  const handleDeleteFaculty = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/faculty/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete faculty');
      }
      setFaculties(faculties.filter((faculty) => faculty._id !== id));
    } catch (error) {
      console.error('Error deleting faculty:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* <h1 className="text-2xl font-bold mb-4">Faculty Management</h1> */}
      <div className="mb-4 my-6">
        <input
          type="text"
          placeholder="Faculty ID"
          value={newFaculty.faculty_id}
          onChange={(e) => setNewFaculty({ ...newFaculty, faculty_id: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Name"
          value={newFaculty.name}
          onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={newFaculty.email}
          onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Department"
          value={newFaculty.department}
          onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleAddFaculty} className="bg-blue-500 text-white p-2 rounded">Add Faculty</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Faculty ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Department</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {faculties.map((faculty) => (
            <tr key={faculty._id}>
              <td className="border p-2">{faculty.faculty_id}</td>
              <td className="border p-2">{faculty.Faculty_Name}</td>
              <td className="border p-2">{faculty.Faculty_Email}</td>
              <td className="border p-2">{faculty.department}</td>
              <td className="border p-2">
                <button onClick={() => handleDeleteFaculty(faculty._id)} className="bg-red-500 text-white p-2 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FacultyManagement;