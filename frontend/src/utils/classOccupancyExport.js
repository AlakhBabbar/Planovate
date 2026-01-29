/**
 * Export utilities for Class Occupancy
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Helper function to format class with type
 * Hides "Full Time" but shows "Part Time" and other types
 */
function formatClassWithType(className, type) {
  const classStr = className || "N/A";
  if (!type) return classStr;
  
  const typeStr = String(type).trim().toUpperCase().replace(/\s+/g, ' ');
  
  // Only add type if it's NOT Full Time (check various formats)
  if (typeStr === "FULL TIME" || typeStr === "FULLTIME" || typeStr === "FULL-TIME") {
    return classStr;
  }
  
  return `${classStr} ${type}`;
}

/**
 * Build class occupancy grid with all classes organized by days:
 * - One sheet/document with all classes
 * - Organized by days (Monday, Tuesday, etc.)
 * - Each day section shows all classes
 * - Classes sorted hierarchically: B.Tech (sem 1,2,3...), M.Tech (sem 1,2,3...), etc.
 */
function buildAllClassesOccupancyGrid(classes, schedules, timeSlots) {
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

  // Use the classes array as-is to preserve custom order from the caller
  // Build header: CLASS | BRANCH | SEMESTER | TYPE | Time Slots...
  const header = ["CLASS", "BRANCH", "SEMESTER", "TYPE", ...timeSlots];
  
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
    
    // For each class, add a row with their occupancy for this specific day
    classes.forEach((classData) => {
      // Group schedules by branch and type for this class
      const groups = {};
      schedules.forEach((schedule) => {
        if (schedule.timetableId !== classData.id) return;
        
        const classType = schedule.class || classData.class || "N/A";
        const branch = schedule.branch || classData.branch || "N/A";
        const semester = schedule.semester || classData.semester || "N/A";
        const type = schedule.type || classData.type || "N/A";
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
        // Add empty row for this class
        const row = [classData.class || "N/A", classData.branch || "N/A", classData.semester || "N/A", classData.type || "N/A"];
        timeSlots.forEach(() => row.push("—"));
        allRows.push(row);
      } else {
        // Add row for each group
        groupedArray.forEach((group) => {
          const row = [group.class, group.branch, group.semester, group.type];
          
          // Add time slot data for this specific day
          timeSlots.forEach((slot, rowIndex) => {
            const matches = group.schedules.filter((s) => {
              return s.rowIndex === rowIndex && s.colIndex === colIndex;
            });
            
            if (matches.length === 0) {
              row.push("—");
            } else {
              const cellContent = matches.map((occ) => {
                const parts = [];
                if (occ.course) parts.push(occ.course);
                if (occ.teacher) parts.push(`(${occ.teacher})`);
                if (occ.room) parts.push(`[${occ.room}]`);
                return parts.join(" ");
              }).join(", ");
              
              row.push(cellContent);
            }
          });
          
          allRows.push(row);
        });
      }
    });
    
    // Add spacing row between days (except after last day)
    if (dayIndex < days.length - 1) {
      allRows.push({ isSpacingRow: true, colSpan: header.length });
    }
  });
  
  return { header, rows: allRows };
}

/**
 * Export class occupancy to PDF with all classes organized by days
 */
