import React, { useRef } from "react";
import { Plus, AlertCircle, Trash2 } from "lucide-react";
import { validateCourse, validateTeacher, validateRoom } from "../../utils/validationHelpers";
import { getCourseIdFromDisplay, getTeacherIdFromDisplay, getRoomIdFromDisplay } from "../../utils/idDisplayHelpers";

const TimetableCell = ({ 
  rowIndex, 
  colIndex, 
  batches,
  batchData,
  conflicts, 
  validationErrors,
  courseOptions,
  teacherOptions,
  roomOptions,
  onCreateBatch, 
  onUpdateBatch,
  onValidationChange,
  isFirstCell,
  firstCellRef
}) => {
  const key = `${rowIndex}-${colIndex}`;
  const batchCount = batches[key] || 1;
  const showBatchField = batchCount > 1;

  const courses = Array.isArray(courseOptions) ? courseOptions : [];
  const teachers = Array.isArray(teacherOptions) ? teacherOptions : [];
  const rooms = Array.isArray(roomOptions) ? roomOptions : [];
  
  // Create refs for inputs within each batch
  const inputRefs = useRef({});
  const validationTimeouts = useRef({});
  
  // Handle clearing all entries in the cell
  const handleClearCell = () => {
    const confirmClear = window.confirm('Are you sure you want to clear all entries in this cell?');
    if (!confirmClear) return;
    
    // Clear all batches in this cell
    for (let i = 0; i < batchCount; i++) {
      onUpdateBatch(rowIndex, colIndex, i, 'batchName', '');
      onUpdateBatch(rowIndex, colIndex, i, 'course', '');
      onUpdateBatch(rowIndex, colIndex, i, 'teacher', '');
      onUpdateBatch(rowIndex, colIndex, i, 'room', '');
      onUpdateBatch(rowIndex, colIndex, i, 'courseId', '');
      onUpdateBatch(rowIndex, colIndex, i, 'teacherId', '');
      onUpdateBatch(rowIndex, colIndex, i, 'roomId', '');
    }
  };

  // Handle input change with validation
  const handleInputChange = async (batchIndex, field, value) => {
    // Update the value immediately
    onUpdateBatch(rowIndex, colIndex, batchIndex, field, value);
    
    // Clear existing timeout for this field
    const timeoutKey = `${batchIndex}-${field}`;
    if (validationTimeouts.current[timeoutKey]) {
      clearTimeout(validationTimeouts.current[timeoutKey]);
    }
    
    // Debounce validation (wait 500ms after user stops typing)
    validationTimeouts.current[timeoutKey] = setTimeout(async () => {
      let validation = { isValid: true, error: null };
      let entityId = null;
      
      if (field === 'course') {
        if (!value.trim()) {
          // Clear the courseId when field is empty
          onUpdateBatch(rowIndex, colIndex, batchIndex, 'courseId', '');
        } else {
          validation = await validateCourse(value);
          if (validation.isValid) {
            entityId = await getCourseIdFromDisplay(value);
            if (entityId) {
              // Store the courseId immediately
              onUpdateBatch(rowIndex, colIndex, batchIndex, 'courseId', entityId);
            }
          }
        }
      } else if (field === 'teacher') {
        if (!value.trim()) {
          // Clear the teacherId when field is empty
          onUpdateBatch(rowIndex, colIndex, batchIndex, 'teacherId', '');
        } else {
          validation = await validateTeacher(value);
          if (validation.isValid) {
            entityId = await getTeacherIdFromDisplay(value);
            if (entityId) {
              // Store the teacherId immediately
              onUpdateBatch(rowIndex, colIndex, batchIndex, 'teacherId', entityId);
            }
          }
        }
      } else if (field === 'room') {
        if (!value.trim()) {
          // Clear the roomId when field is empty
          onUpdateBatch(rowIndex, colIndex, batchIndex, 'roomId', '');
        } else {
          validation = await validateRoom(value);
          if (validation.isValid) {
            entityId = await getRoomIdFromDisplay(value);
            if (entityId) {
              // Store the roomId immediately
              onUpdateBatch(rowIndex, colIndex, batchIndex, 'roomId', entityId);
            }
          }
        }
      }
      
      // Notify parent component of validation result
      if (onValidationChange) {
        const dataKey = `${rowIndex}-${colIndex}-${batchIndex}`;
        onValidationChange(dataKey, field, validation);
      }
    }, 500);
  };

  // Helper function to check if a cell has batch fields
  const cellHasBatchField = (targetRow, targetCol) => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    
    for (const input of allInputs) {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder !== 'Batch') continue;
      
      const cell = input.closest('td');
      if (!cell) continue;
      
      const row = cell.parentElement;
      const table = row.parentElement.parentElement;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const cells = Array.from(row.children).filter(c => c.tagName === 'TD');
      
      const cellRow = rows.indexOf(row);
      const cellCol = cells.indexOf(cell) - 1; // -1 for time column
      
      if (cellRow === targetRow && cellCol === targetCol) {
        return true;
      }
    }
    return false;
  };

  // Helper function to get the last batch index in a cell
  const getLastBatchIndex = (targetRow, targetCol) => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    let maxBatchIndex = 0;
    
    for (const input of allInputs) {
      const cell = input.closest('td');
      if (!cell) continue;
      
      const row = cell.parentElement;
      const table = row.parentElement.parentElement;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const cells = Array.from(row.children).filter(c => c.tagName === 'TD');
      
      const cellRow = rows.indexOf(row);
      const cellCol = cells.indexOf(cell) - 1; // -1 for time column
      
      if (cellRow === targetRow && cellCol === targetCol) {
        const batchDiv = input.closest('.flex-1');
        if (batchDiv) {
          const batchContainer = batchDiv.parentElement;
          const allBatches = Array.from(batchContainer.children);
          const currentBatchIdx = allBatches.indexOf(batchDiv);
          maxBatchIndex = Math.max(maxBatchIndex, currentBatchIdx);
        }
      }
    }
    return maxBatchIndex;
  };

  // Helper function to find input in another cell
  const findInputInCell = (targetRow, targetCol, fieldType, targetBatchIndex = 0) => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    
    // Find the placeholder text for the field type
    let placeholderText;
    if (fieldType === 'batchName') placeholderText = 'Batch';
    else if (fieldType === 'course') placeholderText = 'Course';
    else if (fieldType === 'teacher') placeholderText = 'Teacher';
    else if (fieldType === 'room') placeholderText = 'Room';
    
    // Find all inputs with matching placeholder
    for (const input of allInputs) {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder !== placeholderText) continue;
      
      const cell = input.closest('td');
      if (!cell) continue;
      
      const row = cell.parentElement;
      const table = row.parentElement.parentElement;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const cells = Array.from(row.children).filter(c => c.tagName === 'TD');
      
      const cellRow = rows.indexOf(row);
      const cellCol = cells.indexOf(cell) - 1; // -1 for time column
      
      // Check if this is the target cell
      if (cellRow === targetRow && cellCol === targetCol) {
        // Find the batch index of this input
        const batchDiv = input.closest('.flex-1');
        if (batchDiv) {
          const batchContainer = batchDiv.parentElement;
          const allBatches = Array.from(batchContainer.children);
          const currentBatchIdx = allBatches.indexOf(batchDiv);
          
          if (currentBatchIdx === targetBatchIndex) {
            return input;
          }
        }
      }
    }
    return null;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, batchIndex, fieldType) => {
    const fields = showBatchField ? ['batchName', 'course', 'teacher', 'room'] : ['course', 'teacher', 'room'];
    const currentFieldIndex = fields.indexOf(fieldType);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Move to next field in current batch
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextRef = inputRefs.current[`${batchIndex}-${nextField}`];
        nextRef?.focus();
      } 
      // Move to next batch's first field
      else if (batchIndex < batchCount - 1) {
        const nextBatchFirstField = fields[0];
        const nextRef = inputRefs.current[`${batchIndex + 1}-${nextBatchFirstField}`];
        nextRef?.focus();
      }
      // Move to next cell - try to find next cell's first input
      else {
        const allInputs = document.querySelectorAll('input[type="text"]');
        const currentInput = e.target;
        const currentIndex = Array.from(allInputs).indexOf(currentInput);
        if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1]?.focus();
        }
      }
    }
    
    // Arrow key navigation
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      
      // First, try to move to the same field in the next batch within the current cell
      if (batchIndex < batchCount - 1) {
        const nextRef = inputRefs.current[`${batchIndex + 1}-${fieldType}`];
        nextRef?.focus();
      }
      // If no more batches in current cell, move to the first field of the next cell's first batch
      else {
        let targetFieldType = fieldType;
        // If we're on a batch field, check if the next cell has batch field
        if (fieldType === 'batchName') {
          const nextCellHasBatch = cellHasBatchField(rowIndex, colIndex + 1);
          targetFieldType = nextCellHasBatch ? 'batchName' : 'course';
        }
        const targetInput = findInputInCell(rowIndex, colIndex + 1, targetFieldType, 0);
        targetInput?.focus();
      }
    }
    
    else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      
      // First, try to move to the same field in the previous batch within the current cell
      if (batchIndex > 0) {
        const prevRef = inputRefs.current[`${batchIndex - 1}-${fieldType}`];
        prevRef?.focus();
      }
      // If no previous batch in current cell, move to the last batch of the previous cell
      else if (colIndex > 0) {
        let targetFieldType = fieldType;
        let targetBatchIndex = 0;
        
        // If we're on a batch field, check if the previous cell has batch field
        if (fieldType === 'batchName') {
          const prevCellHasBatch = cellHasBatchField(rowIndex, colIndex - 1);
          targetFieldType = prevCellHasBatch ? 'batchName' : 'course';
          // Get the last batch index of the previous cell
          if (prevCellHasBatch) {
            targetBatchIndex = getLastBatchIndex(rowIndex, colIndex - 1);
          }
        } else {
          // For non-batch fields, also jump to the last batch
          targetBatchIndex = getLastBatchIndex(rowIndex, colIndex - 1);
        }
        
        const targetInput = findInputInCell(rowIndex, colIndex - 1, targetFieldType, targetBatchIndex);
        targetInput?.focus();
      }
    }
    
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      // Move to next field within the same cell and batch
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextRef = inputRefs.current[`${batchIndex}-${nextField}`];
        nextRef?.focus();
      }
      // If on last field (room), move to the cell below with smart batch logic
      else {
        const downCellHasBatch = cellHasBatchField(rowIndex + 1, colIndex);
        
        if (downCellHasBatch) {
          // Get the last batch index of the downward cell
          const downCellLastBatchIndex = getLastBatchIndex(rowIndex + 1, colIndex);
          // Try to jump to the same batch index, or the last available batch if current index is higher
          const targetBatchIndex = Math.min(batchIndex, downCellLastBatchIndex);
          const firstField = fields[0];
          const targetInput = findInputInCell(rowIndex + 1, colIndex, firstField, targetBatchIndex);
          targetInput?.focus();
        } else {
          // No batch field in downward cell, jump to course field
          const targetInput = findInputInCell(rowIndex + 1, colIndex, 'course', 0);
          targetInput?.focus();
        }
      }
    }
    
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      // Move to previous field within the same cell and batch
      if (currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1];
        const prevRef = inputRefs.current[`${batchIndex}-${prevField}`];
        prevRef?.focus();
      }
      // If on first field, move to last field (room) of the cell above (same batch index)
      else if (rowIndex > 0) {
        const lastField = fields[fields.length - 1];
        const targetInput = findInputInCell(rowIndex - 1, colIndex, lastField, batchIndex);
        targetInput?.focus();
      }
    }
  };

  return (
    <td className="border border-gray-200 p-0 min-w-[140px] bg-white align-top relative group">
      {/* Action Buttons - Top Right */}
      <div className="absolute top-0.5 right-0.5 z-10 flex gap-0.5">
        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClearCell();
          }}
          className="w-4 h-4 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded opacity-60 hover:opacity-100 transition-all"
          title="Clear all entries"
          type="button"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
        
        {/* Create Batch Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCreateBatch(rowIndex, colIndex);
          }}
          className="w-4 h-4 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded opacity-60 hover:opacity-100 transition-all"
          title="Create new batch"
          type="button"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>

      <div className="flex divide-x divide-gray-200 min-h-[70px]">
        {Array.from({ length: batchCount }).map((_, batchIndex) => {
          const dataKey = `${rowIndex}-${colIndex}-${batchIndex}`;
          const batch = batchData[dataKey] || {};
          const conflictInfo = conflicts?.[dataKey] || {};
          const validationInfo = validationErrors?.[dataKey] || {};
          const hasTeacherConflict = conflictInfo.teacher?.conflict;
          const hasRoomConflict = conflictInfo.room?.conflict;
          
          // Validation errors
          const hasCourseError = validationInfo.course && !validationInfo.course.isValid;
          const hasTeacherError = validationInfo.teacher && !validationInfo.teacher.isValid;
          const hasRoomError = validationInfo.room && !validationInfo.room.isValid;
          
          // Check if data is migrated (has IDs) or using old format
          const isCourseOldFormat = batch.course && !batch.courseId;
          const isTeacherOldFormat = batch.teacher && !batch.teacherId;
          const isRoomOldFormat = batch.room && !batch.roomId;

          return (
            <div key={batchIndex} className="flex-1 min-w-[70px] p-1 space-y-1">
              {/* Batch Name Field - only shown when more than 1 batch */}
              {showBatchField && (
                <input
                  ref={(el) => {
                    inputRefs.current[`${batchIndex}-batchName`] = el;
                    // Set firstCellRef for the very first input
                    if (isFirstCell && batchIndex === 0 && firstCellRef) {
                      firstCellRef.current = el;
                    }
                  }}
                  type="text"
                  placeholder="Batch"
                  value={batch.batchName || ""}
                  onChange={(e) => onUpdateBatch(rowIndex, colIndex, batchIndex, 'batchName', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'batchName')}
                  className="w-full text-[10px] px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                />
              )}

              {/* Course Field */}
              <div className="relative">
                <input
                  ref={(el) => {
                    inputRefs.current[`${batchIndex}-course`] = el;
                    // If no batch field shown, course is the first input for first cell
                    if (isFirstCell && batchIndex === 0 && !showBatchField && firstCellRef) {
                      firstCellRef.current = el;
                    }
                  }}
                  list={`courses-${rowIndex}-${colIndex}-${batchIndex}`}
                  type="text"
                  placeholder="Course"
                  value={batch.course || ""}
                  onChange={(e) => handleInputChange(batchIndex, 'course', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'course')}
                  className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                    hasCourseError
                      ? "border-orange-500 bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
                      : isCourseOldFormat
                      ? "border-red-900 bg-red-50 text-red-900 focus:ring-red-900 focus:border-red-900"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  title={
                    hasCourseError
                      ? `⚠️ ${validationInfo.course?.error || 'Invalid course'}`
                      : isCourseOldFormat
                      ? "⚠️ Not migrated - Using old format (no ID reference)"
                      : ""
                  }
                />
                {hasCourseError && (
                  <AlertCircle className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500" />
                )}
                <datalist id={`courses-${rowIndex}-${colIndex}-${batchIndex}`}>
                  {courses.map((course, idx) => (
                    <option key={idx} value={course} />
                  ))}
                </datalist>
              </div>

              {/* Teacher Field */}
              <div className="relative">
                <input
                  ref={(el) => inputRefs.current[`${batchIndex}-teacher`] = el}
                  list={`teachers-${rowIndex}-${colIndex}-${batchIndex}`}
                  type="text"
                  placeholder="Teacher"
                  value={batch.teacher || ""}
                  onChange={(e) => handleInputChange(batchIndex, 'teacher', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'teacher')}
                  className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                    hasTeacherError
                      ? "border-orange-500 bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
                      : hasTeacherConflict 
                      ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-500"
                      : isTeacherOldFormat
                      ? "border-red-900 bg-red-50 text-red-900 focus:ring-red-900 focus:border-red-900"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  title={
                    hasTeacherError
                      ? `⚠️ ${validationInfo.teacher?.error || 'Invalid teacher'}`
                      : hasTeacherConflict 
                      ? "⚠️ Conflict: Teacher assigned elsewhere at this time" 
                      : isTeacherOldFormat
                      ? "⚠️ Not migrated - Using old format (no ID reference)"
                      : ""
                  }
                />
                {hasTeacherError && (
                  <AlertCircle className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500" />
                )}
                <datalist id={`teachers-${rowIndex}-${colIndex}-${batchIndex}`}>
                  {teachers.map((teacher, idx) => (
                    <option key={idx} value={teacher} />
                  ))}
                </datalist>
              </div>

              {/* Room Field */}
              <div className="relative">
                <input
                  ref={(el) => inputRefs.current[`${batchIndex}-room`] = el}
                  list={`rooms-${rowIndex}-${colIndex}-${batchIndex}`}
                  type="text"
                  placeholder="Room"
                  value={batch.room || ""}
                  onChange={(e) => handleInputChange(batchIndex, 'room', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'room')}
                  className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                    hasRoomError
                      ? "border-orange-500 bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
                      : hasRoomConflict 
                      ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-500"
                      : isRoomOldFormat
                      ? "border-red-900 bg-red-50 text-red-900 focus:ring-red-900 focus:border-red-900"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  title={
                    hasRoomError
                      ? `⚠️ ${validationInfo.room?.error || 'Invalid room'}`
                      : hasRoomConflict 
                      ? "⚠️ Conflict: Room assigned elsewhere at this time" 
                      : isRoomOldFormat
                      ? "⚠️ Not migrated - Using old format (no ID reference)"
                      : ""
                  }
                />
                {hasRoomError && (
                  <AlertCircle className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500" />
                )}
                <datalist id={`rooms-${rowIndex}-${colIndex}-${batchIndex}`}>
                  {rooms.map((room, idx) => (
                    <option key={idx} value={room} />
                  ))}
                </datalist>
              </div>
            </div>
          );
        })}
      </div>
    </td>
  );
};

export default TimetableCell;
