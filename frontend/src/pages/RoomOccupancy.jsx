import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Building2 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { roomService } from "../firebase/services";
import { getAllSchedules } from "../firebase/services/schedules";

const RoomOccupancy = () => {
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState("Mon");

  const days = [
    { key: "Mon", label: "Monday" },
    { key: "Tue", label: "Tuesday" },
    { key: "Wed", label: "Wednesday" },
    { key: "Thu", label: "Thursday" },
    { key: "Fri", label: "Friday" },
    { key: "Sat", label: "Saturday" },
  ];

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

      setRooms(roomsData);
      setSchedules(schedulesData);

      // Extract unique time slots from schedules and sort them properly
      const uniqueTimeSlots = [...new Set(schedulesData.map(s => s.time).filter(Boolean))];
      
      // Sort time slots by start time
      const sortedTimeSlots = uniqueTimeSlots.sort((a, b) => {
        const getStartTime = (slot) => {
          const start = slot.split(' - ')[0];
          const [hours, minutes] = start.split(':').map(Number);
          return hours * 60 + minutes;
        };
        return getStartTime(a) - getStartTime(b);
      });

      console.log('📊 Time slots:', sortedTimeSlots);
      setTimeSlots(sortedTimeSlots);

    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load room occupancy data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyForCell = (roomFullName, timeSlot, day) => {
    const matches = schedules.filter((s) => {
      const roomMatch = s.room?.toLowerCase().trim() === roomFullName?.toLowerCase().trim();
      const timeMatch = s.time === timeSlot;
      const dayMatch = s.day === day;
      
      return roomMatch && timeMatch && dayMatch;
    });
    
    if (matches.length > 0) {
      console.log(`✅ Found ${matches.length} matches for [${roomFullName}, ${timeSlot}, ${day}]`);
    }
    return matches;
  };

  // Helper function to construct full room identifier as stored in schedules
  const getRoomFullName = (room) => {
    // Schedules store rooms as: "ID faculty" (e.g., "TC Technical")
    const id = room.ID || '';
    const faculty = room.faculty || '';
    return `${id} ${faculty}`.trim();
  };

  const renderCell = (roomFullName, timeSlot) => {
    const occupancies = getOccupancyForCell(roomFullName, timeSlot, selectedDay);

    if (occupancies.length === 0) {
      return (
        <div className="text-center text-gray-400 text-xs py-3">
          —
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {occupancies.map((occ, idx) => (
          <div
            key={idx}
            className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5 text-xs"
          >
            <div className="font-semibold text-blue-900">{occ.teacher || "No Teacher"}</div>
            <div className="text-blue-700 text-[10px] mt-0.5">
              {occ.class && <span>{occ.class}</span>}
              {occ.branch && <span> - {occ.branch}</span>}
              {occ.batch && <span> ({occ.batch})</span>}
            </div>
            {occ.course && (
              <div className="text-blue-600 text-[10px] mt-0.5">
                Course: {occ.course}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Room Occupancy</h1>
          <p className="text-gray-600">View which rooms are occupied at each time slot</p>
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
                          {timeSlots.map((timeSlot, idx) => (
                            <td
                              key={idx}
                              className="px-4 py-2 border-r border-gray-200 align-top"
                            >
                              {renderCell(getRoomFullName(room), timeSlot)}
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
