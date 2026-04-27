/**
 * ConflictPanel — Interactive conflict detection & navigation sidebar.
 *
 * Props:
 *   wsConflicts      Map<"row-col-batchIndex", EnrichedConflict[]>
 *   focusedCell      { row, col } | null
 *   onNavigate       (conflict: EnrichedConflict) => void
 *   activeMetadata   { className, branch, semester, type }
 *
 * Color scheme:
 *   source='schedule' + status='active'   → red
 *   source='temp'     + status='active'   → pink / rose
 *   source='temp'     + status='resolved' → green
 */

import React, { useMemo, useState } from "react";
import {
  AlertCircle, CheckCircle, Users, Building2,
  ArrowRight, MapPin, BookOpen, Layers, X
} from "lucide-react";

// ── Color utilities ────────────────────────────────────────────────────────────

function conflictColor(source, status) {
  if (status === 'resolved') return {
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    header: 'bg-emerald-50 text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700',
    btn: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
    label: 'Resolved (temp)',
    labelColor: 'bg-emerald-50 text-emerald-700',
  };
  if (source === 'temp') return {
    bg: 'bg-rose-50', border: 'border-rose-200',
    header: 'bg-rose-50 text-rose-800',
    badge: 'bg-rose-100 text-rose-700',
    btn: 'from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600',
    label: 'Unsaved (temp)',
    labelColor: 'bg-rose-50 text-rose-700',
  };
  // schedule → red
  return {
    bg: 'bg-red-50', border: 'border-red-200',
    header: 'bg-red-50 text-red-800',
    badge: 'bg-red-100 text-red-700',
    btn: 'from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
    label: 'Saved schedule',
    labelColor: 'bg-gray-100 text-gray-600',
  };
}

function typeIcon(type, size = 13) {
  return type === "teacher"
    ? <Users size={size} className="shrink-0" />
    : <Building2 size={size} className="shrink-0" />;
}

function dayLabel(d) {
  const map = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat" };
  return map[String(d).toLowerCase()] || d;
}

// ── Individual conflict card ───────────────────────────────────────────────────

