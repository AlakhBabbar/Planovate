import React, { useEffect, useState, useRef } from "react";
import { AlertCircle, CheckCircle, Users, Building2, BookOpen, FolderSearch, Save, Download, Plus, X, Maximize2, Minimize2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TimetableTable from "../components/timetableManagment/TimetableTable";
import BrowseTimetablesModal from "../components/timetableManagment/BrowseTimetablesModal";
import TimetableInfoForm from "../components/timetableManagment/TimetableInfoForm";
import ExportModal from "../components/timetableManagment/ExportModal";
import { checkConflicts } from "../utils/Conflict";
import useTimetableStore from "../store/timetableStore";
import { exportTimetableToPdf, exportTimetablesToDoc, exportTimetablesToExcel, exportTimetablesToPdf } from "../utils";
import {
  checkExistingTimetable,
  calculateConflictStats,
  createBatchInCell,
  updateBatchData,
  updateConflictsState,
  generateTableName,
  generateNextTimeSlot,
  DEFAULT_TIME_SLOTS,
} from "../utils/timetableUIHelpers";
import { courseService, roomService, teacherService, timetableService } from "../firebase/services";
import { resolveBatchDataForDisplay, convertDisplayToIds } from "../utils/idDisplayHelpers";
import { validateAllBatchData, hasValidationErrors, getValidationSummary } from "../utils/validationHelpers";

// Generate unique table ID for internal use
const generateUniqueTableId = () => `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Timetable = () => {
  // Zustand store for global options
  const { courseOptions, teacherOptions, roomOptions, semesterOptions, fetchOptions } = useTimetableStore();
  
  // Generate initial unique table ID
  const [tables, setTables] = useState(() => [generateUniqueTableId()]);
  const [activeTable, setActiveTable] = useState(() => tables[0]);
  
  // Per-tab metadata: each tab has its own class, branch, semester, type
  const [tabMetadata, setTabMetadata] = useState(() => ({
    [tables[0]]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
  }));
  
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);

  const [batches, setBatches] = useState({});
  const [batchData, setBatchData] = useState({});
  const [conflicts, setConflicts] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track loaded metadata per tab to prevent refetching on tab switch
  const loadedMetadataRef = useRef({});
  
  // Refs for keyboard navigation
  const classInputRef = useRef(null);
  const branchInputRef = useRef(null);
  const semesterInputRef = useRef(null);
  const typeInputRef = useRef(null);
  const firstCellRef = useRef(null);

  // Helper function to find if a timetable is already open in any tab
  const findTabWithMetadata = (className, branch, semester, type) => {
    return tables.find(tab => {
      const meta = tabMetadata[tab];
      return meta?.className?.trim() === className?.trim() &&
             meta?.branch?.trim() === branch?.trim() &&
             meta?.semester?.trim() === semester?.trim() &&
             meta?.type?.trim() === type?.trim();
    });
  };

  // Fetch options once on component mount
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Check for existing timetable when branch, class, and semester are filled for current tab
  useEffect(() => {
    let cancelled = false;

    const loadExisting = async () => {
      const currentMeta = tabMetadata[activeTable];
      if (!currentMeta?.className?.trim() || !currentMeta?.branch?.trim() || !currentMeta?.semester?.trim() || !currentMeta?.type?.trim()) {
        return;
      }

      // Check if this timetable is already open in another tab
      const existingTab = findTabWithMetadata(currentMeta.className, currentMeta.branch, currentMeta.semester, currentMeta.type);
      if (existingTab && existingTab !== activeTable) {
        // Clear input fields in current tab before switching
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
        }));
        // Switch to the existing tab instead of loading again
        setActiveTable(existingTab);
        return;
      }

      // Check if we've already loaded this exact metadata for this tab
      const metaKey = `${activeTable}-${currentMeta.className}-${currentMeta.branch}-${currentMeta.semester}-${currentMeta.type}`;
      if (loadedMetadataRef.current[metaKey]) {
        return; // Skip fetch if already loaded
      }

      setIsLoadingExisting(true);
      
      const existingTimetable = await checkExistingTimetable(
        currentMeta.className,
        currentMeta.branch,
        currentMeta.semester,
        currentMeta.type,
        timetableService
      );
      
      if (cancelled) return;

      if (existingTimetable) {
        // Load data into the ACTIVE tab only
        setTimeSlots(existingTimetable.timeSlots || DEFAULT_TIME_SLOTS);
        
        const firstLoadedTable = existingTimetable.tables[0] || "Table 1";
        const loadedBatchData = existingTimetable.batchDataByTable[firstLoadedTable] || {};
        
        // Resolve IDs to display names
        const resolvedBatchData = await resolveBatchDataForDisplay(loadedBatchData);
        
        setBatches(prev => ({
          ...prev,
          [activeTable]: existingTimetable.batchesByTable[firstLoadedTable] || {}
        }));
        setBatchData(prev => ({
          ...prev,
          [activeTable]: resolvedBatchData
        }));
        
        // Update timetableId in metadata
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { ...prev[activeTable], timetableId: existingTimetable.timetableId }
        }));
        
        // Mark this metadata as loaded
        loadedMetadataRef.current[metaKey] = true;
      }
      
      setIsLoadingExisting(false);
    };

    const timeoutId = setTimeout(loadExisting, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [tabMetadata[activeTable]?.className, tabMetadata[activeTable]?.branch, tabMetadata[activeTable]?.semester, tabMetadata[activeTable]?.type]);

  const handleLoadSelectedTimetable = async (timetable) => {
    try {
      // Check if this timetable is already open in another tab
      const existingTab = findTabWithMetadata(timetable.class, timetable.branch, timetable.semester, timetable.type);
      if (existingTab) {
        // Clear input fields in current tab before switching
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
        }));
        // Switch to the existing tab and close modal
        setActiveTable(existingTab);
        setShowBrowseModal(false);
        return;
      }

      const loadedTimetable = await timetableService.loadTimetable(timetable.timetableId);
      
      if (loadedTimetable) {
        // Update metadata for current tab
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: {
            className: timetable.class || "",
            branch: timetable.branch || "",
            semester: timetable.semester || "",
            type: timetable.type || "",
            timetableId: timetable.timetableId
          }
        }));
        
        // Load data into the ACTIVE tab only
        setTimeSlots(loadedTimetable.timeSlots);
        
        const firstLoadedTable = loadedTimetable.tables[0] || "Table 1";
        const loadedBatchData = loadedTimetable.batchDataByTable[firstLoadedTable] || {};
        
        // Resolve IDs to display names
        const resolvedBatchData = await resolveBatchDataForDisplay(loadedBatchData);
        
        setBatches(prev => ({
          ...prev,
          [activeTable]: loadedTimetable.batchesByTable[firstLoadedTable] || {}
        }));
        setBatchData(prev => ({
          ...prev,
          [activeTable]: resolvedBatchData
        }));
        
        setShowBrowseModal(false);
      }
    } catch (error) {
      console.error("Error loading timetable:", error);
    }
  };

  const createBatch = (rowIndex, colIndex) => {
    setBatches((prev) => createBatchInCell(prev, activeTable, rowIndex, colIndex));
  };

  const updateBatch = (rowIndex, colIndex, batchIndex, field, value) => {
    setBatchData((prev) => {
      const { updatedBatchData, conflictResult } = updateBatchData({
        currentBatchData: prev,
        currentBatches: batches,
        activeTable,
        rowIndex,
        colIndex,
        batchIndex,
        field,
        value,
        tables,
        checkConflictsFn: checkConflicts,
      });
      
      if (conflictResult) {
        const key = `${rowIndex}-${colIndex}-${batchIndex}`;
        setConflicts((prevConflicts) => 
          updateConflictsState(prevConflicts, activeTable, key, field, conflictResult)
        );
      }
      
      return updatedBatchData;
    });
  };
  
  // Copy cell data from source to target
  const handleCopyCell = (sourceRow, sourceCol, targetRow, targetCol) => {
    const sourceBatchData = batchData[activeTable] || {};
    const sourceBatches = batches[activeTable] || {};
    const sourceKey = `${sourceRow}-${sourceCol}`;
    const sourceBatchCount = sourceBatches[sourceKey] || 1;
    
    // Copy batch count
    setBatches(prev => ({
      ...prev,
      [activeTable]: {
        ...prev[activeTable],
        [`${targetRow}-${targetCol}`]: sourceBatchCount
      }
    }));
    
    // Copy all batch data
    setBatchData(prev => {
      const newBatchData = { ...prev };
      if (!newBatchData[activeTable]) {
        newBatchData[activeTable] = {};
      }
      
      for (let i = 0; i < sourceBatchCount; i++) {
        const sourceDataKey = `${sourceRow}-${sourceCol}-${i}`;
        const targetDataKey = `${targetRow}-${targetCol}-${i}`;
        const sourceData = sourceBatchData[sourceDataKey];
        
        if (sourceData) {
          newBatchData[activeTable][targetDataKey] = { ...sourceData };
        }
      }
      
      return newBatchData;
    });
  };
  
  // Move cell data from source to target
  const handleMoveCell = (sourceRow, sourceCol, targetRow, targetCol) => {
    const sourceBatchData = batchData[activeTable] || {};
    const sourceBatches = batches[activeTable] || {};
    const sourceKey = `${sourceRow}-${sourceCol}`;
    const sourceBatchCount = sourceBatches[sourceKey] || 1;
    
    // Copy to target first
    handleCopyCell(sourceRow, sourceCol, targetRow, targetCol);
    
    // Clear source cell
    setBatches(prev => ({
      ...prev,
      [activeTable]: {
        ...prev[activeTable],
        [sourceKey]: 1 // Reset to 1 batch
      }
    }));
    
    setBatchData(prev => {
      const newBatchData = { ...prev };
      if (!newBatchData[activeTable]) {
        newBatchData[activeTable] = {};
      }
      
      // Clear all source batches
      for (let i = 0; i < sourceBatchCount; i++) {
        const sourceDataKey = `${sourceRow}-${sourceCol}-${i}`;
        delete newBatchData[activeTable][sourceDataKey];
      }
      
      return newBatchData;
    });
  };
  
  // Handle validation state updates from cells
  const handleValidationChange = (dataKey, field, validation) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      
      // Initialize errors for this cell if not exists
      if (!newErrors[activeTable]) {
        newErrors[activeTable] = {};
      }
      if (!newErrors[activeTable][dataKey]) {
        newErrors[activeTable][dataKey] = {};
      }
      
      // Update validation for this field
      if (validation.isValid) {
        // Remove error if valid
        delete newErrors[activeTable][dataKey][field];
        // Clean up empty objects
        if (Object.keys(newErrors[activeTable][dataKey]).length === 0) {
          delete newErrors[activeTable][dataKey];
        }
        if (Object.keys(newErrors[activeTable]).length === 0) {
          delete newErrors[activeTable];
        }
      } else {
        // Add error if invalid
        newErrors[activeTable][dataKey][field] = validation;
      }
      
      return newErrors;
    });
  };

  const stats = calculateConflictStats(conflicts);
  
  // Calculate validation stats
  const activeValidationErrors = validationErrors[activeTable] || {};
  const validationErrorCount = Object.keys(activeValidationErrors).length;

  // Keyboard navigation handlers
  const handleClassKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      branchInputRef.current?.focus();
    }
  };

  const handleBranchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      semesterInputRef.current?.focus();
    }
  };

  const handleSemesterKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      typeInputRef.current?.focus();
    }
  };

  const handleTypeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus first cell input after a short delay to ensure table is rendered
      setTimeout(() => {
        firstCellRef.current?.focus();
      }, 100);
    }
  };

  const addTable = () => {
    const newTable = generateUniqueTableId();
    setTables([...tables, newTable]);
    setActiveTable(newTable);
    // Initialize metadata for new tab
    setTabMetadata(prev => ({
      ...prev,
      [newTable]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
    }));
  };

  const removeTable = (table) => {
    setTables(tables.filter((t) => t !== table));
    if (activeTable === table && tables.length > 1) {
      setActiveTable(tables[0]);
    }
    // Remove metadata for deleted tab
    setTabMetadata(prev => {
      const newMetadata = { ...prev };
      delete newMetadata[table];
      return newMetadata;
    });
  };

  const addTimeSlot = () => {
    const newSlot = generateNextTimeSlot(timeSlots);
    setTimeSlots([...timeSlots, newSlot]);
  };

  const saveToFirestore = async () => {
    const currentMeta = tabMetadata[activeTable];
    if (!currentMeta?.className?.trim() || !currentMeta?.branch?.trim() || !currentMeta?.semester?.trim() || !currentMeta?.type?.trim()) {
      alert("Please fill in Class, Branch, Semester, and Type fields");
      return;
    }

    try {
      // Get the active table's data with proper table name
      const tableName = generateTableName(activeTable, tables);
      
      // Validate all batch data before converting
      const currentBatchData = batchData[activeTable] || {};
      
      // Run validation on all batch data
      const errors = await validateAllBatchData(currentBatchData);
      
      // Check if there are any validation errors
      if (hasValidationErrors(errors)) {
        const summary = getValidationSummary(errors);
        const errorMessage = `Cannot save timetable. Please fix the following errors:\n\n` +
          `- Invalid courses: ${summary.courseErrors}\n` +
          `- Invalid teachers: ${summary.teacherErrors}\n` +
          `- Invalid rooms: ${summary.roomErrors}\n\n` +
          `Total errors: ${summary.totalErrors}\n\n` +
          `Make sure all courses, teachers, and rooms exist in the database.`;
        alert(errorMessage);
        
        // Update validation state to show errors
        setValidationErrors(prev => ({
          ...prev,
          [activeTable]: errors
        }));
        return;
      }
      
      // Convert display names back to IDs before saving
      const convertedBatchData = await convertDisplayToIds(currentBatchData);
      
      // Verify that all entries have IDs
      let missingIds = false;
      for (const [key, value] of Object.entries(convertedBatchData)) {
        if (value.course && !value.courseId) {
          console.error(`Missing courseId for key ${key}:`, value);
          missingIds = true;
        }
        if (value.teacher && !value.teacherId) {
          console.error(`Missing teacherId for key ${key}:`, value);
          missingIds = true;
        }
        if (value.room && !value.roomId) {
          console.error(`Missing roomId for key ${key}:`, value);
          missingIds = true;
        }
      }
      
      if (missingIds) {
        alert("Error: Some entries could not be converted to IDs. Please ensure all courses, teachers, and rooms exist in the database.");
        return;
      }
      
      const batchesByTable = {
        [tableName]: batches[activeTable] || {}
      };
      const batchDataByTable = {
        [tableName]: convertedBatchData
      };
      
      console.log('🚀 Saving timetable with data:', {
        meta: {
          class: currentMeta.className,
          branch: currentMeta.branch,
          semester: currentMeta.semester,
          type: currentMeta.type,
        },
        tableName,
        timeSlots,
        batchesByTable,
        batchDataByTable
      });
      
      const id = await timetableService.saveTimetable({
        meta: {
          class: currentMeta.className,
          branch: currentMeta.branch,
          semester: currentMeta.semester,
          type: currentMeta.type,
        },
        tables: [tableName],
        timeSlots,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        batchesByTable,
        batchDataByTable,
      });

      setTabMetadata(prev => ({
        ...prev,
        [activeTable]: { ...prev[activeTable], timetableId: id }
      }));
      alert(`✅ Timetable saved successfully! (ID: ${id})`);
    } catch (error) {
      console.error("Error saving timetable:", error);
      alert("Failed to save timetable. Check console for details.");
    }
  };

  const buildExportMetaForTable = (tableKey) => {
    const m = tabMetadata[tableKey] ?? {};
    return {
      name: m?.timetableId || "",
      class: m?.className || "",
      branch: m?.branch || "",
      semester: m?.semester || "",
      type: m?.type || "",
    };
  };

  const buildExportTablePayload = (tableKey) => {
    const tableIndex = Math.max(0, tables.indexOf(tableKey));
    const tableLabel = `Table ${tableIndex + 1}`;
    const tableMeta = buildExportMetaForTable(tableKey);
    return {
      tableId: tableLabel,
      meta: tableMeta,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlots,
      batchesByTable: {
        [tableLabel]: batches[tableKey] || {},
      },
      batchDataByTable: {
        [tableLabel]: batchData[tableKey] || {},
      },
    };
  };

  const handleExportConfirm = ({ format, scope }) => {
    const tableKeys = scope === "all" ? tables : [activeTable];
    const tablesPayload = tableKeys.map((k) => buildExportTablePayload(k));

    // For naming, prefer the active table's metadata.
    const activeMeta = buildExportMetaForTable(activeTable);
    const baseNameParts = [activeMeta.class, activeMeta.branch, activeMeta.semester, activeMeta.type].filter(Boolean);
    const baseFileName = baseNameParts.join(" ") || "timetable";

    if (format === "pdf") {
      if (tablesPayload.length === 1) {
        exportTimetableToPdf({
          fileName: baseFileName,
          meta: activeMeta,
          ...tablesPayload[0],
        });
      } else {
        exportTimetablesToPdf({
          fileName: `${baseFileName} (all)`,
          meta: activeMeta,
          tables: tablesPayload,
        });
      }
    } else if (format === "excel") {
      exportTimetablesToExcel({
        fileName: scope === "all" ? `${baseFileName} (all)` : baseFileName,
        meta: activeMeta,
        tables: tablesPayload,
      });
    } else if (format === "doc") {
      exportTimetablesToDoc({
        fileName: scope === "all" ? `${baseFileName} (all)` : baseFileName,
        meta: activeMeta,
        tables: tablesPayload,
      });
    }

    setShowExportModal(false);
  };

  // Fullscreen toggle function
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  // Listen for fullscreen changes (e.g., user pressing ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="fixed bottom-6 right-6 z-50 p-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
      
      {/* Floating Teacher & Room Conflict Warnings - hidden, moved to sidebar */}


      <div className="flex gap-4 p-6 animate-fadeIn">
        {/* Main Content - Timetable Area */}
        <div className="flex-1 min-w-0">
        {/* Tabs and Action Buttons Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {tables.map((tableId, index) => (
              <div
                key={tableId}
                className={`px-3 py-1.5 cursor-pointer flex items-center rounded text-xs transition-all ${
                  tableId === activeTable
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTable(tableId)}
              >
                <span>Table {index + 1}</span>
                {tables.length > 1 && (
                  <button
                    className="ml-1.5 text-current opacity-60 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTable(tableId);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button 
              className="px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1"
              onClick={addTable}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          {/* Action Buttons - Save & Export */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
              onClick={saveToFirestore}
              type="button"
            >
              <Save size={16} />
              Save
            </button>
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
              onClick={() => setShowExportModal(true)}
              type="button"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Timetable Information Form */}
        <TimetableInfoForm
          activeTable={activeTable}
          tabMetadata={tabMetadata}
          setTabMetadata={setTabMetadata}
          semesterOptions={semesterOptions}
          isLoadingExisting={isLoadingExisting}
          onBrowseClick={() => setShowBrowseModal(true)}
          classInputRef={classInputRef}
          branchInputRef={branchInputRef}
          semesterInputRef={semesterInputRef}
          typeInputRef={typeInputRef}
          handleClassKeyDown={handleClassKeyDown}
          handleBranchKeyDown={handleBranchKeyDown}
          handleSemesterKeyDown={handleSemesterKeyDown}
          handleTypeKeyDown={handleTypeKeyDown}
        />

        {/* Browse Timetables Modal */}
        <BrowseTimetablesModal
          isOpen={showBrowseModal}
          onClose={() => setShowBrowseModal(false)}
          onSelectTimetable={handleLoadSelectedTimetable}
          timetableService={timetableService}
        />

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleExportConfirm}
        />

        {/* Timetable Grid */}
        <TimetableTable
          timeSlots={timeSlots}
          batches={batches[activeTable] || {}}
          batchData={batchData[activeTable] || {}}
          conflicts={conflicts[activeTable] || {}}
          validationErrors={validationErrors[activeTable] || {}}
          courseOptions={courseOptions}
          teacherOptions={teacherOptions}
          roomOptions={roomOptions}
          onCreateBatch={createBatch}
          onUpdateBatch={updateBatch}
          onValidationChange={handleValidationChange}
          firstCellRef={firstCellRef}
          onCopyCell={handleCopyCell}
          onMoveCell={handleMoveCell}
        />

        {/* Add Time Slot Button */}
        <button 
          onClick={addTimeSlot} 
          className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} />
          Add Time Slot
        </button>

        </div>

        {/* Suggestions Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-4">
            {/* Stats Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
              <div className="space-y-2">
                <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                  stats.teacherConflicts > 0 
                    ? "bg-red-50 text-red-800" 
                    : "bg-green-50 text-green-800"
                }`}>
                  {stats.teacherConflicts > 0 ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                  <span className="font-medium">Teachers: {stats.teacherConflicts > 0 ? `${stats.teacherConflicts} Conflicts` : 'Clear'}</span>
                </div>
                <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                  stats.roomConflicts > 0 
                    ? "bg-red-50 text-red-800" 
                    : "bg-green-50 text-green-800"
                }`}>
                  {stats.roomConflicts > 0 ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                  <span className="font-medium">Rooms: {stats.roomConflicts > 0 ? `${stats.roomConflicts} Conflicts` : 'Clear'}</span>
                </div>
                <div className={`p-2 rounded text-xs flex items-center gap-2 ${
                  validationErrorCount > 0 
                    ? "bg-orange-50 text-orange-800" 
                    : "bg-green-50 text-green-800"
                }`}>
                  {validationErrorCount > 0 ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                  <span className="font-medium">Validation: {validationErrorCount > 0 ? `${validationErrorCount} Errors` : 'Valid'}</span>
                </div>
              </div>
            </div>

            {/* Suggestions Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Suggestions</h3>
              <div className="space-y-3 text-xs text-gray-600">
                <p>Suggestions will appear here based on your timetable context.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Timetable;