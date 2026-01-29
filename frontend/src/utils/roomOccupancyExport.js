/**
 * Export utilities for Room Occupancy
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Build room occupancy grid with all rooms organized by days:
 * - One sheet/document with all rooms
 * - Organized by days (Monday, Tuesday, etc.)
 * - Each day section shows all rooms
 * - Columns: FACULTY | ROOM | CAPACITY | Time Slots...
 */
function buildAllRoomsOccupancyGrid(rooms, schedules, timeSlots) {
  const days = [
    { key: "Mon", label: "MONDAY" },
    { key: "Tue", label: "TUESDAY" },
    { key: "Wed", label: "WEDNESDAY" },
    { key: "Thu", label: "THURSDAY" },
    { key: "Fri", label: "FRIDAY" },
    { key: "Sat", label: "SATURDAY" },
  ];

  const dayToColIndex = {
    "Mon": 0,
    "Tue": 1,
    "Wed": 2,
    "Thu": 3,
    "Fri": 4,
    "Sat": 5
  };

  // Build header: FACULTY | ROOM | CAPACITY | Time Slots...
  const header = ["FACULTY", "ROOM", "CAPACITY", ...timeSlots];
  
  // Build body organized by days
  const allRows = [];
  
  days.forEach((day, dayIndex) => {
    const colIndex = dayToColIndex[day.key];
    
    // Add day header row (spans all columns)
    allRows.push({
      isDayHeader: true,
      dayLabel: day.label,
      colSpan: header.length
    });
    
    // For each room, add a row with their occupancy for this specific day
    rooms.forEach((room) => {
      const roomId = String(room.unid || '');
      const row = [
        room.faculty || "N/A",
        room.name || room.ID || "N/A",
        room.capacity || "N/A"
      ];
      
      // Add time slot data for this specific day
      timeSlots.forEach((slot, rowIndex) => {
        const matches = schedules.filter((s) => {
          const roomMatch = s.roomId && String(s.roomId) === roomId;
          const timeMatch = s.rowIndex === rowIndex;
          const dayMatch = s.colIndex === colIndex;
          return roomMatch && timeMatch && dayMatch;
        });
        
        if (matches.length === 0) {
          row.push("—");
        } else {
          const cellContent = matches.map((occ) => {
            const parts = [];
            
            // Build complete class name
            const classNameParts = [];
            if (occ.class) classNameParts.push(occ.class);
            if (occ.branch) classNameParts.push(occ.branch);
            if (occ.semester) classNameParts.push(occ.semester);
            if (occ.type) classNameParts.push(occ.type);
            
            if (classNameParts.length > 0) {
              let classInfo = classNameParts.join(" ");
              if (occ.batch) classInfo += ` (${occ.batch})`;
              parts.push(classInfo);
            }
            
            if (occ.course) parts.push(`${occ.course}`);
            if (occ.teacher) parts.push(`(${occ.teacher})`);
            
            return parts.join(" ");
          }).join(", ");
          
          row.push(cellContent);
        }
      });
      
      allRows.push(row);
    });
    
    // Add spacing row between days (except after last day)
    if (dayIndex < days.length - 1) {
      allRows.push({ isSpacingRow: true, colSpan: header.length });
    }
  });
  
  return { header, rows: allRows };
}


/**
 * Export room occupancy to PDF with all rooms organized by days
 */
export function exportRoomOccupancyToPdf(rooms, schedules, timeSlots, fileName = "room-occupancy") {
  // Use A2 size in landscape for more space
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a2"
  });
  
  const { header, rows } = buildAllRoomsOccupancyGrid(rooms, schedules, timeSlots);
  
  // Add title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Room Occupancy - All Rooms by Day`, 14, 15);
  
  // Prepare table body - all days as continuous rows
  const tableBody = [];
  rows.forEach((row) => {
    if (row.isDayHeader) {
      // Day header row - merged cell spanning all columns
      tableBody.push([{ 
        content: row.dayLabel, 
        colSpan: row.colSpan, 
        styles: { 
          halign: 'center', 
          fillColor: [59, 130, 246], 
          textColor: [255, 255, 255],
          fontStyle: 'bold', 
          fontSize: 8,
          cellPadding: 2
        } 
      }]);
    } else if (row.isSpacingRow) {
      // Skip spacing rows to make it more compact
    } else {
      // Regular data row
      tableBody.push(row);
    }
  });
  
  // Create the table - all days flow continuously as rows
  autoTable(doc, {
    head: [header],
    body: tableBody,
    startY: 25,
    theme: "grid",
    styles: {
      fontSize: 5,
      cellPadding: 1,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [100, 100, 100],
      minCellHeight: 5
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 6,
      cellPadding: 1.5
    },
    columnStyles: {
      0: { // FACULTY column
        cellWidth: 22,
        halign: "center",
        fontSize: 5
      },
      1: { // ROOM column
        cellWidth: 22,
        halign: "center",
        fontSize: 5
      },
      2: { // CAPACITY column
        cellWidth: 15,
        halign: "center",
        fontSize: 5
      }
    },
    didParseCell: (data) => {
      // Color occupied time slot cells
      if (data.section === "body" && data.column.index > 2) {
        if (data.cell.raw !== "—" && data.cell.raw !== "" && typeof data.cell.raw === 'string') {
          data.cell.styles.fillColor = [187, 222, 251]; // Light blue
          data.cell.styles.fontSize = 5;
        } else {
          // Empty cells stay white
          data.cell.styles.fillColor = [255, 255, 255];
        }
      }
    },
    // Allow table to span multiple pages if needed, but keep it continuous
    showHead: 'everyPage',
    margin: { top: 25, bottom: 10, left: 10, right: 10 }
  });
  
  doc.save(`${fileName}.pdf`);
}


