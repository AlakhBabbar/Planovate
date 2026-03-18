import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Save,
  Wand2,
  X,
  Users,
  Building2,
} from "lucide-react";
import { roomService, scheduleService, timetableService } from "../firebase/services";
import { DEFAULT_TIME_SLOTS } from "../utils/timetableUIHelpers";
import RoomAvailabilityExportModal from "../components/RoomAvailabilityExportModal";

// ─── constants ────────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat"];
const TIMESLOTS = DEFAULT_TIME_SLOTS;

// ─── helpers ──────────────────────────────────────────────────────────────────
const isSlotAvailable = (room, dayKey, time) =>
  room?.availability?.day?.[dayKey]?.time?.some((s) => s.time === time) ?? false;

const setSlotAvailability = (room, dayKey, time, available) => {
  const updated = JSON.parse(JSON.stringify(room)); // deep clone
  if (!updated.availability?.day) updated.availability = { day: {} };
  if (!updated.availability.day[dayKey]) updated.availability.day[dayKey] = { time: [] };

  const slots = updated.availability.day[dayKey].time;
  const idx = slots.findIndex((s) => s.time === time);

  if (available && idx === -1) {
    slots.push({ time, available: true });
  } else if (!available && idx !== -1) {
    slots.splice(idx, 1);
  }
  return updated;
};

