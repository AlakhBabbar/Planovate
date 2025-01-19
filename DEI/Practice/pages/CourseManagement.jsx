// filepath: /c:/Users/anish/Desktop/DEI/Practice/pages/CourseManagement.jsx
import React, { useState, useEffect } from 'react';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCourse, setNewCourse] = useState({ course_id: '', course_name: '', credits: '' });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/courses');
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      const data = await response.json();
      setCourses(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCourse),
      });
      if (!response.ok) {
        throw new Error('Failed to add course');
      }
      const data = await response.json();
      setCourses([...courses, data]);
      setNewCourse({ course_id: '', course_name: '', credits: '' });
    } catch (error) {
      console.error('Error adding course:', error);
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/courses/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete course');
      }
      setCourses(courses.filter((course) => course._id !== id));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* <h1 className="text-2xl font-bold mb-4">Course Management</h1> */}
      <div className="mb-4 my-6">
        <input
          type="text"
          placeholder="Course ID"
          value={newCourse.course_id}
          onChange={(e) => setNewCourse({ ...newCourse, course_id: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="text"
          placeholder="Course Name"
          value={newCourse.course_name}
          onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
          className="border p-2 mr-2"
        />
        <input
          type="number"
          placeholder="Credits"
          value={newCourse.credits}
          onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
          className="border p-2 mr-2"
        />
        <button onClick={handleAddCourse} className="bg-blue-500 text-white p-2 rounded">Add Course</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Course ID</th>
            <th className="border p-2">Course Name</th>
            <th className="border p-2">Credits</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr key={course._id}>
              <td className="border p-2">{course.course_id}</td>
              <td className="border p-2">{course.course_name}</td>
              <td className="border p-2">{course.credits}</td>
              <td className="border p-2">
                <button onClick={() => handleDeleteCourse(course._id)} className="bg-red-500 text-white p-2 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseManagement;