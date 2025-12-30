import React from "react";
import { Plus } from "lucide-react";

const TimetableCell = ({ 
  rowIndex, 
  colIndex, 
  batches,
  batchData,
  conflicts, 
  courseOptions,
  teacherOptions,
  roomOptions,
  onCreateBatch, 
  onUpdateBatch 
}) => {
  const key = `${rowIndex}-${colIndex}`;
  const batchCount = batches[key] || 1;
  const showBatchField = batchCount > 1;

  const courses = Array.isArray(courseOptions) ? courseOptions : [];
  const teachers = Array.isArray(teacherOptions) ? teacherOptions : [];
  const rooms = Array.isArray(roomOptions) ? roomOptions : [];

  return (
    <td className="border border-gray-200 p-0 min-w-[140px] bg-white align-top relative group">
      {/* Create Batch Button - Top Right */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCreateBatch(rowIndex, colIndex);
        }}
        className="absolute top-0.5 right-0.5 z-10 w-4 h-4 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded opacity-60 hover:opacity-100 transition-all"
        title="Create new batch"
        type="button"
      >
        <Plus className="w-2.5 h-2.5" />
      </button>

      <div className="flex divide-x divide-gray-200 min-h-[70px]">
        {Array.from({ length: batchCount }).map((_, batchIndex) => {
          const dataKey = `${rowIndex}-${colIndex}-${batchIndex}`;
          const batch = batchData[dataKey] || {};
          const conflictInfo = conflicts?.[dataKey] || {};
          const hasTeacherConflict = conflictInfo.teacher?.conflict;
          const hasRoomConflict = conflictInfo.room?.conflict;

          return (
            <div key={batchIndex} className="flex-1 min-w-[70px] p-1 space-y-1">
              {/* Batch Name Field - only shown when more than 1 batch */}
              {showBatchField && (
                <input
                  type="text"
                  placeholder="Batch"
                  value={batch.batchName || ""}
                  onChange={(e) => onUpdateBatch(rowIndex, colIndex, batchIndex, 'batchName', e.target.value)}
                  className="w-full text-[10px] px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                />
              )}

              {/* Course Field */}
              <input
                list={`courses-${rowIndex}-${colIndex}-${batchIndex}`}
                type="text"
                placeholder="Course"
                value={batch.course || ""}
                onChange={(e) => onUpdateBatch(rowIndex, colIndex, batchIndex, 'course', e.target.value)}
                className="w-full text-[10px] px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
              <datalist id={`courses-${rowIndex}-${colIndex}-${batchIndex}`}>
                {courses.map((course, idx) => (
                  <option key={idx} value={course} />
                ))}
              </datalist>

              {/* Teacher Field */}
              <input
                list={`teachers-${rowIndex}-${colIndex}-${batchIndex}`}
                type="text"
                placeholder="Teacher"
                value={batch.teacher || ""}
                onChange={(e) => onUpdateBatch(rowIndex, colIndex, batchIndex, "teacher", e.target.value)}
                className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                  hasTeacherConflict 
                    ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-500" 
                    : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                }`}
                title={hasTeacherConflict ? "⚠️ Conflict: Teacher assigned elsewhere at this time" : ""}
              />
              <datalist id={`teachers-${rowIndex}-${colIndex}-${batchIndex}`}>
                {teachers.map((teacher, idx) => (
                  <option key={idx} value={teacher} />
                ))}
              </datalist>

              {/* Room Field */}
              <input
                list={`rooms-${rowIndex}-${colIndex}-${batchIndex}`}
                type="text"
                placeholder="Room"
                value={batch.room || ""}
                onChange={(e) => onUpdateBatch(rowIndex, colIndex, batchIndex, "room", e.target.value)}
                className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                  hasRoomConflict 
                    ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-500" 
                    : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                }`}
                title={hasRoomConflict ? "⚠️ Conflict: Room assigned elsewhere at this time" : ""}
              />
              <datalist id={`rooms-${rowIndex}-${colIndex}-${batchIndex}`}>
                {rooms.map((room, idx) => (
                  <option key={idx} value={room} />
                ))}
              </datalist>
            </div>
          );
        })}
      </div>
    </td>
  );
};

export default TimetableCell;
