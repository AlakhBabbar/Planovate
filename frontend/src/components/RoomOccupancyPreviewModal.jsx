import React, { useState, useEffect, useMemo } from "react";
import { X, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const RoomOccupancyPreviewModal = ({ 
  isOpen, 
  onClose, 
  roomData, 
  allRooms = null,
  schedules, 
  timeSlots,
  onExportPdf,
  onExportExcel,
  onExportPdfMobile,
  onExportExcelMobile
}) => {
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportSize, setExportSize] = useState("actual"); // "actual" or "mobile"
  const [loading, setLoading] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const isMultiRoom = allRooms && allRooms.length > 0;
  const roomsToShow = isMultiRoom ? allRooms : (roomData ? [roomData] : []);

  // Limit preview data for performance
  const PREVIEW_LIMIT_DAYS = 3;
  const PREVIEW_LIMIT_ROOMS = 20;

  const days = [
    { key: "Mon", label: "MON", fullLabel: "MONDAY" },
    { key: "Tue", label: "TUE", fullLabel: "TUESDAY" },
    { key: "Wed", label: "WED", fullLabel: "WEDNESDAY" },
    { key: "Thu", label: "THU", fullLabel: "THURSDAY" },
    { key: "Fri", label: "FRI", fullLabel: "FRIDAY" },
    { key: "Sat", label: "SAT", fullLabel: "SATURDAY" },
  ];

  const currentDay = days[currentDayIndex];

  const dayToColIndex = {
    "Mon": 0,
    "Tue": 1,
    "Wed": 2,
    "Thu": 3,
    "Fri": 4,
    "Sat": 5
  };

  // Build data for preview (limited for performance)
  const allDaysData = React.useMemo(() => {
    if (!roomsToShow || roomsToShow.length === 0 || !schedules) return [];

    const allRows = [];

    // For preview, limit data based on export size
    const previewDays = exportSize === "mobile" ? days.slice(0, PREVIEW_LIMIT_DAYS) : days;
    const previewRooms = roomsToShow.slice(0, PREVIEW_LIMIT_ROOMS);

    previewDays.forEach((day) => {
      const colIndex = dayToColIndex[day.key];
      
      previewRooms.forEach((room) => {
        const roomId = String(room.unid || '');
        const roomSchedules = schedules.filter(s => 
          s.roomId && String(s.roomId) === roomId
        );

        const row = {
          day: day.key,
          dayLabel: day.fullLabel,
          colIndex: colIndex,
          faculty: room.faculty || "N/A",
          roomName: room.name || room.ID || "N/A",
          capacity: room.capacity || "N/A",
          schedules: roomSchedules
        };

        allRows.push(row);
      });
    });

    return allRows;
  }, [roomsToShow, schedules, timeSlots, exportSize]);

  // For "actual" size mode, filter by current day
  const currentDayData = React.useMemo(() => {
    if (exportSize === "mobile") return allDaysData;
    return allDaysData.filter(row => row.day === currentDay.key);
  }, [allDaysData, currentDay, exportSize]);

  const handleExport = async () => {
    setLoading(true);
    try {
      if (exportSize === "actual") {
        if (exportFormat === "pdf") {
          await onExportPdf(roomsToShow, schedules, timeSlots);
        } else {
          await onExportExcel(roomsToShow, schedules, timeSlots);
        }
      } else {
        // Mobile format
        if (exportFormat === "pdf") {
          await onExportPdfMobile(roomsToShow, schedules, timeSlots);
        } else {
          await onExportExcelMobile(roomsToShow, schedules, timeSlots);
        }
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Export Preview - {isMultiRoom 
                ? (exportSize === "mobile" ? "All Days (Mobile)" : "All Rooms by Day")
                : `${roomData?.name || roomData?.ID || "Room"} (${exportSize === "mobile" ? "Mobile" : "Actual"})`
              }
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isMultiRoom ? (
                exportSize === "mobile" 
                  ? `Preview: First ${PREVIEW_LIMIT_DAYS} days, ${Math.min(PREVIEW_LIMIT_ROOMS, roomsToShow.length)} room${Math.min(PREVIEW_LIMIT_ROOMS, roomsToShow.length) !== 1 ? 's' : ''} (Full data in export)` 
                  : `Previewing ${currentDay.fullLabel} - First ${Math.min(PREVIEW_LIMIT_ROOMS, roomsToShow.length)} room${Math.min(PREVIEW_LIMIT_ROOMS, roomsToShow.length) !== 1 ? 's' : ''} (Full data in export)`
              ) : (
                exportSize === "mobile"
                  ? `Preview: All days for selected room (Mobile format)`
                  : `Previewing ${currentDay.fullLabel} for selected room`
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-x-auto">
            {exportSize === "mobile" ? (
              // Mobile format: Days as rows with merged cells
              <table className="w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      DAY
                    </th>
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      FCT
                    </th>
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      ROOM
                    </th>
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      CAP
                    </th>
                    {timeSlots.map((slot, idx) => (
                      <th 
                        key={idx} 
                        className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center bg-blue-100"
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allDaysData.length === 0 ? (
                    <tr>
                      <td className="border border-gray-400 px-1 py-1 text-[8px] text-center" colSpan={4 + timeSlots.length}>
                        No data
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      return allDaysData.map((row, rowIdx) => {
                        // Check if this is the first row for this day
                        const isFirstOfDay = rowIdx === 0 || allDaysData[rowIdx - 1].day !== row.day;
                        // Count how many rows belong to this day
                        const dayRowCount = allDaysData.filter(r => r.day === row.day).length;
                        
                        return (
                          <tr key={rowIdx}>
                            {isFirstOfDay && (
                              <td 
                                rowSpan={dayRowCount}
                                className="border border-gray-400 px-1 py-1 text-[8px] text-center font-bold bg-blue-50"
                              >
                                {row.dayLabel.split('').join('\n')}
                              </td>
                            )}
                            <td className="border border-gray-400 px-1 py-1 text-[8px] text-center">
                              {row.faculty}
                            </td>
                            <td className="border border-gray-400 px-1 py-1 text-[8px] text-center font-medium">
                              {row.roomName}
                            </td>
                            <td className="border border-gray-400 px-1 py-1 text-[8px] text-center">
                              {row.capacity}
                            </td>
                            {timeSlots.map((slot, slotIdx) => {
                              const matches = row.schedules.filter(s => 
                                s.rowIndex === slotIdx && s.colIndex === row.colIndex
                              );
                              
                              if (matches.length === 0) {
                                return (
                                  <td key={slotIdx} className="border border-gray-400 px-1 py-1 text-[8px] text-center">
                                    —
                                  </td>
                                );
                              }
                              
                              const cellContent = matches.map(occ => {
                                const parts = [];
                                const classNameParts = [];
                                if (occ.class) classNameParts.push(occ.class);
                                if (occ.branch) classNameParts.push(occ.branch);
                                if (occ.semester) classNameParts.push(occ.semester);
                                
                                if (classNameParts.length > 0) {
                                  let classInfo = classNameParts.join(" ");
                                  if (occ.batch) classInfo += ` (${occ.batch})`;
                                  parts.push(classInfo);
                                }
                                
                                if (occ.course) parts.push(`C: ${occ.course}`);
                                if (occ.teacher) parts.push(`T: ${occ.teacher}`);
                                
                                return parts.join(" ");
                              }).join(", ");
                              
                              return (
                                <td 
                                  key={slotIdx} 
                                  className="border border-gray-400 px-1 py-1 text-[8px] text-center bg-blue-50"
                                >
                                  {cellContent}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            ) : (
              // Desktop/Actual format: Standard table
              <table className="w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="border border-gray-400 px-2 py-2 text-xs font-bold text-center">
                      Faculty
                    </th>
                    <th className="border border-gray-400 px-2 py-2 text-xs font-bold text-center">
                      Room
                    </th>
                    <th className="border border-gray-400 px-2 py-2 text-xs font-bold text-center">
                      Capacity
                    </th>
                    {timeSlots.map((slot, idx) => (
                      <th 
                        key={idx} 
                        className="border border-gray-400 px-2 py-2 text-xs font-bold text-center"
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentDayData.length === 0 ? (
                    <tr>
                      <td className="border border-gray-400 px-2 py-2 text-xs text-center" colSpan={3 + timeSlots.length}>
                        No data for this day
                      </td>
                    </tr>
                  ) : (
                    currentDayData.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        <td className="border border-gray-400 px-2 py-2 text-xs text-center">
                          {row.faculty}
                        </td>
                        <td className="border border-gray-400 px-2 py-2 text-xs text-center font-medium">
                          {row.roomName}
                        </td>
                        <td className="border border-gray-400 px-2 py-2 text-xs text-center">
                          {row.capacity}
                        </td>
                        {timeSlots.map((slot, slotIdx) => {
                          const matches = row.schedules.filter(s => 
                            s.rowIndex === slotIdx && s.colIndex === row.colIndex
                          );
                          
                          if (matches.length === 0) {
                            return (
                              <td key={slotIdx} className="border border-gray-400 px-2 py-2 text-xs text-center">
                                —
                              </td>
                            );
                          }
                          
                          const cellContent = matches.map(occ => {
                            const parts = [];
                            const classNameParts = [];
                            if (occ.class) classNameParts.push(occ.class);
                            if (occ.branch) classNameParts.push(occ.branch);
                            if (occ.semester) classNameParts.push(occ.semester);
                            if (occ.type) classNameParts.push(occ.type);
                            
                            if (classNameParts.length > 0) {
                              let classInfo = classNameParts.join(" ");
                              if (occ.batch) classInfo += ` (${occ.batch})`;
                              parts.push(classInfo);
                            }
                            
                            if (occ.course) parts.push(occ.course);
                            if (occ.teacher) parts.push(`(${occ.teacher})`);
                            
                            return parts.join(" ");
                          }).join(", ");
                          
                          return (
                            <td 
                              key={slotIdx} 
                              className="border border-gray-400 px-2 py-2 text-xs text-center bg-blue-50"
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            {exportSize === "actual" && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
                    disabled={currentDayIndex === 0}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous day"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-600 min-w-[120px] text-center font-medium">
                    {currentDay.fullLabel}
                  </span>
                  <button
                    onClick={() => setCurrentDayIndex(Math.min(days.length - 1, currentDayIndex + 1))}
                    disabled={currentDayIndex === days.length - 1}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next day"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="border-l border-gray-300 h-8 mx-2"></div>
              </>
            )}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Size:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="actual"
                    checked={exportSize === "actual"}
                    onChange={(e) => setExportSize(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Actual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="mobile"
                    checked={exportSize === "mobile"}
                    onChange={(e) => setExportSize(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Mobile</span>
                </label>
              </div>
            </div>
            <div className="border-l border-gray-300 h-8 mx-2"></div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Format:</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="excel"
                    checked={exportFormat === "excel"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Excel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="pdf"
                    checked={exportFormat === "pdf"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">PDF</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Export {isMultiRoom ? "All Rooms" : "Room"} - {exportSize === "mobile" ? "Mobile" : "Actual"} ({exportFormat.toUpperCase()})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomOccupancyPreviewModal;
