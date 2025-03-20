import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
import Header from "../components/Header";
import Footer from "../components/Footer";

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

const splitBatch = (rowIndex, colIndex) => {
  setBatches((prev) => {
    const updatedBatches = { ...prev };
    
    // Initialize row & column if not exists
    if (!updatedBatches[rowIndex]) updatedBatches[rowIndex] = {};
    if (!updatedBatches[rowIndex][colIndex]) {
      // Create Section A without Batch input before split
      updatedBatches[rowIndex][colIndex] = [
        { name: "", hasBatchInput: false } 
      ];
    }

    // Add Batch input to existing section A
    updatedBatches[rowIndex][colIndex][0].hasBatchInput = true;

    // Add a new Section B with Batch input
    updatedBatches[rowIndex][colIndex].push({ name: "", hasBatchInput: true });

    return { ...updatedBatches };
  });
};

const updateBatch = (rowIndex, colIndex, batchIndex, value) => {
  setBatches((prev) => {
    const updatedBatches = { ...prev };
    updatedBatches[rowIndex][colIndex][batchIndex].name = value;
    return { ...updatedBatches };
  });
};



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
      
      {/* Floating Teacher & Room Occupancy Stats */}
      <div className="fixed top-18 right-4 flex gap-4 z-50">
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold">Teacher Occupancy</h3>
          <p>Available: 10</p>
          <p>Occupied: 5</p>
        </div>
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
          <h3 className="text-lg font-bold">Room Occupancy</h3>
          <p>Available: 8</p>
          <p>Occupied: 7</p>
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
<div className="overflow-x-auto">
  <table className="w-full border">
    <thead>
      <tr className="bg-gray-200">
        <th className="border p-2">Time</th>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <th key={day} className="border p-2">{day}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {timeSlots.map((slot, rowIndex) => (
        <tr key={rowIndex}>
          <td className="border p-2">{slot}</td>
          {[...Array(6)].map((_, colIndex) => (
            <td key={colIndex} className="border p-2 relative">
              <div className="flex gap-2">
                {/* Render each section horizontally */}
                {batches[rowIndex]?.[colIndex]?.map((batch, batchIndex) => (
                  <div key={batchIndex} className="border p-2 max-w-50 flex flex-col gap-1">
                    {/* Batch Input (Added only when Split is clicked) */}
                    {batch.hasBatchInput && (
                      <input 
                        type="text" 
                        placeholder="Batch Name" 
                        value={batch.name} 
                        onChange={(e) => updateBatch(rowIndex, colIndex, batchIndex, e.target.value)}
                        className="border p-1 w-full rounded"
                      />
                    )}
                    {/* Course, Teacher, Room Dropdowns */}
                    <select className="border p-1 rounded w-full">
                      <option value="">Course</option>
                    </select>
                    <select className="border p-1 rounded w-full">
                      <option value="">Teacher</option>
                    </select>
                    <select className="border p-1 rounded w-full">
                      <option value="">Room</option>
                    </select>
                    
                  </div>
                  
                ))}
                
              <button 
                  className="bg-blue-500 text-white px-3 py-1 rounded mt-2 hover:bg-blue-700 transition w-full"
                  onClick={() => splitBatch(rowIndex, colIndex)}
                >
                  + Split Batch
                </button>
              </div>

              {/* Only Show Split Button If There is No Batch Data */}
              {!batches[rowIndex]?.[colIndex]?.length && (
                <div>
                    <select className="border p-1 rounded w-full">
                      <option value="">Course</option>
                    </select>
                    <select className="border p-1 rounded w-full">
                      <option value="">Teacher</option>
                    </select>
                    <select className="border p-1 rounded w-full">
                      <option value="">Room</option>
                    </select>
                {/* <button 
                  className="bg-blue-500 text-white px-3 py-1 rounded mt-2 hover:bg-blue-700 transition w-full"
                  onClick={() => splitBatch(rowIndex, colIndex)}
                >
                  + Split Batch
                </button> */}
                </div>
              )}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div>






        <button onClick={addTimeSlot} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md">
          + Add Time Slot
        </button>
        <div className="mt-4 flex gap-4">
  <button className="px-4 py-2 bg-green-500 text-white rounded-md">
    Save
  </button>
  <button className="px-4 py-2 bg-yellow-500 text-white rounded-md">
    Export
  </button>
</div>

      </div>
      
      <Footer />
    </div>
  );
};

export default Timetable;