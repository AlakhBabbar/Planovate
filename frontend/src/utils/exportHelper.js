/**
 * Export helper utilities for timetable tables.
 *
 * Export table layout (Excel-style):
 * - Weekdays are COLUMNS
 * - Time periods are ROWS
 *
 * Notes about the current UI data model:
 * - Your stored keys are dataKey(dayIndex, timeIndex, batchIndex)
 *   where dayIndex maps to "days" and timeIndex maps to "timeSlots".
 * - A single (dayIndex,timeIndex) cell may contain multiple batches.
 *   We represent those as "subCells" stacked inside the same export cell.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import * as XLSX from "xlsx";

import { DEFAULT_DAYS, normalize, dataKey } from "./dataHelpers";
import { getBatchCount } from "./timetableHelpers";

function resolveTables({ tableId, batches, batchData, batchesByTable, batchDataByTable }) {
  if (batchesByTable && batchDataByTable) {
    const firstTableId = tableId ?? Object.keys(batchesByTable)[0] ?? "Table 1";
    return {
      tableId: firstTableId,
      batchesForTable: batchesByTable[firstTableId] ?? {},
      batchDataForTable: batchDataByTable[firstTableId] ?? {},
    };
  }

  const singleTableId = tableId ?? "Table 1";
  return {
    tableId: singleTableId,
    batchesForTable: batches ?? {},
    batchDataForTable: batchData ?? {},
  };
}

function compactLines(lines) {
  return (lines ?? []).map(normalize).filter(Boolean);
}

function buildCellSubText({ entry, batchIndex, totalBatches }) {
  const course = normalize(entry?.course);
  const teacher = normalize(entry?.teacher);
  const room = normalize(entry?.room);
  const batchName = normalize(entry?.batchName);

  const label = batchName || (totalBatches > 1 ? `B${batchIndex + 1}` : "");
  const bodyLines = compactLines([course, teacher, room]);

  if (!label && bodyLines.length === 0) return "";
  if (!label) return bodyLines.join("\n");
  if (bodyLines.length === 0) return label;

  return [label, ...bodyLines].join("\n");
}

/**
 * Builds an export grid where:
 * - head: ["Time", ...days]
 * - body: rows for each timeSlot, with day cells filled from timetable data.
 *
 * @returns {{ tableId: string, head: string[][], body: string[][] }}
 */
export function buildTimetableExportGrid({
  tableId,
  days,
  timeSlots,
  batches,
  batchData,
  batchesByTable,
  batchDataByTable,
}) {
  // IMPORTANT: UI indexing
  // - rowIndex => time slot index
  // - colIndex => day index
  // Keys are stored as `${rowIndex}-${colIndex}` and `${rowIndex}-${colIndex}-${batchIndex}`
  const normalizedDays = (days?.length ? days : DEFAULT_DAYS).map(normalize);
  const normalizedSlots = (timeSlots ?? []).map(normalize);

  const resolved = resolveTables({ tableId, batches, batchData, batchesByTable, batchDataByTable });

  const head = [["Time", ...normalizedDays]];

  const body = normalizedSlots.map((slotLabel, timeIndex) => {
    const row = [slotLabel || ""]; // first column is Time

    for (let dayIndex = 0; dayIndex < normalizedDays.length; dayIndex += 1) {
      const count = getBatchCount(resolved.batchesForTable, timeIndex, dayIndex);
      const parts = [];

      for (let batchIndex = 0; batchIndex < count; batchIndex += 1) {
        const key = dataKey(timeIndex, dayIndex, batchIndex);
        const entry = resolved.batchDataForTable?.[key] ?? {};
        const text = buildCellSubText({ entry, batchIndex, totalBatches: count });
        if (text) parts.push(text);
      }

      if (parts.length <= 1) {
        row.push(parts[0] ?? "");
      } else {
        const maxLines = Math.max(
          ...parts.map((p) => Math.max(1, String(p).split("\n").length))
        );
        const placeholder = Array.from({ length: maxLines }, () => " ").join("\n");
        row.push({ content: placeholder, subCells: parts });
      }
    }

    return row;
  });

  return { tableId: resolved.tableId, head, body };
}

function buildPdfTitle(meta, tableId) {
  const name = normalize(meta?.name);
  const cls = normalize(meta?.class);
  const br = normalize(meta?.branch);
  const sem = normalize(meta?.semester);
  const type = normalize(meta?.type);

  const parts = compactLines([
    name,
    [cls, br, sem, type].filter(Boolean).join(" "),
    tableId ? `(${tableId})` : "",
  ]);

  return parts.join(" - ") || "Timetable";
}

