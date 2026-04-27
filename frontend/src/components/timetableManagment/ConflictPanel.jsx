/**
 * ConflictPanel — Interactive conflict detection & navigation sidebar.
 *
 * Props:
 *   wsConflicts      Map<"row-col-batchIndex", EnrichedConflict[]>
 *   focusedCell      { row, col } | null
 *   onNavigate       (conflict: EnrichedConflict) => void
 *   activeMetadata   { className, branch, semester, type }
 */

import React, { useMemo } from "react";
import {
  AlertCircle, CheckCircle, Users, Building2,
  ArrowRight, MapPin, BookOpen, Layers
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type) {
  return type === "teacher"
    ? <Users size={13} className="shrink-0" />
    : <Building2 size={13} className="shrink-0" />;
}

function typeBadge(type) {
  return type === "teacher"
    ? "bg-orange-100 text-orange-700"
    : "bg-blue-100 text-blue-700";
}

function dayLabel(d) {
  const map = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" };
  return map[String(d).toLowerCase()] || d;
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ wsConflicts }) {
  const all = useMemo(() => {
    const list = [];
    for (const arr of wsConflicts.values()) list.push(...arr);
    return list;
  }, [wsConflicts]);

  const teachers = all.filter(c => c.type === "teacher");
  const rooms    = all.filter(c => c.type === "room");
  const total    = wsConflicts.size; // cells with any conflict

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-5 text-center">
        <div className="p-2.5 rounded-full bg-green-50">
          <CheckCircle size={20} className="text-green-500" />
        </div>
        <p className="text-xs font-semibold text-green-700">No Conflicts Detected</p>
        <p className="text-[11px] text-gray-400">All teacher & room assignments are valid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Total pill */}
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">Total conflicting cells</span>
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-[11px]">
          {total}
        </span>
      </div>

      {/* Teacher conflicts */}
      <div className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs
        ${teachers.length > 0 ? "bg-orange-50 text-orange-800" : "bg-green-50 text-green-700"}`}>
        <Users size={13} className="shrink-0" />
        <span className="font-medium flex-1">Teachers</span>
        <span className="font-bold">{teachers.length > 0 ? `${teachers.length} conflict${teachers.length > 1 ? "s" : ""}` : "Clear"}</span>
      </div>

      {/* Room conflicts */}
      <div className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-xs
        ${rooms.length > 0 ? "bg-blue-50 text-blue-800" : "bg-green-50 text-green-700"}`}>
        <Building2 size={13} className="shrink-0" />
        <span className="font-medium flex-1">Rooms</span>
        <span className="font-bold">{rooms.length > 0 ? `${rooms.length} conflict${rooms.length > 1 ? "s" : ""}` : "Clear"}</span>
      </div>

      <p className="text-[10px] text-gray-400 pt-1">
        Hover a cell for 2.5s to see full suggestions, or click any cell to inspect conflicts below.
      </p>
    </div>
  );
}

// ── Conflict card (detailed) ──────────────────────────────────────────────────

