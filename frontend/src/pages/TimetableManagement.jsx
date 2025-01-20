import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const teachers = Array.from({ length: 50 }, (_, i) => `T${i + 1}`);
const rooms = Array.from({ length: 50 }, (_, i) => `R${i + 101}`);
const subjects = ['Math', 'Sci', 'Eng', 'Hist', 'Art'];
const times = ['7:00 - 8:00','8:00 - 9:00','9:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00','16:00 - 17:00','17:00 - 18:00'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TimetableManagement = () => {
  const [tables, setTables] = useState([
    {
      id: 1,
      classInfo: { class: '', branch: '' },
      timetable: times.map(() => days.map(() => [{ teacher: '', subject: '', room: '' }]))
    }
  ]);
  const [activeTableId, setActiveTableId] = useState(1);
  const inputRefs = useRef([]);

  const addNewTable = () => {
    const newTableId = tables.length ? tables[tables.length - 1].id + 1 : 1;
    const newTable = {
      id: newTableId,
      classInfo: { class: '', branch: '' },
      timetable: times.map(() => days.map(() => [{ teacher: '', subject: '', room: '' }]))
    };
    setTables([...tables, newTable]);
    setActiveTableId(newTableId);
  };

  const deleteTable = (id) => {
    if (tables.length === 1) {
      alert('Cannot delete the last table');
      return;
    }
    setTables(tables.filter(table => table.id !== id));
    if (activeTableId === id) {
      setActiveTableId(tables[0].id);
    }
  };

  const handleClassInfoChange = (tableId, key, value) => {
    setTables(tables.map(table => 
      table.id === tableId ? { ...table, classInfo: { ...table.classInfo, [key]: value } } : table
    ));
  };

  const handleChange = (tableId, dayIndex, timeIndex, cellIndex, key, value) => {
    const table = tables.find(table => table.id === tableId);
    if (!table.classInfo.class || !table.classInfo.branch) {
      alert('Please fill in the class and branch information first.');
      return;
    }

    const updatedTimetable = [...table.timetable];
    updatedTimetable[timeIndex][dayIndex][cellIndex][key] = value;
    setTables(tables.map(t => t.id === tableId ? { ...t, timetable: updatedTimetable } : t));
  };

  const handleKeyDown = (event, tableId, dayIndex, timeIndex, cellIndex, key) => {
    if (event.key === 'Enter') {
      if (key === 'teacher') {
        handleBlur(tableId, dayIndex, timeIndex, cellIndex);
      }
    }
  };

  const handleBlur = async (tableId, dayIndex, timeIndex, cellIndex) => {
    const table = tables.find(table => table.id === tableId);
    const slot = table.timetable[timeIndex][dayIndex][cellIndex];
    const requestData = {
      teacher: slot.teacher,
      time: times[timeIndex],
      day: days[dayIndex],
      class: table.classInfo.class,
      branch: table.classInfo.branch,
      batch: slot.batch || '',
    };

    try {
      const response = await fetch('/check-clash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const result = await response.json();

      // Display result
      if (result.clash) {
        alert(`Clash detected: ${result.details}`);
      } else {
        alert('No clash detected');
      }
    } catch (error) {
      console.error('Error checking clash:', error);
    }
  };

  const moveToNextInput = (dayIndex, timeIndex, cellIndex, key) => {
    if (key === 'teacher') {
      if (inputRefs.current[timeIndex] && inputRefs.current[timeIndex][dayIndex] && inputRefs.current[timeIndex][dayIndex][cellIndex]) {
        inputRefs.current[timeIndex][dayIndex][cellIndex].subject.focus();
      }
    } else if (key === 'subject') {
      if (inputRefs.current[timeIndex] && inputRefs.current[timeIndex][dayIndex] && inputRefs.current[timeIndex][dayIndex][cellIndex]) {
        inputRefs.current[timeIndex][dayIndex][cellIndex].room.focus();
      }
    } else if (key === 'room') {
      const nextCellIndex = cellIndex + 1;
      const nextTimeIndex = timeIndex + 1;
      const nextDayIndex = dayIndex + 1;

      if (inputRefs.current[timeIndex] && inputRefs.current[timeIndex][dayIndex] && inputRefs.current[timeIndex][dayIndex][nextCellIndex]) {
        inputRefs.current[timeIndex][dayIndex][nextCellIndex].teacher.focus();
      } else if (inputRefs.current[nextTimeIndex] && inputRefs.current[nextTimeIndex][dayIndex] && inputRefs.current[nextTimeIndex][dayIndex][0]) {
        inputRefs.current[nextTimeIndex][dayIndex][0].teacher.focus();
      } else if (inputRefs.current[timeIndex] && inputRefs.current[timeIndex][nextDayIndex] && inputRefs.current[timeIndex][nextDayIndex][0]) {
        inputRefs.current[timeIndex][nextDayIndex][0].teacher.focus();
      }
    }
  };

  const handleSplitCell = (tableId, dayIndex, timeIndex) => {
    const table = tables.find(table => table.id === tableId);
    const updatedTimetable = [...table.timetable];
    updatedTimetable[timeIndex][dayIndex].push({ teacher: '', subject: '', room: '', batch: '' });
    setTables(tables.map(t => t.id === tableId ? { ...t, timetable: updatedTimetable } : t));
  };

  const handleSave = async () => {
    const table = tables.find(table => table.id === activeTableId);
    const jsonData = table.timetable.flatMap((timeSlots, timeIndex) =>
      timeSlots.flatMap((daySlots, dayIndex) =>
        daySlots.map((slot) => ({
          ...slot,
          day: days[dayIndex],
          time: times[timeIndex],
          class: table.classInfo.class,
          branch: table.classInfo.branch,
        }))
      )
    );

    try {
      const response = await fetch('/api/save-timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        throw new Error('Failed to save timetable');
      }

      alert('Timetable saved successfully');
    } catch (error) {
      console.error('Error saving timetable:', error);
    }
  };

  const activeTable = tables.find(table => table.id === activeTableId);

  if (!activeTable) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="no-print">
        <nav className="flex justify-end space-x-6 p-4 bg-gray-500 text-white">
          <Link to="/rooms" className="hover:text-gray-400">Room List</Link>
          <Link to="/courses" className="hover:text-gray-400">Course</Link>
          <Link to="/teacher" className="hover:text-gray-400">teacher</Link>
        </nav>
      </header>
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-4">
          {tables.map(table => (
            <div key={table.id} className={`px-4 py-2 border ${table.id === activeTableId ? 'bg-gray-300' : 'bg-gray-100'} cursor-pointer`} onClick={() => setActiveTableId(table.id)}>
              Table {table.id}
              <button onClick={() => deleteTable(table.id)} className="ml-2 text-red-500">x</button>
            </div>
          ))}
          <button onClick={addNewTable} className="px-4 py-2 border bg-gray-100 ml-2">+</button>
        </div>
        <div className="mb-4">
          <label className="mr-2">Class:</label>
          <input
            type="text"
            value={activeTable.classInfo.class}
            onChange={(e) => handleClassInfoChange(activeTable.id, 'class', e.target.value)}
            className="border p-2"
          />
          <label className="ml-4 mr-2">Branch:</label>
          <input
            type="text"
            value={activeTable.classInfo.branch}
            onChange={(e) => handleClassInfoChange(activeTable.id, 'branch', e.target.value)}
            className="border p-2"
          />
        </div>
        <table className="min-w-full bg-white border border-gray-300 shadow-lg">
          <thead>
            <tr>
              <th className="border px-4 py-2"></th>
              {days.map((day) => (
                <th key={day} className="border px-4 py-2">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.slice(0, 6).map((time, timeIndex) => (
              <tr key={time}>
                <td className="border px-4 py-2">{time}</td>
                {days.map((day, dayIndex) => (
                  <td key={day} className="border px-4 py-2 relative">
                    {Array.isArray(activeTable.timetable[timeIndex][dayIndex]) && activeTable.timetable[timeIndex][dayIndex].map((slot, cellIndex) => (
                      <div key={cellIndex} className="mb-2">
                        <div className="relative">
                          <input
                            list={`teachers-${timeIndex}-${dayIndex}-${cellIndex}`}
                            value={slot.teacher}
                            onChange={(e) => handleChange(activeTable.id, dayIndex, timeIndex, cellIndex, 'teacher', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, activeTable.id, dayIndex, timeIndex, cellIndex, 'teacher')}
                            className="border p-1 mb-1 w-full"
                            ref={el => {
                              if (!inputRefs.current[timeIndex]) inputRefs.current[timeIndex] = [];
                              if (!inputRefs.current[timeIndex][dayIndex]) inputRefs.current[timeIndex][dayIndex] = [];
                              if (!inputRefs.current[timeIndex][dayIndex][cellIndex]) inputRefs.current[timeIndex][dayIndex][cellIndex] = {};
                              inputRefs.current[timeIndex][dayIndex][cellIndex].teacher = el;
                            }}
                            placeholder='Teacher'
                          />
                          <datalist id={`teachers-${timeIndex}-${dayIndex}-${cellIndex}`}>
                            {teachers.map((teacher) => (
                              <option key={teacher} value={teacher} />
                            ))}
                          </datalist>
                        </div>
                        <div className="relative">
                          <input
                            list={`subjects-${timeIndex}-${dayIndex}-${cellIndex}`}
                            value={slot.subject}
                            onChange={(e) => handleChange(activeTable.id, dayIndex, timeIndex, cellIndex, 'subject', e.target.value)}
                            onKeyDown={(e) => moveToNextInput(dayIndex, timeIndex, cellIndex, 'subject')}
                            className="border p-1 mb-1 w-full"
                            ref={el => {
                              if (!inputRefs.current[timeIndex]) inputRefs.current[timeIndex] = [];
                              if (!inputRefs.current[timeIndex][dayIndex]) inputRefs.current[timeIndex][dayIndex] = [];
                              if (!inputRefs.current[timeIndex][dayIndex][cellIndex]) inputRefs.current[timeIndex][dayIndex][cellIndex] = {};
                              inputRefs.current[timeIndex][dayIndex][cellIndex].subject = el;
                            }}
                            placeholder='Subject'
                          />
                          <datalist id={`subjects-${timeIndex}-${dayIndex}-${cellIndex}`}>
                            {subjects.map((subject) => (
                              <option key={subject} value={subject} />
                            ))}
                          </datalist>
                        </div>
                        <div className="relative">
                          <input
                            list={`rooms-${timeIndex}-${dayIndex}-${cellIndex}`}
                            value={slot.room}
                            onChange={(e) => handleChange(activeTable.id, dayIndex, timeIndex, cellIndex, 'room', e.target.value)}
                            onKeyDown={(e) => moveToNextInput(dayIndex, timeIndex, cellIndex, 'room')}
                            className="border p-1 mb-1 w-full"
                            ref={el => {
                              if (!inputRefs.current[timeIndex]) inputRefs.current[timeIndex] = [];
                              if (!inputRefs.current[timeIndex][dayIndex]) inputRefs.current[timeIndex][dayIndex] = [];
                              if (!inputRefs.current[timeIndex][dayIndex][cellIndex]) inputRefs.current[timeIndex][dayIndex][cellIndex] = {};
                              inputRefs.current[timeIndex][dayIndex][cellIndex].room = el;
                            }}
                            placeholder='Room'
                          />
                          <datalist id={`rooms-${timeIndex}-${dayIndex}-${cellIndex}`}>
                            {rooms.map((room) => (
                              <option key={room} value={room} />
                            ))}
                          </datalist>
                        </div>
                        {activeTable.timetable[timeIndex][dayIndex].length > 1 && (
                          <input
                            type="text"
                            placeholder="Batch"
                            value={slot.batch}
                            onChange={(e) => handleChange(activeTable.id, dayIndex, timeIndex, cellIndex, 'batch', e.target.value)}
                            className="border p-1 mb-1 w-full"
                          />
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => handleSplitCell(activeTable.id, dayIndex, timeIndex)}
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white rounded-full p-1"
                    >
                      +
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={handleSave} className="mt-4 bg-green-500 text-white p-2 rounded">
          Save Timetable
        </button>
      </div>
    </div>
  );
};

export default TimetableManagement;