function ConflictCard({ conflict, index, onNavigate }) {
  const c = conflictColor(conflict.source, conflict.status);
  const isResolved = conflict.status === 'resolved';

  return (
    <div className={`border rounded-lg overflow-hidden shadow-sm ${c.border} ${c.bg}`}>
      {/* Header */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold ${c.header}`}>
        {typeIcon(conflict.type)}
        <span className="uppercase tracking-wide flex-1">
          {isResolved
            ? `${conflict.type === 'teacher' ? 'Teacher' : 'Room'} — Resolved`
            : `${conflict.type === 'teacher' ? 'Teacher' : 'Room'} Double-Booked`}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.badge}`}>#{index + 1}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5 text-[11px] text-gray-700">
        {/* Entity */}
        <div className="flex items-center gap-1.5">
          {typeIcon(conflict.type, 11)}
          <span className="text-gray-400 mr-1">{conflict.type === 'teacher' ? 'Teacher:' : 'Room:'}</span>
          <span className="font-semibold text-gray-900">
            {conflict.teacherName || conflict.roomName || conflict.conflictingId}
          </span>
        </div>

        {/* Slot */}
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-gray-400 shrink-0" />
          <span className="text-gray-400 mr-1">Slot:</span>
          <span className="font-medium">{dayLabel(conflict.day)} · {conflict.time}</span>
        </div>

        {/* Conflicting timetable */}
        {(conflict.displayClass || conflict.displayBranch) && (
          <div className="flex items-start gap-1.5">
            <BookOpen size={11} className="mt-0.5 text-gray-400 shrink-0" />
            <div>
              <span className="text-gray-400">In: </span>
              <span className="font-semibold">
                {[conflict.displayClass, conflict.displayBranch, conflict.displaySemester, conflict.displayType]
                  .filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        )}

        {/* Source badge */}
        <div className="flex items-center gap-1">
          <Layers size={11} className="text-gray-300 shrink-0" />
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.labelColor}`}>
            {c.label}
          </span>
        </div>
      </div>

      {/* Navigate button — only for active conflicts */}
      {onNavigate && !isResolved && (
        <div className="px-3 pb-2.5">
          <button
            onClick={() => onNavigate(conflict)}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5
              bg-gradient-to-r ${c.btn} text-white text-[11px] font-semibold rounded-md
              transition-all duration-150 shadow-sm hover:shadow-md active:scale-[0.97]`}
          >
            Go to Conflict <ArrowRight size={11} />
          </button>
        </div>
      )}
      {isResolved && (
        <div className="px-3 pb-2.5">
          <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-md">
            <CheckCircle size={11} /> Resolved in temp schedule
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary / type-filter header ──────────────────────────────────────────────

function SummarySection({ allConflicts, filterType, onSetFilter }) {
  const teachers = allConflicts.filter(c => c.type === 'teacher' && c.status !== 'resolved');
  const rooms    = allConflicts.filter(c => c.type === 'room'    && c.status !== 'resolved');
  const resolved = allConflicts.filter(c => c.status === 'resolved');
  const total    = teachers.length + rooms.length;

  if (total === 0 && resolved.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-5 text-center">
        <div className="p-2.5 rounded-full bg-green-50">
          <CheckCircle size={20} className="text-green-500" />
        </div>
        <p className="text-xs font-semibold text-green-700">No Active Conflicts</p>
        <p className="text-[11px] text-gray-400">All teacher & room assignments are valid.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500 font-medium">Active conflicts</span>
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold text-[11px]">{total}</span>
      </div>

      {/* Clickable teacher pill */}
      <button
        onClick={() => onSetFilter(filterType === 'teacher' ? null : 'teacher')}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-all ${
          teachers.length > 0
            ? filterType === 'teacher'
              ? 'bg-orange-200 text-orange-900 ring-1 ring-orange-400'
              : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            : 'bg-green-50 text-green-700 cursor-default'
        }`}
      >
        <Users size={13} className="shrink-0" />
        <span className="font-medium flex-1 text-left">Teachers</span>
        {teachers.length > 0 ? (
          <span className="font-bold">{teachers.length} conflict{teachers.length > 1 ? 's' : ''}</span>
        ) : <span>Clear</span>}
        {filterType === 'teacher' && <X size={11} />}
      </button>

      {/* Clickable room pill */}
      <button
        onClick={() => onSetFilter(filterType === 'room' ? null : 'room')}
        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs transition-all ${
          rooms.length > 0
            ? filterType === 'room'
              ? 'bg-blue-200 text-blue-900 ring-1 ring-blue-400'
              : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            : 'bg-green-50 text-green-700 cursor-default'
        }`}
      >
        <Building2 size={13} className="shrink-0" />
        <span className="font-medium flex-1 text-left">Rooms</span>
        {rooms.length > 0 ? (
          <span className="font-bold">{rooms.length} conflict{rooms.length > 1 ? 's' : ''}</span>
        ) : <span>Clear</span>}
        {filterType === 'room' && <X size={11} />}
      </button>

      {resolved.length > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700">
          <CheckCircle size={11} />
          <span>{resolved.length} resolved in temp (unsaved)</span>
        </div>
      )}

      {(teachers.length > 0 || rooms.length > 0) && (
        <p className="text-[10px] text-gray-400 pt-1">
          Click a pill to see all conflicting cells of that type.
        </p>
      )}
    </div>
  );
}

// ── Filtered conflict list (from clicking type pills) ─────────────────────────

