import React, { useMemo } from "react";
import { FolderSearch, Lock } from "lucide-react";

/**
 * TimetableInfoForm Component
 * Displays and manages the timetable metadata inputs with cascading dropdowns.
 * Hierarchy: Program → Branch/Batch → Semester → Type
 * Each field is locked until the previous one is filled.
 */
const TimetableInfoForm = ({
  activeTable,
  tabMetadata,
  setTabMetadata,
  semesterOptions,
  isLoadingExisting,
  onBrowseClick,
  semesterInputRef,
  typeInputRef,
  handleSemesterKeyDown,
  handleTypeKeyDown,
  programs,
  allBranches,
}) => {
  const meta = tabMetadata[activeTable] || {};
  const selectedProgram = meta.className || "";
  const selectedBranch = meta.branch || "";
  const selectedSemester = meta.semester || "";

  // Filter branches by selected program
  const filteredBranches = useMemo(() => {
    if (!selectedProgram) return [];
    return (allBranches || []).filter(
      (b) => !b.programs || b.programs.length === 0 || b.programs.includes(selectedProgram)
    );
  }, [allBranches, selectedProgram]);

  const isProgramSelected = !!selectedProgram;
  const isBranchSelected = !!selectedBranch;
  const isSemesterSelected = !!selectedSemester;

  // Cascade reset: changing a higher-level field clears all downstream fields
  const handleProgramChange = (e) => {
    const value = e.target.value;
    setTabMetadata((prev) => ({
      ...prev,
      [activeTable]: { ...prev[activeTable], className: value, branch: "", semester: "", type: "" },
    }));
  };

  const handleBranchChange = (e) => {
    const value = e.target.value;
    setTabMetadata((prev) => ({
      ...prev,
      [activeTable]: { ...prev[activeTable], branch: value, semester: "", type: "" },
    }));
  };

  const handleSemesterChange = (e) => {
    const value = e.target.value;
    setTabMetadata((prev) => ({
      ...prev,
      [activeTable]: { ...prev[activeTable], semester: value, type: "" },
    }));
    handleSemesterKeyDown && handleSemesterKeyDown({ key: "__change__" });
  };

  const handleTypeChange = (e) => {
    const value = e.target.value;
    setTabMetadata((prev) => ({
      ...prev,
      [activeTable]: { ...prev[activeTable], type: value },
    }));
  };

  const lockedSelectClass =
    "flex-1 min-w-[140px] px-3 py-2 rounded text-sm border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed outline-none";
  const activeSelectClass =
    "flex-1 min-w-[140px] px-3 py-2 rounded text-sm border border-gray-300 bg-white text-gray-800 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 outline-none transition-all cursor-pointer";

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex gap-2 items-center flex-wrap">

        {/* 1. Program dropdown */}
        <select
          className={isLoadingExisting ? lockedSelectClass : activeSelectClass}
          value={selectedProgram}
          onChange={handleProgramChange}
          disabled={isLoadingExisting}
        >
          <option value="">Select Program</option>
          {isProgramSelected && !(programs || []).includes(selectedProgram) && (
            <option key={selectedProgram} value={selectedProgram}>{selectedProgram}</option>
          )}
          {(programs || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* 2. Branch/Batch dropdown — locked until program is chosen */}
        <div className="flex-1 min-w-[140px] relative">
          <select
            className={(!isProgramSelected || isLoadingExisting) ? lockedSelectClass + " w-full" : activeSelectClass + " w-full"}
            value={selectedBranch}
            onChange={handleBranchChange}
            disabled={!isProgramSelected || isLoadingExisting}
          >
            <option value="">
              {!isProgramSelected ? "— Select Program first —" : "Select Branch/Batch"}
            </option>
            {isBranchSelected && !filteredBranches.find(b => b.name === selectedBranch) && (
              <option key={selectedBranch} value={selectedBranch}>{selectedBranch}</option>
            )}
            {filteredBranches.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          {!isProgramSelected && (
            <Lock size={12} className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          )}
        </div>

        {/* 3. Semester dropdown — locked until branch is chosen */}
        <div className="flex-1 min-w-[140px] relative">
          <select
            ref={semesterInputRef}
            className={(!isBranchSelected || isLoadingExisting) ? lockedSelectClass + " w-full" : activeSelectClass + " w-full"}
            value={selectedSemester}
            onChange={handleSemesterChange}
            onKeyDown={handleSemesterKeyDown}
            disabled={!isBranchSelected || isLoadingExisting}
          >
            <option value="">
              {!isBranchSelected ? "— Select Branch first —" : "Select Semester"}
            </option>
            {isSemesterSelected && !semesterOptions.includes(selectedSemester) && (
              <option key={selectedSemester} value={selectedSemester}>{selectedSemester}</option>
            )}
            {semesterOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {!isBranchSelected && (
            <Lock size={12} className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          )}
        </div>

        {/* 4. Type dropdown — locked until semester is chosen */}
        <div className="flex-1 min-w-[140px] relative">
          <select
            ref={typeInputRef}
            className={(!isSemesterSelected || isLoadingExisting) ? lockedSelectClass + " w-full" : activeSelectClass + " w-full"}
            value={meta.type || ""}
            onChange={handleTypeChange}
            onKeyDown={handleTypeKeyDown}
            disabled={!isSemesterSelected || isLoadingExisting}
          >
            <option value="">
              {!isSemesterSelected ? "— Select Semester first —" : "Select Type"}
            </option>
            <option value="full-time">Full-Time</option>
            <option value="part-time">Part-Time</option>
          </select>
          {!isSemesterSelected && (
            <Lock size={12} className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          )}
        </div>

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
