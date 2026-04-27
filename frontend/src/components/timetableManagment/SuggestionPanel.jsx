/**
 * SuggestionPanel — Sidebar panel listing all cells that received AI suggestions.
 *
 * Props:
 *   allSuggestions    { "row-col": suggestion[] }
 *   suggestionsEnabled boolean
 *   computing         boolean
 *   onEnable          () => void
 *   onDisable         () => void
 *   onCellClick       (row, col) => void — highlights + scrolls to cell
 *   wsReady           boolean
 */

import React, { useMemo, useState } from "react";
import { Sparkles, Loader2, Power, ChevronDown, ChevronUp, Lightbulb, MapPin } from "lucide-react";

function dayLabel(d) {
  const map = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat" };
  return map[String(d).toLowerCase()] || d;
}

function SuggestionCard({ cellKey, suggestions, onCellClick }) {
  const [expanded, setExpanded] = useState(false);
  const [row, col] = cellKey.split("-").map(Number);

  return (
    <div className="border border-purple-100 rounded-lg overflow-hidden bg-purple-50/50">
      <button
        onClick={() => {
          onCellClick?.(row, col);
          setExpanded(v => !v);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purple-100/60 transition-colors"
      >
        <Lightbulb size={12} className="text-purple-500 shrink-0" />
        <span className="text-[11px] font-semibold text-purple-800 flex-1">
          Cell [{row}, {col}]
        </span>
        <span className="text-[10px] text-purple-500 font-medium">
          {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''}
        </span>
        {expanded ? <ChevronUp size={11} className="text-purple-400" /> : <ChevronDown size={11} className="text-purple-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5 border-t border-purple-100">
          {suggestions.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-purple-700 mt-1.5">
              <MapPin size={10} className="mt-0.5 shrink-0 text-purple-400" />
              <div>
                {s.course && <span className="font-semibold">{s.course}</span>}
                {s.teacher && <span className="text-purple-500"> · {s.teacher}</span>}
                {s.room && <span className="text-purple-400"> · {s.room}</span>}
                {s.reason && <p className="text-[9px] text-purple-400 mt-0.5">{s.reason}</p>}
              </div>
            </div>
          ))}
          {suggestions.length > 5 && (
            <p className="text-[9px] text-purple-400 text-center pt-1">+{suggestions.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuggestionPanel({
  allSuggestions,
  suggestionsEnabled,
  computing,
  onEnable,
  onDisable,
  onCellClick,
  wsReady,
}) {
  const cellKeys = useMemo(() => {
    return Object.keys(allSuggestions || {}).filter(k => allSuggestions[k]?.length > 0).sort();
  }, [allSuggestions]);

  const totalSuggestions = useMemo(() => {
    return cellKeys.reduce((sum, k) => sum + (allSuggestions[k]?.length || 0), 0);
  }, [cellKeys, allSuggestions]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header with toggle */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className={suggestionsEnabled ? 'text-purple-500' : 'text-gray-400'} />
          <span className="text-sm font-bold text-gray-900">AI Suggestions</span>
        </div>

        {wsReady && (
          <button
            onClick={suggestionsEnabled ? onDisable : onEnable}
            disabled={computing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              computing
                ? 'bg-purple-100 text-purple-600 cursor-wait'
                : suggestionsEnabled
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {computing ? (
              <><Loader2 size={11} className="animate-spin" /> Computing…</>
            ) : suggestionsEnabled ? (
              <><Power size={11} /> Enabled</>
            ) : (
              <><Power size={11} /> Enable</>
            )}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {!wsReady ? (
          <p className="text-[11px] text-gray-400 text-center py-3">Connect to a timetable first</p>
        ) : !suggestionsEnabled ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <div className="p-2 rounded-full bg-gray-50">
              <Sparkles size={18} className="text-gray-300" />
            </div>
            <p className="text-[11px] text-gray-500">Click <b>Enable</b> to start computing AI suggestions for this timetable</p>
            <p className="text-[10px] text-gray-400">You can keep editing while it computes</p>
          </div>
        ) : computing ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Loader2 size={20} className="animate-spin text-purple-400" />
            <p className="text-[11px] text-purple-600 font-medium">Computing suggestions…</p>
            <p className="text-[10px] text-gray-400">You can keep editing — results will appear here</p>
          </div>
        ) : cellKeys.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-3 text-center">
            <Sparkles size={16} className="text-purple-300" />
            <p className="text-[11px] text-gray-500">No suggestions yet</p>
            <p className="text-[10px] text-gray-400">Suggestions appear as data changes</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-gray-500 font-medium">{cellKeys.length} cell{cellKeys.length > 1 ? 's' : ''} with suggestions</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold text-[10px]">{totalSuggestions} total</span>
            </div>
            {cellKeys.map(k => (
              <SuggestionCard
                key={k}
                cellKey={k}
                suggestions={allSuggestions[k]}
                onCellClick={onCellClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
