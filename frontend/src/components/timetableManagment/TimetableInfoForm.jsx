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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          ref={classInputRef}
          type="text"
          placeholder="Class"
          className="flex-1 min-w-[140px] border border-gray-300 focus:border-gray-400 px-3 py-2 rounded text-sm transition-all focus:ring-1 focus:ring-gray-300 outline-none"
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
          className="flex-1 min-w-[140px] border border-gray-300 focus:border-gray-400 px-3 py-2 rounded text-sm transition-all focus:ring-1 focus:ring-gray-300 outline-none"
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
          className="flex-1 min-w-[140px] border border-gray-300 focus:border-gray-400 px-3 py-2 rounded text-sm transition-all focus:ring-1 focus:ring-gray-300 outline-none"
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
          className="flex-1 min-w-[140px] border border-gray-300 focus:border-gray-400 px-3 py-2 rounded text-sm transition-all focus:ring-1 focus:ring-gray-300 outline-none"
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
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-all text-sm font-medium flex items-center gap-1.5"
        >
          <FolderSearch size={14} />
          Browse
        </button>
        {isLoadingExisting && (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableInfoForm;
