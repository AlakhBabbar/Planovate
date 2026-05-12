import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Users, Building2, BookOpen, FolderSearch, Save, Download, Plus, X, Maximize2, Minimize2, Lock, Loader2, Wifi, WifiOff, Sparkles } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TimetableTable from "../components/timetableManagment/TimetableTable";
import BrowseTimetablesModal from "../components/timetableManagment/BrowseTimetablesModal";
import TimetableInfoForm from "../components/timetableManagment/TimetableInfoForm";
import ExportModal from "../components/timetableManagment/ExportModal";
import ConflictPanel from "../components/timetableManagment/ConflictPanel";
import SuggestionPanel from "../components/timetableManagment/SuggestionPanel";

import useTimetableStore from "../store/timetableStore";
import { exportTimetableToPdf, exportTimetablesToDoc, exportTimetablesToExcel, exportTimetablesToPdf } from "../utils";
import {
  checkExistingTimetable,
  createBatchInCell,
  updateBatchData,
  generateTableName,
  generateNextTimeSlot,
  DEFAULT_TIME_SLOTS,
} from "../utils/timetableUIHelpers";
import { courseService, roomService, teacherService, timetableService, settingsService, curriculumService, scheduleService, tempScheduleService, conflictService } from "../api";
import { resolveBatchDataForDisplay, convertDisplayToIds } from "../utils/idDisplayHelpers";
import { validateAllBatchData, hasValidationErrors, getValidationSummary } from "../utils/validationHelpers";
import { buildScheduleOccurrences, generateTimetableId } from "../utils/timetableHelpers";
import { normalize, safeId } from "../utils/dataHelpers";
import { useWebSocket } from "../hooks/useWebSocket";

