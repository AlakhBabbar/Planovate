import React, { useState } from "react";
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { courseService, roomService, teacherService } from "../firebase/services";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const BulkUpload = () => {
  const [activeTab, setActiveTab] = useState("teachers");
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [idConflict, setIdConflict] = useState(null);
  const [newIdInput, setNewIdInput] = useState("");
  const [resolveCallback, setResolveCallback] = useState(null);

  // Check for duplicate teacher with name comparison
  const checkTeacherConflict = async (teacherID, teacherName) => {
    const q = query(collection(db, "teachers"), where("ID", "==", teacherID));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { exists: false };
    }
    
    const existingTeacher = snapshot.docs[0].data();
    const isSameName = normalize(existingTeacher.name) === normalize(teacherName);
    
    return {
      exists: true,
      sameName: isSameName,
      existingName: existingTeacher.name
    };
  };

  // Check for duplicates
  const checkDuplicateTeacher = async (teacherID) => {
    const q = query(collection(db, "teachers"), where("ID", "==", teacherID));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const checkDuplicateCourse = async (courseID) => {
    const q = query(collection(db, "courses"), where("ID", "==", courseID));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const checkDuplicateRoom = async (roomID) => {
    const q = query(collection(db, "rooms"), where("ID", "==", roomID));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  // Normalize string for comparison
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  // Map teacher IDs to their unids
  const mapTeachersToUnids = async (teacherIDs) => {
    if (!Array.isArray(teacherIDs) || teacherIDs.length === 0) {
      return { mappedUnids: [], warnings: [] };
    }

    const mappedUnids = [];
    const warnings = [];

    // Fetch all teachers once
    const allTeachers = await teacherService.listTeachers({});

    for (const teacherID of teacherIDs) {
      const normalizedInputID = normalize(teacherID);
      
      // Find teacher by normalized ID
      const teacher = allTeachers.find(t => normalize(t.ID) === normalizedInputID);
      
      if (teacher && teacher.unid) {
        mappedUnids.push(teacher.unid);
      } else {
        warnings.push(`Teacher with ID "${teacherID}" not found in database`);
      }
    }

    return { mappedUnids, warnings };
  };

  // Sample data for downloads
  const sampleData = {
    teachers: [
      { name: "Dr. John Smith", ID: "T001", faculty: "Engineering", department: "Computer Science" },
      { name: "Prof. Jane Doe", ID: "T002", faculty: "Engineering", department: "Mechanical" }
    ],
    courses: [
      { name: "Data Structures", code: "CS201", ID: "C001", credits: "4", teachers: ["T001"], faculty: "Engineering", department: "Computer Science", semester: "3" },
      { name: "Machine Design", code: "ME301", ID: "C002", credits: "3", teachers: ["T002"], faculty: "Engineering", department: "Mechanical", semester: "5" }
    ],
    rooms: [
      { name: "Lab A", ID: "R001", capacity: 60, faculty: "Engineering" },
      { name: "Room 101", ID: "R002", capacity: 40, faculty: "Engineering" }
    ]
  };

  // Validation functions
  const validateTeacher = (teacher, index) => {
    const errors = [];
    if (!teacher.name?.trim()) errors.push("Name is required");
    if (!teacher.ID?.trim()) errors.push("ID is required");
    if (!teacher.faculty?.trim()) errors.push("Faculty is required");
    if (!teacher.department?.trim()) errors.push("Department is required");
    return { valid: errors.length === 0, errors, index: index + 1 };
  };

  const validateCourse = (course, index) => {
    const errors = [];
    if (!course.name?.trim()) errors.push("Name is required");
    if (!course.code?.trim()) errors.push("Code is required");
    if (!course.ID?.trim()) errors.push("ID is required");
    if (!course.credits?.trim()) errors.push("Credits is required");
    if (!course.faculty?.trim()) errors.push("Faculty is required");
    if (!course.department?.trim()) errors.push("Department is required");
    if (!course.semester?.trim()) errors.push("Semester is required");
    if (!Array.isArray(course.teachers)) errors.push("Teachers must be an array");
    return { valid: errors.length === 0, errors, index: index + 1 };
  };

  const validateRoom = (room, index) => {
    const errors = [];
    if (!room.name?.trim()) errors.push("Name is required");
    if (!room.ID?.trim()) errors.push("ID is required");
    if (!room.faculty?.trim()) errors.push("Faculty is required");
    if (!room.capacity) errors.push("Capacity is required");
    if (room.capacity && (isNaN(room.capacity) || room.capacity <= 0)) {
      errors.push("Capacity must be a positive number");
    }
    return { valid: errors.length === 0, errors, index: index + 1 };
  };

  // Parse CSV
  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        let value = values[index] || "";
        
        // Handle special cases
        if (header === "teachers") {
          // Parse teachers array from semicolon-separated values
          obj[header] = value ? value.split(";").map(t => t.trim()) : [];
        } else if (header === "capacity") {
          obj[header] = value ? Number(value) : 0;
        } else {
          obj[header] = value;
        }
      });
      data.push(obj);
    }

    return data;
  };

  // Prompt user to update ID
  const promptForNewId = (currentId, existingName, newName, rowIndex) => {
    return new Promise((resolve) => {
      setIdConflict({
        currentId,
        existingName,
        newName,
        rowIndex: rowIndex + 1
      });
      setNewIdInput("");
      setResolveCallback(() => resolve);
    });
  };

  // Handle ID resolution
  const handleIdResolution = (newId) => {
    if (resolveCallback) {
      resolveCallback(newId);
      setIdConflict(null);
      setNewIdInput("");
      setResolveCallback(null);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResults(null);

    try {
      const text = await file.text();
      let data;

      // Parse based on file type
      if (file.name.endsWith(".json")) {
        data = JSON.parse(text);
        if (!Array.isArray(data)) {
          throw new Error("JSON file must contain an array of objects");
        }
      } else if (file.name.endsWith(".csv")) {
        data = parseCSV(text);
      } else {
        throw new Error("Unsupported file format. Please use JSON or CSV");
      }

      // Validate and upload
      const validationResults = [];
      const uploadResults = [];
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < data.length; i++) {
        let validation;
        let uploadSuccess = false;
        let uploadError = null;
        let isDuplicate = false;
        let teacherWarnings = [];

        // Validate based on active tab
        if (activeTab === "teachers") {
          validation = validateTeacher(data[i], i);
          if (validation.valid) {
            // Check for conflict
            const conflict = await checkTeacherConflict(data[i].ID, data[i].name);
            
            if (conflict.exists && !conflict.sameName) {
              // ID exists but different name - prompt user
              const newId = await promptForNewId(
                data[i].ID,
                conflict.existingName,
                data[i].name,
                i
              );
              
              if (newId && newId.trim()) {
                // Use new ID and retry
                data[i].ID = newId.trim();
                
                // Check if new ID is also duplicate
                const newIdExists = await checkDuplicateTeacher(newId.trim());
                if (newIdExists) {
                  uploadError = "New ID also exists in database";
                  failCount++;
                } else {
                  try {
                    await teacherService.upsertTeacher(data[i]);
                    uploadSuccess = true;
                    successCount++;
                  } catch (error) {
                    uploadError = error.message;
                    failCount++;
                  }
                }
              } else {
                uploadError = "ID conflict not resolved";
                failCount++;
              }
            } else if (conflict.exists && conflict.sameName) {
              // Same ID and same name - it's a true duplicate
              uploadError = "Entry with this ID already exists";
              isDuplicate = true;
              duplicateCount++;
              failCount++;
            } else {
              // No conflict - proceed normally
              try {
                await teacherService.upsertTeacher(data[i]);
                uploadSuccess = true;
                successCount++;
              } catch (error) {
                uploadError = error.message;
                failCount++;
              }
            }
          } else {
            failCount++;
          }
        } else if (activeTab === "courses") {
          validation = validateCourse(data[i], i);
          if (validation.valid) {
            // Map teacher IDs to unids
            const { mappedUnids, warnings } = await mapTeachersToUnids(data[i].teachers);
            teacherWarnings = warnings;

            // Check for duplicate
            isDuplicate = await checkDuplicateCourse(data[i].ID);
            if (isDuplicate) {
              uploadError = "Entry with this ID already exists";
              duplicateCount++;
              failCount++;
            } else {
              try {
                // Upload with mapped teacher unids
                await courseService.upsertCourse({
                  ...data[i],
                  teachers: mappedUnids
                });
                uploadSuccess = true;
                successCount++;
              } catch (error) {
                uploadError = error.message;
                failCount++;
              }
            }
          } else {
            failCount++;
          }
        } else if (activeTab === "rooms") {
          validation = validateRoom(data[i], i);
          if (validation.valid) {
            // Check for duplicate
            isDuplicate = await checkDuplicateRoom(data[i].ID);
            if (isDuplicate) {
              uploadError = "Entry with this ID already exists";
              duplicateCount++;
              failCount++;
            } else {
              try {
                await roomService.upsertRoom(data[i]);
                uploadSuccess = true;
                successCount++;
              } catch (error) {
                uploadError = error.message;
                failCount++;
              }
            }
          } else {
            failCount++;
          }
        }

        validationResults.push(validation);
        uploadResults.push({ 
          success: uploadSuccess, 
          error: uploadError, 
          duplicate: isDuplicate,
          warnings: teacherWarnings
        });
      }

      setResults({
        total: data.length,
        success: successCount,
        failed: failCount,
        duplicates: duplicateCount,
        details: data.map((item, i) => ({
          data: item,
          validation: validationResults[i],
          upload: uploadResults[i]
        }))
      });

    } catch (error) {
      alert(`Error processing file: ${error.message}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // Download sample JSON
  const downloadSampleJSON = () => {
    const data = sampleData[activeTab];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${activeTab}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download sample CSV
  const downloadSampleCSV = () => {
    const data = sampleData[activeTab];
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    let csv = headers.join(",") + "\n";

    data.forEach(item => {
      const row = headers.map(header => {
        let value = item[header];
        if (Array.isArray(value)) {
          // Join array values with semicolon for teachers
          value = value.join(";");
        }
        return value;
      });
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: "teachers", label: "Teachers" },
    { id: "courses", label: "Courses" },
    { id: "rooms", label: "Rooms" }
  ];

  const getFieldsInfo = () => {
    switch (activeTab) {
      case "teachers":
        return [
          { name: "name", required: true, type: "string" },
          { name: "ID", required: true, type: "string" },
          { name: "faculty", required: true, type: "string" },
          { name: "department", required: true, type: "string" }
        ];
      case "courses":
        return [
          { name: "name", required: true, type: "string" },
          { name: "code", required: true, type: "string" },
          { name: "ID", required: true, type: "string" },
          { name: "credits", required: true, type: "string" },
          { name: "teachers", required: true, type: "array", note: "Array of teacher IDs (use semicolon in CSV)" },
          { name: "faculty", required: true, type: "string" },
          { name: "department", required: true, type: "string" },
          { name: "semester", required: true, type: "string" }
        ];
      case "rooms":
        return [
          { name: "name", required: true, type: "string" },
          { name: "ID", required: true, type: "string" },
          { name: "capacity", required: true, type: "number" },
          { name: "faculty", required: true, type: "string" }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Bulk Data Upload</h1>
            <p className="text-sm text-gray-600 mt-1">Upload multiple records at once using JSON or CSV files</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 px-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setResults(null);
                  }}
                  className={`px-4 py-3 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Fields Information */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Required Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {getFieldsInfo().map(field => (
                  <div key={field.name} className="flex items-start gap-2">
                    <span className="text-blue-600 font-mono text-sm">{field.name}</span>
                    <span className="text-xs text-gray-500">({field.type})</span>
                    {field.note && <span className="text-xs text-gray-500">- {field.note}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Downloads */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Download Sample Files</h3>
              <div className="flex gap-3">
                <button
                  onClick={downloadSampleJSON}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  <Download size={16} />
                  Sample JSON
                </button>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  <Download size={16} />
                  Sample CSV
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Upload File</h3>
              <label className="block">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
              {uploading && (
                <div className="mt-3 flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm">Processing and uploading data...</span>
                </div>
              )}
            </div>

            {/* Results */}
            {results && (
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Upload Results</h3>
                  <div className="flex gap-6 mt-2 text-sm">
                    <span className="text-gray-600">Total: {results.total}</span>
                    <span className="text-green-600 font-medium">Success: {results.success}</span>
                    <span className="text-red-600 font-medium">Failed: {results.failed}</span>
                    {results.duplicates > 0 && (
                      <span className="text-orange-600 font-medium">Duplicates: {results.duplicates}</span>
                    )}
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {results.details.map((detail, index) => {
                    const hasValidationErrors = !detail.validation.valid;
                    const hasUploadError = detail.upload.error;
                    const isSuccess = detail.upload.success;
                    const isDuplicate = detail.upload.duplicate;

                    return (
                      <div
                        key={index}
                        className={`px-4 py-3 border-b border-gray-100 ${
                          isSuccess ? "bg-green-50" : isDuplicate ? "bg-orange-50" : "bg-red-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isSuccess ? (
                            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                          ) : isDuplicate ? (
                            <AlertCircle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">
                              Row {detail.validation.index}: {detail.data.name || detail.data.ID || "Unknown"}
                            </div>
                            
                            {hasValidationErrors && (
                              <div className="mt-1">
                                <div className="text-xs text-red-600 font-medium">Validation Errors:</div>
                                <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                                  {detail.validation.errors.map((error, i) => (
                                    <li key={i}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {isDuplicate && (
                              <div className="mt-1 text-xs text-orange-600">
                                Duplicate: {detail.upload.error}
                              </div>
                            )}
                            
                            {detail.upload.warnings && detail.upload.warnings.length > 0 && (
                              <div className="mt-1">
                                <div className="text-xs text-yellow-600 font-medium">Warnings:</div>
                                <ul className="mt-1 text-xs text-yellow-600 list-disc list-inside">
                                  {detail.upload.warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {hasUploadError && !isDuplicate && (
                              <div className="mt-1 text-xs text-red-600">
                                Upload Error: {detail.upload.error}
                              </div>
                            )}
                            
                            {isSuccess && (
                              <div className="mt-1 text-xs text-green-600">
                                Successfully uploaded to Firestore
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Instructions:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Download a sample file to see the required format</li>
                    <li>Fill in your data following the same structure</li>
                    <li>Upload the file - validation will run on each entry</li>
                    <li>Invalid entries will be skipped but won't stop the entire upload</li>
                    <li>Check the results to see which entries succeeded or failed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ID Conflict Modal */}
      {idConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ID Conflict Detected</h3>
            
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Row {idConflict.rowIndex}:</strong> Teacher ID <strong>{idConflict.currentId}</strong> already exists but with a different name.
              </p>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-600">Existing name:</span>{" "}
                  <span className="font-medium">{idConflict.existingName}</span>
                </p>
                <p>
                  <span className="text-gray-600">New entry name:</span>{" "}
                  <span className="font-medium">{idConflict.newName}</span>
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter a new ID for this teacher:
              </label>
              <input
                type="text"
                value={newIdInput}
                onChange={(e) => setNewIdInput(e.target.value)}
                placeholder="Enter new ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newIdInput.trim()) {
                    handleIdResolution(newIdInput.trim());
                  }
                }}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleIdResolution(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Skip This Entry
              </button>
              <button
                onClick={() => newIdInput.trim() && handleIdResolution(newIdInput.trim())}
                disabled={!newIdInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Update ID & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
