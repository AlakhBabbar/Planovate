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
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col transform transition-all duration-300 scale-100 animate-slideIn">
        <div className="flex justify-between items-center mb-5 pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FolderOpen size={24} className="text-purple-600" />
            Browse Timetables
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-300 p-1"
          >
            <X size={24} />
          </button>
        </div>
        
        {isLoadingTimetables ? (
          <div className="flex flex-col justify-center items-center py-16">
            <Loader2 size={48} className="text-purple-600 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Loading timetables...</p>
          </div>
        ) : allTimetables.length === 0 ? (
          <div className="text-center py-16">
            <Inbox size={64} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No timetables found in the database</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="border-b-2 border-gray-200 p-3 text-left font-semibold text-gray-700 text-sm">Class</th>
                  <th className="border-b-2 border-gray-200 p-3 text-left font-semibold text-gray-700 text-sm">Branch</th>
                  <th className="border-b-2 border-gray-200 p-3 text-left font-semibold text-gray-700 text-sm">Semester</th>
                  <th className="border-b-2 border-gray-200 p-3 text-left font-semibold text-gray-700 text-sm">Faculty</th>
                  <th className="border-b-2 border-gray-200 p-3 text-left font-semibold text-gray-700 text-sm">Department</th>
                  <th className="border-b-2 border-gray-200 p-3 text-left font-semibold text-gray-700 text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {allTimetables.map((tt, index) => (
                  <tr 
                    key={tt.timetableId} 
                    className="hover:bg-blue-50 transition-colors duration-200"
                  >
                    <td className="border-b border-gray-200 p-3 text-sm">{tt.class || "-"}</td>
                    <td className="border-b border-gray-200 p-3 text-sm">{tt.branch || "-"}</td>
                    <td className="border-b border-gray-200 p-3 text-sm">{tt.semester || "-"}</td>
                    <td className="border-b border-gray-200 p-3 text-sm">{tt.faculty || "-"}</td>
                    <td className="border-b border-gray-200 p-3 text-sm">{tt.department || "-"}</td>
                    <td className="border-b border-gray-200 p-3">
                      <button
                        onClick={() => onSelectTimetable(tt)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300 shadow font-medium text-sm flex items-center gap-2"
                      >
                        <FolderOpen size={16} />
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