export function exportClassOccupancyToPdf(classes, schedules, timeSlots, fileName = "class-occupancy", branchColors = {}) {
  // Use A2 size in landscape for more space
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a2"
  });

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    if (!hex || hex === '#FFFFFF') return [255, 255, 255];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 255, 255];
  };
  
  const { header, rows } = buildAllClassesOccupancyGrid(classes, schedules, timeSlots);
  
  // Add title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Class Occupancy - All Classes by Day`, 14, 15);
  
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
          fillColor: [255, 193, 7], 
          fontStyle: 'bold', 
          fontSize: 8,
          cellPadding: 2
        } 
      }]);
    } else if (row.isSpacingRow) {
      // Skip spacing rows to make it more compact
      // tableBody.push([{ content: '', colSpan: row.colSpan, styles: { minCellHeight: 1, fillColor: [240, 240, 240] } }]);
    } else {
      // Regular data row - ensure single line display
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
      fillColor: [255, 235, 59], // Yellow color
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      fontSize: 6,
      cellPadding: 1.5
    },
    columnStyles: {
      0: { // CLASS column
        cellWidth: 22,
        halign: "center",
        fontSize: 5
      },
      1: { // BRANCH column
        cellWidth: 22,
        halign: "center",
        fontSize: 5
      },
      2: { // SEMESTER column
        cellWidth: 18,
        halign: "center",
        fontSize: 5
      },
      3: { // TYPE column
        cellWidth: 18,
        halign: "center",
        fontSize: 5
      }
    },
    didParseCell: (data) => {
      // Apply branch colors to cells
      if (data.section === "body" && data.row && data.row.raw) {
        const branch = data.row.raw[1]; // BRANCH column
        const color = branchColors[branch];
        if (color) {
          data.cell.styles.fillColor = hexToRgb(color);
        }
        // Color occupied time slot cells
        if (data.column.index > 3) {
          if (data.cell.raw !== "—" && data.cell.raw !== "" && typeof data.cell.raw === 'string') {
            if (color) {
              data.cell.styles.fillColor = hexToRgb(color);
            } else {
              data.cell.styles.fillColor = [200, 230, 201]; // Light green fallback
            }
            data.cell.styles.fontSize = 5;
          } else {
            // Empty cells stay white
            data.cell.styles.fillColor = [255, 255, 255];
          }
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
 * Export class occupancy to Excel with all classes organized by days
 */
export function exportClassOccupancyToExcel(classes, schedules, timeSlots, fileName = "class-occupancy", branchColors = {}) {
  const workbook = XLSX.utils.book_new();

  // Helper function to convert hex to Excel RGB
  const hexToExcelRgb = (hex) => {
    if (!hex || hex === '#FFFFFF') return null;
    return hex.replace('#', '');
  };
  
  const { header, rows } = buildAllClassesOccupancyGrid(classes, schedules, timeSlots);
  
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
    { wch: 20 }, // CLASS column
    { wch: 20 }, // BRANCH column
    { wch: 15 }, // SEMESTER column
    { wch: 15 }, // TYPE column
    ...timeSlots.map(() => ({ wch: 30 })) // Time slot columns
  ];
  worksheet["!cols"] = columnWidths;
  
  // Apply merges
  if (merges.length > 0) {
    worksheet["!merges"] = merges;
  }
  
  // Apply styling
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  // Style header row (yellow background)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      fill: { fgColor: { rgb: "FFEB3B" } },
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Style data rows
  let inDaySection = false;
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const firstCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    const firstCellValue = firstCell ? firstCell.v : "";
    
    // Check if this is a day header row
    const isDayHeader = firstCellValue && ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].includes(firstCellValue);
    
    if (isDayHeader) {
      // Style day header row (amber background)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: "" };
        }
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "FFC107" } },
          font: { bold: true, sz: 12 },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }
    } else if (firstCellValue === "") {
      // Spacing row - light gray
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: "" };
        }
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "F0F0F0" } }
        };
      }
    } else {
      // Regular data row - get branch for color
      const branchCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
      const branch = branchCell ? branchCell.v : null;
      const branchColor = branch ? hexToExcelRgb(branchColors[branch]) : null;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        const cellValue = worksheet[cellAddress].v;
        
        // Apply branch color to all cells in the row if available
        if (branchColor && (col <= 3 || (cellValue && cellValue !== "—"))) {
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: branchColor } },
            alignment: { horizontal: "center", vertical: "center", wrapText: col > 3 }
          };
        } else if (col > 3 && cellValue && cellValue !== "—") {
          // Fallback to light green for occupied cells
          worksheet[cellAddress].s = {
            fill: { fgColor: { rgb: "C8E6C9" } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true }
          };
        } else {
          worksheet[cellAddress].s = {
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
    }
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Class Occupancy");
  
  // Write the file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Build grid data for mobile format with days as first column and merged cells
 */
function buildMobileClassesOccupancyGrid(classes, schedules, timeSlots) {
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

  // Header with DAY column first (removed TP)
  const header = ["DAY", "CLS", "BR", "SM", ...timeSlots];
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

  // Use the classes array as-is to preserve custom order from the caller
  days.forEach((day) => {
    const colIndex = dayToColIndex[day.key];
    
    // Track the first row for this day (for merge info)
    const dayStartRow = allRows.length;
    
    classes.forEach((classData) => {
      // Group schedules by branch, semester, and type
      const groups = {};
      schedules.forEach((schedule) => {
        if (schedule.timetableId !== classData.id) return;
        
        const classType = schedule.class || classData.class || "N/A";
        const branch = schedule.branch || classData.branch || "N/A";
        const semester = schedule.semester || classData.semester || "N/A";
        const type = schedule.type || classData.type || "N/A";
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
        // Add empty row for this class
        const classWithType = formatClassWithType(classData.class, classData.type);
        const row = [
          day.fullLabel, // DAY column - full day name
          classWithType, 
          classData.branch || "N/A", 
          toRoman(classData.semester) || "N/A"
        ];
        timeSlots.forEach(() => row.push("—"));
        allRows.push(row);
      } else {
        // Add row for each group
        groupedArray.forEach((group) => {
          const classWithType = formatClassWithType(group.class, group.type);
          const row = [
            day.fullLabel, // DAY column - full day name
            classWithType, 
            group.branch, 
            toRoman(group.semester)
          ];
          
          // Add time slot data for this specific day
          timeSlots.forEach((slot, rowIndex) => {
            const matches = group.schedules.filter((s) => {
              return s.rowIndex === rowIndex && s.colIndex === colIndex;
            });
            
            if (matches.length === 0) {
              row.push("—");
            } else {
              // Mobile format: course ID, teacher ID, room ID (only), and batch
              const cellContent = matches.map((occ) => {
                const parts = [];
                if (occ.course) parts.push(`C: ${occ.course}`);
                if (occ.teacher) parts.push(`T: ${occ.teacher}`);
                if (occ.roomIdOnly) parts.push(`[${occ.roomIdOnly}]`);
                if (occ.batch) parts.push(occ.batch);
                return parts.join(" ");
              }).join(", ");
              
              row.push(cellContent);
            }
          });
          
          allRows.push(row);
        });
      }
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
 * Export class occupancy to PDF in mobile-friendly format (Portrait A4)
 * Uses autoTable's built-in rowSpan support for proper cell merging
 * All data fits on one page with color-coded rows
 */
export function exportClassOccupancyToPdfMobile(classes, schedules, timeSlots, fileName = "class-occupancy-mobile", branchColors = {}) {
  // Use A4 portrait for mobile
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
  
  const { header, rows } = buildMobileClassesOccupancyGrid(classes, schedules, timeSlots);
  
  // Add title
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Class Occupancy (Mobile)`, 14, 10);
  
  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    if (!hex || hex === '#FFFFFF') return [255, 255, 255];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 255, 255];
  };

  // Convert user branch colors to RGB
  const branchColorsRgb = {};
  rows.forEach(row => {
    const branch = row[2]; // BR column (index 2 after removing TP)
    if (branch && branchColors[branch]) {
      branchColorsRgb[branch] = hexToRgb(branchColors[branch]);
    } else if (branch && !branchColorsRgb[branch]) {
      branchColorsRgb[branch] = [255, 255, 255]; // White default
    }
  });
  
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
          fillColor: [255, 249, 196],
          fontStyle: 'bold',
          fontSize: 2,
          cellPadding: 0.1,
          minCellHeight: 1.2
        }
      });
    }
    // For subsequent rows in the same day group, the rowSpan will handle it automatically
    
    // Add the rest of the columns (CLS, BR, SM, and time slots)
    for (let i = 1; i < row.length; i++) {
      rowData.push(row[i]);
    }
    
    // Assign color based on branch
    const branch = row[2]; // BR column
    rowData.branchColor = branchColorsRgb[branch] || [255, 255, 255];
    rowData.branch = branch;
    
    tableBody.push(rowData);
  });
  
  // Calculate column widths dynamically for A4 portrait
  const pageWidth = 210; // A4 width in mm
  const margins = 12; // left + right margins (reduced)
  const availableWidth = pageWidth - margins;
  const numTimeslots = timeSlots.length;
  
  // Fixed widths for first 4 columns (including DAY) - ultra compact (removed TP)
  const fixedColumnWidths = [5, 8, 7, 5]; // DAY, Cls, Br, Sm
  const fixedTotalWidth = fixedColumnWidths.reduce((sum, w) => sum + w, 0);
  
  // Remaining width for time slots
  const timeslotColumnWidth = (availableWidth - fixedTotalWidth) / numTimeslots;
  
  // Build columnStyles object with smaller fonts
  const columnStyles = {
    0: { cellWidth: fixedColumnWidths[0], halign: "center", fontSize: 2, fontStyle: 'bold' }, // DAY
    1: { cellWidth: fixedColumnWidths[1], halign: "center", fontSize: 1.8 }, // Cls
    2: { cellWidth: fixedColumnWidths[2], halign: "center", fontSize: 1.8 }, // Br
    3: { cellWidth: fixedColumnWidths[3], halign: "center", fontSize: 1.8 }  // Sm
  };
  
  // Add time slot columns
  for (let i = 0; i < numTimeslots; i++) {
    columnStyles[4 + i] = {
      cellWidth: timeslotColumnWidth,
      halign: "center",
      fontSize: 1.8
    };
  }
  
  // Calculate available height
  const pageHeight = 297; // A4 height in mm
  const startY = 13;
  const bottomMargin = 8;
  const availableHeight = pageHeight - startY - bottomMargin;
  const headerHeight = 3;
  const rowHeight = (availableHeight - headerHeight) / tableBody.length;
  const finalRowHeight = Math.max(1.2, Math.min(2, rowHeight)); // Min 1.2mm, max 2mm
  
  // Create the table with built-in rowSpan support
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
      fillColor: [100, 100, 100],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      fontSize: 3,
      cellPadding: 0.2,
      minCellHeight: headerHeight
    },
    columnStyles: columnStyles,
    didParseCell: (data) => {
      // Apply branch-based color to all cells in the row
      if (data.section === "body" && data.row && data.row.raw.branchColor) {
        data.cell.styles.fillColor = data.row.raw.branchColor;
      }
    },
    showHead: 'firstPage',
    margin: { top: startY, bottom: bottomMargin, left: 6, right: 6 }
  });
  
  doc.save(`${fileName}.pdf`);
}

/**
 * Export class occupancy to Excel in mobile-friendly format
 */
export function exportClassOccupancyToExcelMobile(classes, schedules, timeSlots, fileName = "class-occupancy-mobile", branchColors = {}) {
  const workbook = XLSX.utils.book_new();

  // Helper function to convert hex to Excel RGB
  const hexToExcelRgb = (hex) => {
    if (!hex || hex === '#FFFFFF') return null;
    return hex.replace('#', '');
  };
  
  const { header, rows } = buildMobileClassesOccupancyGrid(classes, schedules, timeSlots);
  
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
  
  // Set column widths for mobile with DAY column (removed TP)
  const columnWidths = [
    { wch: 5 },  // DAY (narrow, vertical text)
    { wch: 12 }, // CLS (wider to accommodate class+type)
    { wch: 10 }, // BR
    { wch: 8 },  // SM
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
      fill: { fgColor: { rgb: "FFEB3B" } },
      font: { bold: true, sz: 8 },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }
  
  // Style data rows
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    // Get branch for this row
    const branchCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })];
    const branch = branchCell ? branchCell.v : null;
    const branchColor = branch ? hexToExcelRgb(branchColors[branch]) : null;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) {
        worksheet[cellAddress] = { v: "" };
      }
      
      const cellValue = worksheet[cellAddress].v;
      
      if (col === 0) {
        // DAY column - yellow background, bold, vertical text
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "FFF9C4" } },
          font: { bold: true, sz: 8 },
          alignment: { horizontal: "center", vertical: "center", textRotation: 90 }
        };
      } else if (branchColor && (col <= 3 || (col > 3 && cellValue && cellValue !== "—"))) {
        // Apply branch color to all cells except empty time slots
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: branchColor } },
          alignment: { horizontal: "center", vertical: "center", wrapText: col > 3 },
          font: { sz: 8 }
        };
      } else if (col > 3 && cellValue && cellValue !== "—") {
        // Time slot cells with data - fallback green
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: "C8E6C9" } },
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
  
  XLSX.utils.book_append_sheet(workbook, worksheet, "Class Occupancy");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
