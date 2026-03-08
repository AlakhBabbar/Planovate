import React, { useState, useMemo, useEffect } from "react";
import { X, Download, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  exportRoomAvailabilityToPdf,
  exportRoomAvailabilityToPdfMobile,
  exportRoomAvailabilityToExcel,
  exportRoomAvailabilityToExcelMobile,
  DAYS,
  isAvailable,
} from "../utils/roomAvailabilityExport";
import { roomService } from "../firebase/services";

const sortByFaculty = (rooms) =>
  [...rooms].sort((a, b) => {
    const fa = (a.faculty || "").toLowerCase();
    const fb = (b.faculty || "").toLowerCase();
    if (fa !== fb) return fa.localeCompare(fb);
    return (a.ID || "").localeCompare(b.ID || "");
  });

const RoomAvailabilityExportModal = ({ isOpen, onClose, rooms = [], timeSlots = [], faculty = "" }) => {
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportScope, setExportScope] = useState("current"); // "current" | "all"
  const [exportSize, setExportSize] = useState("actual");    // "actual" | "mobile"
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const currentDay = DAYS[currentDayIndex];

  // Fetch all rooms when scope switches to "all"
  useEffect(() => {
    if (exportScope === "all" && allRooms.length === 0 && !loadingAll) {
      setLoadingAll(true);
      roomService.listRooms({})
        .then((data) => setAllRooms(data || []))
        .catch(console.error)
        .finally(() => setLoadingAll(false));
    }
  }, [exportScope]);

  // Which rooms to export/preview
  const activeRooms = useMemo(
    () => sortByFaculty(exportScope === "all" ? allRooms : rooms),
    [exportScope, allRooms, rooms]
  );

  // ── ACTUAL PREVIEW (one day at a time, faculty merges) ───────────────────
  const actualPreviewRows = useMemo(() => {
    const sorted = activeRooms;
    const result = [];
    let i = 0;
    while (i < sorted.length) {
      const fac = sorted[i].faculty || "N/A";
      const group = [];
      while (i < sorted.length && (sorted[i].faculty || "N/A") === fac) {
        group.push(sorted[i]);
        i++;
      }
      group.forEach((room, gi) => {
        result.push({
          isFirstInFaculty: gi === 0,
          facultyRowSpan: group.length,
          faculty: fac,
          roomId: room.ID || room.name || "N/A",
          capacity: room.capacity ?? "N/A",
          slots: timeSlots.map((time) => isAvailable(room, currentDay.key, time)),
        });
      });
    }
    return result;
  }, [activeRooms, timeSlots, currentDay]);

  // ── MOBILE PREVIEW (all days, DAY + FACULTY merged) ─────────────────────
  const mobilePreviewRows = useMemo(() => {
    const sorted = activeRooms;
    const rows = [];
    DAYS.forEach((day) => {
      let i = 0;
      let dayStart = rows.length;
      let dayCount = 0;
      while (i < sorted.length) {
        const fac = sorted[i].faculty || "N/A";
        const group = [];
        while (i < sorted.length && (sorted[i].faculty || "N/A") === fac) {
          group.push(sorted[i]);
          i++;
        }
        const facStart = rows.length;
        group.forEach((room) => {
          rows.push({
            day: day.fullLabel,
            faculty: fac,
            roomId: room.ID || room.name || "N/A",
            capacity: room.capacity ?? "N/A",
            slots: timeSlots.map((time) => isAvailable(room, day.key, time)),
          });
          dayCount++;
        });
        rows[facStart]._facultyFirst = true;
        rows[facStart]._facultyRowSpan = group.length;
      }
      if (dayCount > 0) {
        rows[dayStart]._dayFirst = true;
        rows[dayStart]._dayRowSpan = dayCount;
        rows[dayStart]._dayLabel = day.fullLabel;
      }
    });
    return rows;
  }, [activeRooms, timeSlots]);

  const totalAvailable = useMemo(
    () => actualPreviewRows.reduce((acc, r) => acc + r.slots.filter(Boolean).length, 0),
    [actualPreviewRows]
  );

  const handleExport = async () => {
    setLoading(true);
    try {
      const scopeLabel = exportScope === "all" ? "All Faculties" : faculty;
      const safe = scopeLabel ? scopeLabel.toLowerCase().replace(/\s+/g, "-") : "rooms";
      const name = `room-availability-${safe}${exportSize === "mobile" ? "-mobile" : ""}`;

      if (exportSize === "mobile") {
        exportFormat === "pdf"
          ? exportRoomAvailabilityToPdfMobile(activeRooms, timeSlots, scopeLabel, name)
          : exportRoomAvailabilityToExcelMobile(activeRooms, timeSlots, scopeLabel, name);
      } else {
        exportFormat === "pdf"
          ? exportRoomAvailabilityToPdf(activeRooms, timeSlots, scopeLabel, name)
          : exportRoomAvailabilityToExcel(activeRooms, timeSlots, scopeLabel, name);
      }
      onClose();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Export Room Availability
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {loadingAll
                ? "Loading all rooms…"
                : `${activeRooms.length} room${activeRooms.length !== 1 ? "s" : ""}`
              }
              &nbsp;·&nbsp;{timeSlots.length} time slots
              {exportSize === "actual" && (
                <>&nbsp;·&nbsp;Previewing <span className="font-medium text-gray-700">{currentDay.fullLabel}</span></>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* ── Preview ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-x-auto">
            {loadingAll ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading all rooms…</span>
              </div>
            ) : activeRooms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No rooms to preview.</p>
            ) : exportSize === "actual" ? (
              /* ACTUAL PREVIEW */
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr>
                    <th colSpan={3 + timeSlots.length}
                      className="border border-gray-300 py-1.5 text-center text-xs font-bold text-white bg-green-500 tracking-wide">
                      {currentDay.fullLabel}
                    </th>
                  </tr>
                  <tr className="bg-green-50">
                    <th className="border border-gray-300 px-3 py-2 font-semibold text-gray-700 text-center">FACULTY</th>
                    <th className="border border-gray-300 px-3 py-2 font-semibold text-gray-700 text-center">ROOM</th>
                    <th className="border border-gray-300 px-3 py-2 font-semibold text-gray-700 text-center">CAP</th>
                    {timeSlots.map((slot, i) => (
                      <th key={i} className="border border-gray-300 px-2 py-2 font-semibold text-gray-700 text-center whitespace-nowrap min-w-[90px]">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actualPreviewRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {row.isFirstInFaculty && (
                        <td
                          rowSpan={row.facultyRowSpan}
                          className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700 bg-green-50 align-middle"
                        >
                          {row.faculty}
                        </td>
                      )}
                      <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-800">{row.roomId}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-gray-600">{row.capacity}</td>
                      {row.slots.map((avail, si) => (
                        <td key={si} className={`border border-gray-300 px-2 py-2 text-center ${avail ? "bg-green-100" : "bg-white"}`}>
                          {avail
                            ? <Check className="w-3.5 h-3.5 text-green-600 mx-auto" strokeWidth={2.5} />
                            : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* MOBILE PREVIEW — all days, DAY + FACULTY merged */
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-green-500">
                    <th className="border border-gray-300 px-2 py-2 font-semibold text-white text-center">DAY</th>
                    <th className="border border-gray-300 px-2 py-2 font-semibold text-white text-center">FACULTY</th>
                    <th className="border border-gray-300 px-2 py-2 font-semibold text-white text-center">ROOM</th>
                    <th className="border border-gray-300 px-2 py-2 font-semibold text-white text-center">CAP</th>
                    {timeSlots.map((slot, i) => (
                      <th key={i} className="border border-gray-300 px-2 py-2 font-semibold text-white text-center whitespace-nowrap min-w-20">
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mobilePreviewRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {row._dayFirst && (
                        <td
                          rowSpan={row._dayRowSpan}
                          className="border border-gray-300 px-2 py-2 text-center font-bold text-white bg-green-500 align-middle"
                        >
                          {row._dayLabel}
                        </td>
                      )}
                      {row._facultyFirst && (
                        <td
                          rowSpan={row._facultyRowSpan}
                          className="border border-gray-300 px-2 py-2 text-center font-semibold text-gray-700 bg-green-50 align-middle"
                        >
                          {row.faculty}
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-2 text-center font-medium text-gray-800">{row.roomId}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center text-gray-600">{row.capacity}</td>
                      {row.slots.map((avail, si) => (
                        <td key={si} className={`border border-gray-300 px-2 py-1.5 text-center ${avail ? "bg-green-100" : "bg-white"}`}>
                          {avail
                            ? <Check className="w-3 h-3 text-green-600 mx-auto" strokeWidth={2.5} />
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          {activeRooms.length > 0 && exportSize === "actual" && (
            <p className="mt-3 text-xs text-gray-400 text-right">
              {totalAvailable} / {activeRooms.length * timeSlots.length} slots available on {currentDay.fullLabel}
            </p>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {/* Day nav — actual only */}
            {exportSize === "actual" && (
              <>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentDayIndex((i) => Math.max(0, i - 1))} disabled={currentDayIndex === 0}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-medium text-gray-700 min-w-[100px] text-center">{currentDay.fullLabel}</span>
                  <button onClick={() => setCurrentDayIndex((i) => Math.min(DAYS.length - 1, i + 1))} disabled={currentDayIndex === DAYS.length - 1}
                    className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="border-l border-gray-300 h-6" />
              </>
            )}

            {/* Scope */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Scope:</span>
              {[
                { v: "current", label: faculty ? `Current (${faculty})` : "Current Faculty" },
                { v: "all", label: "All Faculties" },
              ].map(({ v, label }) => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value={v} checked={exportScope === v} onChange={() => setExportScope(v)} className="w-4 h-4 accent-green-600" />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="border-l border-gray-300 h-6" />

            {/* Size */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Size:</span>
              {[
                { v: "actual", label: "Actual" },
                { v: "mobile", label: "Mobile" },
              ].map(({ v, label }) => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value={v} checked={exportSize === v} onChange={() => setExportSize(v)} className="w-4 h-4 accent-green-600" />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="border-l border-gray-300 h-6" />

            {/* Format */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Format:</span>
              {["excel", "pdf"].map((fmt) => (
                <label key={fmt} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value={fmt} checked={exportFormat === fmt} onChange={() => setExportFormat(fmt)} className="w-4 h-4 accent-green-600" />
                  <span className="text-gray-700 uppercase">{fmt}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleExport} disabled={loading || activeRooms.length === 0 || loadingAll}
              className="px-5 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />Exporting…</>
              ) : (
                <><Download size={16} />Export {activeRooms.length} Room{activeRooms.length !== 1 ? "s" : ""} ({exportFormat.toUpperCase()})</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomAvailabilityExportModal;

