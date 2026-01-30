import React, { useEffect } from "react";
import { X, Loader2, Inbox, FolderOpen } from "lucide-react";
import useTimetableStore from "../../store/timetableStore";

const BrowseTimetablesModal = ({ isOpen, onClose, onSelectTimetable, timetableService }) => {
  const { allTimetables, isLoadingTimetables, fetchTimetables } = useTimetableStore();

  useEffect(() => {
    if (isOpen) {
      fetchTimetables();
    }
  }, [isOpen, fetchTimetables]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Browse Timetables</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {isLoadingTimetables ? (
          <div className="flex flex-col justify-center items-center py-16">
            <Loader2 size={40} className="text-gray-400 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading timetables...</p>
          </div>
        ) : allTimetables.length === 0 ? (
          <div className="text-center py-16">
            <Inbox size={56} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No timetables found in the database</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Class</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Branch</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Semester</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Type</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody>
                {allTimetables.map((tt, index) => (
                  <tr 
                    key={tt.timetableId} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 text-sm text-gray-900">{tt.class || "-"}</td>
                    <td className="py-3 text-sm text-gray-600">{tt.branch || "-"}</td>
                    <td className="py-3 text-sm text-gray-600">{tt.semester || "-"}</td>
                    <td className="py-3 text-sm text-gray-600">{tt.type || "-"}</td>
                    <td className="py-3">
                      <button
                        onClick={() => onSelectTimetable(tt)}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded text-xs hover:bg-gray-800 transition-colors font-medium"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseTimetablesModal;
