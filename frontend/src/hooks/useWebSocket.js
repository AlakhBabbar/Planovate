/**
 * useWebSocket — manages a single WebSocket connection to the compute engine.
 *
 * Returns:
 *   wsRef          — ref to the WebSocket instance (for sending messages)
 *   suggestions    — Map<"row-col", suggestion[]> for the full grid
 *   cellSuggestions— { row, col, suggestions[] } for the focused cell
 *   wsStatus       — "connecting"|"connected"|"disconnected"|"error"
 *   computing      — boolean
 *
 * Caller should:
 *   - Call openTimetable(timetableId, meta, days, timeSlots) when timetable loads
 *   - Call cellFocus(row, col) on mouse-enter (2.5s dwell handled server-side)
 *   - Call cursorMove(row, col) on click/keyboard move
 *   - Call closeTimetable() on unmount
 */

import { useRef, useState, useCallback, useEffect } from 'react';

const WS_URL = `ws://localhost:3001`;

export function useWebSocket() {
  const wsRef    = useRef(null);
  const reconnectTimer = useRef(null);

  const [wsStatus, setWsStatus]           = useState('disconnected');
  const [computing, setComputing]          = useState(false);
  const [suggestions, setSuggestions]      = useState(new Map());
  const [cellSuggestions, setCellSuggestions] = useState(null);

  // ── Connection ────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState <= 1) return; // already connecting/open

    setWsStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      console.log('[ws] connected');
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); }
      catch { return; }

      switch (msg.type) {
        case 'connected':
          setWsStatus('connected');
          break;

        case 'computing':
          setComputing(msg.status === 'started');
          break;

        // Full neighbor grid (after cursor_move)
        case 'suggestions':
        case 'suggestions_updated': {
          const { neighbors } = msg;
          if (!neighbors) break;
          setSuggestions(prev => {
            const next = new Map(prev);
            for (const dir of Object.values(neighbors)) {
              if (dir && dir.suggestions?.length) {
                next.set(`${dir.row}-${dir.col}`, dir.suggestions);
              }
            }
            return next;
          });
          break;
        }

        // Focused cell suggestions (after 2.5s dwell)
        case 'cell_suggestions':
          setCellSuggestions({ row: msg.row, col: msg.col, suggestions: msg.suggestions || [] });
          break;

        case 'open_timetable_ack':
          console.log('[ws] timetable open acked:', msg.timetableId);
          break;

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

    ws.onerror = (err) => {
      console.error('[ws] error', err);
      setWsStatus('error');
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      wsRef.current = null;
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, []);

  // Connect on mount, disconnect on unmount
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
    sendMsg({ type: 'open_timetable', timetableId, meta, days, timeSlots });
  }, [sendMsg]);

  const closeTimetable = useCallback(() => {
    sendMsg({ type: 'close_timetable' });
    setSuggestions(new Map());
    setCellSuggestions(null);
  }, [sendMsg]);

  const cursorMove = useCallback((row, col) => {
    sendMsg({ type: 'cursor_move', row, col });
    // Clear focused suggestions when moving
    setCellSuggestions(null);
  }, [sendMsg]);

  const cellFocus = useCallback((row, col) => {
    sendMsg({ type: 'cell_focus', row, col });
  }, [sendMsg]);

  const cellBlur = useCallback(() => {
    // Clear cell suggestions when leaving a cell
    setCellSuggestions(null);
  }, []);

  return {
    wsRef,
    wsStatus,
    computing,
    suggestions,
    cellSuggestions,
    openTimetable,
    closeTimetable,
    cursorMove,
    cellFocus,
    cellBlur,
  };
}
