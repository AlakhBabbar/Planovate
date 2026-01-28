/**
 * Export utilities for Teacher Occupancy
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Build teacher occupancy grid for a specific day
 */
function buildTeacherOccupancyGrid(teachers, schedules, timeSlots, dayKey, dayLabel) {
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
  const header = ["Teacher", ...timeSlots];
  
  // Build body
  const body = teachers.map((teacher) => {
    const teacherName = teacher.name || teacher.ID || "Unknown";
    const teacherId = String(teacher.unid || '');
    
    const row = [teacherName];
    
    // For each time slot (rowIndex)
    timeSlots.forEach((timeSlot, rowIndex) => {
      // Find schedules matching this teacher, day, and time
      const matches = schedules.filter((s) => {
        const teacherMatch = s.teacherId && String(s.teacherId) === teacherId;
        const timeMatch = s.rowIndex === rowIndex;
        const dayMatch = s.colIndex === colIndex;
        return teacherMatch && timeMatch && dayMatch;
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
          if (occ.semester) classNameParts.push(occ.semester);
          if (occ.type) classNameParts.push(occ.type);
          
          if (classNameParts.length > 0) {
            let classInfo = classNameParts.join(" ");
            if (occ.batch) classInfo += ` (${occ.batch})`;
            parts.push(classInfo);
          }
          
          // Course is separate field
          if (occ.course) parts.push(`Course: ${occ.course}`);
          
          if (occ.room) parts.push(`Room: ${occ.room}`);
          
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
 * Export teacher occupancy to PDF (separate pages for each day)
 */
export function exportTeacherOccupancyToPdf(teachers, schedules, timeSlots, fileName = "teacher-occupancy") {
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
    // Add new page for each day (except the first one)
    if (dayIndex > 0) {
      doc.addPage();
    }
    
    const { header, body, dayLabel } = buildTeacherOccupancyGrid(
      teachers,
      schedules,
      timeSlots,
      day.key,
      day.label
    );
    
    // Add title for the day
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Teacher Occupancy - ${dayLabel}`, 14, 15);
    
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
        fillColor: [34, 197, 94], // Green color for teacher occupancy
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
            data.cell.styles.fillColor = [220, 252, 231]; // Light green background
          }
        }
      }
    });
  });
  
  doc.save(`${fileName}.pdf`);
}

/**
 * Export teacher occupancy to Excel (separate sheets for each day)
 */
export function exportTeacherOccupancyToExcel(teachers, schedules, timeSlots, fileName = "teacher-occupancy") {
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
    const { header, body } = buildTeacherOccupancyGrid(
      teachers,
      schedules,
      timeSlots,
      day.key,
      day.label
    );
    
    // Combine header and body
    const data = [header, ...body];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Teacher name column
      ...timeSlots.map(() => ({ wch: 25 })) // Time slot columns
    ];
    worksheet["!cols"] = columnWidths;
    
    // Add worksheet to workbook with day name as sheet name
    XLSX.utils.book_append_sheet(workbook, worksheet, day.label);
  });
  
  // Write the file
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
