/**
 * useWebSocket — WebSocket connection to compute engine.
 *
 * Exposes:
 *   wsStatus          "connecting" | "connected" | "disconnected" | "error"
 *   wsReady           boolean — true only when connected AND timetable is acked
 *   computing         boolean — grid recompute in progress
 *   suggestions       Map<"row-col", suggestion[]>
 *   cellSuggestions   { row, col, suggestions[] } | null
 *   wsConflicts       Map<"row-col-batchIndex", ConflictDescriptor[]>
 *
 * Actions:
 *   openTimetable(id, meta, days, timeSlots)
 *   closeTimetable()
 *   cursorMove(row, col)
 *   cellFocus(row, col)
 *   cellBlur()
 *   checkCell(row, col, batchIndex, { day, time, teacherId, roomId })
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const WS_URL = `ws://localhost:3001`;
const RECONNECT_DELAY = 3000;

export function useWebSocket() {
  const wsRef          = useRef(null);
  const reconnectTimer = useRef(null);
  const pendingOpen    = useRef(null); // payload to re-send after reconnect

  const [wsStatus, setWsStatus]               = useState('disconnected');
  const [wsReady,  setWsReady]                = useState(false);
  const [computing, setComputing]              = useState(false);
  const [suggestions, setSuggestions]          = useState(new Map());
  const [cellSuggestions, setCellSuggestions]  = useState(null);
  const [wsConflicts, setWsConflicts]          = useState(new Map());

  // ── Connection ─────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    setWsStatus('connecting');
    setWsReady(false);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      // Re-send open_timetable if we were previously in a session
      if (pendingOpen.current) {
        ws.send(JSON.stringify(pendingOpen.current));
      }
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); }
      catch { return; }

      switch (msg.type) {

        case 'connected':
          setWsStatus('connected');
          break;

        case 'open_timetable_ack':
          // Now fully ready — unlock the UI
          setWsReady(true);
          break;

        case 'computing':
          setComputing(msg.status === 'started');
          break;

        // Neighbor suggestions after cursor_move
        case 'suggestions':
        case 'suggestions_updated': {
          const { neighbors } = msg;
          if (!neighbors) break;
          setSuggestions(prev => {
            const next = new Map(prev);
            for (const dir of Object.values(neighbors)) {
              if (dir?.suggestions?.length) next.set(`${dir.row}-${dir.col}`, dir.suggestions);
            }
            return next;
          });
          break;
        }

        // Focused cell suggestions after 2.5s dwell
        case 'cell_suggestions':
          setCellSuggestions({ row: msg.row, col: msg.col, suggestions: msg.suggestions || [] });
          break;

        // Backend conflict result ← check_cell
        case 'conflict_result': {
          const key = `${msg.row}-${msg.col}-${msg.batchIndex ?? 0}`;
          setWsConflicts(prev => {
            const next = new Map(prev);
            if (msg.conflicts && msg.conflicts.length > 0) {
              next.set(key, msg.conflicts);
            } else {
              next.delete(key); // clear resolved conflict
            }
            return next;
          });
          break;
        }

        case 'warning':
          console.warn('[ws]', msg.message);
          break;

        case 'error':
          console.error('[ws] server error:', msg.message);
          break;

        default:
          break;
      }
    };

    ws.onerror = () => {
      setWsStatus('error');
      setWsReady(false);
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      setWsReady(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // ── Senders ────────────────────────────────────────────────────────────────

  const sendMsg = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const openTimetable = useCallback((timetableId, meta, days, timeSlots) => {
    setSuggestions(new Map());
    setCellSuggestions(null);
    setWsConflicts(new Map());
    setWsReady(false);
    const payload = { type: 'open_timetable', timetableId, meta, days, timeSlots };
    pendingOpen.current = payload;
    sendMsg(payload);
  }, [sendMsg]);

  const closeTimetable = useCallback(() => {
    sendMsg({ type: 'close_timetable' });
    setSuggestions(new Map());
    setCellSuggestions(null);
    setWsConflicts(new Map());
    setWsReady(false);
    pendingOpen.current = null;
  }, [sendMsg]);

  const cursorMove = useCallback((row, col) => {
    sendMsg({ type: 'cursor_move', row, col });
    setCellSuggestions(null);
  }, [sendMsg]);

  const cellFocus = useCallback((row, col) => {
    sendMsg({ type: 'cell_focus', row, col });
  }, [sendMsg]);

  const cellBlur = useCallback(() => {
    setCellSuggestions(null);
  }, []);

  /**
   * Send a cell change to backend for conflict validation.
   * @param {number} row
   * @param {number} col
   * @param {number} batchIndex
   * @param {{ day: string, time: string, teacherId?: string, roomId?: string }} data
   */
  const checkCell = useCallback((row, col, batchIndex, { day, time, teacherId, roomId }) => {
    sendMsg({ type: 'check_cell', row, col, batchIndex, day, time, teacherId, roomId });
  }, [sendMsg]);

  return {
    wsRef,
    wsStatus,
    wsReady,
    computing,
    suggestions,
    cellSuggestions,
    wsConflicts,
    openTimetable,
    closeTimetable,
    cursorMove,
    cellFocus,
    cellBlur,
    checkCell,
  };
}
