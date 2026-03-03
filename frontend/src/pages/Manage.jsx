import React, { useState, useEffect, useRef } from "react";
import { Trash2, Calendar, Loader2, AlertCircle, Download, Database, Upload, BookOpen, Save } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { timetableService, settingsService, curriculumService, scheduleService } from "../firebase/services";
import { backupCompleteDatabase, getBackupSummary, restoreFromBackup } from "../utils/databaseBackup";
import CurriculumFilling from "./CurriculumFilling";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

const Manage = () => {
  const [activeTab, setActiveTab] = useState("timetables");
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState(null);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupSummary, setBackupSummary] = useState(null);
  const fileInputRef = useRef(null);
  
  // Settings data
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  
  // Update fields for each timetable
  const [updateFields, setUpdateFields] = useState({});
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadTimetables();
    loadBackupSummary();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await settingsService.getAllSettings();
      setPrograms(settings.programs || []);
      setBranches(settings.branches || []);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadBackupSummary = async () => {
    const summary = await getBackupSummary();
    setBackupSummary(summary);
  };

  const loadTimetables = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await timetableService.listTimetables();
      setTimetables(data);
      
      // Initialize update fields
      const initialFields = {};
      data.forEach(tt => {
        initialFields[tt.timetableId] = {
          updatedClass: tt.class || "",
          updatedBranch: tt.branch || ""
        };
      });
      setUpdateFields(initialFields);
    } catch (err) {
      console.error("Error loading timetables:", err);
      setError("Failed to load timetables. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFieldChange = (timetableId, field, value) => {
    setUpdateFields(prev => ({
      ...prev,
      [timetableId]: {
        ...prev[timetableId],
        [field]: value
      }
    }));
  };

  const getAvailableBranches = (selectedProgram) => {
    if (!selectedProgram) return [];
    const matchingBranches = branches.filter(b => 
      b.programs && b.programs.includes(selectedProgram)
    );
    return matchingBranches.map(b => b.name);
  };

  const handleUpdateTimetable = async (timetable) => {
    const fields = updateFields[timetable.timetableId];
    
    if (!fields.updatedClass || !fields.updatedBranch) {
      alert("Please select both class and branch");
      return;
    }

    const confirmMessage = `Update timetable and curriculum:\n\nFrom: ${timetable.class} - ${timetable.branch}\nTo: ${fields.updatedClass} - ${fields.updatedBranch}\n\nThis will update:\n- Timetable metadata\n- All schedules\n- Related curriculum\n\nContinue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdating(timetable.timetableId);

      // Update timetable document
      const timetableRef = doc(db, "timetables", timetable.timetableId);
      await updateDoc(timetableRef, {
        class: fields.updatedClass,
        branch: fields.updatedBranch
      });

      // Update all schedules for this timetable
      const schedulesQuery = query(
        collection(db, "schedules"),
        where("timetableId", "==", timetable.timetableId)
      );
      const schedulesSnapshot = await getDocs(schedulesQuery);
      
      const scheduleUpdates = [];
      schedulesSnapshot.forEach((doc) => {
        scheduleUpdates.push(
          updateDoc(doc.ref, {
            class: fields.updatedClass,
            branch: fields.updatedBranch
          })
        );
      });
      
      if (scheduleUpdates.length > 0) {
        await Promise.all(scheduleUpdates);
      }

      // Update curriculum if exists
      const oldCurriculumId = curriculumService.generateCurriculumId({
        className: timetable.class,
        branch: timetable.branch,
        semester: timetable.semester,
        type: timetable.type
      });

      const newCurriculumId = curriculumService.generateCurriculumId({
        className: fields.updatedClass,
        branch: fields.updatedBranch,
        semester: timetable.semester,
        type: timetable.type
      });

      if (oldCurriculumId !== newCurriculumId) {
        try {
          const oldCurriculum = await curriculumService.getCurriculum(oldCurriculumId);
          if (oldCurriculum) {
            // Save with new ID
            await curriculumService.saveCurriculum({
              className: fields.updatedClass,
              branch: fields.updatedBranch,
              semester: timetable.semester,
              type: timetable.type,
              courses: oldCurriculum.courses
            });
            // Delete old curriculum
            await curriculumService.deleteCurriculum(oldCurriculumId);
          }
        } catch (error) {
          console.log("No curriculum to update or error updating:", error);
        }
      } else {
        // Just update the existing curriculum
        const curriculumRef = doc(db, "curriculums", oldCurriculumId);
        try {
          await updateDoc(curriculumRef, {
            class: fields.updatedClass,
            branch: fields.updatedBranch
          });
        } catch (error) {
          console.log("Curriculum doesn't exist, skipping");
        }
      }

      // Reload timetables
      await loadTimetables();
      alert("Timetable updated successfully!");
    } catch (error) {
      console.error("Error updating timetable:", error);
      alert("Failed to update timetable. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateAll = async () => {
    // Get all timetables that have both updated class and branch filled
    const timetablesToUpdate = timetables.filter(tt => {
      const fields = updateFields[tt.timetableId];
      return fields && fields.updatedClass && fields.updatedBranch;
    });

    if (timetablesToUpdate.length === 0) {
      alert("Please select updated class and branch for at least one timetable");
      return;
    }

    const confirmMessage = `Update ${timetablesToUpdate.length} timetable(s)?\n\nThis will update:\n- Timetable metadata\n- All schedules\n- Related curriculums\n\nContinue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdating("all");
      let successCount = 0;
      let failCount = 0;

      for (const timetable of timetablesToUpdate) {
        try {
          const fields = updateFields[timetable.timetableId];

          // Update timetable document
          const timetableRef = doc(db, "timetables", timetable.timetableId);
          await updateDoc(timetableRef, {
            class: fields.updatedClass,
            branch: fields.updatedBranch
          });

          // Update all schedules for this timetable
          const schedulesQuery = query(
            collection(db, "schedules"),
            where("timetableId", "==", timetable.timetableId)
          );
          const schedulesSnapshot = await getDocs(schedulesQuery);
          
          const scheduleUpdates = [];
          schedulesSnapshot.forEach((doc) => {
            scheduleUpdates.push(
              updateDoc(doc.ref, {
                class: fields.updatedClass,
                branch: fields.updatedBranch
              })
            );
          });
          
          if (scheduleUpdates.length > 0) {
            await Promise.all(scheduleUpdates);
          }

          // Update curriculum if exists
          const oldCurriculumId = curriculumService.generateCurriculumId({
            className: timetable.class,
            branch: timetable.branch,
            semester: timetable.semester,
            type: timetable.type
          });

          const newCurriculumId = curriculumService.generateCurriculumId({
            className: fields.updatedClass,
            branch: fields.updatedBranch,
            semester: timetable.semester,
            type: timetable.type
          });

          if (oldCurriculumId !== newCurriculumId) {
            try {
              const oldCurriculum = await curriculumService.getCurriculum(oldCurriculumId);
              if (oldCurriculum) {
                await curriculumService.saveCurriculum({
                  className: fields.updatedClass,
                  branch: fields.updatedBranch,
                  semester: timetable.semester,
                  type: timetable.type,
                  courses: oldCurriculum.courses
                });
                await curriculumService.deleteCurriculum(oldCurriculumId);
              }
            } catch (error) {
              console.log("No curriculum to update or error updating:", error);
            }
          } else {
            const curriculumRef = doc(db, "curriculums", oldCurriculumId);
            try {
              await updateDoc(curriculumRef, {
                class: fields.updatedClass,
                branch: fields.updatedBranch
              });
            } catch (error) {
              console.log("Curriculum doesn't exist, skipping");
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Error updating timetable ${timetable.timetableId}:`, error);
          failCount++;
        }
      }

      // Reload timetables
      await loadTimetables();
      
      if (failCount === 0) {
        alert(`Successfully updated ${successCount} timetable(s)!`);
      } else {
        alert(`Updated ${successCount} timetable(s) successfully.\n${failCount} timetable(s) failed to update.`);
      }
    } catch (error) {
      console.error("Error in bulk update:", error);
      alert("Failed to update timetables. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (timetable) => {
    const confirmMessage = `Are you sure you want to delete the timetable for:\n\nClass: ${timetable.class}\nBranch: ${timetable.branch}\nSemester: ${timetable.semester}\nType: ${timetable.type}\n\nThis will also delete all associated schedules and cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeleting(timetable.timetableId);
      await timetableService.deleteTimetable(timetable.timetableId);
      setTimetables(prev => prev.filter(t => t.timetableId !== timetable.timetableId));
      alert("Timetable deleted successfully!");
    } catch (err) {
      console.error("Error deleting timetable:", err);
      alert("Failed to delete timetable. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleBackupDatabase = async () => {
    if (!window.confirm("This will download all database collections as separate JSON files. Continue?")) {
      return;
    }

    try {
      setBacking(true);
      const result = await backupCompleteDatabase();
      
      if (result.success) {
        const summary = Object.entries(result.summary)
          .map(([name, data]) => `${name}: ${data.count} records`)
          .join('\n');
        alert(`Database backup completed successfully!\n\n${summary}\n\nFiles have been downloaded to your Downloads folder.`);
      } else {
        alert(`Backup failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Error backing up database:", err);
      alert("Failed to backup database. Please try again.");
    } finally {
      setBacking(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) {
      return;
    }

    const fileNames = files.map(f => f.name).join(', ');
    const confirmMessage = `You are about to restore data from ${files.length} file(s):\n\n${fileNames}\n\nThis will upload the data to your current database. Existing records with the same IDs will be overwritten.\n\nContinue?`;
    
    if (!window.confirm(confirmMessage)) {
      event.target.value = '';
      return;
    }

    try {
      setRestoring(true);
      const result = await restoreFromBackup(files);
      
      if (result.success) {
        const summary = Object.entries(result.summary)
          .map(([name, data]) => {
            if (data.failed > 0) {
              return `${name}: ${data.success}/${data.total} uploaded (${data.failed} failed)`;
            }
            return `${name}: ${data.success || data.total || 0} records uploaded`;
          })
          .join('\n');
        
        alert(`Database restore completed!\n\n${summary}\n\nPage will reload to show updated data.`);
        
        // Reload the page to refresh data
        window.location.reload();
      } else {
        alert(`Restore failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Error restoring database:", err);
      alert("Failed to restore database. Please try again.");
    } finally {
      setRestoring(false);
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage</h1>
              <p className="text-gray-600">Manage timetables and curriculum data</p>
            </div>
            {activeTab === "timetables" && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpdateAll}
                  disabled={updating === "all" || timetables.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  title="Update all timetables with filled dropdowns"
                >
                  {updating === "all" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating All...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Update All
                    </>
                  )}
                </button>
                <button
                  onClick={handleRestoreClick}
                  disabled={restoring}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  title="Restore database from backup files"
                >
                  {restoring ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Restore Backup
                    </>
                  )}
                </button>
                <button
                  onClick={handleBackupDatabase}
                  disabled={backing}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  title="Download complete database backup"
                >
                  {backing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Backing up...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Backup Database
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          {activeTab === "timetables" && backupSummary && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
              <Database className="w-4 h-4 text-blue-600" />
              <span>
                Database contains: {backupSummary.teachers} teachers, {backupSummary.courses} courses, {backupSummary.rooms} rooms, {backupSummary.timetables} timetables
              </span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("timetables")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "timetables"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Timetables
                </div>
              </button>
              <button
                onClick={() => setActiveTab("curriculum")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "curriculum"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Curriculum Filling
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "timetables" ? (
          <>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : timetables.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetables Found</h3>
            <p className="text-gray-600">Create your first timetable to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Semester
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Updated Class
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Updated Branch
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {timetables.map((timetable) => {
                    const fields = updateFields[timetable.timetableId] || {};
                    const availableBranches = getAvailableBranches(fields.updatedClass);
                    
                    return (
                    <tr 
                      key={timetable.timetableId} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {timetable.class || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {timetable.branch || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {timetable.semester || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {timetable.type || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={fields.updatedClass || ""}
                          onChange={(e) => {
                            handleUpdateFieldChange(timetable.timetableId, "updatedClass", e.target.value);
                            handleUpdateFieldChange(timetable.timetableId, "updatedBranch", "");
                          }}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Program</option>
                          {programs.map(program => (
                            <option key={program} value={program}>{program}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={fields.updatedBranch || ""}
                          onChange={(e) => handleUpdateFieldChange(timetable.timetableId, "updatedBranch", e.target.value)}
                          disabled={!fields.updatedClass}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Branch</option>
                          {availableBranches.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateTimetable(timetable)}
                            disabled={updating === timetable.timetableId || !fields.updatedClass || !fields.updatedBranch}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updating === timetable.timetableId ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" />
                                Update
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(timetable)}
                            disabled={deleting === timetable.timetableId || updating === timetable.timetableId}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === timetable.timetableId ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && timetables.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {timetables.length} timetable{timetables.length !== 1 ? 's' : ''}
          </div>
        )}
          </>
        ) : (
          <CurriculumFilling />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Manage;