function FilteredConflictList({ wsConflicts, filterType, onNavigate, onClear }) {
  const items = useMemo(() => {
    const result = [];
    for (const [key, list] of wsConflicts.entries()) {
      const [row, col] = key.split('-').map(Number);
      for (const c of list) {
        if (c.type === filterType) result.push({ ...c, _cellRow: row, _cellCol: col });
      }
    }
    return result;
  }, [wsConflicts, filterType]);

  if (!items.length) return (
    <div className="text-[11px] text-gray-400 py-3 text-center">No {filterType} conflicts found.</div>
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-red-600 font-semibold">
          {items.length} {filterType} conflict{items.length > 1 ? 's' : ''}:
        </p>
        <button onClick={onClear} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
          <X size={10} /> Clear filter
        </button>
      </div>
      {items.map((c, i) => (
        <ConflictCard key={`${c.conflictingId}-${c._cellRow}-${c._cellCol}-${i}`} conflict={c} index={i} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

// ── Global conflict list (loaded from DB, grouped by source timetable) ────────

function GlobalConflictList({ conflicts, onNavigate }) {
  // Group by source timetable
  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of conflicts) {
      const key = c.sourceTimetableId || 'unknown';
      if (!map.has(key)) map.set(key, { label: c.sourceClass || key, items: [] });
      map.get(key).items.push(c);
    }
    return [...map.entries()];
  }, [conflicts]);

  if (!grouped.length) return (
    <div className="flex flex-col items-center gap-1.5 py-4 text-center">
      <CheckCircle size={16} className="text-green-500" />
      <p className="text-[11px] text-green-700 font-medium">No persisted conflicts</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {grouped.map(([ttId, group]) => (
        <div key={ttId}>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 truncate">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.items.map((c, i) => (
              <ConflictCard
                key={`${c._id || c.conflictKey}-${i}`}
                conflict={{
                  ...c,
                  type: c.conflictType,
                  conflictingTimetableId: c.conflictTimetableId,
                  source: c.conflictScheduleType,
                  displayClass: c.conflictClass,
                  displayBranch: c.conflictBranch,
                  displaySemester: c.conflictSemester,
                  displayType: c.conflictType_,
                }}
                index={i}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ConflictPanel({
  wsConflicts,
  focusedCell,
  onNavigate,
  activeMetadata,
  globalConflicts = [],
  globalConflictsLoading = false,
}) {
  const [filterType, setFilterType] = useState(null); // 'teacher' | 'room' | null
  const [showGlobal, setShowGlobal] = useState(true);

  // All WS conflicts flat (real-time, current session)
  const allConflicts = useMemo(() => {
    const list = [];
    for (const arr of wsConflicts.values()) list.push(...arr);
    return list;
  }, [wsConflicts]);

  // Focused cell conflicts (any batch)
  const focusedConflicts = useMemo(() => {
    if (!focusedCell) return [];
    const { row, col } = focusedCell;
    const result = [];
    for (let b = 0; b < 10; b++) {
      const key = `${row}-${col}-${b}`;
      const list = wsConflicts.get(key);
      if (list?.length) result.push(...list);
      else if (b > 0) break;
    }
    return result;
  }, [wsConflicts, focusedCell]);

  const totalActive = allConflicts.filter(c => c.status !== 'resolved').length;
  const globalActive = globalConflicts.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-4">

      {/* ── Global Persisted Conflicts (always shown, DB-loaded) ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setShowGlobal(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className={globalActive > 0 ? 'text-red-500' : 'text-green-400'} />
            <span className="text-sm font-bold text-gray-900">All Conflicts</span>
            <span className="text-[10px] text-gray-400 font-normal">(from DB)</span>
          </div>
          <div className="flex items-center gap-2">
            {globalConflictsLoading
              ? <span className="text-[10px] text-gray-400 animate-pulse">Loading…</span>
              : <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  globalActive > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>{globalActive} active</span>
            }
            <span className="text-gray-400 text-xs">{showGlobal ? '▲' : '▼'}</span>
          </div>
        </button>

        {showGlobal && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {globalConflictsLoading ? (
              <div className="py-4 text-center text-[11px] text-gray-400 animate-pulse">Loading conflicts…</div>
            ) : (
              <div className="mt-3">
                <GlobalConflictList conflicts={globalConflicts} onNavigate={onNavigate} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Real-time Conflict Detection (current session) ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={15} className={totalActive > 0 ? 'text-red-500' : 'text-green-500'} />
          <h3 className="text-sm font-bold text-gray-900">Live Detection</h3>
          <span className="text-[10px] text-gray-400 font-normal ml-auto">current session</span>
        </div>

        <SummarySection
          allConflicts={allConflicts}
          filterType={filterType}
          onSetFilter={setFilterType}
        />

        {filterType && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <FilteredConflictList
              wsConflicts={wsConflicts}
              filterType={filterType}
              onNavigate={onNavigate}
              onClear={() => setFilterType(null)}
            />
          </div>
        )}
      </div>

      {/* ── Focused Cell Detail ── */}
      {focusedCell && !filterType && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Selected Cell</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
              [{focusedCell.row}, {focusedCell.col}]
            </span>
          </div>

          {activeMetadata && (activeMetadata.className || activeMetadata.branch) && (
            <div className="mb-3 px-2.5 py-2 bg-indigo-50 rounded-lg text-[11px] text-indigo-700 space-y-0.5">
              <p className="font-semibold text-indigo-900">{activeMetadata.className} · {activeMetadata.branch}</p>
              <p className="text-indigo-600">Sem {activeMetadata.semester} — {activeMetadata.type}</p>
            </div>
          )}

          {focusedConflicts.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-[11px] text-red-600 font-semibold">
                {focusedConflicts.length} conflict{focusedConflicts.length > 1 ? 's' : ''} in this cell:
              </p>
              {focusedConflicts.map((c, i) => (
                <ConflictCard
                  key={`${c.conflictingId}-${c.type}-${i}`}
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
