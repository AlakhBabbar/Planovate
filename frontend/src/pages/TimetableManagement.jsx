import React, { useEffect, useState, useRef } from "react";
import { AlertCircle, CheckCircle, Users, Building2, BookOpen, FolderSearch, Save, Download, Plus, X } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TimetableTable from "../components/timetableManagment/TimetableTable";import BrowseTimetablesModal from "../components/timetableManagment/BrowseTimetablesModal";import { checkConflicts } from "../utils/Conflict";
import useTimetableStore from "../store/timetableStore";
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

// Generate unique table ID for internal use
const generateUniqueTableId = () => `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Timetable = () => {
  // Zustand store for global options
  const { courseOptions, teacherOptions, roomOptions, semesterOptions, fetchOptions } = useTimetableStore();
  
  // Generate initial unique table ID
  const [tables, setTables] = useState(() => [generateUniqueTableId()]);
  const [activeTable, setActiveTable] = useState(() => tables[0]);
  
  // Per-tab metadata: each tab has its own class, branch, semester
  const [tabMetadata, setTabMetadata] = useState(() => ({
    [tables[0]]: { className: "", branch: "", semester: "", timetableId: "" }
  }));
  
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);

  const [batches, setBatches] = useState({});
  const [batchData, setBatchData] = useState({});
  const [conflicts, setConflicts] = useState({});
  
  // Track loaded metadata per tab to prevent refetching on tab switch
  const loadedMetadataRef = useRef({});

  // Helper function to find if a timetable is already open in any tab
  const findTabWithMetadata = (className, branch, semester) => {
    return tables.find(tab => {
      const meta = tabMetadata[tab];
      return meta?.className?.trim() === className?.trim() &&
             meta?.branch?.trim() === branch?.trim() &&
             meta?.semester?.trim() === semester?.trim();
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
      if (!currentMeta?.className?.trim() || !currentMeta?.branch?.trim() || !currentMeta?.semester?.trim()) {
        return;
      }

      // Check if this timetable is already open in another tab
      const existingTab = findTabWithMetadata(currentMeta.className, currentMeta.branch, currentMeta.semester);
      if (existingTab && existingTab !== activeTable) {
        // Clear input fields in current tab before switching
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { className: "", branch: "", semester: "", timetableId: "" }
        }));
        // Switch to the existing tab instead of loading again
        setActiveTable(existingTab);
        return;
      }

      // Check if we've already loaded this exact metadata for this tab
      const metaKey = `${activeTable}-${currentMeta.className}-${currentMeta.branch}-${currentMeta.semester}`;
      if (loadedMetadataRef.current[metaKey]) {
        return; // Skip fetch if already loaded
      }

      setIsLoadingExisting(true);
      
      const existingTimetable = await checkExistingTimetable(
        currentMeta.className,
        currentMeta.branch,
        currentMeta.semester,
        timetableService
      );
      
      if (cancelled) return;

      if (existingTimetable) {
        // Load data into the ACTIVE tab only
        setTimeSlots(existingTimetable.timeSlots);
        
        const firstLoadedTable = existingTimetable.tables[0] || "Table 1";
        setBatches(prev => ({
          ...prev,
          [activeTable]: existingTimetable.batchesByTable[firstLoadedTable] || {}
        }));
        setBatchData(prev => ({
          ...prev,
          [activeTable]: existingTimetable.batchDataByTable[firstLoadedTable] || {}
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
  }, [tabMetadata[activeTable]?.className, tabMetadata[activeTable]?.branch, tabMetadata[activeTable]?.semester]);

  const handleLoadSelectedTimetable = async (timetable) => {
    try {
      // Check if this timetable is already open in another tab
      const existingTab = findTabWithMetadata(timetable.class, timetable.branch, timetable.semester);
      if (existingTab) {
        // Clear input fields in current tab before switching
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { className: "", branch: "", semester: "", timetableId: "" }
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
            timetableId: timetable.timetableId
          }
        }));
        
        // Load data into the ACTIVE tab only
        setTimeSlots(loadedTimetable.timeSlots);
        
        const firstLoadedTable = loadedTimetable.tables[0] || "Table 1";
        setBatches(prev => ({
          ...prev,
          [activeTable]: loadedTimetable.batchesByTable[firstLoadedTable] || {}
        }));
        setBatchData(prev => ({
          ...prev,
          [activeTable]: loadedTimetable.batchDataByTable[firstLoadedTable] || {}
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

  const stats = calculateConflictStats(conflicts);



  const addTable = () => {
    const newTable = generateUniqueTableId();
    setTables([...tables, newTable]);
    setActiveTable(newTable);
    // Initialize metadata for new tab
    setTabMetadata(prev => ({
      ...prev,
      [newTable]: { className: "", branch: "", semester: "", timetableId: "" }
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
    if (!currentMeta?.className?.trim() || !currentMeta?.branch?.trim() || !currentMeta?.semester?.trim()) {
      alert("Please fill in Class, Branch, and Semester fields");
      return;
    }

    try {
      const id = await timetableService.saveTimetable({
        meta: {
          class: currentMeta.className,
          branch: currentMeta.branch,
          semester: currentMeta.semester,
        },
        tables,
        timeSlots,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        batchesByTable: batches,
        batchDataByTable: batchData,
      });

      setTabMetadata(prev => ({
        ...prev,
        [activeTable]: { ...prev[activeTable], timetableId: id }
      }));
      alert(`Saved timetable to Firestore (ID: ${id})`);
    } catch (error) {
      console.error("Error saving timetable:", error);
      alert("Failed to save timetable. Check console for details.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      {/* Floating Teacher & Room Conflict Warnings */}
      <div className="fixed top-20 right-4 flex flex-col gap-3 z-50 animate-fadeInRight">
        <div className={`p-3 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-300 border-l-4 ${
          stats.teacherConflicts > 0 
            ? "bg-red-50 border-red-500 text-red-900" 
            : "bg-green-50 border-green-500 text-green-900"
        }`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {stats.teacherConflicts > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>Teachers: {stats.teacherConflicts > 0 ? `${stats.teacherConflicts} Conflicts` : 'Clear'}</span>
          </div>
        </div>
        <div className={`p-3 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-300 border-l-4 ${
          stats.roomConflicts > 0 
            ? "bg-red-50 border-red-500 text-red-900" 
            : "bg-green-50 border-green-500 text-green-900"
        }`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {stats.roomConflicts > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>Rooms: {stats.roomConflicts > 0 ? `${stats.roomConflicts} Conflicts` : 'Clear'}</span>
          </div>
        </div>
      </div>


      <div className="container mx-auto p-6 animate-fadeIn">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tables.map((tableId, index) => (
            <div
              key={tableId}
              className={`px-5 py-2.5 cursor-pointer flex items-center rounded-md shadow transition-all duration-300 border ${
                tableId === activeTable
                  ? "bg-blue-600 text-white shadow-md border-blue-600"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
              }`}
              onClick={() => setActiveTable(tableId)}
            >
              <span className="font-medium text-sm">Table {index + 1}</span>
              {tables.length > 1 && (
                <button
                  className="ml-2 text-current opacity-70 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTable(tableId);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button 
            className="px-4 py-2.5 rounded-md bg-white text-gray-700 shadow border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 flex items-center gap-1"
            onClick={addTable}
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add</span>
          </button>
        </div>

        {/* Course, Branch, Semester Inputs */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-5 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            <span>Timetable Information</span>
          </h3>
          <div className="flex gap-3 items-center flex-wrap">
            <input
              type="text"
              placeholder="Class"
              className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
              value={tabMetadata[activeTable]?.className || ""}
              onChange={(e) => setTabMetadata(prev => ({
                ...prev,
                [activeTable]: { ...prev[activeTable], className: e.target.value }
              }))}
              disabled={isLoadingExisting}
            />
            <input
              type="text"
              placeholder="Branch/Batch"
              className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
              value={tabMetadata[activeTable]?.branch || ""}
              onChange={(e) => setTabMetadata(prev => ({
                ...prev,
                [activeTable]: { ...prev[activeTable], branch: e.target.value }
              }))}
              disabled={isLoadingExisting}
            />
            <select
              className="flex-1 min-w-[180px] border border-gray-300 focus:border-blue-500 p-2.5 rounded-md transition-all duration-300 focus:ring-1 focus:ring-blue-300 outline-none text-sm"
              value={tabMetadata[activeTable]?.semester || ""}
              onChange={(e) => setTabMetadata(prev => ({
                ...prev,
                [activeTable]: { ...prev[activeTable], semester: e.target.value }
              }))}
              disabled={isLoadingExisting}
            >
              <option value="">Select Semester</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowBrowseModal(true)}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all duration-300 shadow whitespace-nowrap font-medium text-sm flex items-center gap-2"
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

        {/* Browse Timetables Modal */}
        <BrowseTimetablesModal
          isOpen={showBrowseModal}
          onClose={() => setShowBrowseModal(false)}
          onSelectTimetable={handleLoadSelectedTimetable}
          timetableService={timetableService}
        />

        {/* Timetable Grid */}
        <TimetableTable
          timeSlots={timeSlots}
          batches={batches[activeTable] || {}}
          batchData={batchData[activeTable] || {}}
          conflicts={conflicts[activeTable] || {}}
          courseOptions={courseOptions}
          teacherOptions={teacherOptions}
          roomOptions={roomOptions}
          onCreateBatch={createBatch}
          onUpdateBatch={updateBatch}
        />

        {/* Add Time Slot Button */}
        <button 
          onClick={addTimeSlot} 
          className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-300 shadow font-medium text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Add Time Slot
        </button>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3 flex-wrap">
          <button
            className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-all duration-300 shadow font-medium text-sm flex items-center gap-2"
            onClick={saveToFirestore}
            type="button"
          >
            <Save size={16} />
            Save Timetable
          </button>
          <button className="px-6 py-2.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-all duration-300 shadow font-medium text-sm flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>

      </div>
      
      <Footer />
    </div>
  );
};

export default Timetable;