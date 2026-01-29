import React, { useState, useEffect, useMemo } from "react";
import { X, Download, Loader2, ChevronLeft, ChevronRight, Palette, ArrowUpDown, GripVertical } from "lucide-react";

// Memoized color picker row component to prevent unnecessary re-renders
const ColorPickerRow = React.memo(({ branch, color, onColorChange, onReset }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-gray-700 flex-1">
      {branch}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={color}
        onChange={(e) => onColorChange(branch, e.target.value)}
        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
      />
      <button
        onClick={() => onReset(branch)}
        className="px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      >
        Reset
      </button>
    </div>
  </div>
));

ColorPickerRow.displayName = 'ColorPickerRow';

const ClassOccupancyPreviewModal = ({ 
  isOpen, 
  onClose, 
  classData, 
  allClasses = null,
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
  const [showColorCustomization, setShowColorCustomization] = useState(false);
  const [showOrderCustomization, setShowOrderCustomization] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [branchColors, setBranchColors] = useState(() => {
    // Load saved colors from localStorage on initial mount
    try {
      const savedColors = localStorage.getItem('classOccupancyBranchColors');
      return savedColors ? JSON.parse(savedColors) : {};
    } catch (error) {
      console.error('Error loading saved branch colors:', error);
      return {};
    }
  });

  // Save branch colors to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(branchColors).length > 0) {
      try {
        localStorage.setItem('classOccupancyBranchColors', JSON.stringify(branchColors));
      } catch (error) {
        console.error('Error saving branch colors:', error);
      }
    }
  }, [branchColors]);

  // Helper function to convert semester number to Roman numerals
  const toRoman = (num) => {
    const romanMap = {
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
      6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
    };
    const match = String(num).match(/(\d+)/);
    const numValue = match ? parseInt(match[1]) : null;
    return romanMap[numValue] || String(num);
  };

  // Helper function to format class with type (hide Full Time, show Part Time)
  const formatClassWithType = (className, type) => {
    const classStr = className || "N/A";
    if (!type) return classStr;
    
    const typeStr = String(type).trim().toUpperCase().replace(/\s+/g, ' ');
    
    // Only add type if it's NOT Full Time (check various formats)
    if (typeStr === "FULL TIME" || typeStr === "FULLTIME" || typeStr === "FULL-TIME") {
      return classStr;
    }
    
    return `${classStr} ${type}`;
  };

  const isMultiClass = allClasses && allClasses.length > 0;
  const rawClassesToShow = isMultiClass ? allClasses : (classData ? [classData] : []);

  // Load and save class order from localStorage
  const [customClassOrder, setCustomClassOrder] = useState(() => {
    try {
      const savedOrder = localStorage.getItem('classOccupancyClassOrder');
      return savedOrder ? JSON.parse(savedOrder) : [];
    } catch (error) {
      console.error('Error loading saved class order:', error);
      return [];
    }
  });

  useEffect(() => {
    if (customClassOrder.length > 0) {
      try {
        localStorage.setItem('classOccupancyClassOrder', JSON.stringify(customClassOrder));
      } catch (error) {
        console.error('Error saving class order:', error);
      }
    }
  }, [customClassOrder]);

  // Apply custom order to classes
  const classesToShow = useMemo(() => {
    if (customClassOrder.length === 0) return rawClassesToShow;
    
    // Create a map for quick lookup
    const orderMap = {};
    customClassOrder.forEach((id, index) => {
      orderMap[id] = index;
    });
    
    // Sort classes based on custom order, keeping unordered ones at the end
    return [...rawClassesToShow].sort((a, b) => {
      const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999999;
      const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999999;
      return orderA - orderB;
    });
  }, [rawClassesToShow, customClassOrder]);

  // Limit preview data for performance (show only first 3 days in mobile mode)
  const PREVIEW_LIMIT_DAYS = 3;
  const PREVIEW_LIMIT_CLASSES = 20;

  // Extract unique branches
  const uniqueBranches = useMemo(() => {
    if (!classesToShow || classesToShow.length === 0) return [];
    const branches = new Set();
    classesToShow.forEach(cls => {
      if (cls.branch) branches.add(cls.branch);
    });
    schedules?.forEach(schedule => {
      if (schedule.branch) branches.add(schedule.branch);
    });
    return Array.from(branches).sort();
  }, [classesToShow, schedules]);

  // Initialize default colors (white) when branches change, but preserve saved colors
  useEffect(() => {
    const savedColors = branchColors;
    const defaultColors = {};
    uniqueBranches.forEach(branch => {
      if (!savedColors[branch]) {
        defaultColors[branch] = '#FFFFFF'; // White by default
      }
    });
    if (Object.keys(defaultColors).length > 0) {
      setBranchColors(prev => ({ ...prev, ...defaultColors }));
    }
  }, [uniqueBranches]);

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
    if (!classesToShow || classesToShow.length === 0 || !schedules) return [];

    const allRows = [];

    // For preview, limit data based on export size
    const previewDays = exportSize === "mobile" ? days.slice(0, PREVIEW_LIMIT_DAYS) : days;
    const previewClasses = classesToShow.slice(0, PREVIEW_LIMIT_CLASSES);

    previewDays.forEach((day) => {
      const colIndex = dayToColIndex[day.key];
      
      previewClasses.forEach((classItem) => {
        // Group schedules by branch and type for this class
        const groups = {};
        schedules.forEach((schedule) => {
          if (schedule.timetableId !== classItem.id) return;
          
          const classType = schedule.class || classItem.class || "N/A";
          const branch = schedule.branch || classItem.branch || "N/A";
          const semester = schedule.semester || classItem.semester || "N/A";
          const type = schedule.type || classItem.type || "N/A";
          const groupKey = `${classType}|${branch}|${semester}|${type}`;
          
          if (!groups[groupKey]) {
            groups[groupKey] = {
              class: classType,
              branch: branch,
              semester: semester,
              type: type,
              schedules: []
            };
          }
          
          groups[groupKey].schedules.push(schedule);
        });

        const groupedArray = Object.values(groups);
        
        if (groupedArray.length === 0) {
          const classWithType = formatClassWithType(classItem.class, classItem.type);
          allRows.push({
            day: day.key,
            dayLabel: day.fullLabel,
            colIndex: colIndex,
            class: classWithType,
            branch: classItem.branch || "N/A",
            semester: toRoman(classItem.semester) || "N/A",
            schedules: []
          });
        } else {
          groupedArray.forEach((group) => {
            const classWithType = formatClassWithType(group.class, group.type);
            allRows.push({
              day: day.key,
              dayLabel: day.fullLabel,
              colIndex: colIndex,
              class: classWithType,
              branch: group.branch,
              semester: toRoman(group.semester),
              schedules: group.schedules
            });
          });
        }
      });
    });

    return allRows;
  }, [classesToShow, schedules, exportSize]);

  const getOccupancyForCell = React.useCallback((groupSchedules, rowIndex, colIndex) => {
    const matches = groupSchedules.filter((s) => {
      return s.rowIndex === rowIndex && s.colIndex === colIndex;
    });
    
    if (matches.length === 0) return "—";
    
    // Format cell content based on export size
    if (exportSize === "mobile") {
      // Mobile format: course ID, teacher ID, room ID (only), and batch
      return matches.map((occ) => {
        const parts = [];
        if (occ.course) parts.push(`C: ${occ.course}`);
        if (occ.teacher) parts.push(`T: ${occ.teacher}`);
        if (occ.roomIdOnly) parts.push(`[${occ.roomIdOnly}]`);
        if (occ.batch) parts.push(occ.batch);
        return parts.join(" ");
      }).join(", ");
    } else {
      // Actual format: course ID, teacher ID, room ID (only), and batch
      return matches.map((occ) => {
        const parts = [];
        if (occ.course) parts.push(`Course: ${occ.course}`);
        if (occ.teacher) parts.push(`Teacher: ${occ.teacher}`);
        if (occ.roomIdOnly) parts.push(`[${occ.roomIdOnly}]`);
        if (occ.batch) parts.push(occ.batch);
        return parts.join(" ");
      }).join(", ");
    }
  }, [exportSize]);

  const handleExport = async () => {
    setLoading(true);
    try {
      if (exportSize === "mobile") {
        // Mobile export with colors and ordered classes
        if (exportFormat === "pdf") {
          await onExportPdfMobile(branchColors, classesToShow);
        } else {
          await onExportExcelMobile(branchColors, classesToShow);
        }
      } else {
        // Actual size export with colors and ordered classes
        if (exportFormat === "pdf") {
          await onExportPdf(branchColors, classesToShow);
        } else {
          await onExportExcel(branchColors, classesToShow);
        }
      }
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error("Export error:", error);
      setLoading(false);
    }
  };

  // Memoize background styles to prevent recalculation
  const branchBgStyles = useMemo(() => {
    const styles = {};
    uniqueBranches.forEach(branch => {
      const color = branchColors[branch] || '#FFFFFF';
      styles[branch] = { backgroundColor: color };
    });
    return styles;
  }, [branchColors, uniqueBranches]);

  // Get background style for branch
  const getBranchBgStyle = (branch) => {
    return branchBgStyles[branch] || { backgroundColor: '#FFFFFF' };
  };

  // Class ordering functions with drag and drop
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...customClassOrder];
    const draggedItem = newOrder[draggedIndex];
    
    // Remove from old position
    newOrder.splice(draggedIndex, 1);
    // Insert at new position
    newOrder.splice(index, 0, draggedItem);
    
    setCustomClassOrder(newOrder);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const initializeClassOrder = () => {
    const currentOrder = classesToShow.map(cls => cls.id);
    setCustomClassOrder(currentOrder);
  };

  const resetClassOrder = () => {
    setCustomClassOrder([]);
    localStorage.removeItem('classOccupancyClassOrder');
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
              Export Preview - {exportSize === "mobile" ? "All Days (Mobile)" : "All Classes by Day"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {exportSize === "mobile" 
                ? `Preview: First ${PREVIEW_LIMIT_DAYS} days, ${Math.min(PREVIEW_LIMIT_CLASSES, classesToShow.length)} class${Math.min(PREVIEW_LIMIT_CLASSES, classesToShow.length) !== 1 ? 'es' : ''} (Full data in export)` 
                : `Previewing ${currentDay.fullLabel} - First ${Math.min(PREVIEW_LIMIT_CLASSES, classesToShow.length)} class${Math.min(PREVIEW_LIMIT_CLASSES, classesToShow.length) !== 1 ? 'es' : ''} (Full data in export)`
              }
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
                  <tr className="bg-yellow-300">
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      DAY
                    </th>
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      CLS
                    </th>
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      BR
                    </th>
                    <th className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center">
                      SM
                    </th>
                    {timeSlots.map((slot, idx) => (
                      <th 
                        key={idx} 
                        className="border border-gray-400 px-1 py-1 text-[8px] font-bold text-center bg-yellow-300"
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
                        const bgStyle = getBranchBgStyle(row.branch);
                        
                        return (
                          <tr key={rowIdx}>
                            {isFirstOfDay && (
                              <td 
                                className="border border-gray-400 px-1 py-1 text-[8px] text-center font-bold bg-yellow-100"
                                rowSpan={dayRowCount}
                              >
                                <div className="flex flex-col items-center justify-center leading-none">
                                  {row.day.split('').map((letter, idx) => (
                                    <span key={idx} className="block">{letter}</span>
                                  ))}
                                </div>
                              </td>
                            )}
                            <td className="border border-gray-400 px-1 py-1 text-[7px] text-center" style={bgStyle}>
                              {row.class}
                            </td>
                            <td className="border border-gray-400 px-1 py-1 text-[7px] text-center" style={bgStyle}>
                              {row.branch}
                            </td>
                            <td className="border border-gray-400 px-1 py-1 text-[7px] text-center" style={bgStyle}>
                              {row.semester}
                            </td>
                            {timeSlots.map((slot, colIdx) => {
                              const content = getOccupancyForCell(row.schedules, colIdx, row.colIndex);
                              const isEmpty = content === "—";
                              
                              return (
                                <td 
                                  key={colIdx}
                                  className="border border-gray-400 px-1 py-1 text-[7px] text-center"
                                  style={isEmpty ? { backgroundColor: '#FFFFFF' } : bgStyle}
                                >
                                  {content}
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
              // Actual format: Original day-by-day view
              <table className="w-full border-collapse border border-gray-400">
                <thead>
                  <tr className="bg-yellow-300">
                    <th className="border border-gray-400 px-3 py-2 text-xs font-bold text-center">
                      CLASS
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-xs font-bold text-center">
                      BRANCH
                    </th>
                    <th className="border border-gray-400 px-3 py-2 text-xs font-bold text-center">
                      SEMESTER
                    </th>
                    {timeSlots.map((slot, idx) => (
                      <th 
                        key={idx} 
                        className="border border-gray-400 px-3 py-2 text-xs font-bold text-center bg-yellow-300"
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allDaysData.filter(row => row.day === currentDay.key).length === 0 ? (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2 text-xs text-center" colSpan={3 + timeSlots.length}>
                        No data
                      </td>
                    </tr>
                  ) : (
                    allDaysData.filter(row => row.day === currentDay.key).map((group, groupIdx) => {
                      const bgStyle = getBranchBgStyle(group.branch);
                      return (
                        <tr key={groupIdx}>
                          <td className="border border-gray-400 px-2 py-2 text-xs text-center" style={bgStyle}>
                            {group.class}
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-xs text-center" style={bgStyle}>
                            {group.branch}
                          </td>
                          <td className="border border-gray-400 px-2 py-2 text-xs text-center" style={bgStyle}>
                            {group.semester}
                          </td>
                          {timeSlots.map((slot, rowIndex) => {
                            const content = getOccupancyForCell(group.schedules, rowIndex, group.colIndex);
                            const isEmpty = content === "—";
                            
                            return (
                              <td 
                                key={rowIndex}
                                className="border border-gray-400 px-2 py-2 text-xs text-center"
                                style={isEmpty ? { backgroundColor: '#FFFFFF' } : bgStyle}
                              >
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Order Customization Modal */}
        {showOrderCustomization && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[600px] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Customize Class Order</h3>
                <button
                  onClick={() => setShowOrderCustomization(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {customClassOrder.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No custom order set. Classes are shown in default order.</p>
                    <button
                      onClick={initializeClassOrder}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      Initialize Custom Order
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                      <GripVertical size={16} />
                      Drag and drop to reorder classes
                    </p>
                    <div className="space-y-2">
                      {customClassOrder.map((classId, index) => {
                        const classItem = classesToShow.find(c => c.id === classId);
                        if (!classItem) return null;
                        
                        return (
                          <div
                            key={classId}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 transition-all cursor-move ${
                              draggedIndex === index 
                                ? 'border-purple-400 bg-purple-50 opacity-50' 
                                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            <GripVertical size={20} className="text-gray-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium text-sm">{classItem.class} - {classItem.branch}</span>
                              <span className="text-xs text-gray-600 ml-2">Sem {classItem.semester}</span>
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              #{index + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={resetClassOrder}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => setShowOrderCustomization(false)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Color Customization Modal */}
        {showColorCustomization && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[600px] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Customize Branch Colors</h3>
                <button
                  onClick={() => setShowColorCustomization(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {uniqueBranches.map(branch => (
                    <ColorPickerRow
                      key={branch}
                      branch={branch}
                      color={branchColors[branch] || '#FFFFFF'}
                      onColorChange={(branch, color) => setBranchColors(prev => ({
                        ...prev,
                        [branch]: color
                      }))}
                      onReset={(branch) => setBranchColors(prev => ({
                        ...prev,
                        [branch]: '#FFFFFF'
                      }))}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Reset all to white
                    const resetColors = {};
                    uniqueBranches.forEach(branch => {
                      resetColors[branch] = '#FFFFFF';
                    });
                    setBranchColors(resetColors);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setShowColorCustomization(false)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

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
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Actual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="mobile"
                    checked={exportSize === "mobile"}
                    onChange={(e) => setExportSize(e.target.value)}
                    className="w-4 h-4 text-purple-600"
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
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">Excel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="pdf"
                    checked={exportFormat === "pdf"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm text-gray-700">PDF</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowOrderCustomization(true)}
              className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <ArrowUpDown size={18} />
              Order Classes
            </button>
            <button
              onClick={() => setShowColorCustomization(true)}
              className="px-4 py-2 text-purple-600 border border-purple-300 rounded-md hover:bg-purple-50 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              <Palette size={18} />
              Customize Colors
            </button>
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
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors shadow-sm flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Export {exportSize === "mobile" ? "Mobile" : "Actual"} ({exportFormat.toUpperCase()})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassOccupancyPreviewModal;
