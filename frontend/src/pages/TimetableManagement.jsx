import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TimetableTable from "../components/TimetableTable";
import { checkConflicts } from "../utils/Conflict";

const Timetable = () => {
  const [tables, setTables] = useState(["Table 1"]);
  const [activeTable, setActiveTable] = useState("Table 1");
  const [timeSlots, setTimeSlots] = useState([
    "7:00 - 7:55",
    "8:00 - 8:55",
    "9:00 - 9:55",
    "10:00 - 10:55",
    "11:00 - 11:55",
    "12:00 - 12:55",
    "1:00 - 1:55",
    "2:00 - 2:55",
  ]);

  const [batches, setBatches] = useState({});
  const [batchData, setBatchData] = useState({});
  const [conflicts, setConflicts] = useState({});

  const createBatch = (rowIndex, colIndex) => {
    setBatches((prev) => {
      const key = `${rowIndex}-${colIndex}`;
      const tableData = prev[activeTable] || {};
      return {
        ...prev,
        [activeTable]: {
          ...tableData,
          [key]: (tableData[key] || 1) + 1
        }
      };
    });
  };

  const updateBatch = (rowIndex, colIndex, batchIndex, field, value) => {
    setBatchData((prev) => {
      const key = `${rowIndex}-${colIndex}-${batchIndex}`;
      const tableData = prev[activeTable] || {};
      const updated = {
        ...prev,
        [activeTable]: {
          ...tableData,
          [key]: {
            ...(tableData[key] || {}),
            [field]: value
          }
        }
      };
      
      if (field === "teacher" || field === "room") {
        const conflictResult = checkConflicts({
          rowIndex,
          colIndex,
          batchIndex,
          field,
          nextValue: value,
          batchesByTable: {
            ...batches,
            [activeTable]: updated[activeTable]
          },
          batchDataByTable: updated,
          tableId: activeTable,
          tableIds: tables
        });
        
        setConflicts((prevConflicts) => {
          const tableConflicts = prevConflicts[activeTable] || {};
          return {
            ...prevConflicts,
            [activeTable]: {
              ...tableConflicts,
              [key]: {
                ...(tableConflicts[key] || {}),
                teacher: field === "teacher" ? conflictResult.teacher : (tableConflicts[key]?.teacher || { conflict: false }),
                room: field === "room" ? conflictResult.room : (tableConflicts[key]?.room || { conflict: false })
              }
            }
          };
        });
      }
      
      return updated;
    });
  };

  const getConflictStats = () => {
    const teacherConflicts = new Set();
    const roomConflicts = new Set();
    
    Object.values(conflicts).forEach((tableConflicts) => {
      Object.entries(tableConflicts).forEach(([key, conflictData]) => {
        if (conflictData.teacher?.conflict) {
          const cellKey = key.split("-").slice(0, 2).join("-");
          conflictData.teacher.matches?.forEach(match => {
            if (match.teacher) teacherConflicts.add(`${match.teacher}-${cellKey}`);
          });
        }
        if (conflictData.room?.conflict) {
          const cellKey = key.split("-").slice(0, 2).join("-");
          conflictData.room.matches?.forEach(match => {
            if (match.room) roomConflicts.add(`${match.room}-${cellKey}`);
          });
        }
      });
    });
    
    return {
      teacherConflicts: teacherConflicts.size,
      roomConflicts: roomConflicts.size
    };
  };

  const stats = getConflictStats();



  const addTable = () => {
    const newTable = `Table ${tables.length + 1}`;
    setTables([...tables, newTable]);
    setActiveTable(newTable);
  };

  const removeTable = (table) => {
    setTables(tables.filter((t) => t !== table));
    if (activeTable === table && tables.length > 1) {
      setActiveTable(tables[0]);
    }
  };

  const addTimeSlot = () => {
    const lastSlot = timeSlots[timeSlots.length - 1];
    const [startHour, startMinute] = lastSlot.split(" - ")[1].split(":");
    let newHour = parseInt(startHour) + 1;
    let newSlot = `${newHour}:00 - ${newHour}:55`;
    setTimeSlots([...timeSlots, newSlot]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Floating Teacher & Room Conflict Warnings */}
      <div className="fixed top-20 right-4 flex flex-col gap-3 z-50">
        <div className={`p-3 rounded-lg shadow-lg transition-colors ${
          stats.teacherConflicts > 0 
            ? "bg-red-600 text-white" 
            : "bg-green-600 text-white"
        }`}>
          <h3 className="text-sm font-bold mb-1">Teacher Status</h3>
          {stats.teacherConflicts > 0 ? (
            <>
              <p className="text-xs">⚠️ Conflicts: {stats.teacherConflicts}</p>
              <p className="text-xs mt-1 opacity-90">Same teacher assigned multiple times</p>
            </>
          ) : (
            <p className="text-xs">✓ No conflicts detected</p>
          )}
        </div>
        <div className={`p-3 rounded-lg shadow-lg transition-colors ${
          stats.roomConflicts > 0 
            ? "bg-red-600 text-white" 
            : "bg-green-600 text-white"
        }`}>
          <h3 className="text-sm font-bold mb-1">Room Status</h3>
          {stats.roomConflicts > 0 ? (
            <>
              <p className="text-xs">⚠️ Conflicts: {stats.roomConflicts}</p>
              <p className="text-xs mt-1 opacity-90">Same room assigned multiple times</p>
            </>
          ) : (
            <p className="text-xs">✓ No conflicts detected</p>
          )}
        </div>
      </div>


      <div className="container mx-auto p-4">
        {/* Tabs for Tables */}
        <div className="flex items-center gap-2 mb-4">
          {tables.map((table) => (
            <div
              key={table}
              className={`px-4 py-2 border rounded-lg cursor-pointer ${
                activeTable === table ? "bg-gray-300" : ""
              }`}
              onClick={() => setActiveTable(table)}
            >
              {table}
              {table !== "Table 1" && (
                <button
                  className="ml-2 text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTable(table);
                  }}
                >
                  ✖
                </button>
              )}
            </div>
          ))}
          <button className="px-3 py-2 border rounded-lg" onClick={addTable}>+</button>
        </div>

        {/* Course, Branch, Semester Inputs */}
        <div className="flex max-w-200 gap-4 mb-4">
          <input type="text" placeholder="Course" className="border p-2 rounded-md w-1/3" />
          <input type="text" placeholder="Branch/Batch" className="border p-2 rounded-md w-1/3" />
          <select className="border p-2 rounded-md w-1/3">
            <option value="">Select Semester</option>
            {/* Options will be fetched from backend */}
          </select>
        </div>

        {/* Timetable Grid */}
        <TimetableTable
          timeSlots={timeSlots}
          batches={batches[activeTable] || {}}
          batchData={batchData[activeTable] || {}}
          conflicts={conflicts[activeTable] || {}}
          onCreateBatch={createBatch}
          onUpdateBatch={updateBatch}
        />

        {/* Add Time Slot Button */}
        <button 
          onClick={addTimeSlot} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          + Add Time Slot
        </button>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-4">
          <button className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
            Save
          </button>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">
            Export
          </button>
        </div>

      </div>
      
      <Footer />
    </div>
  );
};

export default Timetable;