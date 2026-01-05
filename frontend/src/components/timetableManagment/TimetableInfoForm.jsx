import React from "react";
import { BookOpen, FolderSearch } from "lucide-react";

/**
 * TimetableInfoForm Component
 * Displays and manages the timetable metadata inputs (class, branch, semester, type)
 */
const TimetableInfoForm = ({
  activeTable,
  tabMetadata,
  setTabMetadata,
  semesterOptions,
  isLoadingExisting,
  onBrowseClick,
  classInputRef,
  branchInputRef,
  semesterInputRef,
  typeInputRef,
  handleClassKeyDown,
  handleBranchKeyDown,
  handleSemesterKeyDown,
  handleTypeKeyDown,
}) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-5 mb-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BookOpen size={20} className="text-blue-600" />
        <span>Timetable Information</span>
      </h3>
      <div className="flex gap-3 items-center flex-wrap">
        <input
          ref={classInputRef}
          type="text"
          placeholder="Class"
          className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
          value={tabMetadata[activeTable]?.className || ""}
          onChange={(e) =>
            setTabMetadata((prev) => ({
              ...prev,
              [activeTable]: { ...prev[activeTable], className: e.target.value },
            }))
          }
          onKeyDown={handleClassKeyDown}
          disabled={isLoadingExisting}
        />
        <input
          ref={branchInputRef}
          type="text"
          placeholder="Branch/Batch"
          className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
          value={tabMetadata[activeTable]?.branch || ""}
          onChange={(e) =>
            setTabMetadata((prev) => ({
              ...prev,
              [activeTable]: { ...prev[activeTable], branch: e.target.value },
            }))
          }
          onKeyDown={handleBranchKeyDown}
          disabled={isLoadingExisting}
        />
        <select
          ref={semesterInputRef}
          className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
          value={tabMetadata[activeTable]?.semester || ""}
          onChange={(e) =>
            setTabMetadata((prev) => ({
              ...prev,
              [activeTable]: { ...prev[activeTable], semester: e.target.value },
            }))
          }
          onKeyDown={handleSemesterKeyDown}
          disabled={isLoadingExisting}
        >
          <option value="">Select Semester</option>
          {semesterOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          ref={typeInputRef}
          className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
          value={tabMetadata[activeTable]?.type || ""}
          onChange={(e) =>
            setTabMetadata((prev) => ({
              ...prev,
              [activeTable]: { ...prev[activeTable], type: e.target.value },
            }))
          }
          onKeyDown={handleTypeKeyDown}
          disabled={isLoadingExisting}
        >
          <option value="">Select Type</option>
          <option value="full-time">Full-Time</option>
          <option value="part-time">Part-Time</option>
        </select>
        <button
          onClick={onBrowseClick}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 hover:cursor-pointer transition-all duration-300 shadow whitespace-nowrap font-medium text-sm flex items-center gap-2"
        >
          <FolderSearch size={16} />
          Browse
        </button>
        {isLoadingExisting && (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableInfoForm;