function sanitizeFileBaseName(base) {
  const safe = normalize(base || "timetable")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return safe || "timetable";
}

function saveBlobFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function cellToPlainText(cell) {
  if (!cell) return "";
  if (typeof cell === "string") return cell;
  if (typeof cell === "object" && Array.isArray(cell.subCells)) {
    // Horizontal representation for non-PDF outputs.
    return cell.subCells.filter(Boolean).join(" | ");
  }
  return String(cell);
}

function gridToAoa(grid) {
  const headRow = (grid.head?.[0] ?? []).map(cellToPlainText);
  const bodyRows = (grid.body ?? []).map((row) => row.map(cellToPlainText));
  return [headRow, ...bodyRows];
}

/**
 * Exports a timetable table to PDF.
 *
 * This uses the export grid format (time rows × weekday columns).
 */
export function exportTimetableToPdf({
  fileName,
  meta,
  tableId,
  days,
  timeSlots,
  batches,
  batchData,
  batchesByTable,
  batchDataByTable,
}) {
  const grid = buildTimetableExportGrid({
    tableId,
    days,
    timeSlots,
    batches,
    batchData,
    batchesByTable,
    batchDataByTable,
  });

  const title = buildPdfTitle(meta, grid.tableId);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const marginX = 24;
  const marginTop = 32;

  doc.setFontSize(12);
  doc.text(title, marginX, marginTop);

  autoTable(doc, {
    head: grid.head,
    body: grid.body,
    startY: marginTop + 14,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "hidden",
      valign: "top",
    },
    headStyles: {
      fontStyle: "bold",
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 90 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 0) return; // Time column

      const raw = data.cell.raw;
      if (!raw || typeof raw !== "object" || !Array.isArray(raw.subCells)) return;

      // Use placeholder lines to reserve height, but hide the placeholder text.
      const placeholderLines = String(raw.content ?? " ").split("\n");
      data.cell.text = placeholderLines;
      data.cell.styles.textColor = [255, 255, 255];
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 0) return;

      const raw = data.cell.raw;
      if (!raw || typeof raw !== "object" || !Array.isArray(raw.subCells)) return;

      const subCells = raw.subCells.filter(Boolean);
      if (subCells.length === 0) return;

      const { cell } = data;
      const pad = typeof cell.styles.cellPadding === "number" ? cell.styles.cellPadding : 4;
      const fontSize = cell.styles.fontSize ?? 8;
      const lineHeight = fontSize * 1.2;

      const n = subCells.length;
      const segW = cell.width / n;

      // Divider lines between sub-cells (only when > 1)
      if (n > 1) {
        doc.setDrawColor(180);
        doc.setLineWidth(0.5);
        for (let i = 1; i < n; i += 1) {
          const x = cell.x + segW * i;
          doc.line(x, cell.y, x, cell.y + cell.height);
        }
      }

      doc.setTextColor(0);
      doc.setFontSize(fontSize);

      for (let i = 0; i < n; i += 1) {
        const segX = cell.x + segW * i;
        const segMaxW = Math.max(1, segW - pad * 2);
        const lines = String(subCells[i])
          .split("\n")
          .flatMap((line) => doc.splitTextToSize(line, segMaxW));

        let cursorY = cell.y + pad + fontSize;
        for (const line of lines) {
          if (cursorY > cell.y + cell.height - pad) break;
          doc.text(String(line), segX + pad, cursorY, { maxWidth: segMaxW });
          cursorY += lineHeight;
        }
      }
    },
  });

  const safe = sanitizeFileBaseName(fileName || title);
  doc.save(`${safe}.pdf`);
}

/**
 * Exports multiple tables into a single multi-page PDF.
 */
