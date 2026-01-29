import React, { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, GraduationCap, Download, ChevronDown, Search, Filter, Eye, X } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ClassOccupancyPreviewModal from "../components/ClassOccupancyPreviewModal";
import { timetableService } from "../firebase/services";
import { getAllSchedules } from "../firebase/services/schedules";
import { DEFAULT_TIME_SLOTS } from "../utils/timetableUIHelpers";
import { getCourseDisplayName, getRoomDisplayName, getTeacherDisplayName } from "../utils/idDisplayHelpers";
import { exportClassOccupancyToPdf, exportClassOccupancyToExcel, exportClassOccupancyToPdfMobile, exportClassOccupancyToExcelMobile } from "../utils/classOccupancyExport";

const ClassOccupancy = () => {
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPreviewAllModal, setShowPreviewAllModal] = useState(false);
  
  // State for filters
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [branches, setBranches] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const days = [
    { key: "Mon", label: "Monday" },
    { key: "Tue", label: "Tuesday" },
    { key: "Wed", label: "Wednesday" },
    { key: "Thu", label: "Thursday" },
    { key: "Fri", label: "Friday" },
    { key: "Sat", label: "Saturday" },
  ];

  /**
   * Generate a time slot based on its index (rowIndex).
   * First 8 slots are from DEFAULT_TIME_SLOTS, then generate 55-minute slots incrementally.
   */
  const generateTimeSlot = (rowIndex) => {
    // Use default time slots for the first 8 slots
    if (rowIndex < DEFAULT_TIME_SLOTS.length) {
      return DEFAULT_TIME_SLOTS[rowIndex];
    }

    // For additional slots, generate 55-minute increments
    // Last default slot ends at 3:05, so start from there
    const lastDefaultEnd = "3:05";
    const [hours, minutes] = lastDefaultEnd.split(":").map(Number);
    
    // Calculate how many 55-minute slots past the default
    const extraSlots = rowIndex - DEFAULT_TIME_SLOTS.length + 1;
    const startMinutes = hours * 60 + minutes + (extraSlots - 1) * 55;
    const endMinutes = startMinutes + 55;
    
    const formatTime = (totalMinutes) => {
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h}:${m.toString().padStart(2, "0")}`;
    };
    
    return `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const schedulesData = await getAllSchedules();

      console.log('📊 Loaded schedules:', schedulesData.length);
      console.log('📊 Sample schedule:', schedulesData[0]);

      // Get unique timetable IDs from schedules
      const uniqueTimetableIds = [...new Set(schedulesData.map(s => s.timetableId).filter(Boolean))];
      
      // Fetch timetable metadata for all unique IDs
      const timetablesMap = new Map();
      await Promise.all(
        uniqueTimetableIds.map(async (timetableId) => {
          try {
            const timetableData = await timetableService.loadTimetable(timetableId);
            if (timetableData && timetableData.meta) {
              timetablesMap.set(timetableId, timetableData.meta);
            }
          } catch (err) {
            console.warn(`Failed to load timetable metadata for ${timetableId}:`, err);
          }
        })
      );

      // Resolve IDs to display names and add metadata from timetable
      const resolvedSchedules = await Promise.all(
        schedulesData.map(async (schedule) => {
          const resolved = { ...schedule };
          
          // Get metadata from timetable document
          const timetableMeta = timetablesMap.get(schedule.timetableId);
          if (timetableMeta) {
            resolved.class = timetableMeta.class;
            resolved.branch = timetableMeta.branch;
            resolved.semester = timetableMeta.semester;
            resolved.type = timetableMeta.type;
          }
          
          // Resolve courseId to course display name
          if (schedule.courseId) {
            resolved.course = await getCourseDisplayName(schedule.courseId);
          }
          
          // Resolve roomId to room display name
          if (schedule.roomId) {
            const roomFullDisplay = await getRoomDisplayName(schedule.roomId);
            resolved.room = roomFullDisplay;
            // Get the actual room ID field from the room document
            const rooms = await import('../utils/idDisplayHelpers').then(m => m.fetchRoomsCache());
            const room = rooms.get(String(schedule.roomId));
            resolved.roomIdOnly = room?.ID || schedule.roomId;
          }

          // Resolve teacherId to teacher display name
          if (schedule.teacherId) {
            resolved.teacher = await getTeacherDisplayName(schedule.teacherId);
          }
          
          return resolved;
        })
      );

      setSchedules(resolvedSchedules);

      // Extract unique classes from schedules
      const classesMap = new Map();
      resolvedSchedules.forEach((schedule) => {
        if (schedule.timetableId) {
          const classKey = schedule.timetableId;
          if (!classesMap.has(classKey)) {
            classesMap.set(classKey, {
              id: classKey,
              class: schedule.class || '',
              branch: schedule.branch || '',
              semester: schedule.semester || '',
              type: schedule.type || '',
              displayName: `${schedule.class || ''} ${schedule.branch || ''} ${schedule.semester || ''} ${schedule.type || ''}`.trim()
            });
          }
        }
      });

      const classesArray = Array.from(classesMap.values());
      setClasses(classesArray);

      // Extract unique branches and semesters
      const uniqueBranches = [...new Set(classesArray.map(c => c.branch).filter(Boolean))].sort();
      const uniqueSemesters = [...new Set(classesArray.map(c => c.semester).filter(Boolean))].sort();
      setBranches(uniqueBranches);
      setSemesters(uniqueSemesters);

      console.log('📊 Unique classes:', classesArray.length);
      console.log('📊 Sample class:', classesArray[0]);

      // Find the maximum rowIndex to determine the last time slot
      let maxRowIndex = -1;
      schedulesData.forEach((schedule) => {
        if (schedule.rowIndex !== undefined && schedule.rowIndex > maxRowIndex) {
          maxRowIndex = schedule.rowIndex;
        }
      });

      console.log('📊 Maximum rowIndex found:', maxRowIndex);

      // Generate time slots from 0 to maxRowIndex
      const generatedTimeSlots = [];
      if (maxRowIndex >= 0) {
        for (let i = 0; i <= maxRowIndex; i++) {
          generatedTimeSlots.push(generateTimeSlot(i));
        }
      }

      console.log('📊 Generated time slots:', generatedTimeSlots);
      setTimeSlots(generatedTimeSlots);

    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load class occupancy data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyForCell = (classId, rowIndex, dayKey) => {
    // Map day key to colIndex (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5)
    const dayToColIndex = {
      "Mon": 0,
      "Tue": 1,
      "Wed": 2,
      "Thu": 3,
      "Fri": 4,
      "Sat": 5
    };
    
    const colIndex = dayToColIndex[dayKey];
    
    const matches = schedules.filter((s) => {
      // Match by timetableId (class identifier)
      const classMatch = s.timetableId && String(s.timetableId) === String(classId);
      // Match by rowIndex (time slot)
      const timeMatch = s.rowIndex === rowIndex;
      // Match by colIndex (day)
      const dayMatch = s.colIndex === colIndex;
      
      return classMatch && timeMatch && dayMatch;
    });
    
    return matches;
  };

  // Filtered classes based on search and filters
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch = searchQuery === "" || 
        cls.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBranch = selectedBranch === "" || cls.branch === selectedBranch;
      const matchesSemester = selectedSemester === "" || cls.semester === selectedSemester;
      
      return matchesSearch && matchesBranch && matchesSemester;
    });
  }, [classes, searchQuery, selectedBranch, selectedSemester]);
  
  // Export handlers
  const handleShowPreview = () => {
    setShowPreviewModal(true);
    setShowExportMenu(false);
  };

  const handleShowExportAll = () => {
    setShowPreviewAllModal(true);
    setShowExportMenu(false);
  };

  const handleExportPdf = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || (selectedClass ? [selectedClass] : []);
    if (classesToExport.length > 0) {
      exportClassOccupancyToPdf(classesToExport, schedules, timeSlots, "class-occupancy", branchColors);
    }
  };
  
  const handleExportExcel = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || (selectedClass ? [selectedClass] : []);
    if (classesToExport.length > 0) {
      exportClassOccupancyToExcel(classesToExport, schedules, timeSlots, "class-occupancy", branchColors);
    }
  };

  const handleExportPdfMobile = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || (selectedClass ? [selectedClass] : []);
    if (classesToExport.length > 0) {
      exportClassOccupancyToPdfMobile(classesToExport, schedules, timeSlots, "class-occupancy-mobile", branchColors);
    }
  };
  
  const handleExportExcelMobile = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || (selectedClass ? [selectedClass] : []);
    if (classesToExport.length > 0) {
      exportClassOccupancyToExcelMobile(classesToExport, schedules, timeSlots, "class-occupancy-mobile", branchColors);
    }
  };

  const handleExportAllPdf = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || filteredClasses;
    exportClassOccupancyToPdf(classesToExport, schedules, timeSlots, "all-classes-occupancy", branchColors);
  };
  
  const handleExportAllExcel = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || filteredClasses;
    exportClassOccupancyToExcel(classesToExport, schedules, timeSlots, "all-classes-occupancy", branchColors);
  };

  const handleExportAllPdfMobile = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || filteredClasses;
    exportClassOccupancyToPdfMobile(classesToExport, schedules, timeSlots, "all-classes-occupancy-mobile", branchColors);
  };
  
  const handleExportAllExcelMobile = (branchColors = {}, orderedClasses = null) => {
    const classesToExport = orderedClasses || filteredClasses;
    exportClassOccupancyToExcelMobile(classesToExport, schedules, timeSlots, "all-classes-occupancy-mobile", branchColors);
  };

  // Render cell for individual class view (days as columns)
  const renderIndividualCell = (classId, rowIndex, dayKey) => {
    const occupancies = getOccupancyForCell(classId, rowIndex, dayKey);

    if (occupancies.length === 0) {
      return (
        <div className="text-center text-gray-400 text-xs py-3">
          —
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {occupancies.map((occ, idx) => {
          return (
            <div
              key={idx}
              className="bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-xs"
            >
              {occ.batch && (
                <div className="font-semibold text-purple-900 text-[10px]">
                  Batch: {occ.batch}
                </div>
              )}
              {occ.course && (
                <div className="text-purple-700 text-[10px] mt-0.5">
                  {occ.course}
                </div>
              )}
              {occ.teacher && (
                <div className="text-purple-600 text-[10px] mt-0.5">
                  Teacher: {occ.teacher}
                </div>
              )}
              {occ.room && (
                <div className="text-purple-600 text-[10px] mt-0.5">
                  Room: {occ.room}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render individual class view
  const renderIndividualView = () => {
    if (!selectedClass) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Class Selected</h3>
          <p className="text-gray-600">Please select a class from the list to view their occupancy</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Class Info Header */}
        <div className="bg-purple-50 border-b border-purple-200 px-6 py-4">
          <h2 className="text-xl font-bold text-purple-900">{selectedClass.displayName}</h2>
          <div className="flex gap-4 mt-2 text-sm text-purple-700">
            {selectedClass.class && <span>Class: {selectedClass.class}</span>}
            {selectedClass.branch && <span>Branch: {selectedClass.branch}</span>}
            {selectedClass.semester && <span>Semester: {selectedClass.semester}</span>}
            {selectedClass.type && <span>Type: {selectedClass.type}</span>}
          </div>
        </div>

        {/* Occupancy Grid - Days as columns, Time slots as rows */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                  Time Slot
                </th>
                {days.map((day) => (
                  <th
                    key={day.key}
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[180px]"
                  >
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((timeSlot, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {timeSlot}
                  </td>
                  {days.map((day) => (
                    <td
                      key={day.key}
                      className="px-4 py-2 border-r border-gray-200 align-top"
                    >
                      {renderIndividualCell(selectedClass.id, rowIndex, day.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render class list for selection
  const renderClassList = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Select Class ({filteredClasses.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredClasses.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No classes found matching your criteria
            </div>
          ) : (
            filteredClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors ${
                  selectedClass?.id === cls.id ? "bg-purple-100 border-l-4 border-l-purple-600" : ""
                }`}
              >
                <div className="font-medium text-gray-900">{cls.displayName}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                  {cls.branch && <span>Branch: {cls.branch}</span>}
                  {cls.semester && <span>Sem: {cls.semester}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Occupancy</h1>
            <p className="text-gray-600">View individual class's weekly schedule</p>
          </div>
          
          {/* Export Button */}
          {!loading && classes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
              >
                <Download size={18} />
                Export
                <ChevronDown size={16} />
              </button>
              
              {showExportMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowExportMenu(false)}
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {selectedClass && (
                      <>
                        <button
                          onClick={handleShowPreview}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <Eye size={16} />
                          Preview & Export
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                      </>
                    )}
                    <button
                      onClick={handleShowExportAll}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} />
                      Export All Classes ({filteredClasses.length})
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Search */}
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search by class name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Branch Filter */}
                <div className="min-w-[200px]">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">All Branches</option>
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Semester Filter */}
                <div className="min-w-[200px]">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="">All Semesters</option>
                      {semesters.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedBranch || selectedSemester) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedBranch("");
                      setSelectedSemester("");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Class List + Occupancy Grid Layout */}
            {classes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">No classes found. Please create timetables first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Class List - 1/3 width on large screens */}
                <div className="lg:col-span-1">
                  {renderClassList()}
                </div>

                {/* Class Occupancy Grid - 2/3 width on large screens */}
                <div className="lg:col-span-2">
                  {renderIndividualView()}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Preview Modal */}
      {showPreviewModal && selectedClass && (
        <ClassOccupancyPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          classData={selectedClass}
          schedules={schedules}
          timeSlots={timeSlots}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onExportPdfMobile={handleExportPdfMobile}
          onExportExcelMobile={handleExportExcelMobile}
        />
      )}

      {/* Preview All Modal */}
      {showPreviewAllModal && (
        <ClassOccupancyPreviewModal
          isOpen={showPreviewAllModal}
          onClose={() => setShowPreviewAllModal(false)}
          classData={null}
          allClasses={filteredClasses}
          schedules={schedules}
          timeSlots={timeSlots}
          onExportPdf={handleExportAllPdf}
          onExportExcel={handleExportAllExcel}
          onExportPdfMobile={handleExportAllPdfMobile}
          onExportExcelMobile={handleExportAllExcelMobile}
        />
      )}
    </div>
  );
};

export default ClassOccupancy;