// Generate unique table ID for internal use
const generateUniqueTableId = () => `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const Timetable = () => {
  // Routing — supports /timetable/:timetableId for deep linking
  const { timetableId: urlTimetableId } = useParams();
  const navigate = useNavigate();

  // Zustand store for global options
  const { courseOptions, teacherOptions, roomOptions, semesterOptions, fetchOptions, fetchTimetables, allCoursesRaw, allTeachersRaw } = useTimetableStore();
  
  // Generate initial unique table ID
  const [tables, setTables] = useState(() => [generateUniqueTableId()]);
  const [activeTable, setActiveTable] = useState(() => tables[0]);
  
  // Per-tab metadata: each tab has its own class, branch, semester, type
  const [tabMetadata, setTabMetadata] = useState(() => ({
    [tables[0]]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
  }));
  
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);

  // Programs and branches from settings
  const [programs, setPrograms] = useState([]);
  const [allBranches, setAllBranches] = useState([]);

  // Curriculum for the active tab's class (used to filter course/teacher dropdowns)
  const [activeCurriculum, setActiveCurriculum] = useState(null);

  const [batches, setBatches] = useState({});
  const [batchData, setBatchData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Conflict panel — focused cell tracking
  const [focusedCell, setFocusedCell] = useState(null); // { row, col }
  // Highlight state — set when navigating to a conflict
  const [highlightCell, setHighlightCell] = useState(null); // { row, col }
  const highlightTimerRef = useRef(null);

  // Global conflicts loaded from DB on page mount (shown even before any timetable is open)
  const [globalConflicts, setGlobalConflicts] = useState([]);
  const [globalConflictsLoading, setGlobalConflictsLoading] = useState(true);

  // Track loaded metadata per tab to prevent refetching on tab switch
  const loadedMetadataRef = useRef({});

  // Auto-save status: "saved" | "saving" | "unsaved"
  const [autoSaveStatus, setAutoSaveStatus] = useState("saved");

  // ── Recent changes: only the cells the user edited since the last auto-save ──
  // Keys are "tabKey:rowIndex-colIndex-batchIndex", values are the cell data objects.
  // We use BOTH a ref (for the interval closure) and state (for React to see updates).
  const recentChangesRef = useRef({});
  const [recentChanges, setRecentChanges] = useState({});
  const syncRecentChanges = (updater) => {
    const next = typeof updater === "function" ? updater(recentChangesRef.current) : updater;
    recentChangesRef.current = next;
    setRecentChanges(next);
  };

  // ── Cells that came from tempSchedules on load (for yellow highlight) ──
  // Keys are "rowIndex-colIndex" (cell position, not batch level).
  const [tempCells, setTempCells] = useState(new Set());

  // ── Unsaved-changes banner ─────────────────────────────────────────────────
  const [hasUnsavedFromTemp, setHasUnsavedFromTemp] = useState(false);
  const [wsReadyOverride, setWsReadyOverride] = useState(false);

  // Keep tabMetadata accessible inside async closures without stale-ref issues
  const tabMetadataRef = useRef(tabMetadata);
  useEffect(() => { tabMetadataRef.current = tabMetadata; }, [tabMetadata]);

  // ── WebSocket connection (compute engine + conflict detection) ───────────────
  const {
    wsStatus,
    wsReady,
    computing: wsComputing,
    suggestions: wsSuggestions,
    cellSuggestions: wsCellSuggestions,
    wsConflicts,
    suggestionsEnabled: wsSuggestionsEnabled,
    allSuggestions: wsAllSuggestions,
    openTimetable: wsOpenTimetable,
    closeTimetable: wsCloseTimetable,
    cursorMove: wsCursorMove,
    cellFocus: wsCellFocus,
    cellBlur: wsCellBlur,
    checkCell: wsCheckCell,
    enableSuggestions: wsEnableSuggestions,
    disableSuggestions: wsDisableSuggestions,
  } = useWebSocket();

  // Refs for keyboard navigation
  const semesterInputRef = useRef(null);
  const typeInputRef = useRef(null);
  const firstCellRef = useRef(null);

  // Helper function to find if a timetable is already open in any tab
  const findTabWithMetadata = (className, branch, semester, type) => {
    return tables.find(tab => {
      const meta = tabMetadata[tab];
      return meta?.className?.trim() === className?.trim() &&
             meta?.branch?.trim() === branch?.trim() &&
             meta?.semester?.trim() === semester?.trim() &&
             meta?.type?.trim() === type?.trim();
    });
  };

  // Fetch options once on component mount
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Pre-load timetables list so auto-load can match by fields
  useEffect(() => {
    fetchTimetables();
  }, [fetchTimetables]);

  // Load global conflicts from DB on page mount
  useEffect(() => {
    setGlobalConflictsLoading(true);
    conflictService.getAllConflicts()
      .then(c => setGlobalConflicts(c))
      .catch(console.error)
      .finally(() => setGlobalConflictsLoading(false));
  }, []);

  // ─── Helper: load + merge permanent schedules with temp schedules ────────────
  // Returns { resolvedBatchData, resolvedBatches, newTempCells, hasTempData }
  const loadAndMergeSchedules = async (timetableId) => {
    const { reconstructTimetableFromSchedules } = await import("../utils/timetableHelpers");

    const [permDocs, tempDocs] = await Promise.all([
      scheduleService.getSchedulesByTimetableId(timetableId),
      tempScheduleService.getTempSchedulesByTimetableId(timetableId),
    ]);

    // Build a map from docKey → { perm, temp } for merging
    // docKey pattern: "rowIndex-colIndex-batchIndex"
    const permMap = new Map();
    permDocs.forEach((d) => {
      const k = `${d.rowIndex}-${d.colIndex}-${d.batchIndex ?? 0}`;
      permMap.set(k, d);
    });

    const tempMap = new Map();
    tempDocs.forEach((d) => {
      const k = `${d.rowIndex}-${d.colIndex}-${d.batchIndex ?? 0}`;
      tempMap.set(k, d);
    });

    // Merge: for each key present in either collection take the newer entry
    const allKeys = new Set([...permMap.keys(), ...tempMap.keys()]);
    const merged = [];
    const newTempCells = new Set(); // "rowIndex-colIndex" cell positions from temp

    for (const k of allKeys) {
      const perm = permMap.get(k);
      const temp = tempMap.get(k);

      if (perm && temp) {
        // MongoDB returns plain JS Date — use getTime(), not Firebase's .toMillis()
        const permTs = perm.updatedAt ? new Date(perm.updatedAt).getTime() : 0;
        const tempTs = temp.updatedAt ? new Date(temp.updatedAt).getTime() : 0;
        // Prefer temp if it is newer OR same age (temp = in-progress work)
        if (tempTs >= permTs) {
          merged.push(temp);
          newTempCells.add(`${temp.rowIndex}-${temp.colIndex}`);
        } else {
          merged.push(perm);
        }
      } else if (temp) {
        merged.push(temp);
        newTempCells.add(`${temp.rowIndex}-${temp.colIndex}`);
      } else if (perm) {
        merged.push(perm);
      }
    }

    if (merged.length === 0) {
      return { resolvedBatchData: {}, resolvedBatches: {}, newTempCells, hasTempData: newTempCells.size > 0 };
    }

    const { batchesByTable, batchDataByTable } = reconstructTimetableFromSchedules(merged);

    // Merge ALL table groups together (temp and perm may have different tableIds due to the
    // generateTableName bug, so we combine everything into one view)
    const combinedBatchData = {};
    const combinedBatches = {};
    for (const tableData of Object.values(batchDataByTable)) {
      Object.assign(combinedBatchData, tableData);
    }
    for (const tableData of Object.values(batchesByTable)) {
      for (const [cellKey, count] of Object.entries(tableData)) {
        combinedBatches[cellKey] = Math.max(combinedBatches[cellKey] || 0, count);
      }
    }

    const resolvedBatchData = await resolveBatchDataForDisplay(combinedBatchData);

    return {
      resolvedBatchData,
      resolvedBatches: combinedBatches,
      newTempCells,
      hasTempData: newTempCells.size > 0,
    };
  };

  // Fetch programs and branches from settings
  useEffect(() => {
    settingsService.getAllSettings().then((settings) => {
      setPrograms(settings.programs || []);
      setAllBranches(settings.branches || []);
    }).catch((err) => console.error("Error loading settings:", err));
  }, []);

  // Fetch curriculum for the active tab whenever its metadata changes
  useEffect(() => {
    const meta = tabMetadata[activeTable] || {};
    if (!meta.className || !meta.branch || !meta.semester || !meta.type) {
      setActiveCurriculum(null);
      return;
    }
    // Try to find a matching curriculum by field values (case-insensitive)
    curriculumService.listCurriculums().then((list) => {
      const norm = (v) => String(v ?? "").trim().toLowerCase();
      const found = (list || []).find(
        (c) =>
          norm(c.class) === norm(meta.className) &&
          norm(c.branch) === norm(meta.branch) &&
          norm(c.semester) === norm(meta.semester) &&
          norm(c.type) === norm(meta.type)
      );
      setActiveCurriculum(found || null);
    }).catch((err) => {
      console.error("Error fetching curriculum:", err);
      setActiveCurriculum(null);
    });
  }, [tabMetadata[activeTable]?.className, tabMetadata[activeTable]?.branch, tabMetadata[activeTable]?.semester, tabMetadata[activeTable]?.type, activeTable]);

  // Check for existing timetable when branch, class, and semester are filled for current tab
  useEffect(() => {
    let cancelled = false;

    const loadExisting = async () => {
      const currentMeta = tabMetadata[activeTable];
      if (!currentMeta?.className?.trim() || !currentMeta?.branch?.trim() || !currentMeta?.semester?.trim() || !currentMeta?.type?.trim()) {
        return;
      }

      // Check if this timetable is already open in another tab
      const existingTab = findTabWithMetadata(currentMeta.className, currentMeta.branch, currentMeta.semester, currentMeta.type);
      if (existingTab && existingTab !== activeTable) {
        // Clear input fields in current tab before switching
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
        }));
        // Switch to the existing tab instead of loading again
        setActiveTable(existingTab);
        return;
      }

      // Check if we've already loaded this exact metadata for this tab
      const metaKey = `${activeTable}-${currentMeta.className}-${currentMeta.branch}-${currentMeta.semester}-${currentMeta.type}`;
      if (loadedMetadataRef.current[metaKey]) {
        return; // Skip fetch if already loaded
      }

      setIsLoadingExisting(true);

      // Find a matching timetable from the already-loaded list first.
      // This mirrors the Browse approach: use the STORED timetableId rather than
      // regenerating it from the field values (which may differ in formatting,
      // e.g. semester "1" stored vs "Sem 1" in course documents).
      // Read directly from store state (not closure) to always get the latest list.
      const { allTimetables: latestTimetables } = useTimetableStore.getState();
      const norm = (v) => String(v ?? "").trim().toLowerCase();
      const matched = (latestTimetables || []).find(
        (tt) =>
          norm(tt.class) === norm(currentMeta.className) &&
          norm(tt.branch) === norm(currentMeta.branch) &&
          norm(tt.semester) === norm(currentMeta.semester) &&
          norm(tt.type) === norm(currentMeta.type)
      );

      let existingTimetable = null;
      if (matched?.timetableId) {
        // Load directly via the real stored ID (same as Browse does)
        const raw = await timetableService.loadTimetable(matched.timetableId);
        if (raw) {
          existingTimetable = {
            ...raw,
            timetableId: matched.timetableId,
            tables: raw.tables || ["Table 1"],
            timeSlots: raw.timeSlots || DEFAULT_TIME_SLOTS,
            batchesByTable: raw.batchesByTable || {},
            batchDataByTable: raw.batchDataByTable || {},
          };
        }
      } else {
        // Fallback: try generating the ID from field values (works when strings match exactly)
        existingTimetable = await checkExistingTimetable(
          currentMeta.className,
          currentMeta.branch,
          currentMeta.semester,
          currentMeta.type,
          timetableService
        );
      }
      
      if (cancelled) return;

      if (existingTimetable) {
        const ttId = existingTimetable.timetableId;

        // Fetch permanent + temp schedules and merge them
        const { resolvedBatchData, resolvedBatches, newTempCells, hasTempData } =
          await loadAndMergeSchedules(ttId);

        if (cancelled) return;

        // Load data into the ACTIVE tab only
        const loadedTimeSlots = existingTimetable.timeSlots || DEFAULT_TIME_SLOTS;
        setTimeSlots(loadedTimeSlots);
        setBatches(prev => ({ ...prev, [activeTable]: resolvedBatches }));
        setBatchData(prev => ({ ...prev, [activeTable]: resolvedBatchData }));
        setTempCells(newTempCells);
        setHasUnsavedFromTemp(hasTempData);

        // Update timetableId in metadata
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { ...prev[activeTable], timetableId: ttId }
        }));

        // Mark this metadata as loaded
        loadedMetadataRef.current[metaKey] = true;

        // → Open WebSocket session for compute engine suggestions
        wsOpenTimetable(
          ttId,
          { class: currentMeta.className, branch: currentMeta.branch, semester: currentMeta.semester, type: currentMeta.type },
          ["mon", "tue", "wed", "thu", "fri", "sat"],
          loadedTimeSlots
        );
      } else {
        // No existing timetable found — clear stale grid data from previous timetable
        setBatches(prev => ({ ...prev, [activeTable]: {} }));
        setBatchData(prev => ({ ...prev, [activeTable]: {} }));
        setTempCells(new Set());
        setHasUnsavedFromTemp(false);
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { ...prev[activeTable], timetableId: '' }
        }));
        wsCloseTimetable();
        // Mark as loaded so we don't re-fetch
        loadedMetadataRef.current[metaKey] = true;
      }
      
      setIsLoadingExisting(false);
    };

    const timeoutId = setTimeout(loadExisting, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [tabMetadata[activeTable]?.className, tabMetadata[activeTable]?.branch, tabMetadata[activeTable]?.semester, tabMetadata[activeTable]?.type]);

  // ─── Auto-save: every 5s, save ONLY recentChanges to tempSchedules ──────────
  useEffect(() => {
    const timetableId = tabMetadata[activeTable]?.timetableId;
    const meta        = tabMetadata[activeTable] || {};
    const metaComplete = !!(meta.className && meta.branch && meta.semester && meta.type);
    if (!timetableId || !metaComplete) return;

    const interval = setInterval(async () => {
      // Read from ref — no re-render cost, always current
      const changes = recentChangesRef.current;
      if (Object.keys(changes).length === 0) return; // nothing to save

      try {
        setAutoSaveStatus("saving");
        const currentMeta = tabMetadataRef.current[activeTable] || {};
        const tableName   = generateTableName(activeTable, tables);

        // Build minimal occurrences list — only the changed cells
        // We keep display names for temp schedules so work isn't lost if IDs aren't resolved yet
        const convertedChanges = await convertDisplayToIds(changes, true);
        const occurrences = [];
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        for (const [cellKey, cellData] of Object.entries(convertedChanges)) {
          // cellKey format: "rowIndex-colIndex-batchIndex"
          const [rowIndex, colIndex, batchIndex] = cellKey.split("-").map(Number);
          occurrences.push({
            timetableId,
            tableId: tableName,
            rowIndex,
            colIndex,
            batchIndex: batchIndex ?? 0,
            day: days[colIndex] ?? "",
            time: timeSlots[rowIndex] ?? "",
            class: currentMeta.className,
            branch: currentMeta.branch,
            semester: currentMeta.semester,
            type: currentMeta.type,
            batch: cellData.batchName || "",
            courseId: cellData.courseId || "",
            teacherId: cellData.teacherId || "",
            roomId: cellData.roomId || "",
            // Fallbacks for display names (important for temp storage)
            course: cellData.course || "",
            teacher: cellData.teacher || "",
            room: cellData.room || "",
          });
        }

        if (occurrences.length > 0) {
          await tempScheduleService.upsertTempSchedules(timetableId, occurrences);
        }

        // Clear only the keys we just saved
        syncRecentChanges((prev) => {
          const next = { ...prev };
          Object.keys(changes).forEach((k) => delete next[k]);
          return next;
        });

        setAutoSaveStatus("saved");
      } catch (err) {
        console.error("[auto-save] error:", err);
        setAutoSaveStatus("unsaved");
      }
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabMetadata[activeTable]?.timetableId, activeTable, timeSlots]);

  // ─── Ctrl+S keyboard shortcut ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveTimetableData();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTable, tabMetadata, batches, batchData, timeSlots]);

  const handleLoadSelectedTimetable = async (timetable) => {
    try {
      // Check if this timetable is already open in another tab
      const existingTab = findTabWithMetadata(timetable.class, timetable.branch, timetable.semester, timetable.type);
      if (existingTab) {
        setTabMetadata(prev => ({
          ...prev,
          [activeTable]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
        }));
        setActiveTable(existingTab);
        setShowBrowseModal(false);
        return;
      }

      const loadedTimetable = await timetableService.loadTimetable(timetable.timetableId);
      if (!loadedTimetable) return;

      // Update metadata first
      setTabMetadata(prev => ({
        ...prev,
        [activeTable]: {
          className: timetable.class || "",
          branch: timetable.branch || "",
          semester: timetable.semester || "",
          type: timetable.type || "",
          timetableId: timetable.timetableId
        }
      }));

      setTimeSlots(loadedTimetable.timeSlots);

      // Fetch permanent + temp schedules and merge
      const { resolvedBatchData, resolvedBatches, newTempCells, hasTempData } =
        await loadAndMergeSchedules(timetable.timetableId);

      setBatches(prev => ({ ...prev, [activeTable]: resolvedBatches }));
      setBatchData(prev => ({ ...prev, [activeTable]: resolvedBatchData }));
      setTempCells(newTempCells);
      setHasUnsavedFromTemp(hasTempData);
      setShowBrowseModal(false);
    } catch (error) {
      console.error("Error loading timetable:", error);
    }
  };

  // Discard unsaved temp-schedule changes
  const handleDiscardTemp = async () => {
    const timetableId = tabMetadata[activeTable]?.timetableId;
    if (!timetableId) return;
    if (!window.confirm("Discard all unsaved changes from the previous session?")) return;
    try {
      await tempScheduleService.deleteTempSchedulesByTimetableId(timetableId);
      // Reload from permanent schedules only (temp is now deleted so merge returns perm-only)
      const { resolvedBatchData, resolvedBatches } = await loadAndMergeSchedules(timetableId);
      setBatches(prev => ({ ...prev, [activeTable]: resolvedBatches }));
      setBatchData(prev => ({ ...prev, [activeTable]: resolvedBatchData }));
      setTempCells(new Set());
      setHasUnsavedFromTemp(false);
      syncRecentChanges({});
    } catch (err) {
      console.error("[discard] error:", err);
    }
  };

  // Promote temp schedules → permanent schedules (called from "Save Now" banner)
  const handleSaveFromTemp = async () => {
    const timetableId = tabMetadata[activeTable]?.timetableId;
    const currentMeta = tabMetadata[activeTable];
    if (!timetableId || !currentMeta) {
      alert("No timetable loaded. Fill in the fields and save first.");
      return;
    }
    try {
      // Fetch raw temp docs directly from API (source of truth)
      const tempDocs = await tempScheduleService.getTempSchedulesByTimetableId(timetableId);
      if (!tempDocs || tempDocs.length === 0) {
        setHasUnsavedFromTemp(false);
        return;
      }

      // Overwrite permanent schedules with temp data
      // saveSchedules does: delete all existing for timetableId, then insert new ones
      await scheduleService.saveSchedules({ timetableId, schedules: tempDocs });

      // Clear temp
      await tempScheduleService.deleteTempSchedulesByTimetableId(timetableId);

      setTempCells(new Set());
      setHasUnsavedFromTemp(false);
      syncRecentChanges({});
      alert("✅ Changes saved permanently!");
    } catch (err) {
      console.error("[save-from-temp] error:", err);
      alert("Failed to save. Check console.");
    }
  };

  const createBatch = (rowIndex, colIndex) => {
    setBatches((prev) => createBatchInCell(prev, activeTable, rowIndex, colIndex));
  };

  const removeBatch = (rowIndex, colIndex, batchIndex) => {
    const key = `${rowIndex}-${colIndex}`;
    const currentCount = (batches[activeTable] || {})[key] || 1;
    if (currentCount <= 1) return; // nothing to remove

    // Shift batch data: move entries after batchIndex down by 1
    setBatchData((prev) => {
      const tableData = { ...(prev[activeTable] || {}) };
      const now = Date.now();
      const changes = {};
      // Shift batches above batchIndex down, stamping _updatedAt on each moved cell
      for (let i = batchIndex; i < currentCount - 1; i++) {
        const src = tableData[`${rowIndex}-${colIndex}-${i + 1}`] || {};
        const cell = { ...src, _updatedAt: now };
        tableData[`${rowIndex}-${colIndex}-${i}`] = cell;
        changes[`${rowIndex}-${colIndex}-${i}`] = cell;
      }
      // Remove the last (now duplicated) entry
      delete tableData[`${rowIndex}-${colIndex}-${currentCount - 1}`];
      // Track as recent changes
      syncRecentChanges((prev) => ({ ...prev, ...changes }));
      return { ...prev, [activeTable]: tableData };
    });

    // Decrement batch count
    setBatches((prev) => ({
      ...prev,
      [activeTable]: {
        ...(prev[activeTable] || {}),
        [key]: currentCount - 1,
      },
    }));
  };

  const updateBatch = (rowIndex, colIndex, batchIndex, field, value) => {
    const cellKey = `${rowIndex}-${colIndex}-${batchIndex}`;
    setBatchData((prev) => {
      const { updatedBatchData } = updateBatchData({
        currentBatchData: prev,
        currentBatches: batches,
        activeTable,
        rowIndex,
        colIndex,
        batchIndex,
        field,
        value,
        tables,
        // No frontend conflict check — backend handles it via WS
      });

      // Track this cell as a recent change for auto-save
      const updatedCell = (updatedBatchData[activeTable] || {})[cellKey] || {};
      syncRecentChanges((prev) => ({ ...prev, [cellKey]: updatedCell }));

      // ── Send to backend for real-time conflict validation ───────────────
      // Only check when teacher or room changes (the two conflict-relevant fields)
      if ((field === 'teacherId' || field === 'roomId') && wsReady) {
        const currentCell = (updatedBatchData[activeTable] || {})[cellKey] || {};
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const day  = days[colIndex] || '';
        const time = timeSlots[rowIndex] || '';
        wsCheckCell(rowIndex, colIndex, batchIndex, {
          day,
          time,
          teacherId: field === 'teacherId' ? value : (currentCell.teacherId || ''),
          roomId:    field === 'roomId'    ? value : (currentCell.roomId    || ''),
        });
      }

      return updatedBatchData;
    });
  };

  // ── Conflict panel: cell focus tracking ───────────────────────────────────
  const handleCellFocusForPanel = useCallback((row, col) => {
    setFocusedCell({ row, col });
    wsCellFocus(row, col);
  }, [wsCellFocus]);

  // ── Navigate to a conflicting cell in another timetable ───────────────────
  const navigateToConflict = useCallback(async (conflict) => {
    // TARGET = the CONFLICTING timetable (not the source/caller's)
    const targetId = conflict.conflictingTimetableId || conflict.conflictTimetableId;
    if (!targetId) {
      console.warn('[navigate] missing conflictingTimetableId in conflict:', conflict);
      return;
    }

    // Check if target timetable is already open in any tab
    const existingTab = tables.find(t => {
      const meta = tabMetadataRef.current[t];
      return meta?.timetableId === targetId;
    });

    if (existingTab) {
      // Already open — just switch
      setActiveTable(existingTab);
    } else {
      // Open a NEW tab with the conflict timetable metadata.
      // The useEffect watching [className, branch, semester, type] will auto-load
      // the schedules and open the WS session once we switch to it.
      const newTabId = generateUniqueTableId();

      setTabMetadata(prev => ({
        ...prev,
        [newTabId]: {
          className:   conflict.displayClass    || '',
          branch:      conflict.displayBranch   || '',
          semester:    conflict.displaySemester || '',
          type:        conflict.displayType     || '',
          timetableId: targetId,
        }
      }));

      setTables(prev => [...prev, newTabId]);
      setActiveTable(newTabId);
    }

    navigate(`/timetable/${targetId}`, { replace: true });

    // Highlight AFTER schedule has had time to load (useEffect fires ~500ms after metadata change)
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightCell({ row: conflict.rowIndex, col: conflict.colIndex });
      const cellEl = document.querySelector(
        `[data-cell="${conflict.rowIndex}-${conflict.colIndex}"]`
      );
      if (cellEl) cellEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Auto-clear after 3s
      highlightTimerRef.current = setTimeout(() => setHighlightCell(null), 3000);
    }, 900);
  }, [tables, navigate, tabMetadataRef]);

  // ── URL param auto-load on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!urlTimetableId) return;
    // Only auto-load if no timetable is loaded yet in the active tab
    const currentMeta = tabMetadataRef.current[activeTable];
    if (currentMeta?.timetableId) return;

    timetableService.loadTimetable(urlTimetableId).then(tt => {
      if (!tt) return;
      setTabMetadata(prev => ({
        ...prev,
        [activeTable]: {
          className:   tt.timetable?.class    || '',
          branch:      tt.timetable?.branch   || '',
          semester:    tt.timetable?.semester || '',
          type:        tt.timetable?.type     || '',
          timetableId: urlTimetableId,
        }
      }));
    }).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTimetableId]);

  // Copy cell data from source to target
  const handleCopyCell = (sourceRow, sourceCol, targetRow, targetCol) => {

    const sourceBatchData = batchData[activeTable] || {};
    const sourceBatches = batches[activeTable] || {};
    const sourceKey = `${sourceRow}-${sourceCol}`;
    const sourceBatchCount = sourceBatches[sourceKey] || 1;
    
    // Copy batch count
    setBatches(prev => ({
      ...prev,
      [activeTable]: {
        ...prev[activeTable],
        [`${targetRow}-${targetCol}`]: sourceBatchCount
      }
    }));
    
    // Copy all batch data, stamping _updatedAt on each target cell
    const now = Date.now();
    setBatchData(prev => {
      const newBatchData = { ...prev };
      if (!newBatchData[activeTable]) newBatchData[activeTable] = {};
      const changes = {};

      for (let i = 0; i < sourceBatchCount; i++) {
        const sourceDataKey = `${sourceRow}-${sourceCol}-${i}`;
        const targetDataKey = `${targetRow}-${targetCol}-${i}`;
        const sourceData = sourceBatchData[sourceDataKey];
        if (sourceData) {
          const cell = { ...sourceData, _updatedAt: now };
          newBatchData[activeTable][targetDataKey] = cell;
          changes[targetDataKey] = cell;
        }
      }

      // Track copied cells as recent changes
      syncRecentChanges((prev) => ({ ...prev, ...changes }));
      return newBatchData;
    });
  };
  
  // Move cell data from source to target
  const handleMoveCell = (sourceRow, sourceCol, targetRow, targetCol) => {
    const sourceBatchData = batchData[activeTable] || {};
    const sourceBatches = batches[activeTable] || {};
    const sourceKey = `${sourceRow}-${sourceCol}`;
    const sourceBatchCount = sourceBatches[sourceKey] || 1;
    
    // Copy to target first
    handleCopyCell(sourceRow, sourceCol, targetRow, targetCol);
    
    // Clear source cell
    setBatches(prev => ({
      ...prev,
      [activeTable]: {
        ...prev[activeTable],
        [sourceKey]: 1 // Reset to 1 batch
      }
    }));
    
    setBatchData(prev => {
      const newBatchData = { ...prev };
      if (!newBatchData[activeTable]) {
        newBatchData[activeTable] = {};
      }
      
      // Clear all source batches
      for (let i = 0; i < sourceBatchCount; i++) {
        const sourceDataKey = `${sourceRow}-${sourceCol}-${i}`;
        delete newBatchData[activeTable][sourceDataKey];
      }
      
      return newBatchData;
    });
  };
  
  // Handle validation state updates from cells
  const handleValidationChange = (dataKey, field, validation) => {
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      
      // Initialize errors for this cell if not exists
      if (!newErrors[activeTable]) {
        newErrors[activeTable] = {};
      }
      if (!newErrors[activeTable][dataKey]) {
        newErrors[activeTable][dataKey] = {};
      }
      
      // Update validation for this field
      if (validation.isValid) {
        // Remove error if valid
        delete newErrors[activeTable][dataKey][field];
        // Clean up empty objects
        if (Object.keys(newErrors[activeTable][dataKey]).length === 0) {
          delete newErrors[activeTable][dataKey];
        }
        if (Object.keys(newErrors[activeTable]).length === 0) {
          delete newErrors[activeTable];
        }
      } else {
        // Add error if invalid
        newErrors[activeTable][dataKey][field] = validation;
      }
      
      return newErrors;
    });
  };

  // Calculate validation stats
  const activeValidationErrors = validationErrors[activeTable] || {};
  const validationErrorCount = Object.keys(activeValidationErrors).length;

  // Metadata completeness — all four fields must be filled to unlock the grid
  const activeMetadata = tabMetadata[activeTable] || {};
  const isMetadataComplete = !!(activeMetadata.className && activeMetadata.branch && activeMetadata.semester && activeMetadata.type);

  // Keyboard navigation handlers
  const handleSemesterKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      typeInputRef.current?.focus();
    }
  };

  const handleTypeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus first cell input after a short delay to ensure table is rendered
      setTimeout(() => {
        firstCellRef.current?.focus();
      }, 100);
    }
  };

  const addTable = () => {
    const newTable = generateUniqueTableId();
    setTables([...tables, newTable]);
    setActiveTable(newTable);
    // Initialize metadata for new tab
    setTabMetadata(prev => ({
      ...prev,
      [newTable]: { className: "", branch: "", semester: "", type: "", timetableId: "" }
    }));
  };

  const removeTable = (table) => {
    setTables(tables.filter((t) => t !== table));
    if (activeTable === table && tables.length > 1) {
      setActiveTable(tables[0]);
    }
    // Remove metadata for deleted tab
    setTabMetadata(prev => {
      const newMetadata = { ...prev };
      delete newMetadata[table];
      return newMetadata;
    });
  };

  const addTimeSlot = () => {
    const newSlot = generateNextTimeSlot(timeSlots);
    setTimeSlots([...timeSlots, newSlot]);
  };

  const saveTimetableData = async () => {
    const currentMeta = tabMetadata[activeTable];
    if (!currentMeta?.className?.trim() || !currentMeta?.branch?.trim() || !currentMeta?.semester?.trim() || !currentMeta?.type?.trim()) {
      alert("Please fill in Class, Branch, Semester, and Type fields");
      return;
    }

    try {
      // Get the active table's data with proper table name
      const tableName = generateTableName(activeTable, tables);
      
      // Validate all batch data before converting
      const currentBatchData = batchData[activeTable] || {};
      
      // Run validation on all batch data
      const errors = await validateAllBatchData(currentBatchData);
      
      // Check if there are any validation errors
      if (hasValidationErrors(errors)) {
        const summary = getValidationSummary(errors);
        const errorMessage = `Cannot save timetable. Please fix the following errors:\n\n` +
          `- Invalid courses: ${summary.courseErrors}\n` +
          `- Invalid teachers: ${summary.teacherErrors}\n` +
          `- Invalid rooms: ${summary.roomErrors}\n\n` +
          `Total errors: ${summary.totalErrors}\n\n` +
          `Make sure all courses, teachers, and rooms exist in the database.`;
        alert(errorMessage);
        
        // Update validation state to show errors
        setValidationErrors(prev => ({
          ...prev,
          [activeTable]: errors
        }));
        return;
      }
      
      // Convert display names back to IDs before saving
      const convertedBatchData = await convertDisplayToIds(currentBatchData);
      
      // Verify that all entries have IDs
      let missingIds = false;
      for (const [key, value] of Object.entries(convertedBatchData)) {
        if (value.course && !value.courseId) {
          console.error(`Missing courseId for key ${key}:`, value);
          missingIds = true;
        }
        if (value.teacher && !value.teacherId) {
          console.error(`Missing teacherId for key ${key}:`, value);
          missingIds = true;
        }
        if (value.room && !value.roomId) {
          console.error(`Missing roomId for key ${key}:`, value);
          missingIds = true;
        }
      }
      
      if (missingIds) {
        alert("Error: Some entries could not be converted to IDs. Please ensure all courses, teachers, and rooms exist in the database.");
        return;
      }
      
      const batchesByTable = {
        [tableName]: batches[activeTable] || {}
      };
      const batchDataByTable = {
        [tableName]: convertedBatchData
      };
      
      console.log('🚀 Saving timetable with data:', {
        meta: {
          class: currentMeta.className,
          branch: currentMeta.branch,
          semester: currentMeta.semester,
          type: currentMeta.type,
        },
        tableName,
        timeSlots,
        batchesByTable,
        batchDataByTable
      });
      
      const id = await timetableService.saveTimetable({
        meta: {
          class: currentMeta.className,
          branch: currentMeta.branch,
          semester: currentMeta.semester,
          type: currentMeta.type,
        },
        tables: [tableName],
        timeSlots,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        batchesByTable,
        batchDataByTable,
      });

      // Generate individual schedule entries and save them permanently
      const occurrences = buildScheduleOccurrences({
        timetableId: id,
        meta: {
          class: currentMeta.className,
          branch: currentMeta.branch,
          semester: currentMeta.semester,
          type: currentMeta.type,
        },
        tables: [tableName],
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        timeSlots,
        batchesByTable,
        batchDataByTable,
      });
      await scheduleService.saveSchedules({ timetableId: id, schedules: occurrences });

      // After permanent save, clear temp entries and local unsaved state
      await tempScheduleService.deleteTempSchedulesByTimetableId(id).catch(() => {});
      syncRecentChanges({});
      setTempCells(new Set());
      setHasUnsavedFromTemp(false);

      setTabMetadata(prev => ({
        ...prev,
        [activeTable]: { ...prev[activeTable], timetableId: id }
      }));
      setAutoSaveStatus("saved");
      alert(`✅ Timetable saved successfully! (ID: ${id})`);
    } catch (error) {
      console.error("Error saving timetable:", error);
      alert("Failed to save timetable. Check console for details.");
    }
  };

  const buildExportMetaForTable = (tableKey) => {
    const m = tabMetadata[tableKey] ?? {};
    return {
      name: m?.timetableId || "",
      class: m?.className || "",
      branch: m?.branch || "",
      semester: m?.semester || "",
      type: m?.type || "",
    };
  };

  const buildExportTablePayload = (tableKey) => {
    const tableIndex = Math.max(0, tables.indexOf(tableKey));
    const tableLabel = `Table ${tableIndex + 1}`;
    const tableMeta = buildExportMetaForTable(tableKey);
    return {
      tableId: tableLabel,
      meta: tableMeta,
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlots,
      batchesByTable: {
        [tableLabel]: batches[tableKey] || {},
      },
      batchDataByTable: {
        [tableLabel]: batchData[tableKey] || {},
      },
    };
  };

  const handleExportConfirm = ({ format, scope }) => {
    const tableKeys = scope === "all" ? tables : [activeTable];
    const tablesPayload = tableKeys.map((k) => buildExportTablePayload(k));

    // For naming, prefer the active table's metadata.
    const activeMeta = buildExportMetaForTable(activeTable);
    const baseNameParts = [activeMeta.class, activeMeta.branch, activeMeta.semester, activeMeta.type].filter(Boolean);
    const baseFileName = baseNameParts.join(" ") || "timetable";

    if (format === "pdf") {
      if (tablesPayload.length === 1) {
        exportTimetableToPdf({
          fileName: baseFileName,
          meta: activeMeta,
          ...tablesPayload[0],
        });
      } else {
        exportTimetablesToPdf({
          fileName: `${baseFileName} (all)`,
          meta: activeMeta,
          tables: tablesPayload,
        });
      }
    } else if (format === "excel") {
      exportTimetablesToExcel({
        fileName: scope === "all" ? `${baseFileName} (all)` : baseFileName,
        meta: activeMeta,
        tables: tablesPayload,
      });
    } else if (format === "doc") {
      exportTimetablesToDoc({
        fileName: scope === "all" ? `${baseFileName} (all)` : baseFileName,
        meta: activeMeta,
        tables: tablesPayload,
      });
    }

    setShowExportModal(false);
  };

  // Fullscreen toggle function
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  // Listen for fullscreen changes (e.g., user pressing ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="fixed bottom-6 right-6 z-50 p-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors shadow-lg"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
      
      {/* Floating Teacher & Room Conflict Warnings - hidden, moved to sidebar */}


      <div className="flex gap-4 p-6 animate-fadeIn">
        {/* Main Content - Timetable Area */}
        <div className="flex-1 min-w-0">
        {/* Tabs and Action Buttons Row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {tables.map((tableId, index) => (
              <div
                key={tableId}
                className={`px-3 py-1.5 cursor-pointer flex items-center rounded text-xs transition-all ${
                  tableId === activeTable
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTable(tableId)}
              >
                <span>Table {index + 1}</span>
                {tables.length > 1 && (
                  <button
                    className="ml-1.5 text-current opacity-60 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTable(tableId);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            <button 
              className="px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1"
              onClick={addTable}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          {/* Action Buttons - Save & Export */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Auto-save status indicator */}
            {tabMetadata[activeTable]?.timetableId && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-all ${
                autoSaveStatus === "saving"
                  ? "text-yellow-700 bg-yellow-50 border border-yellow-200"
                  : autoSaveStatus === "unsaved"
                  ? "text-red-700 bg-red-50 border border-red-200"
                  : "text-green-700 bg-green-50 border border-green-200"
              }`}>
                {autoSaveStatus === "saving" ? (
                  <><Loader2 size={12} className="animate-spin" /> Auto-backing up...</>
                ) : autoSaveStatus === "unsaved" ? (
                  <><AlertCircle size={12} /> Not backed up</>
                ) : (
                  <><CheckCircle size={12} /> Auto-backed up</>
                )}
              </span>
            )}
            {/* WS connection status */}
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border transition-all ${
              wsStatus === "connected"
                ? "text-purple-600 bg-purple-50 border-purple-200"
                : wsStatus === "connecting"
                ? "text-gray-500 bg-gray-50 border-gray-200"
                : "text-gray-400 bg-gray-50 border-gray-200"
            }`} title={`Compute engine: ${wsStatus}`}>
              {wsStatus === "connected" ? (
                <><Sparkles size={12} /> Engine Ready</>
              ) : wsStatus === "connecting" ? (
                <><Loader2 size={12} className="animate-spin" /> Connecting...</>
              ) : (
                <><WifiOff size={12} /> Offline</>
              )}
            </span>
            <button
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2"
              onClick={saveTimetableData}
              type="button"
              title="Save (Ctrl+S)"
            >
              <Save size={16} />
              Save
            </button>
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
              onClick={() => setShowExportModal(true)}
              type="button"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Unsaved temp-schedule changes banner */}
        {hasUnsavedFromTemp && (
          <div className="mb-3 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
              You have unsaved changes from a previous session
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveFromTemp}
                className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors font-medium"
              >
                Save Now
              </button>
              <button
                onClick={handleDiscardTemp}
                className="px-3 py-1 text-xs bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-50 transition-colors font-medium"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Timetable Information Form */}
        <TimetableInfoForm
          activeTable={activeTable}
          tabMetadata={tabMetadata}
          setTabMetadata={setTabMetadata}
          semesterOptions={semesterOptions}
          isLoadingExisting={isLoadingExisting}
          onBrowseClick={() => setShowBrowseModal(true)}
          semesterInputRef={semesterInputRef}
          typeInputRef={typeInputRef}
          handleSemesterKeyDown={handleSemesterKeyDown}
          handleTypeKeyDown={handleTypeKeyDown}
          programs={programs}
          allBranches={allBranches}
        />

        {/* Browse Timetables Modal */}
        <BrowseTimetablesModal
          isOpen={showBrowseModal}
          onClose={() => setShowBrowseModal(false)}
          onSelectTimetable={handleLoadSelectedTimetable}
          timetableService={timetableService}
        />

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onConfirm={handleExportConfirm}
        />

        {/* Timetable Grid — locked until all metadata is filled */}
        <div className="relative">
          <TimetableTable
            timeSlots={timeSlots}
            batches={batches[activeTable] || {}}
            batchData={batchData[activeTable] || {}}
            conflicts={wsConflicts}
            validationErrors={validationErrors[activeTable] || {}}
            courseOptions={courseOptions}
            teacherOptions={teacherOptions}
            roomOptions={roomOptions}
            onCreateBatch={createBatch}
            onRemoveBatch={removeBatch}
            onUpdateBatch={updateBatch}
            onValidationChange={handleValidationChange}
            firstCellRef={firstCellRef}
            onCopyCell={handleCopyCell}
            onMoveCell={handleMoveCell}
            curriculumData={activeCurriculum}
            allCoursesRaw={allCoursesRaw}
            allTeachersRaw={allTeachersRaw}
            tempCells={tempCells}
            wsSuggestions={wsSuggestions}
            wsCellSuggestions={wsCellSuggestions}
            onCellFocus={handleCellFocusForPanel}
            onCellBlur={wsCellBlur}
            highlightCell={highlightCell}
          />
          {/* WS not-ready overlay — only show when a timetable is loaded but backend hasn't acked yet */}
          {isMetadataComplete && tabMetadata[activeTable]?.timetableId && !wsReady && !wsReadyOverride && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-lg z-10">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 size={28} className="animate-spin text-purple-500" />
                <p className="text-sm font-semibold text-gray-700">
                  {wsStatus === 'disconnected' || wsStatus === 'error'
                    ? 'Reconnecting to compute engine…'
                    : 'Connecting to compute engine…'}
                </p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Waiting for backend validation service.
                </p>
                <button
                  onClick={() => setWsReadyOverride(true)}
                  className="mt-2 text-[11px] text-purple-500 underline hover:text-purple-700 transition-colors"
                >
                  Skip &amp; edit anyway
                </button>
              </div>
            </div>
          )}
          {/* Metadata-incomplete overlay */}
          {!isMetadataComplete && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-lg z-10 pointer-events-all">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Lock size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">Timetable grid is locked</p>
                <p className="text-xs text-gray-400 max-w-xs">
                  Fill in all fields above — Program, Branch/Batch, Semester, and Type — to unlock the grid.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Time Slot Button */}
        <button 
          onClick={addTimeSlot} 
          className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <Plus size={16} />
          Add Time Slot
        </button>

        </div>

        {/* Conflict & Status Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-6 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
            {/* Validation status pill */}
            {validationErrorCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
                <AlertCircle size={13} />
                <span className="font-semibold">{validationErrorCount} Validation Error{validationErrorCount > 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Interactive Conflict Panel */}
            <ConflictPanel
              wsConflicts={wsConflicts}
              focusedCell={focusedCell}
              onNavigate={navigateToConflict}
              activeMetadata={activeMetadata}
              globalConflicts={globalConflicts}
              globalConflictsLoading={globalConflictsLoading}
            />

            {/* AI Suggestion Panel */}
            <SuggestionPanel
              allSuggestions={wsAllSuggestions}
              suggestionsEnabled={wsSuggestionsEnabled}
              computing={wsComputing}
              onEnable={wsEnableSuggestions}
              onDisable={wsDisableSuggestions}
              wsReady={wsReady}
              onCellClick={(row, col) => {
                if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
                setHighlightCell({ row, col });
                const cellEl = document.querySelector(`[data-cell="${row}-${col}"]`);
                if (cellEl) cellEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                highlightTimerRef.current = setTimeout(() => setHighlightCell(null), 3000);
              }}
            />
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Timetable;