import React from "react";
import TimetableCell from "./TimetableCell";

const TimetableTable = ({ 
  timeSlots, 
  batches,
  batchData,
  conflicts, 
  courseOptions,
  teacherOptions,
  roomOptions,
  onCreateBatch, 
  onUpdateBatch 
}) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-1.5 text-left font-semibold text-gray-700 text-xs min-w-[80px]">
              Time
            </th>
            {days.map((day) => (
              <th 
                key={day} 
                className="border border-gray-300 p-1.5 text-center font-semibold text-gray-700 text-xs min-w-[140px]"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
              <td className="border border-gray-300 p-1.5 font-medium text-gray-600 bg-gray-50 text-xs">
                {slot}
              </td>
              {days.map((_, colIndex) => (
                <TimetableCell
                  key={colIndex}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  batches={batches}
                  batchData={batchData}
                  conflicts={conflicts}
                  courseOptions={courseOptions}
                  teacherOptions={teacherOptions}
                  roomOptions={roomOptions}
                  onCreateBatch={onCreateBatch}
                  onUpdateBatch={onUpdateBatch}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimetableTable;
