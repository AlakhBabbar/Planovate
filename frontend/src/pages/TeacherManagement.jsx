// filepath: /c:/Users/anish/Desktop/DEI/Practice/pages/TeacherManagement.jsx
import React, { useState, useEffect } from 'react';

const TeacherManagement = () => {
  const [teachers, setteachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newteacher, setNewteacher] = useState({ teacher_id: '', name: '', email: '', department: '' });

  useEffect(() => {
    fetchteachers();
  }, []);

  const fetchteachers = async () => {
    try {
      const response = await fetch('http://localhost:5000/teacher');
      if (!response.ok) {
        throw new Error('Failed to fetch teachers');
      }
      const data = await response.json();
      setteachers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setLoading(false);
    }
  };

  const handleAddteacher = async () => {
    try {
      const response = await fetch('http://localhost:5000/teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newteacher),
      });
      if (!response.ok) {
        throw new Error('Failed to add teacher');
      }
      const data = await response.json();
      setteachers([...teachers, data]);
      setNewteacher({ teacher_id: '', name: '', email: '', department: '' });
    } catch (error) {
      console.error('Error adding teacher:', error);
    }
  };

  const handleDeleteteacher = async (ID) => {
    try {
      const response = await fetch(`http://localhost:5000/teacher/${ID}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete teacher');
      }
      setteachers(teachers.filter((teacher) => teacher.ID !== ID));
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* <h1 className="text-2xl font-bold mb-4">teacher Management</h1> */}
      <div className="mb-4 my-6">
        <input
          type="text"
          placeholder="teacher ID"
          value={newteacher.teacher_id}
          onChange={(e) => setNewteacher({ ...newteacher, teacher_id: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Name"
          value={newteacher.name}
          onChange={(e) => setNewteacher({ ...newteacher, name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={newteacher.email}
          onChange={(e) => setNewteacher({ ...newteacher, email: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Department"
          value={newteacher.department}
          onChange={(e) => setNewteacher({ ...newteacher, department: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleAddteacher} className="bg-blue-500 text-white p-2 rounded">Add teacher</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">teacher ID</th>
            <th className="border p-2">Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Department</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((teacher) => (
            <tr key={teacher._id}>
              <td className="border p-2">{teacher.teacher_id}</td>
              <td className="border p-2">{teacher.teacher_Name}</td>
              <td className="border p-2">{teacher.teacher_Email}</td>
              <td className="border p-2">{teacher.department}</td>
              <td className="border p-2">
                <button onClick={() => handleDeleteteacher(teacher._id)} className="bg-red-500 text-white p-2 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TeacherManagement;