// ─── component ────────────────────────────────────────────────────────────────
const RoomAvailability = ({ faculty, rooms: initialRooms, onRoomsUpdate }) => {
  // sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);

  // room data (local copy so we can mutate without immediately saving)
  const [rooms, setRooms] = useState(initialRooms ?? []);

  // editing
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [occupiedLabels, setOccupiedLabels] = useState({}); // key -> label string
  const [successMsg, setSuccessMsg] = useState("");

  // drag state
  const isDragging = useRef(false);
  const dragSetValue = useRef(null); // true = make available, false = make unavailable

  // keep local rooms in sync when parent updates the list
  useEffect(() => {
    setRooms(initialRooms ?? []);
    if (selectedRoomIndex >= (initialRooms ?? []).length) {
      setSelectedRoomIndex(0);
    }
  }, [initialRooms]);

  // stop drag on mouse-up anywhere in the document
  useEffect(() => {
    const stop = () => { isDragging.current = false; };
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const selectedRoom = rooms[selectedRoomIndex] ?? null;

  // ── cell mutation ──────────────────────────────────────────────────────────
  const applyToggle = useCallback(
    (roomIdx, dayKey, time, forceValue = null) => {
      setRooms((prev) => {
        const room = prev[roomIdx];
        const current = isSlotAvailable(room, dayKey, time);
        const next = forceValue !== null ? forceValue : !current;
        if (current === next) return prev; // no change
        const updated = [...prev];
        updated[roomIdx] = { ...setSlotAvailability(room, dayKey, time, next), isModified: true };
        return updated;
      });
    },
    []
  );

  const handleCellMouseDown = (dayKey, time) => {
    if (!isEditing) return;
    const currentVal = isSlotAvailable(selectedRoom, dayKey, time);
    dragSetValue.current = !currentVal; // we will paint the opposite of whatever we started on
    isDragging.current = true;
    applyToggle(selectedRoomIndex, dayKey, time, dragSetValue.current);
  };

  const handleCellMouseEnter = (dayKey, time) => {
    if (!isEditing || !isDragging.current) return;
    applyToggle(selectedRoomIndex, dayKey, time, dragSetValue.current);
  };

  // ── select all helpers ─────────────────────────────────────────────────────
  const setAllCells = (value) => {
    setRooms((prev) => {
      let room = prev[selectedRoomIndex];
      for (const dayKey of DAY_KEYS) {
        for (const time of TIMESLOTS) {
          room = setSlotAvailability(room, dayKey, time, value);
        }
      }
      const updated = [...prev];
      updated[selectedRoomIndex] = { ...room, isModified: true };
      return updated;
    });
  };

  const setColumnCells = (dayKey, value) => {
    setRooms((prev) => {
      let room = prev[selectedRoomIndex];
      for (const time of TIMESLOTS) room = setSlotAvailability(room, dayKey, time, value);
      const updated = [...prev];
      updated[selectedRoomIndex] = { ...room, isModified: true };
      return updated;
    });
  };

  const setRowCells = (time, value) => {
    setRooms((prev) => {
      let room = prev[selectedRoomIndex];
      for (const dayKey of DAY_KEYS) room = setSlotAvailability(room, dayKey, time, value);
      const updated = [...prev];
      updated[selectedRoomIndex] = { ...room, isModified: true };
      return updated;
    });
  };

  // check if all are a given value (for toggle logic)
  const isAllSet = (val) =>
    selectedRoom
      ? DAY_KEYS.every((d) => TIMESLOTS.every((t) => isSlotAvailable(selectedRoom, d, t) === val))
      : false;

  const isColumnAllSet = (dayKey, val) =>
    selectedRoom ? TIMESLOTS.every((t) => isSlotAvailable(selectedRoom, dayKey, t) === val) : false;

  const isRowAllSet = (time, val) =>
    selectedRoom ? DAY_KEYS.every((d) => isSlotAvailable(selectedRoom, d, time) === val) : false;

  // ── auto detect ─────────────────────────────────────────────────────────────
  const handleAutoDetect = useCallback(async () => {
    if (rooms.length === 0) return;
    try {
      setAutoDetecting(true);

      // ── Step 1: fetch all schedules (same as RoomOccupancy) ──────────────
      const allSchedules = await scheduleService.getAllSchedules();

      // ── Step 2: fetch timetable metadata for labels ───────────────────────
      const uniqueTimetableIds = [
        ...new Set(allSchedules.map((s) => s.timetableId).filter(Boolean)),
      ];
      const timetablesMap = new Map();
      await Promise.all(
        uniqueTimetableIds.map(async (tid) => {
          try {
            const data = await timetableService.loadTimetable(tid);
            if (data?.meta) timetablesMap.set(tid, data.meta);
          } catch (_) {}
        })
      );

      // ── Step 3: build occupied map: "roomId__colIndex__rowIndex" → label ──
      // colIndex: Mon=0 Tue=1 Wed=2 Thu=3 Fri=4 Sat=5  (same as RoomOccupancy)
      const occupied = new Map();
      for (const s of allSchedules) {
        if (!s.roomId) continue;
        const key = `${s.roomId}__${s.colIndex}__${s.rowIndex}`;
        if (!occupied.has(key)) {
          const meta = timetablesMap.get(s.timetableId);
          const label = meta
            ? [meta.class, meta.branch].filter(Boolean).join(" · ")
            : "";
          occupied.set(key, label);
        }
      }

      // ── Step 4: rebuild availability for every room ───────────────────────
      const COL = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5 };

      setRooms((prev) =>
        prev.map((room) => {
          if (!room.unid) return room;
          let updated = JSON.parse(JSON.stringify(room));
          if (!updated.availability?.day) updated.availability = { day: {} };

          for (const dayKey of DAY_KEYS) {
            if (!updated.availability.day[dayKey])
              updated.availability.day[dayKey] = { time: [] };

            TIMESLOTS.forEach((time, rowIndex) => {
              const key = `${String(room.unid)}__${COL[dayKey]}__${rowIndex}`;
              const isOccupied = occupied.has(key);
              updated = setSlotAvailability(updated, dayKey, time, isOccupied);
            });
          }

          return { ...updated, isModified: true };
        })
      );

      // ── Step 5: build labels map for grid display ─────────────────────────
      const labelsMap = {};
      for (const room of rooms) {
        if (!room.unid) continue;
        TIMESLOTS.forEach((time, rowIndex) => {
          for (const dayKey of DAY_KEYS) {
            const key = `${String(room.unid)}__${COL[dayKey]}__${rowIndex}`;
            if (occupied.has(key))
              labelsMap[`${String(room.unid)}__${dayKey}__${time}`] = occupied.get(key);
          }
        });
      }
      setOccupiedLabels(labelsMap);

      setSuccessMsg("Auto-detect complete. Review and save.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("Auto-detect failed:", err);
      alert("Failed to auto-detect availability.");
    } finally {
      setAutoDetecting(false);
    }
  }, [rooms]);

  // ── save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const modified = rooms.filter((r) => r.isModified);
    if (modified.length === 0) {
      setIsEditing(false);
      return;
    }
    try {
      setSaving(true);
      for (const room of modified) {
        await roomService.upsertRoom({
          unid: room.unid,
          ID: room.ID,
          name: room.name,
          capacity: room.capacity,
          floor: room.floor,
          faculty: faculty,
          availability: room.availability,
        });
      }
      setRooms((prev) => prev.map((r) => ({ ...r, isModified: false })));
      onRoomsUpdate?.();
      setSuccessMsg("Availability saved!");
      setTimeout(() => setSuccessMsg(""), 3000);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    // revert to initialRooms
    setRooms(initialRooms ?? []);
    setIsEditing(false);
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-4" style={{ userSelect: "none" }}>
      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────── */}
      <div
        className={`shrink-0 transition-all duration-200 ${
          sidebarOpen ? "w-56" : "w-10"
        }`}
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-full">
          {/* sidebar header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50">
            {sidebarOpen && (
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Rooms
              </span>
            )}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-0.5 rounded hover:bg-gray-200 transition-colors ml-auto"
              title={sidebarOpen ? "Collapse" : "Expand"}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* room list */}
          {sidebarOpen && (
            <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
              {rooms.length === 0 ? (
                <p className="text-xs text-gray-400 p-3 text-center">No rooms</p>
              ) : (
                rooms.map((room, idx) => (
                  <button
                    key={room.unid ?? idx}
                    onClick={() => setSelectedRoomIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 ${
                      selectedRoomIndex === idx
                        ? "bg-blue-50 text-gray-900 border-l-2 border-l-blue-400 hover:bg-blue-50"
                        : "text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Building2
                        className={`w-3 h-3 shrink-0 ${
                          selectedRoomIndex === idx ? "text-blue-400" : "text-gray-400"
                        }`}
                      />
                      <span className="text-xs font-semibold truncate">{room.ID}</span>
                      {room.isModified && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5 pl-[18px]">
                      <span className="truncate">{room.faculty || "—"}</span>
                      <span className="text-gray-300">·</span>
                      <Users className="w-2.5 h-2.5 shrink-0 text-gray-400" />
                      <span className="shrink-0">{room.capacity || "—"}</span>
                      {room.floor && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="shrink-0">Fl: {room.floor}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN GRID AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* toolbar */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {selectedRoom && (
              <span className="text-sm font-medium text-gray-800">
                {selectedRoom.ID}
                {selectedRoom.faculty && (
                  <span className="text-gray-400 font-normal ml-1">— {selectedRoom.faculty}</span>
                )}
              </span>
            )}
            {successMsg && (
              <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                {successMsg}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              disabled={rooms.length === 0}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export room availability chart"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={handleAutoDetect}
              disabled={autoDetecting || rooms.length === 0}
              className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Detect availability from existing timetables (occupied slots = not available)"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {autoDetecting ? "Detecting…" : "Auto Detect"}
            </button>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                disabled={!selectedRoom}
                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-1.5 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Availability
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-1.5 disabled:bg-gray-400"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* grid */}
        {selectedRoom ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {/* top-left corner: select-all */}
                  <th className="border border-gray-200 bg-gray-50 p-2 text-gray-500 font-medium whitespace-nowrap w-28 min-w-28">
                    {isEditing && (
                      <button
                        onClick={() => setAllCells(!isAllSet(true))}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors font-medium text-gray-700"
                        title="Toggle all cells"
                      >
                        {isAllSet(true) ? "Clear All" : "Select All"}
                      </button>
                    )}
                    {!isEditing && <span className="text-gray-400 text-[10px]">Time / Day</span>}
                  </th>

                  {DAY_KEYS.map((dayKey, di) => (
                    <th
                      key={dayKey}
                      className="border border-gray-200 bg-gray-50 p-2 text-center text-gray-700 font-semibold uppercase tracking-wide min-w-20"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{DAYS[di]}</span>
                        {isEditing && (
                          <button
                            onClick={() => setColumnCells(dayKey, !isColumnAllSet(dayKey, true))}
                            className="text-[9px] px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600 font-medium leading-none"
                            title={`Toggle all ${DAYS[di]} slots`}
                          >
                            {isColumnAllSet(dayKey, true) ? "Clear" : "All"}
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {TIMESLOTS.map((time) => (
                  <tr key={time} className="group">
                    {/* row label + row select-all */}
                    <td className="border border-gray-200 bg-gray-50 px-2 py-1.5 whitespace-nowrap text-gray-600 font-medium">
                      <div className="flex items-center justify-between gap-1">
                        <span>{time}</span>
                        {isEditing && (
                          <button
                            onClick={() => setRowCells(time, !isRowAllSet(time, true))}
                            className="text-[9px] px-1 py-0.5 rounded bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600 font-medium leading-none shrink-0"
                            title={`Toggle all ${time} slots`}
                          >
                            {isRowAllSet(time, true) ? "✕" : "✓"}
                          </button>
                        )}
                      </div>
                    </td>

                    {DAY_KEYS.map((dayKey) => {
                      const available = isSlotAvailable(selectedRoom, dayKey, time);
                      return (
                        <td
                          key={dayKey}
                          onMouseDown={() => handleCellMouseDown(dayKey, time)}
                          onMouseEnter={() => handleCellMouseEnter(dayKey, time)}
                          className={`border border-gray-200 text-center transition-colors
                            ${available ? "bg-green-100" : "bg-white"}
                            ${isEditing ? "cursor-pointer hover:opacity-80" : ""}
                          `}
                          style={{ height: "40px", minWidth: "80px" }}
                        >
                          {available && (
                            <div className="flex items-center justify-center h-full">
                              <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center h-64">
            <p className="text-sm text-gray-400">Select a room from the list to view its availability.</p>
          </div>
        )}

        {/* legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-100 border border-green-200 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={2.5} />
            </div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-white border border-gray-200" />
            <span>Not available</span>
          </div>
          {isEditing && (
            <span className="text-gray-400 italic">
              Click or drag across cells to toggle availability.
            </span>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <RoomAvailabilityExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        rooms={rooms}
        timeSlots={TIMESLOTS}
        faculty={faculty}
      />
    </div>
  );
};

export default RoomAvailability;
