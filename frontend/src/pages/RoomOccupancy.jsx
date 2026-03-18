import React, { useState, useEffect, useMemo } from "react";
import { Loader2, AlertCircle, Building2, Download, ChevronDown, Search, Filter, LayoutGrid, Building } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RoomOccupancyPreviewModal from "../components/RoomOccupancyPreviewModal";
import { roomService, timetableService } from "../firebase/services";
import { getAllSchedules } from "../firebase/services/schedules";
import { DEFAULT_TIME_SLOTS } from "../utils/timetableUIHelpers";
import { getCourseDisplayName, getTeacherDisplayName } from "../utils/idDisplayHelpers";
import { exportRoomOccupancyToPdf, exportRoomOccupancyToExcel, exportRoomOccupancyToPdfMobile, exportRoomOccupancyToExcelMobile } from "../utils/roomOccupancyExport";

const RoomOccupancy = () => {
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPreviewAllModal, setShowPreviewAllModal] = useState(false);
  const [showPreviewIndividualModal, setShowPreviewIndividualModal] = useState(false);
  
  // New state for individual room view
  const [viewMode, setViewMode] = useState("all"); // "all" or "individual"
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState("");
  const [faculties, setFaculties] = useState([]);

  // Define capacity ranges
  const capacityRanges = [
    { label: "1-30", min: 1, max: 30 },
    { label: "31-60", min: 31, max: 60 },
    { label: "61-100", min: 61, max: 100 },
    { label: "101-200", min: 101, max: 200 },
    { label: "200+", min: 201, max: Infinity },
  ];

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

      const [roomsData, schedulesData] = await Promise.all([
        roomService.listRooms(),
        getAllSchedules(),
      ]);

      console.log('📊 Loaded schedules:', schedulesData.length);
      console.log('📊 Sample schedule:', schedulesData[0]);
      console.log('📊 Loaded rooms:', roomsData.length);
      console.log('📊 Sample room:', roomsData[0]);

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
          
          // Resolve teacherId to teacher display name
          if (schedule.teacherId) {
            resolved.teacher = await getTeacherDisplayName(schedule.teacherId);
          }
          
          return resolved;
        })
      );

      setRooms(roomsData);
      setSchedules(resolvedSchedules);

      // Extract unique faculties
      const uniqueFaculties = [...new Set(roomsData.map(r => r.faculty).filter(Boolean))].sort();
      setFaculties(uniqueFaculties);

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
      setError("Failed to load room occupancy data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyForCell = (roomId, rowIndex, dayKey) => {
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
      // Match by room document ID (roomId)
      const roomMatch = s.roomId && String(s.roomId) === String(roomId);
      // Match by rowIndex (time slot)
      const timeMatch = s.rowIndex === rowIndex;
      // Match by colIndex (day)
      const dayMatch = s.colIndex === colIndex;
      
      return roomMatch && timeMatch && dayMatch;
    });
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} matches for [Room ID: ${roomId}, Row: ${rowIndex}, Day: ${dayKey} (Col: ${colIndex})]`);
    }
    return matches;
  };

  // Helper function to get room document ID
  const getRoomDocumentId = (room) => {
    // Return the room's document ID (unid)
    return String(room.unid || '');
  };

  // Filtered rooms based on search and filters
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = searchQuery === "" || 
        (room.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.ID || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFaculty = selectedFaculty === "" || room.faculty === selectedFaculty;
      
      let matchesCapacity = true;
      if (selectedCapacity !== "") {
        const range = capacityRanges.find(r => r.label === selectedCapacity);
        if (range && room.capacity) {
          matchesCapacity = room.capacity >= range.min && room.capacity <= range.max;
        }
      }
      
      return matchesSearch && matchesFaculty && matchesCapacity;
    });
  }, [rooms, searchQuery, selectedFaculty, selectedCapacity]);
  
  // Export handlers - show preview modal
  const handleExportClick = () => {
    setShowPreviewAllModal(true);
    setShowExportMenu(false);
  };
  
  // Individual room export handler
  const handleIndividualExportClick = () => {
    if (selectedRoom) {
      setShowPreviewIndividualModal(true);
    }
  };
  
  // Export functions passed to modal
  const handleExportPdf = (roomsToExport, schedulesToExport, timeSlotsToExport) => {
    exportRoomOccupancyToPdf(roomsToExport, schedulesToExport, timeSlotsToExport, "room-occupancy");
  };
  
  const handleExportExcel = (roomsToExport, schedulesToExport, timeSlotsToExport) => {
    exportRoomOccupancyToExcel(roomsToExport, schedulesToExport, timeSlotsToExport, "room-occupancy");
  };
  
  const handleExportPdfMobile = (roomsToExport, schedulesToExport, timeSlotsToExport) => {
    exportRoomOccupancyToPdfMobile(roomsToExport, schedulesToExport, timeSlotsToExport, "room-occupancy-mobile");
  };
  
  const handleExportExcelMobile = (roomsToExport, schedulesToExport, timeSlotsToExport) => {
    exportRoomOccupancyToExcelMobile(roomsToExport, schedulesToExport, timeSlotsToExport, "room-occupancy-mobile");
  };

  const renderCell = (roomId, rowIndex) => {
    const occupancies = getOccupancyForCell(roomId, rowIndex, selectedDay);

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
          if (occ.semester) classNameParts.push(occ.semester); // This seems to be semester in the data
          if (occ.type) classNameParts.push(occ.type);
          
          const fullClassName = classNameParts.join(" ");
          
          return (
            <div
              key={idx}
              className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-xs"
            >
              <div className="font-semibold text-blue-900 text-[10px]">
                {fullClassName}
                {occ.batch && <span className="ml-1">({occ.batch})</span>}
              </div>
              {occ.course && (
                <div className="text-blue-700 text-[10px] mt-0.5">
                  Course: {occ.course}
                </div>
              )}
              {occ.teacher && (
                <div className="text-blue-600 text-[10px] mt-0.5">
                  Teacher: {occ.teacher}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render cell for individual room view (days as columns)
  const renderIndividualCell = (roomId, rowIndex, dayKey) => {
    const occupancies = getOccupancyForCell(roomId, rowIndex, dayKey);

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
              className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-xs"
            >
              <div className="font-semibold text-blue-900 text-[10px]">
                {fullClassName}
                {occ.batch && <span className="ml-1">({occ.batch})</span>}
              </div>
              {occ.course && (
                <div className="text-blue-700 text-[10px] mt-0.5">
                  {occ.course}
                </div>
              )}
              {occ.teacher && (
                <div className="text-blue-600 text-[10px] mt-0.5">
                  Teacher: {occ.teacher}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render individual room view
  const renderIndividualView = () => {
    if (!selectedRoom) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Room Selected</h3>
          <p className="text-gray-600">Please select a room from the list to view its occupancy</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Room Info Header */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">{selectedRoom.name || selectedRoom.ID}</h2>
              <div className="flex gap-4 mt-2 text-sm text-blue-700">
                {selectedRoom.faculty && <span>Faculty: {selectedRoom.faculty}</span>}
                {selectedRoom.floor && <span>Floor: {selectedRoom.floor}</span>}
                {selectedRoom.capacity && <span>Capacity: {selectedRoom.capacity}</span>}
              </div>
            </div>
            <button
              onClick={handleIndividualExportClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 text-sm font-medium"
            >
              <Download size={16} />
              Export This Room
            </button>
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
                      {renderIndividualCell(getRoomDocumentId(selectedRoom), rowIndex, day.key)}
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

  // Render room list for selection
  const renderRoomList = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-h-[600px] overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Select Room ({filteredRooms.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredRooms.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No rooms found matching your criteria
            </div>
          ) : (
            filteredRooms.map((room) => (
              <button
                key={room.unid}
                onClick={() => setSelectedRoom(room)}
                className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors ${
                  selectedRoom?.unid === room.unid ? "bg-blue-100 border-l-4 border-l-blue-600" : ""
                }`}
              >
                <div className="font-medium text-gray-900">{room.name || room.ID}</div>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                  {room.faculty && <span>Faculty: {room.faculty}</span>}
                  {room.floor && <span>Floor: {room.floor}</span>}
                  {room.capacity && <span>Cap: {room.capacity}</span>}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Room Occupancy</h1>
            <p className="text-gray-600">
              {viewMode === "all" 
                ? "View which rooms are occupied at each time slot" 
                : "View individual room's weekly schedule"}
            </p>
          </div>
          
          {/* View Switcher and Export Button */}
          {!loading && rooms.length > 0 && (
            <div className="flex items-center gap-3">
              {/* View Mode Switcher */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex gap-1">
                <button
                  onClick={() => {
                    setViewMode("all");
                    setSelectedRoom(null);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === "all"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <LayoutGrid size={16} />
                  All Rooms
                </button>
                <button
                  onClick={() => setViewMode("individual")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    viewMode === "individual"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Building size={16} />
                  By Room
                </button>
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 font-medium"
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
                        onClick={handleExportClick}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <Download size={16} />
                        Export All Rooms
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
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
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

                    {/* Capacity Filter */}
                    <div className="min-w-[200px]">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          value={selectedCapacity}
                          onChange={(e) => setSelectedCapacity(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                        >
                          <option value="">All Capacities</option>
                          {capacityRanges.map((range) => (
                            <option key={range.label} value={range.label}>
                              {range.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {(searchQuery || selectedFaculty || selectedCapacity) && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedFaculty("");
                          setSelectedCapacity("");
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Individual View Layout - Room List + Occupancy Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Room List - 1/3 width on large screens */}
                  <div className="lg:col-span-1">
                    {renderRoomList()}
                  </div>

                  {/* Room Occupancy Grid - 2/3 width on large screens */}
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
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>

            {/* Occupancy Table */}
            {rooms.length === 0 || timeSlots.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                <p className="text-gray-600">
                  {rooms.length === 0 ? "No rooms found. " : ""}
                  {timeSlots.length === 0 ? "No schedules found." : ""}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 min-w-[120px]">
                          Room
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
                      {rooms.map((room) => (
                        <tr
                          key={room.unid}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                            <div>{room.name || room.ID}</div>
                            {room.floor && (
                              <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                Floor: {room.floor}
                              </div>
                            )}
                            {room.capacity && (
                              <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                                Cap: {room.capacity}
                              </div>
                            )}
                          </td>
                          {timeSlots.map((timeSlot, rowIndex) => (
                            <td
                              key={rowIndex}
                              className="px-4 py-2 border-r border-gray-200 align-top"
                            >
                              {renderCell(getRoomDocumentId(room), rowIndex)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!loading && rooms.length > 0 && timeSlots.length > 0 && (
              <div className="mt-4 text-sm text-gray-600 text-center">
                Showing {rooms.length} room{rooms.length !== 1 ? "s" : ""} across{" "}
                {timeSlots.length} time slot{timeSlots.length !== 1 ? "s" : ""}
              </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      {/* Preview Modals */}
      {showPreviewModal && selectedRoom && (
        <RoomOccupancyPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          roomData={selectedRoom}
          schedules={schedules}
          timeSlots={timeSlots}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onExportPdfMobile={handleExportPdfMobile}
          onExportExcelMobile={handleExportExcelMobile}
        />
      )}

      {showPreviewAllModal && (
        <RoomOccupancyPreviewModal
          isOpen={showPreviewAllModal}
          onClose={() => setShowPreviewAllModal(false)}
          allRooms={rooms}
          schedules={schedules}
          timeSlots={timeSlots}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onExportPdfMobile={handleExportPdfMobile}
          onExportExcelMobile={handleExportExcelMobile}
        />
      )}

      {showPreviewIndividualModal && selectedRoom && (
        <RoomOccupancyPreviewModal
          isOpen={showPreviewIndividualModal}
          onClose={() => setShowPreviewIndividualModal(false)}
          roomData={selectedRoom}
          schedules={schedules}
          timeSlots={timeSlots}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onExportPdfMobile={handleExportPdfMobile}
          onExportExcelMobile={handleExportExcelMobile}
        />
      )}
      <Footer />
    </div>
  );
};

export default RoomOccupancy;
