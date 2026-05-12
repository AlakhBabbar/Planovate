import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, AlertCircle, Trash2, Copy, Move, X, GripVertical } from "lucide-react";
import { validateCourse, validateTeacher, validateRoom } from "../../utils/validationHelpers";
import { getCourseIdFromDisplay, getTeacherIdFromDisplay, getRoomIdFromDisplay } from "../../utils/idDisplayHelpers";

/**
 * Smart dropdown for teachers with three sections:
 * 1. Assigned — teachers linked to the selected course in the curriculum
 * 2. Same department — teachers sharing the course's department
 * 3. Other departments — remaining teachers, grouped by their department
 */
const TeacherCombobox = ({
  value,
  onChange,
  onKeyDown,
  groups,
  inputRef,
  className,
  placeholder,
  title,
}) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 200 });
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const internalInputRef = useRef(null);
  const containerRef = useRef(null);
  const dropRef = useRef(null);

  // Let parent register the input DOM node via callback ref
  useEffect(() => {
    if (typeof inputRef === "function") inputRef(internalInputRef.current);
  });

  // Close when clicking outside
  useEffect(() => {
    const handleOuter = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOuter);
    return () => document.removeEventListener("mousedown", handleOuter);
  }, []);

  // Reset highlight when dropdown opens/closes or filter changes
  useEffect(() => {
    setHighlightIdx(-1);
  }, [open, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !dropRef.current) return;
    const el = dropRef.current.querySelector(`[data-idx="${highlightIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  // Position the dropdown below the container div
  const updatePos = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(220, rect.width),
      });
    }
  };

  const filterStr = (value || "").toLowerCase();
  const filterOpts = (opts) =>
    opts.filter((o) => !filterStr || o.toLowerCase().includes(filterStr));

  const { assigned = [], courseDept, sameDept = [], otherDepts = {} } = groups;
  const fAssigned = filterOpts(assigned);
  const fSameDept = filterOpts(sameDept);
  const fOtherDepts = Object.fromEntries(
    Object.entries(otherDepts)
      .map(([dept, ts]) => [dept, filterOpts(ts)])
      .filter(([, ts]) => ts.length > 0)
  );

  // Flat list of all visible options (for keyboard navigation)
  const flatOptions = [
    ...fAssigned,
    ...fSameDept,
    ...Object.values(fOtherDepts).flat(),
  ];
  const hasOptions = flatOptions.length > 0;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightIdx((i) => Math.min(i + 1, flatOptions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(flatOptions[highlightIdx]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    onKeyDown && onKeyDown(e);
  };

  // Build a continuous flat index across groups for highlighting
  let flatIdx = 0;
  const renderGroup = (items, headerEl, hoverClass) =>
    items.length > 0 ? (
      <React.Fragment>
        {headerEl}
        {items.map((t) => {
          const idx = flatIdx++;
          const isHl = idx === highlightIdx;
          return (
            <div
              key={idx}
              data-idx={idx}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(t); }}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`px-2 py-1 cursor-pointer text-gray-800 ${
                isHl ? "bg-gray-200" : hoverClass
              }`}
            >
              {t}
            </div>
          );
        })}
      </React.Fragment>
    ) : null;

  const dropdown = open && hasOptions
    ? createPortal(
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 9999,
          }}
          className="max-h-52 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg text-[10px] ring-1 ring-black/5"
        >
          {(() => { flatIdx = 0; return null; })()}
          {fAssigned.length > 0 && renderGroup(
            fAssigned,
            <div className="sticky top-0 px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold text-[9px] uppercase tracking-wide border-b border-amber-100">
              ★ Assigned
            </div>,
            "hover:bg-amber-50"
          )}
          {fSameDept.length > 0 && renderGroup(
            fSameDept,
            <div className="sticky top-0 px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[9px] uppercase tracking-wide border-b border-blue-100">
              {courseDept || "Same Dept"}
            </div>,
            "hover:bg-blue-50"
          )}
          {Object.entries(fOtherDepts).map(([dept, teachers]) =>
            renderGroup(
              teachers,
              <div key={dept} className="sticky top-0 px-2 py-0.5 bg-gray-50 text-gray-500 font-semibold text-[9px] uppercase tracking-wide border-b border-gray-100">
                {dept}
              </div>,
              "hover:bg-gray-50"
            )
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={internalInputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); updatePos(); setOpen(true); }}
        onClick={() => { updatePos(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={className}
        title={title}
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
};

/**
 * Simple portal-based combobox for flat option lists (Course, Room).
 * Same positioning/look as TeacherCombobox but with a single flat list.
 */
const SimpleCombobox = ({
  value,
  onChange,
  onKeyDown,
  options,
  inputRef,
  className,
  placeholder,
  title,
}) => {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 200 });
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const internalInputRef = useRef(null);
  const containerRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (typeof inputRef === "function") inputRef(internalInputRef.current);
  });

  useEffect(() => {
    const handleOuter = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOuter);
    return () => document.removeEventListener("mousedown", handleOuter);
  }, []);

  // Reset highlight when dropdown opens/closes or filter changes
  useEffect(() => {
    setHighlightIdx(-1);
  }, [open, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !dropRef.current) return;
    const el = dropRef.current.querySelector(`[data-idx="${highlightIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  const updatePos = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(220, rect.width),
      });
    }
  };

  // Normalize options to {value, label} shape
  const normalizedOpts = (options || []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  const filterStr = (value || "").toLowerCase();
  const filtered = normalizedOpts.filter(
    (o) => !filterStr || o.label.toLowerCase().includes(filterStr) || o.value.toLowerCase().includes(filterStr)
  );

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault();
        e.stopPropagation();
        handleSelect(filtered[highlightIdx]);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    }
    onKeyDown && onKeyDown(e);
  };

  const dropdown =
    open && filtered.length > 0
      ? createPortal(
          <div
            ref={dropRef}
            style={{
              position: "fixed",
              top: dropPos.top,
              left: dropPos.left,
              width: dropPos.width,
              zIndex: 9999,
            }}
            className="max-h-52 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg text-[10px] ring-1 ring-black/5"
          >
            {filtered.map((opt, i) => (
              <div
                key={i}
                data-idx={i}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`px-2 py-1 cursor-pointer text-gray-800 ${
                  i === highlightIdx ? "bg-gray-200" : "hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={internalInputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); updatePos(); setOpen(true); }}
        onClick={() => { updatePos(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        className={className}
        title={title}
        autoComplete="off"
      />
      {dropdown}
    </div>
  );
};

const TimetableCell = ({ 
  rowIndex, 
  colIndex, 
  batches,
  batchData,
  conflicts, 
  validationErrors,
  courseOptions,
  teacherOptions,
  roomOptions,
  onCreateBatch, 
  onUpdateBatch,
  onRemoveBatch,
  onValidationChange,
  isFirstCell,
  firstCellRef,
  onCopyCell,
  onMoveCell,
  curriculumData,
  allCoursesRaw,
  allTeachersRaw,
  isFromTemp = false, // cell was loaded from tempSchedules → show yellow highlight
  suggestions = [],    // WS suggestions for this cell
  isSuggestionFocused = false, // user dwelled 2.5s → show full suggestions
  onCellFocus,         // (row, col) => void
  onCellBlur,          // () => void
  isHighlighted = false, // flash highlight on conflict navigation
  dataCellKey,           // e.g. "2-3" for data-cell attribute
}) => {
  const key = `${rowIndex}-${colIndex}`;
  const batchCount = batches[key] || 1;
  const showBatchField = batchCount > 1;

  // A cell is "filled" if any of its batches has at least one value
  const isFilled = Array.from({ length: batchCount }).some((_, bi) => {
    const d = batchData[`${rowIndex}-${colIndex}-${bi}`] || {};
    return !!(d.course || d.teacher || d.room);
  });

  const courses = Array.isArray(courseOptions) ? courseOptions : [];
  const teachers = Array.isArray(teacherOptions) ? teacherOptions : [];
  const rooms = Array.isArray(roomOptions) ? roomOptions : [];

  // --- Curriculum-aware course list ---
  // Only show courses assigned to this class in the curriculum (falls back to all).
  const filteredCourses = React.useMemo(() => {
    const currCourses = curriculumData?.courses;
    if (!currCourses?.length || !allCoursesRaw?.length) return courses;
    const ids = new Set(currCourses.map((c) => String(c.courseId)));
    const names = allCoursesRaw
      .filter((c) => ids.has(String(c.unid)))
      .map((c) => c.ID || c.code || c.name)
      .filter(Boolean);
    return names.length > 0 ? names : courses;
  }, [curriculumData, allCoursesRaw, courses]);

  // --- Teacher groups for a selected course display name ---
  const getTeacherGroups = React.useCallback(
    (selectedCourseDisplay) => {
      const empty = { assigned: [], courseDept: null, sameDept: [], otherDepts: {} };
      if (!allTeachersRaw?.length) {
        // No raw data: return flat groups by nothing
        const otherDepts = {};
        teachers.forEach((t) => {
          const dept = "All Teachers";
          if (!otherDepts[dept]) otherDepts[dept] = [];
          otherDepts[dept].push(t);
        });
        return { ...empty, otherDepts };
      }

      // Find raw course object
      const rawCourse = selectedCourseDisplay
        ? allCoursesRaw?.find(
            (c) => (c.ID || c.code || c.name) === selectedCourseDisplay
          )
        : null;

      const courseDept = rawCourse?.department || null;

      // Assigned teacher IDs from curriculum
      const currEntry = rawCourse
        ? curriculumData?.courses?.find(
            (c) => String(c.courseId) === String(rawCourse.unid)
          )
        : null;
      const assignedIds = new Set((currEntry?.teacherIds || []).map(String));

      const assigned = Array.from(assignedIds)
        .map((tid) => {
          const t = allTeachersRaw.find((t) => String(t.unid) === tid);
          return t ? t.ID || t.name : null;
        })
        .filter(Boolean);

      const remaining = allTeachersRaw.filter((t) => !assignedIds.has(String(t.unid)));

      const sameDept = courseDept
        ? remaining
            .filter((t) => t.department === courseDept)
            .map((t) => t.ID || t.name)
            .filter(Boolean)
        : [];

      const otherDepts = {};
      remaining
        .filter((t) => !courseDept || t.department !== courseDept)
        .forEach((t) => {
          const dept = t.department || "Other";
          if (!otherDepts[dept]) otherDepts[dept] = [];
          otherDepts[dept].push(t.ID || t.name);
        });

      return { assigned, courseDept, sameDept, otherDepts };
    },
    [curriculumData, allCoursesRaw, allTeachersRaw, teachers]
  );
  
  // Create refs for inputs within each batch
  const inputRefs = useRef({});
  const validationTimeouts = useRef({});
  const [showDropMenu, setShowDropMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [hoveredAction, setHoveredAction] = useState(null);
  
  // Drag and drop handlers
  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', JSON.stringify({ rowIndex, colIndex }));
    e.currentTarget.style.opacity = '0.5';
    // Store source cell info globally since getData doesn't work in dragOver
    window.__dragSourceCell = { rowIndex, colIndex };
  };
  
  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    window.__dragSourceCell = null;
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };
  
  const handleDragLeave = (e) => {
    // Only hide if leaving the cell completely
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
      setHoveredAction(null);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sourceData = window.__dragSourceCell;
    if (!sourceData) {
      setDragOver(false);
      setHoveredAction(null);
      return;
    }
    
    const targetRow = rowIndex;
    const targetCol = colIndex;
    
    // Don't drop on same cell
    if (sourceData.rowIndex === targetRow && sourceData.colIndex === targetCol) {
      setDragOver(false);
      setHoveredAction(null);
      return;
    }
    
    // Execute action based on which icon was hovered
    if (hoveredAction === 'copy' && onCopyCell) {
      onCopyCell(sourceData.rowIndex, sourceData.colIndex, targetRow, targetCol);
    } else if (hoveredAction === 'move' && onMoveCell) {
      onMoveCell(sourceData.rowIndex, sourceData.colIndex, targetRow, targetCol);
    }
    
    setDragOver(false);
    setHoveredAction(null);
    window.__dragSourceCell = null;
  };
  
  // Handle clearing all entries in the cell
  const handleClearCell = () => {
    const confirmClear = window.confirm('Are you sure you want to clear all entries in this cell?');
    if (!confirmClear) return;
    
    // Clear all batches in this cell
    for (let i = 0; i < batchCount; i++) {
      onUpdateBatch(rowIndex, colIndex, i, 'batchName', '');
      onUpdateBatch(rowIndex, colIndex, i, 'course', '');
      onUpdateBatch(rowIndex, colIndex, i, 'teacher', '');
      onUpdateBatch(rowIndex, colIndex, i, 'room', '');
      onUpdateBatch(rowIndex, colIndex, i, 'courseId', '');
      onUpdateBatch(rowIndex, colIndex, i, 'teacherId', '');
      onUpdateBatch(rowIndex, colIndex, i, 'roomId', '');
    }
  };

  const handleClearBatch = (batchIndex) => {
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'batchName', '');
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'course', '');
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'teacher', '');
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'room', '');
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'courseId', '');
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'teacherId', '');
    onUpdateBatch(rowIndex, colIndex, batchIndex, 'roomId', '');
  };

  // Handle input change with validation
  const handleInputChange = async (batchIndex, field, value) => {
    // Update the value immediately
    onUpdateBatch(rowIndex, colIndex, batchIndex, field, value);
    
    // Clear existing timeout for this field
    const timeoutKey = `${batchIndex}-${field}`;
    if (validationTimeouts.current[timeoutKey]) {
      clearTimeout(validationTimeouts.current[timeoutKey]);
    }
    
    // Debounce validation (wait 500ms after user stops typing)
    validationTimeouts.current[timeoutKey] = setTimeout(async () => {
      let validation = { isValid: true, error: null };
      let entityId = null;
      
      if (field === 'course') {
        if (!value.trim()) {
          // Clear the courseId when field is empty
          onUpdateBatch(rowIndex, colIndex, batchIndex, 'courseId', '');
        } else {
          validation = await validateCourse(value);
          if (validation.isValid) {
            entityId = await getCourseIdFromDisplay(value);
            if (entityId) {
              // Store the courseId immediately
              onUpdateBatch(rowIndex, colIndex, batchIndex, 'courseId', entityId);
            }
          }
        }
      } else if (field === 'teacher') {
        if (!value.trim()) {
          // Clear the teacherId when field is empty
          onUpdateBatch(rowIndex, colIndex, batchIndex, 'teacherId', '');
        } else {
          validation = await validateTeacher(value);
          if (validation.isValid) {
            entityId = await getTeacherIdFromDisplay(value);
            if (entityId) {
              // Store the teacherId immediately
              onUpdateBatch(rowIndex, colIndex, batchIndex, 'teacherId', entityId);
            }
          }
        }
      } else if (field === 'room') {
        if (!value.trim()) {
          // Clear the roomId when field is empty
          onUpdateBatch(rowIndex, colIndex, batchIndex, 'roomId', '');
        } else {
          validation = await validateRoom(value);
          if (validation.isValid) {
            entityId = await getRoomIdFromDisplay(value);
            if (entityId) {
              // Store the roomId immediately
              onUpdateBatch(rowIndex, colIndex, batchIndex, 'roomId', entityId);
            }
          }
        }
      }
      
      // Notify parent component of validation result
      if (onValidationChange) {
        const dataKey = `${rowIndex}-${colIndex}-${batchIndex}`;
        onValidationChange(dataKey, field, validation);
      }
    }, 500);
  };

  // Helper function to check if a cell has batch fields
  const cellHasBatchField = (targetRow, targetCol) => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    
    for (const input of allInputs) {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder !== 'Batch') continue;
      
      const cell = input.closest('td');
      if (!cell) continue;
      
      const row = cell.parentElement;
      const table = row.parentElement.parentElement;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const cells = Array.from(row.children).filter(c => c.tagName === 'TD');
      
      const cellRow = rows.indexOf(row);
      const cellCol = cells.indexOf(cell) - 1; // -1 for time column
      
      if (cellRow === targetRow && cellCol === targetCol) {
        return true;
      }
    }
    return false;
  };

  // Helper function to get the last batch index in a cell
  const getLastBatchIndex = (targetRow, targetCol) => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    let maxBatchIndex = 0;
    
    for (const input of allInputs) {
      const cell = input.closest('td');
      if (!cell) continue;
      
      const row = cell.parentElement;
      const table = row.parentElement.parentElement;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const cells = Array.from(row.children).filter(c => c.tagName === 'TD');
      
      const cellRow = rows.indexOf(row);
      const cellCol = cells.indexOf(cell) - 1; // -1 for time column
      
      if (cellRow === targetRow && cellCol === targetCol) {
        const batchDiv = input.closest('.flex-1');
        if (batchDiv) {
          const batchContainer = batchDiv.parentElement;
          const allBatches = Array.from(batchContainer.children);
          const currentBatchIdx = allBatches.indexOf(batchDiv);
          maxBatchIndex = Math.max(maxBatchIndex, currentBatchIdx);
        }
      }
    }
    return maxBatchIndex;
  };

  // Helper function to find input in another cell
  const findInputInCell = (targetRow, targetCol, fieldType, targetBatchIndex = 0) => {
    const allInputs = document.querySelectorAll('input[type="text"]');
    
    // Find the placeholder text for the field type
    let placeholderText;
    if (fieldType === 'batchName') placeholderText = 'Batch';
    else if (fieldType === 'course') placeholderText = 'Course';
    else if (fieldType === 'teacher') placeholderText = 'Teacher';
    else if (fieldType === 'room') placeholderText = 'Room';
    
    // Find all inputs with matching placeholder
    for (const input of allInputs) {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder !== placeholderText) continue;
      
      const cell = input.closest('td');
      if (!cell) continue;
      
      const row = cell.parentElement;
      const table = row.parentElement.parentElement;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      const cells = Array.from(row.children).filter(c => c.tagName === 'TD');
      
      const cellRow = rows.indexOf(row);
      const cellCol = cells.indexOf(cell) - 1; // -1 for time column
      
      // Check if this is the target cell
      if (cellRow === targetRow && cellCol === targetCol) {
        // Find the batch index of this input
        const batchDiv = input.closest('.flex-1');
        if (batchDiv) {
          const batchContainer = batchDiv.parentElement;
          const allBatches = Array.from(batchContainer.children);
          const currentBatchIdx = allBatches.indexOf(batchDiv);
          
          if (currentBatchIdx === targetBatchIndex) {
            return input;
          }
        }
      }
    }
    return null;
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, batchIndex, fieldType) => {
    const fields = showBatchField ? ['batchName', 'course', 'teacher', 'room'] : ['course', 'teacher', 'room'];
    const currentFieldIndex = fields.indexOf(fieldType);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Move to next field in current batch
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextRef = inputRefs.current[`${batchIndex}-${nextField}`];
        nextRef?.focus();
      } 
      // Move to next batch's first field
      else if (batchIndex < batchCount - 1) {
        const nextBatchFirstField = fields[0];
        const nextRef = inputRefs.current[`${batchIndex + 1}-${nextBatchFirstField}`];
        nextRef?.focus();
      }
      // Move to next cell - try to find next cell's first input
      else {
        const allInputs = document.querySelectorAll('input[type="text"]');
        const currentInput = e.target;
        const currentIndex = Array.from(allInputs).indexOf(currentInput);
        if (currentIndex >= 0 && currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1]?.focus();
        }
      }
    }
    
    // Arrow key navigation
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      
      // First, try to move to the same field in the next batch within the current cell
      if (batchIndex < batchCount - 1) {
        const nextRef = inputRefs.current[`${batchIndex + 1}-${fieldType}`];
        nextRef?.focus();
      }
      // If no more batches in current cell, move to the first field of the next cell's first batch
      else {
        let targetFieldType = fieldType;
        // If we're on a batch field, check if the next cell has batch field
        if (fieldType === 'batchName') {
          const nextCellHasBatch = cellHasBatchField(rowIndex, colIndex + 1);
          targetFieldType = nextCellHasBatch ? 'batchName' : 'course';
        }
        const targetInput = findInputInCell(rowIndex, colIndex + 1, targetFieldType, 0);
        targetInput?.focus();
      }
    }
    
    else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      
      // First, try to move to the same field in the previous batch within the current cell
      if (batchIndex > 0) {
        const prevRef = inputRefs.current[`${batchIndex - 1}-${fieldType}`];
        prevRef?.focus();
      }
      // If no previous batch in current cell, move to the last batch of the previous cell
      else if (colIndex > 0) {
        let targetFieldType = fieldType;
        let targetBatchIndex = 0;
        
        // If we're on a batch field, check if the previous cell has batch field
        if (fieldType === 'batchName') {
          const prevCellHasBatch = cellHasBatchField(rowIndex, colIndex - 1);
          targetFieldType = prevCellHasBatch ? 'batchName' : 'course';
          // Get the last batch index of the previous cell
          if (prevCellHasBatch) {
            targetBatchIndex = getLastBatchIndex(rowIndex, colIndex - 1);
          }
        } else {
          // For non-batch fields, also jump to the last batch
          targetBatchIndex = getLastBatchIndex(rowIndex, colIndex - 1);
        }
        
        const targetInput = findInputInCell(rowIndex, colIndex - 1, targetFieldType, targetBatchIndex);
        targetInput?.focus();
      }
    }
    
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      // Move to next field within the same cell and batch
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextRef = inputRefs.current[`${batchIndex}-${nextField}`];
        nextRef?.focus();
      }
      // If on last field (room), move to the cell below with smart batch logic
      else {
        const downCellHasBatch = cellHasBatchField(rowIndex + 1, colIndex);
        
        if (downCellHasBatch) {
          // Get the last batch index of the downward cell
          const downCellLastBatchIndex = getLastBatchIndex(rowIndex + 1, colIndex);
          // Try to jump to the same batch index, or the last available batch if current index is higher
          const targetBatchIndex = Math.min(batchIndex, downCellLastBatchIndex);
          const firstField = fields[0];
          const targetInput = findInputInCell(rowIndex + 1, colIndex, firstField, targetBatchIndex);
          targetInput?.focus();
        } else {
          // No batch field in downward cell, jump to course field
          const targetInput = findInputInCell(rowIndex + 1, colIndex, 'course', 0);
          targetInput?.focus();
        }
      }
    }
    
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      // Move to previous field within the same cell and batch
      if (currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1];
        const prevRef = inputRefs.current[`${batchIndex}-${prevField}`];
        prevRef?.focus();
      }
      // If on first field, move to last field (room) of the cell above (same batch index)
      else if (rowIndex > 0) {
        const lastField = fields[fields.length - 1];
        const targetInput = findInputInCell(rowIndex - 1, colIndex, lastField, batchIndex);
        targetInput?.focus();
      }
    }
  };

  // ── Cell-level conflict state (across ALL batches) ──────────────────────────
  // Derive the most severe conflict state for this cell to apply the right bg color.
  // Priority: schedule-active > temp-active > temp-resolved > none
  const cellConflictState = (() => {
    let hasScheduleActive = false;
    let hasTempActive     = false;
    let hasTempResolved   = false;

    if (conflicts instanceof Map) {
      for (let b = 0; b < batchCount; b++) {
        const list = conflicts.get(`${rowIndex}-${colIndex}-${b}`) || [];
        for (const c of list) {
          if (c.status === 'resolved') {
            hasTempResolved = true;
          } else if (c.source === 'temp') {
            hasTempActive = true;
          } else {
            hasScheduleActive = true;
          }
        }
      }
    }

    if (hasScheduleActive) return 'schedule-active';
    if (hasTempActive)     return 'temp-active';
    if (hasTempResolved)   return 'temp-resolved';
    return 'none';
  })();

  return (
    <td
      data-cell={dataCellKey || `${rowIndex}-${colIndex}`}
      className={`p-2 min-w-[140px] align-top relative group cursor-move transition-all border-r ${
        isHighlighted
          ? 'ring-2 ring-indigo-400 bg-indigo-50 border-indigo-300 animate-pulse'
          : dragOver
          ? 'ring-2 ring-gray-400 bg-gray-100 border-gray-300'
          : cellConflictState === 'schedule-active'
          ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
          : cellConflictState === 'temp-active'
          ? 'bg-rose-50 border-rose-200 ring-1 ring-rose-200'
          : cellConflictState === 'temp-resolved'
          ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200'
          : isFromTemp
          ? 'bg-yellow-50 border-amber-300 ring-1 ring-amber-200'
          : isFilled
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 opacity-50 hover:opacity-100 border-gray-200'
      }`}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => onCellFocus?.(rowIndex, colIndex)}
      onMouseLeave={() => onCellBlur?.()}
    >
      {/* Drag Indicator - Top Left */}
      <div className="absolute top-1 left-1 z-10">
        <div className="w-4 h-4 flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
          <GripVertical className="w-3 h-3" />
        </div>
      </div>

      {/* Action Buttons - Top Right */}
      <div className="absolute top-1 right-1 z-10 flex gap-1">
        {/* Delete Button — only shown when there is a single batch */}
        {batchCount === 1 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClearCell();
            }}
            className="w-5 h-5 flex items-center justify-center bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 rounded border border-gray-200 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all"
            title="Clear cell"
            type="button"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        
        {/* Create Batch Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCreateBatch(rowIndex, colIndex);
          }}
          className="w-5 h-5 flex items-center justify-center bg-white hover:bg-gray-900 text-gray-600 hover:text-white rounded border border-gray-200 hover:border-gray-900 opacity-0 group-hover:opacity-100 transition-all"
          title="Create new batch"
          type="button"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Drag Overlay with Action Icons */}
      {dragOver && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50 z-20 flex items-center justify-center gap-4 rounded backdrop-blur-sm"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Copy Icon */}
          <div
            onMouseEnter={() => setHoveredAction('copy')}
            onMouseLeave={() => setHoveredAction(null)}
            onDragOver={(e) => {
              e.preventDefault();
              setHoveredAction('copy');
            }}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg cursor-pointer transition-all duration-200 ${
              hoveredAction === 'copy'
                ? 'bg-blue-600 scale-110 shadow-xl'
                : 'bg-gray-400 hover:bg-gray-500 shadow-md'
            }`}
            title="Copy to this cell"
          >
            <Copy size={28} className="text-white pointer-events-none" />
            {hoveredAction === 'copy' && (
              <span className="text-white text-[10px] font-medium mt-1 pointer-events-none">Copy</span>
            )}
          </div>

          {/* Move Icon */}
          <div
            onMouseEnter={() => setHoveredAction('move')}
            onMouseLeave={() => setHoveredAction(null)}
            onDragOver={(e) => {
              e.preventDefault();
              setHoveredAction('move');
            }}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg cursor-pointer transition-all duration-200 ${
              hoveredAction === 'move'
                ? 'bg-green-600 scale-110 shadow-xl'
                : 'bg-gray-400 hover:bg-gray-500 shadow-md'
            }`}
            title="Move to this cell"
          >
            <Move size={28} className="text-white pointer-events-none" />
            {hoveredAction === 'move' && (
              <span className="text-white text-[10px] font-medium mt-1 pointer-events-none">Move</span>
            )}
          </div>

          {/* Cancel Icon */}
          <div
            onMouseEnter={() => setHoveredAction('cancel')}
            onMouseLeave={() => setHoveredAction(null)}
            onDragOver={(e) => {
              e.preventDefault();
              setHoveredAction('cancel');
            }}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg cursor-pointer transition-all duration-200 ${
              hoveredAction === 'cancel'
                ? 'bg-red-600 scale-110 shadow-xl'
                : 'bg-gray-400 hover:bg-gray-500 shadow-md'
            }`}
            title="Cancel"
          >
            <X size={28} className="text-white pointer-events-none" />
            {hoveredAction === 'cancel' && (
              <span className="text-white text-[10px] font-medium mt-1 pointer-events-none">Cancel</span>
            )}
          </div>
        </div>
      )}

      <div className="flex divide-x divide-gray-200 min-h-[70px]">
        {Array.from({ length: batchCount }).map((_, batchIndex) => {
          const dataKey = `${rowIndex}-${colIndex}-${batchIndex}`;
          const batch = batchData[dataKey] || {};
          // conflicts is Map<"row-col-batchIndex", ConflictDescriptor[]> (backend-driven)
          const conflictList = conflicts instanceof Map
            ? (conflicts.get(dataKey) || [])
            : [];
          const hasTeacherConflict = conflictList.some(c => c.type === 'teacher');
          const hasRoomConflict    = conflictList.some(c => c.type === 'room');
          
          // Validation errors
          const validationInfo = validationErrors?.[dataKey] || {};
          const hasCourseError = validationInfo.course && !validationInfo.course.isValid;
          const hasTeacherError = validationInfo.teacher && !validationInfo.teacher.isValid;
          const hasRoomError = validationInfo.room && !validationInfo.room.isValid;
          
          // Check if data is migrated (has IDs) or using old format
          const isCourseOldFormat = batch.course && !batch.courseId;
          const isTeacherOldFormat = batch.teacher && !batch.teacherId;
          const isRoomOldFormat = batch.room && !batch.roomId;

          return (
            <div key={batchIndex} className="relative group/batch flex-1 min-w-[70px] p-1 space-y-1">
              {/* Per-batch delete — only shown when there are multiple batches */}
              {batchCount > 1 && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveBatch(rowIndex, colIndex, batchIndex); }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-4 h-4 flex items-center justify-center bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded border border-gray-200 hover:border-red-300 opacity-0 group-hover/batch:opacity-100 transition-all"
                  title="Remove this split"
                  type="button"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
              {/* Batch Name Field - only shown when more than 1 batch */}
              {showBatchField && (
                <input
                  ref={(el) => {
                    inputRefs.current[`${batchIndex}-batchName`] = el;
                    // Set firstCellRef for the very first input
                    if (isFirstCell && batchIndex === 0 && firstCellRef) {
                      firstCellRef.current = el;
                    }
                  }}
                  type="text"
                  placeholder="Batch"
                  value={batch.batchName || ""}
                  onChange={(e) => onUpdateBatch(rowIndex, colIndex, batchIndex, 'batchName', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'batchName')}
                  className="w-full text-[10px] px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                />
              )}

              {/* Course Field */}
              <div className="relative">
                <SimpleCombobox
                  value={batch.course || ""}
                  onChange={(val) => {
                    handleInputChange(batchIndex, 'course', val);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'course')}
                  options={filteredCourses}
                  inputRef={(el) => {
                    inputRefs.current[`${batchIndex}-course`] = el;
                    if (isFirstCell && batchIndex === 0 && !showBatchField && firstCellRef) {
                      firstCellRef.current = el;
                    }
                  }}
                  className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                    hasCourseError
                      ? "border-orange-500 bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
                      : isCourseOldFormat
                      ? "border-red-900 bg-red-50 text-red-900 focus:ring-red-900 focus:border-red-900"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  placeholder="Course"
                  title={
                    hasCourseError
                      ? `⚠️ ${validationInfo.course?.error || 'Invalid course'}`
                      : isCourseOldFormat
                      ? "⚠️ Not migrated - Using old format (no ID reference)"
                      : ""
                  }
                />
                {hasCourseError && (
                  <AlertCircle className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500" />
                )}
              </div>

              {/* Teacher Field — smart grouped combobox */}
              <div className="relative">
                <TeacherCombobox
                  value={batch.teacher || ""}
                  onChange={(val) => handleInputChange(batchIndex, 'teacher', val)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'teacher')}
                  groups={getTeacherGroups(batch.course || "")}
                  inputRef={(el) => inputRefs.current[`${batchIndex}-teacher`] = el}
                  className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                    hasTeacherError
                      ? "border-orange-500 bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
                      : hasTeacherConflict
                      ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-500"
                      : isTeacherOldFormat
                      ? "border-red-900 bg-red-50 text-red-900 focus:ring-red-900 focus:border-red-900"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  placeholder="Teacher"
                  title={
                    hasTeacherError
                      ? `⚠️ ${validationInfo.teacher?.error || 'Invalid teacher'}`
                      : hasTeacherConflict
                      ? "⚠️ Conflict: Teacher assigned elsewhere at this time"
                      : isTeacherOldFormat
                      ? "⚠️ Not migrated - Using old format (no ID reference)"
                      : ""
                  }
                />
                {hasTeacherError && (
                  <AlertCircle className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500" />
                )}
              </div>

              {/* Room Field */}
              <div className="relative">
                <SimpleCombobox
                  value={batch.room || ""}
                  onChange={(val) => handleInputChange(batchIndex, 'room', val)}
                  onKeyDown={(e) => handleKeyDown(e, batchIndex, 'room')}
                  options={rooms}
                  inputRef={(el) => inputRefs.current[`${batchIndex}-room`] = el}
                  className={`w-full text-[10px] px-1 py-0.5 border rounded focus:outline-none focus:ring-1 ${
                    hasRoomError
                      ? "border-orange-500 bg-orange-50 focus:ring-orange-500 focus:border-orange-500"
                      : hasRoomConflict
                      ? "border-red-500 bg-red-50 focus:ring-red-400 focus:border-red-500"
                      : isRoomOldFormat
                      ? "border-red-900 bg-red-50 text-red-900 focus:ring-red-900 focus:border-red-900"
                      : "border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                  }`}
                  placeholder="Room"
                  title={
                    hasRoomError
                      ? `⚠️ ${validationInfo.room?.error || 'Invalid room'}`
                      : hasRoomConflict
                      ? "⚠️ Conflict: Room assigned elsewhere at this time"
                      : isRoomOldFormat
                      ? "⚠️ Not migrated - Using old format (no ID reference)"
                      : ""
                  }
                />
                {hasRoomError && (
                  <AlertCircle className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-orange-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Ghost suggestion overlay (purple) ───────────────────── */}
      {suggestions.length > 0 && !isFilled && (
        <div
          className={`mt-1 rounded border transition-all ${
            isSuggestionFocused
              ? 'border-purple-400 bg-purple-50 shadow-sm shadow-purple-100'
              : 'border-purple-200 bg-purple-50/60'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-1 px-1.5 pt-1 pb-0.5">
            <span className="text-[9px] font-semibold text-purple-500 uppercase tracking-wide">
              ✦ Suggestion
            </span>
          </div>

          {/* Top suggestion always visible */}
          {suggestions.slice(0, isSuggestionFocused ? suggestions.length : 1).map((s, i) => (
            <div
              key={i}
              className={`px-1.5 py-0.5 cursor-pointer group/sug transition-colors ${
                i > 0 ? 'border-t border-purple-100' : ''
              } hover:bg-purple-100 rounded`}
              title={s.reason}
              onClick={(e) => {
                e.stopPropagation();
                // Apply suggestion: fill batchIndex 0 with IDs + display names
                onUpdateBatch(rowIndex, colIndex, 0, 'course',    s.courseCode  || s.courseName || '');
                onUpdateBatch(rowIndex, colIndex, 0, 'courseId',  s.courseId    || '');
                onUpdateBatch(rowIndex, colIndex, 0, 'teacher',   s.teacherName || '');
                onUpdateBatch(rowIndex, colIndex, 0, 'teacherId', s.teacherId   || '');
                onUpdateBatch(rowIndex, colIndex, 0, 'room',      s.roomName    || '');
                onUpdateBatch(rowIndex, colIndex, 0, 'roomId',    s.roomId      || '');
                if (s.suggestBatchSplit) {
                  onCreateBatch(rowIndex, colIndex);
                }
              }}
            >
              <p className="text-[10px] font-medium text-purple-700 truncate">
                {s.courseCode || s.courseName}
              </p>
              <p className="text-[9px] text-purple-500 truncate">{s.teacherName}</p>
              <p className="text-[9px] text-purple-400 truncate">{s.roomName}</p>
              {i === 0 && !isSuggestionFocused && suggestions.length > 1 && (
                <p className="text-[8px] text-purple-300 mt-0.5">+{suggestions.length - 1} more (hover 2s)</p>
              )}
              {s.reason && isSuggestionFocused && (
                <p className="text-[8px] text-purple-300 mt-0.5 leading-tight line-clamp-2">{s.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </td>
  );
};

export default TimetableCell;
