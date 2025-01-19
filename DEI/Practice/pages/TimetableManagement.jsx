import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const times = ['7:00 - 8:00','8:00 - 9:00','9:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00','16:00 - 17:00','17:00 - 18:00'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TimetableManagement = () => {
  const [timetable, setTimetable] = useState(
    times.map(() => days.map(() => ({ teacher: '', subject: '', room: '' })))
  );
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    fetchTimetable();
    fetchFaculties();
    fetchRooms();
    fetchCourses();
  }, []);

  const fetchTimetable = async () => {
    try {
      const response = await fetch('/api/timetable');
      if (!response.ok) {
        throw new Error('Failed to fetch timetable');
      }
      const data = await response.json();
      setTimetable(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setLoading(false);
    }
  };

  const fetchFaculties = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/faculty');
      if (!response.ok) {
        throw new Error('Failed to fetch faculties');
      }
      const data = await response.json();
      setFaculties(data);
    } catch (error) {
      console.error('Error fetching faculties:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/courses');
      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleChange = async (timeIndex, dayIndex, field, value) => {
    const newTimetable = [...timetable];
    newTimetable[timeIndex][dayIndex][field] = value;
    setTimetable(newTimetable);

    // Save the updated timetable entry to the backend
    try {
      const response = await fetch(`/api/timetable/${newTimetable[timeIndex][dayIndex]._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTimetable[timeIndex][dayIndex]),
      });
      if (!response.ok) {
        throw new Error('Failed to update timetable entry');
      }
    } catch (error) {
      console.error('Error updating timetable entry:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="no-print">
        <nav className="flex justify-end space-x-6 p-4 bg-gray-500 text-white">
          <Link to="/teachers" className="hover:text-gray-400">Teacher List</Link>
          <Link to="/rooms" className="hover:text-gray-400">Room List</Link>
          <Link to="/courses" className="hover:text-gray-400">Course</Link>
          <Link to="/faculty" className="hover:text-gray-400">Faculty</Link>
        </nav>
      </header>

      <div className="content p-4">
        <div className="timetable">
          <h2 className="text-2xl text-gray-600 font-bold mb-4">Weekly Timetable</h2>
          <table id="timetableGrid" className="min-w-full bg-gray-100 text-xs">
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="py-1 px-2 border-b">Time</th>
                {days.map((day) => (
                  <th key={day} className="py-1 px-2 border-b">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time, timeIndex) => (
                <tr key={time}>
                  <td className="py-1 px-2 border-b">{time}</td>
                  {days.map((day, dayIndex) => (
                    <td key={day} className="py-1 px-2 border-b">
                      <div className="mb-1">
                        <select
                          value={timetable[timeIndex][dayIndex].teacher}
                          onChange={(e) =>
                            handleChange(timeIndex, dayIndex, 'teacher', e.target.value)
                          }
                          className="w-full px-1 py-1 border rounded bg-white print:border-none print:bg-transparent print:appearance-none"
                        >
                          <option value="">Faculty</option>
                          {faculties.map((faculty) => (
                            <option key={faculty._id} value={faculty._id}>
                              {faculty.Faculty_Name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-1">
                        <select
                          value={timetable[timeIndex][dayIndex].subject}
                          onChange={(e) =>
                            handleChange(timeIndex, dayIndex, 'subject', e.target.value)
                          }
                          className="w-full px-1 py-1 border rounded bg-white print:border-none print:bg-transparent print:appearance-none"
                        >
                          <option value="">Course</option>
                          {courses.map((course) => (
                            <option key={course._id} value={course._id}>
                              {course.course_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-1">
                        <select
                          value={timetable[timeIndex][dayIndex].room}
                          onChange={(e) =>
                            handleChange(timeIndex, dayIndex, 'room', e.target.value)
                          }
                          className="w-full px-1 py-1 border rounded bg-white print:border-none print:bg-transparent print:appearance-none"
                        >
                          <option value="">Room</option>
                          {rooms.map((room) => (
                            <option key={room._id} value={room._id}>
                              {room.room}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            id="printButton"
            className="no-print mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handlePrint}
          >
            Print Timetable
          </button>
        </div>
      </div>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #timetableGrid, #timetableGrid * {
              visibility: visible;
            }
            #timetableGrid {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              font-size: 8px;
            }
            #timetableGrid th, #timetableGrid td {
              padding: 2px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default TimetableManagement;