/**
 * Export utilities for Class Occupancy
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Build class occupancy grid (time slots as rows, days as columns)
 */
function buildClassOccupancyGrid(classData, schedules, timeSlots) {
  const days = [
    { key: "Mon", label: "Monday" },
    { key: "Tue", label: "Tuesday" },
    { key: "Wed", label: "Wednesday" },
    { key: "Thu", label: "Thursday" },
    { key: "Fri", label: "Friday" },
    { key: "Sat", label: "Saturday" },
  ];

  const dayToColIndex = {
    "Mon": 0,
    "Tue": 1,
    "Wed": 2,
    "Thu": 3,
    "Fri": 4,
    "Sat": 5
  };
  
  // Build header
  const header = ["Time Slot", ...days.map(d => d.label)];
  
  // Build body
  const body = timeSlots.map((timeSlot, rowIndex) => {
    const row = [timeSlot];
    
    // For each day
    days.forEach((day) => {
      const colIndex = dayToColIndex[day.key];
      
      // Find schedules matching this class, time, and day
      const matches = schedules.filter((s) => {
        const classMatch = s.timetableId && String(s.timetableId) === String(classData.id);
        const timeMatch = s.rowIndex === rowIndex;
        const dayMatch = s.colIndex === colIndex;
        return classMatch && timeMatch && dayMatch;
      });
      
      if (matches.length === 0) {
        row.push("—");
      } else {
        // Build cell content
        const cellContent = matches.map((occ) => {
          const parts = [];
          
          if (occ.batch) parts.push(`Batch: ${occ.batch}`);
          if (occ.course) parts.push(occ.course);
          if (occ.teacher) parts.push(`Teacher: ${occ.teacher}`);
          if (occ.room) parts.push(`Room: ${occ.room}`);
          
          return parts.join("\n");
        }).join("\n---\n");
        
        row.push(cellContent);
      }
    });
    
    return row;
  });
  
  return { header, body, className: classData.displayName };
}

/**
 * Export class occupancy to PDF
 */
export function exportClassOccupancyToPdf(classes, schedules, timeSlots, fileName = "class-occupancy") {
  // Use A2 size in landscape for more space (594mm x 420mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a2"
  });
  
  classes.forEach((classData, classIndex) => {
    // Add new page for each class (except the first one)
    if (classIndex > 0) {
      doc.addPage();
    }
    
    const { header, body, className } = buildClassOccupancyGrid(
      classData,
      schedules,
      timeSlots
    );
    
    // Add title for the class
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Class Occupancy - ${className}`, 14, 15);
    
    // Create the table
    autoTable(doc, {
      head: [header],
      body: body,
      startY: 25,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
        valign: "top"
      },
      headStyles: {
        fillColor: [147, 51, 234], // Purple color for class occupancy
        textColor: 255,
        fontStyle: "bold",
        halign: "center"
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          halign: "left",
          cellWidth: 35
        }
      },
      didParseCell: (data) => {
        // Make occupied cells stand out
        if (data.section === "body" && data.column.index > 0) {
          if (data.cell.raw !== "—") {
            data.cell.styles.fillColor = [243, 232, 255]; // Light purple background
          }
        }
      }
    });
  });
  
  doc.save(`${fileName}.pdf`);
}

/**
 * Export class occupancy to Excel
 */
export function exportClassOccupancyToExcel(classes, schedules, timeSlots, fileName = "class-occupancy") {
  const workbook = XLSX.utils.book_new();
  
  classes.forEach((classData) => {
    const { header, body, className } = buildClassOccupancyGrid(
      classData,
      schedules,
      timeSlots
    );
    
    // Combine header and body
    const data = [header, ...body];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Time slot column
      { wch: 25 }, // Monday
      { wch: 25 }, // Tuesday
      { wch: 25 }, // Wednesday
      { wch: 25 }, // Thursday
      { wch: 25 }, // Friday
      { wch: 25 }  // Saturday
    ];
    worksheet["!cols"] = columnWidths;
    
    // Sanitize sheet name (max 31 chars, no special characters)
    const sheetName = className.substring(0, 31).replace(/[:\\/?*\[\]]/g, '-');
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  
  // Write the file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
