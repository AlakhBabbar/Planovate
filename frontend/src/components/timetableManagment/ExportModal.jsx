import React, { useMemo, useState } from "react";
import { X, Download } from "lucide-react";

const ExportModal = ({ isOpen, onClose, onConfirm }) => {
  const [format, setFormat] = useState("pdf");
  const [scope, setScope] = useState("current");

  const canConfirm = useMemo(() => {
    return Boolean(format) && Boolean(scope);
  }, [format, scope]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full overflow-hidden flex flex-col transform transition-all duration-300 scale-100 animate-slideIn">
        <div className="flex justify-between items-center mb-5 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Download size={22} className="text-orange-600" />
            Export Timetable
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-300 p-1"
            type="button"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">File format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            >
              <option value="pdf">PDF</option>
              <option value="doc">DOC</option>
              <option value="excel">Excel</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Download</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="exportScope"
                  value="current"
                  checked={scope === "current"}
                  onChange={() => setScope("current")}
                />
                Current timetable
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="exportScope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                All opened timetables
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-all duration-300 text-sm font-medium"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-300 shadow text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => onConfirm({ format, scope })}
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
