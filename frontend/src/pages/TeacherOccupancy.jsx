import React, { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Users, Download, ChevronDown, Search, Filter, LayoutGrid, User } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { teacherService, timetableService } from "../firebase/services";
import { getAllSchedules } from "../firebase/services/schedules";
import { DEFAULT_TIME_SLOTS } from "../utils/timetableUIHelpers";
import { getCourseDisplayName, getRoomDisplayName } from "../utils/idDisplayHelpers";
import { exportTeacherOccupancyToPdf, exportTeacherOccupancyToExcel } from "../utils/teacherOccupancyExport";

const TeacherOccupancy = () => {
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // New state for individual teacher view
  const [viewMode, setViewMode] = useState("all"); // "all" or "individual"
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

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

      const [teachersData, schedulesData] = await Promise.all([
        teacherService.listTeachers(),
        getAllSchedules(),
      ]);

      console.log('📊 Loaded schedules:', schedulesData.length);
      console.log('📊 Sample schedule:', schedulesData[0]);
      console.log('📊 Loaded teachers:', teachersData.length);
      console.log('📊 Sample teacher:', teachersData[0]);

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
            resolved.room = await getRoomDisplayName(schedule.roomId);
          }
          
          return resolved;
        })
      );

      setTeachers(teachersData);
      setSchedules(resolvedSchedules);

      // Extract unique faculties and departments
      const uniqueFaculties = [...new Set(teachersData.map(t => t.faculty).filter(Boolean))].sort();
      const uniqueDepartments = [...new Set(teachersData.map(t => t.department).filter(Boolean))].sort();
      setFaculties(uniqueFaculties);
      setDepartments(uniqueDepartments);

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
      setError("Failed to load teacher occupancy data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyForCell = (teacherId, rowIndex, dayKey) => {
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
      // Match by teacher document ID (teacherId)
      const teacherMatch = s.teacherId && String(s.teacherId) === String(teacherId);
      // Match by rowIndex (time slot)
      const timeMatch = s.rowIndex === rowIndex;
      // Match by colIndex (day)
      const dayMatch = s.colIndex === colIndex;
      
      return teacherMatch && timeMatch && dayMatch;
    });
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} matches for [Teacher ID: ${teacherId}, Row: ${rowIndex}, Day: ${dayKey} (Col: ${colIndex})]`);
    }
    return matches;
  };

  // Helper function to get teacher document ID
  const getTeacherDocumentId = (teacher) => {
    // Return the teacher's document ID (unid)
    return String(teacher.unid || '');
  };

  // Filtered teachers based on search and filters
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch = searchQuery === "" || 
        (teacher.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (teacher.ID || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFaculty = selectedFaculty === "" || teacher.faculty === selectedFaculty;
      const matchesDepartment = selectedDepartment === "" || teacher.department === selectedDepartment;
      
      return matchesSearch && matchesFaculty && matchesDepartment;
    });
  }, [teachers, searchQuery, selectedFaculty, selectedDepartment]);
  
  // Export handlers
  const handleExportPdf = () => {
    exportTeacherOccupancyToPdf(teachers, schedules, timeSlots, "teacher-occupancy");
    setShowExportMenu(false);
  };
  
  const handleExportExcel = () => {
    exportTeacherOccupancyToExcel(teachers, schedules, timeSlots, "teacher-occupancy");
    setShowExportMenu(false);
  };

  const renderCell = (teacherId, rowIndex) => {
    const occupancies = getOccupancyForCell(teacherId, rowIndex, selectedDay);

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
          // Build complete class name: Class Branch Semester Type (NOT including course)
          const classNameParts = [];
          if (occ.class) classNameParts.push(occ.class);
          if (occ.branch) classNameParts.push(occ.branch);
          if (occ.semester) classNameParts.push(occ.semester);
          if (occ.type) classNameParts.push(occ.type);
          
          const fullClassName = classNameParts.join(" ");
          
          return (
            <div
              key={idx}
              className="bg-green-50 border border-green-200 rounded px-2 py-1.5 text-xs"
            >
              <div className="font-semibold text-green-900 text-[10px]">
                {fullClassName}
                {occ.batch && <span className="ml-1">({occ.batch})</span>}
              </div>
              {occ.course && (
                <div className="text-green-700 text-[10px] mt-0.5">
                  Course: {occ.course}
                </div>
              )}
              {occ.room && (
                <div className="text-green-600 text-[10px] mt-0.5">
                  Room: {occ.room}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render cell for individual teacher view (days as columns)
  const renderIndividualCell = (teacherId, rowIndex, dayKey) => {
    const occupancies = getOccupancyForCell(teacherId, rowIndex, dayKey);

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
          const classNameParts = [];
          if (occ.class) classNameParts.push(occ.class);
          if (occ.branch) classNameParts.push(occ.branch);
          if (occ.semester) classNameParts.push(occ.semester);
          if (occ.type) classNameParts.push(occ.type);
          
          const fullClassName = classNameParts.join(" ");
          
          return (
            <div
              key={idx}
              className="bg-green-50 border border-green-200 rounded px-2 py-1.5 text-xs"
            >
              <div className="font-semibold text-green-900 text-[10px]">
                {fullClassName}
                {occ.batch && <span className="ml-1">({occ.batch})</span>}
              </div>
              {occ.course && (
                <div className="text-green-700 text-[10px] mt-0.5">
                  {occ.course}
                </div>
              )}
              {occ.room && (
                <div className="text-green-600 text-[10px] mt-0.5">
                  Room: {occ.room}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render individual teacher view
  const renderIndividualView = () => {
    if (!selectedTeacher) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teacher Selected</h3>
          <p className="text-gray-600">Please select a teacher from the list to view their occupancy</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Teacher Info Header */}
        <div className="bg-green-50 border-b border-green-200 px-6 py-4">
          <h2 className="text-xl font-bold text-green-900">{selectedTeacher.name || selectedTeacher.ID}</h2>
          <div className="flex gap-4 mt-2 text-sm text-green-700">
            {selectedTeacher.ID && <span>ID: {selectedTeacher.ID}</span>}
            {selectedTeacher.department && <span>Department: {selectedTeacher.department}</span>}
            {selectedTeacher.faculty && <span>Faculty: {selectedTeacher.faculty}</span>}
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
                      {renderIndividualCell(getTeacherDocumentId(selectedTeacher), rowIndex, day.key)}
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

  // Render teacher list for selection
  const renderTeacherList = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Select Teacher ({filteredTeachers.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredTeachers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No teachers found matching your criteria
            </div>
          ) : (
            filteredTeachers.map((teacher) => (
              <button
                key={teacher.unid}
                onClick={() => setSelectedTeacher(teacher)}
                className={`w-full px-4 py-3 text-left hover:bg-green-50 transition-colors ${
                  selectedTeacher?.unid === teacher.unid ? "bg-green-100 border-l-4 border-l-green-600" : ""
                }`}
              >
                <div className="font-medium text-gray-900">{teacher.name || teacher.ID}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                  {teacher.ID && <span>ID: {teacher.ID}</span>}
                  {teacher.department && <span>Dept: {teacher.department}</span>}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Occupancy</h1>
            <p className="text-gray-600">
              {viewMode === "all" 
                ? "View which teachers are occupied at each time slot" 
                : "View individual teacher's weekly schedule"}
            </p>
          </div>
          
          {/* View Switcher and Export Button */}
          {!loading && teachers.length > 0 && (
            <div className="flex items-center gap-3">
              {/* View Mode Switcher */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex gap-1">
                <button
                  onClick={() => {
                    setViewMode("all");
                    setSelectedTeacher(null);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === "all"
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <LayoutGrid size={16} />
                  All Teachers
                </button>
                <button
                  onClick={() => setViewMode("individual")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === "individual"
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <User size={16} />
                  By Teacher
                </button>
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
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
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={handleExportPdf}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Download size={16} />
                        Export as PDF
                      </button>
                      <button
                        onClick={handleExportExcel}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Download size={16} />
                        Export as Excel
                      </button>
                    </div>
                  </>
                )}
              </div>
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
            {viewMode === "individual" && (
              <>
                {/* Search and Filters for Individual View */}
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search by name or ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Faculty Filter */}
                    <div className="min-w-[200px]">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          value={selectedFaculty}
                          onChange={(e) => setSelectedFaculty(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                        >
                          <option value="">All Faculties</option>
                          {faculties.map((faculty) => (
                            <option key={faculty} value={faculty}>
                              {faculty}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Department Filter */}
                    <div className="min-w-[200px]">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                        >
                          <option value="">All Departments</option>
                          {departments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {(searchQuery || selectedFaculty || selectedDepartment) && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedFaculty("");
                          setSelectedDepartment("");
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual View Layout - Teacher List + Occupancy Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Teacher List - 1/3 width on large screens */}
                  <div className="lg:col-span-1">
                    {renderTeacherList()}
                  </div>

                  {/* Teacher Occupancy Grid - 2/3 width on large screens */}
                  <div className="lg:col-span-2">
                    {renderIndividualView()}
                  </div>
                </div>
              </>
            )}

            {viewMode === "all" && (
              <>
                {/* Day Tabs */}
                <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex gap-1 overflow-x-auto">
                  {days.map((day) => (
                    <button
                      key={day.key}
                      onClick={() => setSelectedDay(day.key)}
                      className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        selectedDay === day.key
                          ? "bg-green-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>

                {/* Occupancy Table */}
                {teachers.length === 0 || timeSlots.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600">
                      {teachers.length === 0 ? "No teachers found. " : ""}
                      {timeSlots.length === 0 ? "No schedules found." : ""}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[150px]">
                              Teacher
                            </th>
                            {timeSlots.map((timeSlot, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[180px]"
                              >
                                {timeSlot}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teachers.map((teacher) => (
                            <tr
                              key={teacher.unid}
                              className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                              <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                                <div>{teacher.name || teacher.ID}</div>
                                {teacher.department && (
                                  <div className="text-[10px] text-gray-500 font-normal mt-1">
                                    Dept: {teacher.department}
                                  </div>
                                )}
                              </td>
                              {timeSlots.map((timeSlot, rowIndex) => (
                                <td
                                  key={rowIndex}
                                  className="px-4 py-2 border-r border-gray-200 align-top"
                                >
                                  {renderCell(getTeacherDocumentId(teacher), rowIndex)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!loading && teachers.length > 0 && timeSlots.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600 text-center">
                    Showing {teachers.length} teacher{teachers.length !== 1 ? "s" : ""} across{" "}
                    {timeSlots.length} time slot{timeSlots.length !== 1 ? "s" : ""}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TeacherOccupancy;
