/**
 * Export utilities for Room Occupancy
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Build room occupancy grid for a specific day
 */
function buildRoomOccupancyGrid(rooms, schedules, timeSlots, dayKey, dayLabel) {
  // Map day key to colIndex
  const dayToColIndex = {
    "Mon": 0,
    "Tue": 1,
    "Wed": 2,
    "Thu": 3,
    "Fri": 4,
    "Sat": 5
  };
  
  const colIndex = dayToColIndex[dayKey];
  
  // Build header
  const header = ["Room", ...timeSlots];
  
  // Build body
  const body = rooms.map((room) => {
    const roomName = room.name || room.ID || "Unknown";
    const roomId = String(room.unid || '');
    
    const row = [roomName];
    
    // For each time slot (rowIndex)
    timeSlots.forEach((timeSlot, rowIndex) => {
      // Find schedules matching this room, day, and time
      const matches = schedules.filter((s) => {
        const roomMatch = s.roomId && String(s.roomId) === roomId;
        const timeMatch = s.rowIndex === rowIndex;
        const dayMatch = s.colIndex === colIndex;
        return roomMatch && timeMatch && dayMatch;
      });
      
      if (matches.length === 0) {
        row.push("—");
      } else {
        // Build cell content with complete class info
        const cellContent = matches.map((occ) => {
          const parts = [];
          
          // Build complete class name: Class Branch Semester Type (NOT including course)
          const classNameParts = [];
          if (occ.class) classNameParts.push(occ.class);
          if (occ.branch) classNameParts.push(occ.branch);
          if (occ.semester) classNameParts.push(occ.semester); // This seems to be semester in the data
          if (occ.type) classNameParts.push(occ.type);
          
          if (classNameParts.length > 0) {
            let classInfo = classNameParts.join(" ");
            if (occ.batch) classInfo += ` (${occ.batch})`;
            parts.push(classInfo);
          }
          
          // Course is separate field
          if (occ.course) parts.push(`Course: ${occ.course}`);
          
          if (occ.teacher) parts.push(`Teacher: ${occ.teacher}`);
          
          return parts.join("\n");
        }).join("\n---\n");
        
        row.push(cellContent);
      }
    });
    
    return row;
  });
  
  return { header, body, dayLabel };
}

/**
 * Export room occupancy to PDF (separate pages for each day)
 */
export function exportRoomOccupancyToPdf(rooms, schedules, timeSlots, fileName = "room-occupancy") {
  // Use A2 size in landscape for more space (594mm x 420mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a2"
  });
  
  const days = [
    { key: "Mon", label: "Monday" },
    { key: "Tue", label: "Tuesday" },
    { key: "Wed", label: "Wednesday" },
    { key: "Thu", label: "Thursday" },
    { key: "Fri", label: "Friday" },
    { key: "Sat", label: "Saturday" },
  ];
  
  days.forEach((day, dayIndex) => {
    if (dayIndex > 0) {
      doc.addPage(); // New page for each day
    }
    
    const { header, body, dayLabel } = buildRoomOccupancyGrid(
      rooms,
      schedules,
      timeSlots,
      day.key,
      day.label
    );
    
    // Title for the day
    doc.setFontSize(14);
    doc.text(`Room Occupancy - ${dayLabel}`, 10, 12);
    
    // Calculate column widths dynamically
    const pageWidth = doc.internal.pageSize.getWidth();
    const margins = 20; // 10mm on each side
    const availableWidth = pageWidth - margins;
    const roomColumnWidth = 25; // Fixed width for room column
    const timeSlotColumnWidth = (availableWidth - roomColumnWidth) / timeSlots.length;
    
    // Build column styles dynamically
    const columnStyles = {
      0: { cellWidth: roomColumnWidth, fontStyle: "bold" } // Room column
    };
    
    // Set width for each time slot column
    for (let i = 1; i <= timeSlots.length; i++) {
      columnStyles[i] = { cellWidth: timeSlotColumnWidth };
    }
    
    // Table
    autoTable(doc, {
      startY: 18,
      head: [header],
      body: body,
      styles: {
        fontSize: 6,
        cellPadding: 1.5,
        overflow: "linebreak",
        cellWidth: "wrap",
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        fontSize: 6,
        cellPadding: 2,
      },
      columnStyles: columnStyles,
      margin: { top: 18, left: 10, right: 10, bottom: 10 },
      theme: "grid",
      tableWidth: "auto",
    });
  });
  
  doc.save(`${fileName}.pdf`);
}

/**
 * Export room occupancy to Excel (separate sheets for each day)
 */
export function exportRoomOccupancyToExcel(rooms, schedules, timeSlots, fileName = "room-occupancy") {
  const workbook = XLSX.utils.book_new();
  
  const days = [
    { key: "Mon", label: "Monday" },
    { key: "Tue", label: "Tuesday" },
    { key: "Wed", label: "Wednesday" },
    { key: "Thu", label: "Thursday" },
    { key: "Fri", label: "Friday" },
    { key: "Sat", label: "Saturday" },
  ];
  
  days.forEach((day) => {
    const { header, body } = buildRoomOccupancyGrid(
      rooms,
      schedules,
      timeSlots,
      day.key,
      day.label
    );
    
    // Combine header and body
    const sheetData = [header, ...body];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Set column widths
    const colWidths = [{ wch: 20 }]; // Room column
    timeSlots.forEach(() => colWidths.push({ wch: 30 })); // Time slot columns
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, day.label);
  });
  
  // Export
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