export function exportTimetablesToPdf({ fileName, meta, tables }) {
  const safe = sanitizeFileBaseName(fileName || meta?.name || "timetable");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const marginX = 24;
  const marginTop = 32;

  (tables ?? []).forEach((t, index) => {
    if (index > 0) doc.addPage();

    const grid = buildTimetableExportGrid(t);
    const title = buildPdfTitle(meta, grid.tableId);

    doc.setFontSize(12);
    doc.text(title, marginX, marginTop);

    autoTable(doc, {
      head: grid.head,
      body: grid.body,
      startY: marginTop + 14,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 4,
        overflow: "hidden",
        valign: "top",
      },
      headStyles: {
        fontStyle: "bold",
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 90 },
      },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 0) return;

        const raw = data.cell.raw;
        if (!raw || typeof raw !== "object" || !Array.isArray(raw.subCells)) return;

        const placeholderLines = String(raw.content ?? " ").split("\n");
        data.cell.text = placeholderLines;
        data.cell.styles.textColor = [255, 255, 255];
      },
      didDrawCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === 0) return;

        const raw = data.cell.raw;
        if (!raw || typeof raw !== "object" || !Array.isArray(raw.subCells)) return;

        const subCells = raw.subCells.filter(Boolean);
        if (subCells.length === 0) return;

        const { cell } = data;
        const pad = typeof cell.styles.cellPadding === "number" ? cell.styles.cellPadding : 4;
        const fontSize = cell.styles.fontSize ?? 8;
        const lineHeight = fontSize * 1.2;

        const n = subCells.length;
        const segW = cell.width / n;

        if (n > 1) {
          doc.setDrawColor(180);
          doc.setLineWidth(0.5);
          for (let i = 1; i < n; i += 1) {
            const x = cell.x + segW * i;
            doc.line(x, cell.y, x, cell.y + cell.height);
          }
        }

        doc.setTextColor(0);
        doc.setFontSize(fontSize);

        for (let i = 0; i < n; i += 1) {
          const segX = cell.x + segW * i;
          const segMaxW = Math.max(1, segW - pad * 2);
          const lines = String(subCells[i])
            .split("\n")
            .flatMap((line) => doc.splitTextToSize(line, segMaxW));

          let cursorY = cell.y + pad + fontSize;
          for (const line of lines) {
            if (cursorY > cell.y + cell.height - pad) break;
            doc.text(String(line), segX + pad, cursorY, { maxWidth: segMaxW });
            cursorY += lineHeight;
          }
        }
      },
    });
  });

  doc.save(`${safe}.pdf`);
}

/**
 * Exports one or more timetables to Excel.
 * - Each timetable becomes a separate sheet.
 */
export function exportTimetablesToExcel({ fileName, meta, tables }) {
  const safe = sanitizeFileBaseName(fileName || meta?.name || "timetable");
  const wb = XLSX.utils.book_new();

  (tables ?? []).forEach((t, index) => {
    const grid = buildTimetableExportGrid(t);
    const aoa = gridToAoa(grid);
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Basic wrapping for readability
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) continue;
        ws[addr].s = ws[addr].s || {};
        ws[addr].s.alignment = { wrapText: true, vertical: "top" };
      }
    }

    const sheetNameBase = normalize(grid.tableId) || `Table ${index + 1}`;
    const sheetName = sheetNameBase.slice(0, 31) || `Table ${index + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `${safe}.xlsx`);
}

function buildDocHtml({ meta, grids }) {
  const title = buildPdfTitle(meta, "");

  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");

  const tableToHtml = (grid) => {
    const headRow = grid.head?.[0] ?? [];
    const rows = [headRow, ...(grid.body ?? [])];

    const tr = (cells, isHead) => {
      const tag = isHead ? "th" : "td";
      return (
        "<tr>" +
        cells
          .map((c) => {
            const text = escapeHtml(cellToPlainText(c)).replace(/\n/g, "<br/>");
            return `<${tag}>${text}</${tag}>`;
          })
          .join("") +
        "</tr>"
      );
    };

    return (
      `<h3 style="margin: 16px 0 6px;">${escapeHtml(grid.tableId || "Table")}</h3>` +
      '<table border="1" cellspacing="0" cellpadding="4" style="border-collapse: collapse; width: 100%; font-size: 10pt;">' +
      "<thead>" +
      tr(rows[0], true) +
      "</thead>" +
      "<tbody>" +
      rows.slice(1).map((r) => tr(r, false)).join("") +
      "</tbody>" +
      "</table>"
    );
  };

  return (
    "<!doctype html>" +
    "<html><head><meta charset=\"utf-8\"/>" +
    `<title>${escapeHtml(title)}</title>` +
    "</head><body>" +
    `<h2 style=\"margin: 0 0 8px;\">${escapeHtml(title)}</h2>` +
    (grids ?? []).map((g) => tableToHtml(g)).join("") +
    "</body></html>"
  );
}

/**
 * Exports one or more timetables to a DOC file (HTML-based .doc).
 */
export function exportTimetablesToDoc({ fileName, meta, tables }) {
  const safe = sanitizeFileBaseName(fileName || meta?.name || "timetable");
  const grids = (tables ?? []).map((t) => buildTimetableExportGrid(t));
  const html = buildDocHtml({ meta, grids });
  const blob = new Blob([html], { type: "application/msword" });
  saveBlobFile(blob, `${safe}.doc`);
}

/**
 * (Planned) Excel / DOC exports
 *
 * Excel: will use the same buildTimetableExportGrid() output with an
 * XLSX worksheet generation and (optionally) merges for multi-batch cells.
 * DOC: likely HTML->DOCX conversion or a DOCX generator library.
 */
