/**
 * Export utilities for Room Availability
 * Supports "actual" (landscape A2, day-section headers, FACULTY merge) and
 * "mobile" (portrait A4, DAY + FACULTY merged columns) formats.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const DAYS = [
  { key: "mon", label: "Mon", fullLabel: "MONDAY" },
  { key: "tue", label: "Tue", fullLabel: "TUESDAY" },
  { key: "wed", label: "Wed", fullLabel: "WEDNESDAY" },
  { key: "thu", label: "Thu", fullLabel: "THURSDAY" },
  { key: "fri", label: "Fri", fullLabel: "FRIDAY" },
  { key: "sat", label: "Sat", fullLabel: "SATURDAY" },
];

export const isAvailable = (room, dayKey, time) =>
  room?.availability?.day?.[dayKey]?.time?.some((s) => s.time === time) ?? false;

// Sort rooms alphabetically by faculty then ID
const sortByFaculty = (rooms) =>
  [...rooms].sort((a, b) => {
    const fa = (a.faculty || "").toLowerCase();
    const fb = (b.faculty || "").toLowerCase();
    if (fa !== fb) return fa.localeCompare(fb);
    return (a.ID || "").localeCompare(b.ID || "");
  });

// ─────────────────────────────────────────────────────────────────────────────
// "ACTUAL" FORMAT — A2 landscape, day banners, FACULTY column merged per group
// ─────────────────────────────────────────────────────────────────────────────

function buildActualGrid(rooms, timeSlots) {
  const sorted = sortByFaculty(rooms);
  const header = ["FACULTY", "ROOM", "CAPACITY", ...timeSlots];

  const allRows = [];

  DAYS.forEach((day, dayIdx) => {
    allRows.push({ isDayHeader: true, dayLabel: day.fullLabel, colSpan: header.length });

    // Group by faculty for merging
    let i = 0;
    while (i < sorted.length) {
      const faculty = sorted[i].faculty || "N/A";
      const group = [];
      while (i < sorted.length && (sorted[i].faculty || "N/A") === faculty) {
        group.push(sorted[i]);
        i++;
      }
      group.forEach((room, gi) => {
        const row = [
          gi === 0
            ? { v: faculty, _facultyFirst: true, _facultyRowSpan: group.length }
            : { v: null, _facultyMerged: true },
          room.ID || room.name || "N/A",
          room.capacity ?? "N/A",
        ];
        timeSlots.forEach((time) => {
          row.push(isAvailable(room, day.key, time) ? "✓" : "—");
        });
        allRows.push(row);
      });
    }

    if (dayIdx < DAYS.length - 1) allRows.push({ isSpacingRow: true });
  });

  return { header, rows: allRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// "MOBILE" FORMAT — A4 portrait, DAY + FACULTY merged columns
// ─────────────────────────────────────────────────────────────────────────────

function buildMobileGrid(rooms, timeSlots) {
  const sorted = sortByFaculty(rooms);
  const header = ["DAY", "FACULTY", "ROOM", "CAP", ...timeSlots];
  const allRows = [];

  DAYS.forEach((day) => {
    let dayStart = allRows.length;
    let dayCount = 0;

    let i = 0;
    while (i < sorted.length) {
      const faculty = sorted[i].faculty || "N/A";
      const group = [];
      while (i < sorted.length && (sorted[i].faculty || "N/A") === faculty) {
        group.push(sorted[i]);
        i++;
      }
      let facStart = allRows.length;
      group.forEach((room) => {
        const row = [
          day.fullLabel,
          faculty,
          room.ID || room.name || "N/A",
          room.capacity ?? "N/A",
        ];
        timeSlots.forEach((time) => {
          row.push(isAvailable(room, day.key, time) ? "✓" : "—");
        });
        allRows.push(row);
        dayCount++;
      });
      allRows[facStart]._facultyFirst = true;
      allRows[facStart]._facultyRowSpan = group.length;
    }

    if (dayCount > 0) {
      allRows[dayStart]._dayFirst = true;
      allRows[dayStart]._dayRowSpan = dayCount;
    }
  });

  return { header, rows: allRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — ACTUAL
// ─────────────────────────────────────────────────────────────────────────────
export function exportRoomAvailabilityToPdf(rooms, timeSlots, label = "", fileName = "room-availability") {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a2" });
  const { header, rows } = buildActualGrid(rooms, timeSlots);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Room Availability${label ? ` — ${label}` : ""}`, 14, 14);

  const tableBody = [];
  rows.forEach((row) => {
    if (row.isDayHeader) {
      tableBody.push([{
        content: row.dayLabel,
        colSpan: row.colSpan,
        styles: { halign: "center", fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, cellPadding: 2 },
      }]);
    } else if (row.isSpacingRow) {
      // skip
    } else {
      tableBody.push(row.map((cell, ci) => {
        if (ci === 0 && cell && typeof cell === "object") {
          if (cell._facultyFirst) {
            return { content: cell.v, rowSpan: cell._facultyRowSpan, styles: { valign: "middle", halign: "center", fontStyle: "bold", fillColor: [240, 255, 244] } };
          }
          if (cell._facultyMerged) {
            return { content: "", styles: { fillColor: [240, 255, 244] } };
          }
        }
        return cell && typeof cell === "object" ? (cell.v ?? "") : cell;
      }));
    }
  });

  autoTable(doc, {
    head: [header],
    body: tableBody,
    startY: 22,
    theme: "grid",
    styles: { fontSize: 5, cellPadding: 1, overflow: "linebreak", halign: "center", valign: "middle", lineWidth: 0.1, lineColor: [120, 120, 120], minCellHeight: 5 },
    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 22 }, 2: { cellWidth: 14 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 2) {
        if (data.cell.raw === "✓") {
          data.cell.styles.fillColor = [187, 247, 208];
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.raw === "—") {
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.textColor = [210, 210, 210];
        }
      }
    },
    showHead: "everyPage",
    margin: { top: 22, bottom: 10, left: 10, right: 10 },
  });

  doc.save(`${fileName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — MOBILE
// ─────────────────────────────────────────────────────────────────────────────
export function exportRoomAvailabilityToPdfMobile(rooms, timeSlots, label = "", fileName = "room-availability-mobile") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { header, rows } = buildMobileGrid(rooms, timeSlots);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Room Availability${label ? ` — ${label}` : ""} (Mobile)`, 6, 8);

  const tableBody = rows.map((row) => {
    const cells = [];
    // DAY column
    if (row._dayFirst) {
      cells.push({ content: row[0], rowSpan: row._dayRowSpan, styles: { halign: "center", valign: "middle", fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 2.5, cellPadding: 0.5 } });
    }
    // FACULTY column
    if (row._facultyFirst) {
      cells.push({ content: row[1], rowSpan: row._facultyRowSpan, styles: { halign: "center", valign: "middle", fillColor: [240, 255, 244], fontStyle: "bold", fontSize: 2.2, cellPadding: 0.3 } });
    }
    // ROOM, CAP, slots
    for (let i = 2; i < row.length; i++) cells.push(row[i] ?? "");
    return cells;
  });

  const pageWidth = 210;
  const margins = 12;
  const available = pageWidth - margins;
  const fixedW = [5, 8, 10, 6];
  const tsW = Math.max(2, (available - fixedW.reduce((a, b) => a + b, 0)) / timeSlots.length);
  const colStyles = {
    0: { cellWidth: fixedW[0] },
    1: { cellWidth: fixedW[1] },
    2: { cellWidth: fixedW[2] },
    3: { cellWidth: fixedW[3] },
  };
  timeSlots.forEach((_, i) => { colStyles[4 + i] = { cellWidth: tsW, fontSize: 1.8 }; });

  autoTable(doc, {
    head: [header],
    body: tableBody,
    startY: 11,
    theme: "grid",
    tableWidth: available,
    styles: { fontSize: 2, cellPadding: 0.3, overflow: "linebreak", halign: "center", valign: "middle", lineWidth: 0.05, lineColor: [150, 150, 150], minCellHeight: 2 },
    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 2.5, cellPadding: 0.4 },
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 3) {
        if (data.cell.raw === "✓") { data.cell.styles.fillColor = [187, 247, 208]; data.cell.styles.textColor = [21, 128, 61]; }
        else if (data.cell.raw === "—") { data.cell.styles.fillColor = [255, 255, 255]; data.cell.styles.textColor = [210, 210, 210]; }
      }
    },
    showHead: "firstPage",
    margin: { top: 11, bottom: 8, left: 6, right: 6 },
  });

  doc.save(`${fileName}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel — ACTUAL
// ─────────────────────────────────────────────────────────────────────────────
export function exportRoomAvailabilityToExcel(rooms, timeSlots, label = "", fileName = "room-availability") {
  const workbook = XLSX.utils.book_new();
  const { header, rows } = buildActualGrid(rooms, timeSlots);

  const data = [header];
  const merges = [];
  let r = 1;

  rows.forEach((row) => {
    if (row.isDayHeader) {
      data.push([row.dayLabel]);
      merges.push({ s: { r, c: 0 }, e: { r, c: row.colSpan - 1 } });
      r++;
    } else if (row.isSpacingRow) {
      data.push([""]);
      r++;
    } else {
      const excelRow = row.map((cell) =>
        cell && typeof cell === "object" ? (cell.v ?? "") : (cell ?? "")
      );
      // Faculty merge
      const fac = row[0];
      if (fac && typeof fac === "object" && fac._facultyFirst && fac._facultyRowSpan > 1) {
        merges.push({ s: { r, c: 0 }, e: { r: r + fac._facultyRowSpan - 1, c: 0 } });
      }
      data.push(excelRow);
      r++;
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 10 }, ...timeSlots.map(() => ({ wch: 14 }))];
  if (merges.length) ws["!merges"] = merges;

  const range = XLSX.utils.decode_range(ws["!ref"]);

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = { fill: { fgColor: { rgb: "22C55E" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
  }

  for (let row = 1; row <= range.e.r; row++) {
    const firstAddr = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (!ws[firstAddr]) { ws[firstAddr] = { v: "" }; }
    const isDayHdr = typeof ws[firstAddr].v === "string" && DAYS.some((d) => d.fullLabel === ws[firstAddr].v);

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: row, c });
      if (!ws[addr]) ws[addr] = { v: "" };
      const val = ws[addr].v;
      if (isDayHdr) {
        ws[addr].s = { fill: { fgColor: { rgb: "22C55E" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
      } else if (c === 0) {
        ws[addr].s = { fill: { fgColor: { rgb: "F0FFF4" } }, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
      } else if (c > 2) {
        ws[addr].s = val === "✓"
          ? { fill: { fgColor: { rgb: "BBF7D0" } }, font: { bold: true, color: { rgb: "15803D" } }, alignment: { horizontal: "center", vertical: "center" } }
          : { alignment: { horizontal: "center", vertical: "center" } };
      } else {
        ws[addr].s = { alignment: { horizontal: "center", vertical: "center" } };
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, ws, "Room Availability");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel — MOBILE
// ─────────────────────────────────────────────────────────────────────────────
export function exportRoomAvailabilityToExcelMobile(rooms, timeSlots, label = "", fileName = "room-availability-mobile") {
  const workbook = XLSX.utils.book_new();
  const { header, rows } = buildMobileGrid(rooms, timeSlots);

  const data = [header];
  const merges = [];
  let r = 1;

  rows.forEach((row) => {
    data.push([...row]);
    if (row._dayFirst && row._dayRowSpan > 1) {
      merges.push({ s: { r, c: 0 }, e: { r: r + row._dayRowSpan - 1, c: 0 } });
    }
    if (row._facultyFirst && row._facultyRowSpan > 1) {
      merges.push({ s: { r, c: 1 }, e: { r: r + row._facultyRowSpan - 1, c: 1 } });
    }
    r++;
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, ...timeSlots.map(() => ({ wch: 13 }))];
  if (merges.length) ws["!merges"] = merges;

  const range = XLSX.utils.decode_range(ws["!ref"]);

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = { fill: { fgColor: { rgb: "22C55E" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
  }

  for (let row = 1; row <= range.e.r; row++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: row, c });
      if (!ws[addr]) ws[addr] = { v: "" };
      const val = ws[addr].v;
      if (c === 0) {
        ws[addr].s = { fill: { fgColor: { rgb: "22C55E" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
      } else if (c === 1) {
        ws[addr].s = { fill: { fgColor: { rgb: "F0FFF4" } }, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" } };
      } else if (c > 3) {
        ws[addr].s = val === "✓"
          ? { fill: { fgColor: { rgb: "BBF7D0" } }, font: { bold: true, color: { rgb: "15803D" } }, alignment: { horizontal: "center", vertical: "center" } }
          : { alignment: { horizontal: "center", vertical: "center" } };
      } else {
        ws[addr].s = { alignment: { horizontal: "center", vertical: "center" } };
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, ws, "Room Availability");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

