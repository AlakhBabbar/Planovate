import React from "react";
import TimetableCell from "./TimetableCell";

const TimetableTable = ({ 
  timeSlots, 
  batches,
  batchData,
  conflicts, 
  validationErrors,
  courseOptions,
  teacherOptions,
  roomOptions,
  onCreateBatch,
  onRemoveBatch,
  onUpdateBatch,
  onValidationChange,
  firstCellRef,
  onCopyCell,
  onMoveCell,
  curriculumData,
  allCoursesRaw,
  allTeachersRaw,
  tempCells, // Set<"rowIndex-colIndex"> — cells loaded from tempSchedules
  // WS suggestion props
  wsSuggestions,       // Map<"row-col", suggestion[]>
  wsCellSuggestions,   // { row, col, suggestions[] } | null — focused cell
  onCellFocus,         // (row, col) => void
  onCellBlur,          // () => void
  highlightCell,       // { row, col } | null — cell to highlight after conflict nav
}) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-auto max-h-[600px]">
      <table className="w-full">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="sticky left-0 z-30 p-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide w-24 bg-gray-50 border-r border-gray-200">
              Time
            </th>
            {days.map((day) => (
              <th 
                key={day} 
                className="p-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wide min-w-[120px] bg-gray-50"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-200">
              <td className="sticky left-0 z-10 p-3 font-medium text-gray-600 bg-gray-50 text-xs whitespace-nowrap border-r border-gray-200">
                {slot}
              </td>
              {days.map((_, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                const isFocusedCell = wsCellSuggestions?.row === rowIndex && wsCellSuggestions?.col === colIndex;
                const cellSugs = isFocusedCell
                  ? wsCellSuggestions.suggestions
                  : wsSuggestions?.get(cellKey) || [];

                return (
                  <TimetableCell
                    key={colIndex}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    batches={batches}
                    batchData={batchData}
                    conflicts={conflicts}
                    validationErrors={validationErrors}
                    courseOptions={courseOptions}
                    teacherOptions={teacherOptions}
                    roomOptions={roomOptions}
                    onCreateBatch={onCreateBatch}
                    onRemoveBatch={onRemoveBatch}
                    onUpdateBatch={onUpdateBatch}
                    onValidationChange={onValidationChange}
                    isFirstCell={rowIndex === 0 && colIndex === 0}
                    firstCellRef={rowIndex === 0 && colIndex === 0 ? firstCellRef : null}
                    onCopyCell={onCopyCell}
                    onMoveCell={onMoveCell}
                    curriculumData={curriculumData}
                    allCoursesRaw={allCoursesRaw}
                    allTeachersRaw={allTeachersRaw}
                    isFromTemp={tempCells?.has(cellKey) ?? false}
                    suggestions={cellSugs}
                    isSuggestionFocused={isFocusedCell}
                    onCellFocus={onCellFocus}
                    onCellBlur={onCellBlur}
                    isHighlighted={highlightCell?.row === rowIndex && highlightCell?.col === colIndex}
                    dataCellKey={cellKey}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default TimetableTable;