function ConflictCard({ conflict, index, onNavigate }) {
  return (
    <div className="border border-red-100 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold ${
        conflict.type === "teacher" ? "bg-orange-50 text-orange-800" : "bg-blue-50 text-blue-800"
      }`}>
        {typeIcon(conflict.type)}
        <span className="uppercase tracking-wide">
          {conflict.type === "teacher" ? "Teacher Double-Booked" : "Room Double-Booked"}
        </span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${typeBadge(conflict.type)}`}>
          #{index + 1}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-2 text-[11px] text-gray-700">
        {/* Conflicting entity */}
        <div className="flex items-start gap-1.5">
          {conflict.type === "teacher"
            ? <Users size={11} className="mt-0.5 text-orange-500 shrink-0" />
            : <Building2 size={11} className="mt-0.5 text-blue-500 shrink-0" />}
          <div>
            <span className="text-gray-400 mr-1">
              {conflict.type === "teacher" ? "Teacher:" : "Room:"}
            </span>
            <span className="font-semibold text-gray-900">
              {conflict.teacherName || conflict.roomName || conflict.conflictingId}
            </span>
          </div>
        </div>

        {/* Conflict location */}
        <div className="flex items-start gap-1.5">
          <MapPin size={11} className="mt-0.5 text-gray-400 shrink-0" />
          <div>
            <span className="text-gray-400 mr-1">Conflicting slot:</span>
            <span className="font-medium text-gray-800">
              {dayLabel(conflict.day)} · {conflict.time}
            </span>
          </div>
        </div>

        {/* Conflicting timetable context */}
        {(conflict.displayClass || conflict.displayBranch) && (
          <div className="flex items-start gap-1.5">
            <BookOpen size={11} className="mt-0.5 text-gray-400 shrink-0" />
            <div className="space-y-0.5">
              <span className="text-gray-400">In timetable: </span>
              <span className="font-semibold text-gray-900">
                {[conflict.displayClass, conflict.displayBranch, conflict.displaySemester, conflict.displayType]
                  .filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
        )}

        {/* Source badge */}
        <div className="flex items-center gap-1.5">
          <Layers size={11} className="text-gray-300 shrink-0" />
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
            conflict.source === "temp"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-gray-100 text-gray-600"
          }`}>
            {conflict.source === "temp" ? "Unsaved (temp)" : "Saved schedule"}
          </span>
        </div>
      </div>

      {/* Navigate button */}
      {onNavigate && (
        <div className="px-3 pb-2.5">
          <button
            onClick={() => onNavigate(conflict)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5
              bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600
              text-white text-[11px] font-semibold rounded-md transition-all duration-150
              shadow-sm hover:shadow-md active:scale-[0.97]"
          >
            Go to Conflict
            <ArrowRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ConflictPanel({ wsConflicts, focusedCell, onNavigate, activeMetadata }) {

  // Collect conflicts for the focused cell (any batchIndex)
  const focusedConflicts = useMemo(() => {
    if (!focusedCell) return [];
    const { row, col } = focusedCell;
    const result = [];
    // Iterate all batch indices for this cell
    for (let b = 0; b < 10; b++) {
      const key = `${row}-${col}-${b}`;
      const list = wsConflicts.get(key);
      if (list?.length) result.push(...list);
      else if (b > 0) break; // stop at first empty batchIndex after 0
    }
    return result;
  }, [wsConflicts, focusedCell]);

  const hasFocusedConflicts = focusedConflicts.length > 0;
  const totalConflictCells  = wsConflicts.size;

  return (
    <div className="space-y-4">
      {/* ── Conflict Overview ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={15} className={totalConflictCells > 0 ? "text-red-500" : "text-green-500"} />
          <h3 className="text-sm font-bold text-gray-900">Conflict Detection</h3>
        </div>
        <SummaryCard wsConflicts={wsConflicts} />
      </div>

      {/* ── Focused Cell Detail ── */}
      {focusedCell && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Selected Cell</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
              [{focusedCell.row}, {focusedCell.col}]
            </span>
          </div>

          {/* Current timetable context */}
          {activeMetadata && (activeMetadata.className || activeMetadata.branch) && (
            <div className="mb-3 px-2.5 py-2 bg-indigo-50 rounded-lg text-[11px] text-indigo-700 space-y-0.5">
              <p className="font-semibold text-indigo-900">
                {activeMetadata.className} · {activeMetadata.branch}
              </p>
              <p className="text-indigo-600">
                Sem {activeMetadata.semester} — {activeMetadata.type}
              </p>
            </div>
          )}

          {hasFocusedConflicts ? (
            <div className="space-y-2.5">
              <p className="text-[11px] text-red-600 font-semibold">
                {focusedConflicts.length} conflict{focusedConflicts.length > 1 ? "s" : ""} found in this cell:
              </p>
              {focusedConflicts.map((c, i) => (
                <ConflictCard
                  key={`${c.timetableId}-${c.type}-${i}`}
                  conflict={c}
                  index={i}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-green-700 bg-green-50 px-2.5 py-2 rounded-lg">
              <CheckCircle size={12} />
              <span>No conflicts in this cell</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