/**
 * Export room occupancy to Excel with all rooms organized by days
 */
export function exportRoomOccupancyToExcel(rooms, schedules, timeSlots, fileName = "room-occupancy") {
  const workbook = XLSX.utils.book_new();
  
  const { header, rows } = buildAllRoomsOccupancyGrid(rooms, schedules, timeSlots);
  
  // Build data array for Excel
  const data = [header];
  const merges = [];
  let currentRow = 1; // Start after header
  
  rows.forEach((row) => {
    if (row.isDayHeader) {
      // Day header row
      data.push([row.dayLabel]);
      // Merge cells for day header
      merges.push({
        s: { r: currentRow, c: 0 },
        e: { r: currentRow, c: row.colSpan - 1 }
      });
      currentRow++;
    } else if (row.isSpacingRow) {
      // Spacing row
      data.push([""]);
      currentRow++;
    } else {
      // Regular data row
      data.push(row);
      currentRow++;
    }
  });
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  const columnWidths = [
    { wch: 20 }, // FACULTY column
    { wch: 20 }, // ROOM column
    { wch: 12 }, // CAPACITY column
    ...timeSlots.map(() => ({ wch: 30 })) // Time slot columns
  ];
  worksheet["!cols"] = columnWidths;
  
  // Apply merges
  if (merges.length > 0) {
    worksheet["!merges"] = merges;
  }
  
  // Apply styling
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  // Style header row (blue background)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "3B82F6" } },
      font: { bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Style data rows
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const firstCellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (!worksheet[firstCellAddress]) continue;
    
    const firstCellValue = worksheet[firstCellAddress].v;
    
    // Check if this is a day header row
    const isDayHeader = typeof firstCellValue === 'string' && 
      (firstCellValue.includes('MONDAY') || firstCellValue.includes('TUESDAY') || 
       firstCellValue.includes('WEDNESDAY') || firstCellValue.includes('THURSDAY') || 
       firstCellValue.includes('FRIDAY') || firstCellValue.includes('SATURDAY'));
    
    if (isDayHeader) {
      // Style day header row (blue background, white text, bold, centered)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "3B82F6" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    } else {
      // Style regular data row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        const cellValue = worksheet[cellAddress].v;
        
        // Color occupied cells (column > 2 means time slot columns)
        if (col > 2) {
          if (cellValue && cellValue !== "—" && cellValue !== "") {
            worksheet[cellAddress].s = {
              fill: { fgColor: { rgb: "BBDEFB" } }, // Light blue
              alignment: { horizontal: "center", vertical: "center", wrapText: true }
            };
          } else {
            worksheet[cellAddress].s = {
              alignment: { horizontal: "center", vertical: "center" }
            };
          }
        } else {
          // Style FACULTY, ROOM, CAPACITY columns
          worksheet[cellAddress].s = {
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
    }
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Room Occupancy");
  
  // Write file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Build grid data for mobile format with days as first column and merged cells
 */
function buildMobileRoomsOccupancyGrid(rooms, schedules, timeSlots) {
  // Header with DAY column first
  const header = ["DAY", "FCT", "ROOM", "CAP", ...timeSlots];
  const allRows = [];

  const days = [
    { key: "Mon", label: "MON", fullLabel: "MONDAY" },
    { key: "Tue", label: "TUE", fullLabel: "TUESDAY" },
    { key: "Wed", label: "WED", fullLabel: "WEDNESDAY" },
    { key: "Thu", label: "THU", fullLabel: "THURSDAY" },
    { key: "Fri", label: "FRI", fullLabel: "FRIDAY" },
    { key: "Sat", label: "SAT", fullLabel: "SATURDAY" },
  ];

  const dayToColIndex = {
    "Mon": 0,
    "Tue": 1,
    "Wed": 2,
    "Thu": 3,
    "Fri": 4,
    "Sat": 5
  };

  days.forEach((day) => {
    const colIndex = dayToColIndex[day.key];
    
    // Track the first row for this day (for merge info)
    const dayStartRow = allRows.length;
    
    rooms.forEach((room) => {
      const roomId = String(room.unid || '');
      const row = [
        day.fullLabel, // DAY column - full day name
        room.faculty || "N/A",
        room.name || room.ID || "N/A",
        room.capacity || "N/A"
      ];
      
      // Add time slot data for this specific day
      timeSlots.forEach((slot, rowIndex) => {
        const matches = schedules.filter((s) => {
          const roomMatch = s.roomId && String(s.roomId) === roomId;
          const timeMatch = s.rowIndex === rowIndex;
          const dayMatch = s.colIndex === colIndex;
          return roomMatch && timeMatch && dayMatch;
        });
        
        if (matches.length === 0) {
          row.push("—");
        } else {
          // Mobile format: concise display
          const cellContent = matches.map((occ) => {
            const parts = [];
            
            // Shortened class info
            const classNameParts = [];
            if (occ.class) classNameParts.push(occ.class);
            if (occ.branch) classNameParts.push(occ.branch);
            if (occ.semester) classNameParts.push(occ.semester);
            
            if (classNameParts.length > 0) {
              let classInfo = classNameParts.join(" ");
              if (occ.batch) classInfo += ` (${occ.batch})`;
              parts.push(classInfo);
            }
            
            if (occ.course) parts.push(`C: ${occ.course}`);
            if (occ.teacher) parts.push(`T: ${occ.teacher}`);
            
            return parts.join(" ");
          }).join(", ");
          
          row.push(cellContent);
        }
      });
      
      allRows.push(row);
    });
    
    // Store merge info for this day
    const dayEndRow = allRows.length - 1;
    if (dayEndRow >= dayStartRow) {
      allRows[dayStartRow].dayMerge = {
        startRow: dayStartRow,
        endRow: dayEndRow,
        dayLabel: day.fullLabel // Full day name like MONDAY
      };
    }
  });
  
  return { header, rows: allRows };
}

/**
 * Export room occupancy to PDF in mobile-friendly format (Portrait A4)
 */
export function exportRoomOccupancyToPdfMobile(rooms, schedules, timeSlots, fileName = "room-occupancy-mobile") {
  // Use A4 portrait for mobile
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  const { header, rows } = buildMobileRoomsOccupancyGrid(rooms, schedules, timeSlots);
  
  // Add title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Room Occupancy (Mobile)`, 14, 10);
  
  // Prepare table body with rowSpan for merged DAY cells
  const tableBody = [];
  const processedDayGroups = new Set();
  
  rows.forEach((row, rowIdx) => {
    const rowData = [];
    
    // Get the day value
    const dayValue = row[0];
    
    // Check if this is the first row of a day group
    if (row.dayMerge && !processedDayGroups.has(dayValue)) {
      // First row of day - add cell with rowSpan
      processedDayGroups.add(dayValue);
      
      // Create a custom cell with rowSpan
      rowData.push({
        content: row.dayMerge.dayLabel.split('').join('\n'), // Stack letters vertically
        rowSpan: row.dayMerge.endRow - row.dayMerge.startRow + 1,
        styles: { 
          halign: 'center',
          valign: 'middle',
          fillColor: [187, 222, 251], // Light blue
          fontStyle: 'bold',
          fontSize: 2,
          cellPadding: 0.1,
          minCellHeight: 1.2
        }
      });
    }
    
    // Add the rest of the columns (FCT, ROOM, CAP, and time slots)
    for (let i = 1; i < row.length; i++) {
      rowData.push(row[i]);
    }
    
    tableBody.push(rowData);
  });
  
  // Calculate column widths dynamically for A4 portrait
  const pageWidth = 210; // A4 width in mm
  const margins = 12; // left + right margins
  const availableWidth = pageWidth - margins;
  const numTimeslots = timeSlots.length;
  
  // Fixed widths for first 4 columns
  const fixedColumnWidths = [5, 7, 10, 6]; // DAY, FCT, ROOM, CAP
  const fixedTotalWidth = fixedColumnWidths.reduce((sum, w) => sum + w, 0);
  
  // Remaining width for time slots
  const timeslotColumnWidth = (availableWidth - fixedTotalWidth) / numTimeslots;
  
  // Build columnStyles object
  const columnStyles = {
    0: { cellWidth: fixedColumnWidths[0], halign: "center", fontSize: 2, fontStyle: 'bold' }, // DAY
    1: { cellWidth: fixedColumnWidths[1], halign: "center", fontSize: 1.8 }, // FCT
    2: { cellWidth: fixedColumnWidths[2], halign: "center", fontSize: 1.8 }, // ROOM
    3: { cellWidth: fixedColumnWidths[3], halign: "center", fontSize: 1.8 }  // CAP
  };
  
  // Add time slot columns
  for (let i = 0; i < numTimeslots; i++) {
    columnStyles[4 + i] = {
      cellWidth: timeslotColumnWidth,
      halign: "center",
      fontSize: 1.8
    };
  }
  
  // Calculate row height
  const pageHeight = 297; // A4 height in mm
  const startY = 13;
  const bottomMargin = 8;
  const availableHeight = pageHeight - startY - bottomMargin;
  const headerHeight = 3;
  const rowHeight = (availableHeight - headerHeight) / tableBody.length;
  const finalRowHeight = Math.max(1.2, Math.min(2, rowHeight));
  
  // Create the table
  autoTable(doc, {
    head: [header],
    body: tableBody,
    startY: startY,
    theme: "grid",
    tableWidth: availableWidth,
    styles: {
      fontSize: 1.8,
      cellPadding: 0.1,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
      lineWidth: 0.05,
      lineColor: [150, 150, 150],
      minCellHeight: finalRowHeight,
      cellHeight: finalRowHeight
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 3,
      cellPadding: 0.2,
      minCellHeight: headerHeight
    },
    columnStyles: columnStyles,
    didParseCell: (data) => {
      // Color occupied time slot cells (columns after index 3)
      if (data.section === "body" && data.column.index > 3) {
        if (data.cell.raw !== "—" && data.cell.raw !== "" && typeof data.cell.raw === 'string') {
          data.cell.styles.fillColor = [187, 222, 251]; // Light blue
        }
      }
    },
    showHead: 'firstPage',
    margin: { top: startY, bottom: bottomMargin, left: 6, right: 6 }
  });
  
  doc.save(`${fileName}.pdf`);
}

/**
 * Export room occupancy to Excel in mobile-friendly format
 */
export function exportRoomOccupancyToExcelMobile(rooms, schedules, timeSlots, fileName = "room-occupancy-mobile") {
  const workbook = XLSX.utils.book_new();
  
  const { header, rows } = buildMobileRoomsOccupancyGrid(rooms, schedules, timeSlots);
  
  // Build data array for Excel
  const data = [header];
  const merges = [];
  let currentRow = 1; // Start after header
  
  // Track day merges
  const dayMerges = [];
  
  rows.forEach((row) => {
    if (row.dayMerge) {
      // Record merge info for this day
      dayMerges.push({
        startRow: currentRow,
        endRow: currentRow + (row.dayMerge.endRow - row.dayMerge.startRow),
        dayLabel: row.dayMerge.dayLabel
      });
    }
    
    data.push(row);
    currentRow++;
  });
  
  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths for mobile
  const columnWidths = [
    { wch: 5 },  // DAY (narrow, vertical text)
    { wch: 10 }, // FCT
    { wch: 12 }, // ROOM
    { wch: 8 },  // CAP
    ...timeSlots.map(() => ({ wch: 18 })) // Time slots
  ];
  worksheet["!cols"] = columnWidths;
  
  // Apply DAY column merges
  dayMerges.forEach((merge) => {
    merges.push({
      s: { r: merge.startRow, c: 0 }, // DAY column
      e: { r: merge.endRow, c: 0 }
    });
  });
  
  if (merges.length > 0) {
    worksheet["!merges"] = merges;
  }
  
  // Apply styling
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  // Style header row
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "3B82F6" } }, // Blue
      font: { bold: true, sz: 8, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Style data rows
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { v: "" };
      }
      
      const cellValue = worksheet[cellAddress].v;
      
      if (col === 0) {
        // DAY column - light blue background, bold, vertical text
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "BBDEFB" } },
          font: { bold: true, sz: 8 },
          alignment: { horizontal: "center", vertical: "center", textRotation: 90 }
        };
      } else if (col > 3 && cellValue && cellValue !== "—") {
        // Time slot cells with data - light blue
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "BBDEFB" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          font: { sz: 8 }
        };
      } else {
        // Other cells - default styling
        worksheet[cellAddress].s = {
          alignment: { horizontal: "center", vertical: "center" },
          font: { sz: 8 }
        };
      }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, "Room Occupancy");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
