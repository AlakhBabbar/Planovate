import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

const ExportModal = ({ isOpen, onClose, onConfirm }) => {
  const [format, setFormat] = useState("pdf");
  const [scope, setScope] = useState("current");

  const canConfirm = useMemo(() => {
    return Boolean(format) && Boolean(scope);
  }, [format, scope]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Export Timetable</h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">File Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
            >
              <option value="pdf">PDF</option>
              <option value="doc">DOC</option>
              <option value="excel">Excel</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Scope</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="exportScope"
                  value="current"
                  checked={scope === "current"}
                  onChange={() => setScope("current")}
                  className="text-gray-900 focus:ring-gray-400"
                />
                Current timetable
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="exportScope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="text-gray-900 focus:ring-gray-400"
                />
                All opened timetables
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ format, scope })}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            disabled={!canConfirm}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
