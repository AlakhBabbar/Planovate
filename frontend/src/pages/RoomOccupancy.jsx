import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Building2, Download, ChevronDown } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { roomService, timetableService } from "../firebase/services";
import { getAllSchedules } from "../firebase/services/schedules";
import { DEFAULT_TIME_SLOTS } from "../utils/timetableUIHelpers";
import { getCourseDisplayName, getTeacherDisplayName } from "../utils/idDisplayHelpers";
import { exportRoomOccupancyToPdf, exportRoomOccupancyToExcel } from "../utils/roomOccupancyExport";

const RoomOccupancy = () => {
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [showExportMenu, setShowExportMenu] = useState(false);

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
  
  // Export handlers
  const handleExportPdf = () => {
    exportRoomOccupancyToPdf(rooms, schedules, timeSlots, "room-occupancy");
    setShowExportMenu(false);
  };
  
  const handleExportExcel = () => {
    exportRoomOccupancyToExcel(rooms, schedules, timeSlots, "room-occupancy");
    setShowExportMenu(false);
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Room Occupancy</h1>
            <p className="text-gray-600">View which rooms are occupied at each time slot</p>
          </div>
          
          {/* Export Button */}
          {!loading && rooms.length > 0 && (
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
                            {room.capacity && (
                              <div className="text-[10px] text-gray-500 font-normal mt-1">
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
      </main>

      <Footer />
    </div>
  );
};

export default RoomOccupancy;
