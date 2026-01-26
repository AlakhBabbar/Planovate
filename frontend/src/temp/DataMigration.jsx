import React, { useState, useEffect } from "react";
import { Database, AlertCircle, CheckCircle, Loader, RefreshCw, Play, BarChart3 } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  fetchAllTimetables,
  analyzeMigration,
  performMigration,
  verifyMigration,
  analyzeTimetableMigration,
  performTimetableMigration,
  verifyTimetableMigration,
  getTimetableMigrationStatus
} from "./migrationLogic";

const DataMigration = () => {
  const [timetables, setTimetables] = useState([]);
  const [timetableStatuses, setTimetableStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [verification, setVerification] = useState(null);
  const [progress, setProgress] = useState(null);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [migrationResults, setMigrationResults] = useState({});

  // Fetch timetables on mount
  useEffect(() => {
    loadTimetables();
  }, []);

  const loadTimetables = async () => {
    setLoading(true);
    try {
      const data = await fetchAllTimetables();
      setTimetables(data);
      
      // Load migration status for each timetable
      const statuses = await getTimetableMigrationStatus();
      setTimetableStatuses(statuses);
    } catch (error) {
      console.error("Error loading timetables:", error);
      alert("Failed to load timetables");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await analyzeMigration();
      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing migration:", error);
      alert("Failed to analyze migration");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeTimetable = async (timetableId) => {
    setLoading(true);
    setSelectedTimetable(timetableId);
    setAnalysis(null);
    try {
      const result = await analyzeTimetableMigration(timetableId);
      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing timetable:", error);
      alert("Failed to analyze timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateTimetable = async (timetableId) => {
    const ttInfo = timetableStatuses.find(t => t.timetableId === timetableId);
    const ttName = ttInfo ? `${ttInfo.class} - ${ttInfo.branch} - ${ttInfo.semester}` : timetableId;
    
    if (!window.confirm(
      `⚠️ WARNING: Migrate Timetable?\n\n` +
      `Timetable: ${ttName}\n` +
      `Schedules: ${ttInfo?.totalSchedules || 0}\n\n` +
      `This will add new ID fields to this timetable's schedules.\n\n` +
      `Are you sure you want to proceed?`
    )) {
      return;
    }

    setLoading(true);
    setProgress(null);
    setSelectedTimetable(timetableId);

    try {
      const result = await performTimetableMigration(timetableId, (prog) => {
        setProgress(prog);
      });
      
      setMigrationResults(prev => ({
        ...prev,
        [timetableId]: result
      }));
      
      // Refresh statuses
      await loadTimetables();
      
      alert(`Migration completed!\n\nTimetable: ${ttName}\nTotal: ${result.total}\nUpdated: ${result.updated}\nErrors: ${result.errors.length}`);
    } catch (error) {
      console.error("Error performing migration:", error);
      alert("Migration failed: " + error.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleVerifyTimetable = async (timetableId) => {
    setLoading(true);
    setSelectedTimetable(timetableId);
    setVerification(null);
    try {
      const result = await verifyTimetableMigration(timetableId);
      setVerification(result);
    } catch (error) {
      console.error("Error verifying timetable:", error);
      alert("Failed to verify timetable");
    } finally {
      setLoading(false);
    }
  };

  const getMigrationStatusBadge = (status) => {
    if (!status) return null;
    
    if (status.migrationProgress === 0) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-700">
          Not Migrated
        </span>
      );
    } else if (status.migrationProgress === 100) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
          ✓ Migrated
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-700">
          Partial ({Math.round(status.migrationProgress)}%)
        </span>
      );
    }
  };

  const handleMigrate = async () => {
    if (!window.confirm(
      "⚠️ WARNING: This will update your database!\n\n" +
      "This migration will add new ID fields (teacherId, courseId, roomId) to all schedule documents.\n\n" +
      "The old fields (teacher, course, room) will remain for backward compatibility.\n\n" +
      "Are you sure you want to proceed?"
    )) {
      return;
    }

    setLoading(true);
    setMigrationStatus(null);
    setProgress(null);

    try {
      const result = await performMigration((prog) => {
        setProgress(prog);
      });
      setMigrationStatus(result);
      alert(`Migration completed!\n\nTotal: ${result.total}\nUpdated: ${result.updated}\nErrors: ${result.errors.length}`);
    } catch (error) {
      console.error("Error performing migration:", error);
      alert("Migration failed: " + error.message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setVerification(null);
    try {
      const result = await verifyMigration();
      setVerification(result);
    } catch (error) {
      console.error("Error verifying migration:", error);
      alert("Failed to verify migration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">
                Database Migration Tool
              </h1>
            </div>
            <p className="text-gray-600 mb-4">
              This tool migrates your timetable data structure from storing names directly
              to using unique IDs with references.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Migration Details:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><strong>Teacher:</strong> Teacher ID → Unique Document ID</li>
                    <li><strong>Course:</strong> Course ID → Unique Document ID</li>
                    <li><strong>Room:</strong> Room ID + Faculty → Unique Document ID</li>
                  </ul>
                  <p className="mt-2">
                    Old fields will be preserved for backward compatibility.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timetables Overview */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Timetables - Individual Migration
              </h2>
              <button
                onClick={loadTimetables}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            {loading && timetableStatuses.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600 mb-4">
                  Total Timetables: <span className="font-semibold">{timetableStatuses.length}</span>
                  {' | '}
                  Migrated: <span className="font-semibold text-green-600">
                    {timetableStatuses.filter(t => t.isMigrated).length}
                  </span>
                  {' | '}
                  Pending: <span className="font-semibold text-orange-600">
                    {timetableStatuses.filter(t => !t.isMigrated).length}
                  </span>
                </p>
                {timetableStatuses.length > 0 && (
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Timetable
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Schedules
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {timetableStatuses.map((tt, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {tt.class || 'N/A'} - {tt.branch || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {tt.semester || 'N/A'} | {tt.type || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {tt.totalSchedules > 0 ? (
                                <span>
                                  <span className="font-semibold text-green-600">{tt.migratedSchedules}</span>
                                  {' / '}
                                  <span>{tt.totalSchedules}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400">No schedules</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {getMigrationStatusBadge(tt)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleAnalyzeTimetable(tt.timetableId)}
                                  disabled={loading || tt.totalSchedules === 0}
                                  className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Analyze this timetable"
                                >
                                  <BarChart3 className="w-3 h-3" />
                                  Analyze
                                </button>
                                <button
                                  onClick={() => handleMigrateTimetable(tt.timetableId)}
                                  disabled={loading || tt.totalSchedules === 0 || tt.migrationProgress === 100}
                                  className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Migrate this timetable"
                                >
                                  <Play className="w-3 h-3" />
                                  {tt.migrationProgress > 0 && tt.migrationProgress < 100 ? 'Re-migrate' : 'Migrate'}
                                </button>
                                <button
                                  onClick={() => handleVerifyTimetable(tt.timetableId)}
                                  disabled={loading || tt.totalSchedules === 0}
                                  className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Verify this timetable"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Verify
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Bulk Migration Actions (All Timetables)
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                Analyze All
              </button>
              
              <button
                onClick={handleMigrate}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Database className="w-5 h-5" />
                )}
                Migrate All
              </button>
              
              <button
                onClick={handleVerify}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Verify All
              </button>
            </div>
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Migration Progress
              </h2>
              <div className="space-y-3">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-indigo-600">
                        Processing...
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-indigo-600">
                        {Math.round((progress.processed / progress.total) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                    <div
                      style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-300"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600">Processed</p>
                    <p className="text-2xl font-bold text-gray-800">{progress.processed}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <p className="text-gray-600">Updated</p>
                    <p className="text-2xl font-bold text-green-600">{progress.updated}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <p className="text-gray-600">Errors</p>
                    <p className="text-2xl font-bold text-red-600">{progress.errors}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Analysis Results
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Schedules</p>
                    <p className="text-2xl font-bold text-blue-600">{analysis.totalSchedules}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Teachers Found</p>
                    <p className="text-2xl font-bold text-green-600">{analysis.teacherMappings}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Courses Found</p>
                    <p className="text-2xl font-bold text-green-600">{analysis.courseMappings}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Rooms Found</p>
                    <p className="text-2xl font-bold text-green-600">{analysis.roomMappings}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Teachers Not Found</p>
                    <p className="text-2xl font-bold text-red-600">{analysis.teacherNotFound}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Courses Not Found</p>
                    <p className="text-2xl font-bold text-red-600">{analysis.courseNotFound}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Rooms Not Found</p>
                    <p className="text-2xl font-bold text-red-600">{analysis.roomNotFound}</p>
                  </div>
                </div>

                {analysis.examples.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Example Conversions:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-64 overflow-y-auto">
                      {analysis.examples.map((ex, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Doc ID: {ex.docId}</p>
                          <ul className="text-sm space-y-1">
                            {ex.changes.map((change, cidx) => (
                              <li key={cidx} className="text-gray-700">{change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Migration Status */}
          {migrationStatus && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Migration Complete
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{migrationStatus.total}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Processed</p>
                  <p className="text-2xl font-bold text-gray-800">{migrationStatus.processed}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Updated</p>
                  <p className="text-2xl font-bold text-green-600">{migrationStatus.updated}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{migrationStatus.errors.length}</p>
                </div>
              </div>
              
              {migrationStatus.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-600 mb-2">Errors:</h3>
                  <div className="bg-red-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                    {migrationStatus.errors.map((err, idx) => (
                      <div key={idx} className="text-sm mb-2">
                        <span className="font-medium">Doc {err.docId}:</span> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Results */}
          {verification && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Verification Results
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Schedules</p>
                    <p className="text-2xl font-bold text-blue-600">{verification.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">With Teacher ID</p>
                    <p className="text-2xl font-bold text-green-600">{verification.withTeacherId}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">With Course ID</p>
                    <p className="text-2xl font-bold text-green-600">{verification.withCourseId}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">With Room ID</p>
                    <p className="text-2xl font-bold text-green-600">{verification.withRoomId}</p>
                  </div>
                </div>

                {verification.samples.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Sample Schedules:</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-64 overflow-y-auto">
                      {verification.samples.map((sample, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border text-sm">
                          <p className="text-xs text-gray-500 mb-2">Doc ID: {sample.docId}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium">Teacher:</span> {sample.teacher || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Teacher ID:</span>{' '}
                              <span className={sample.teacherId ? 'text-green-600' : 'text-red-600'}>
                                {sample.teacherId || 'Missing'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Course:</span> {sample.course || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Course ID:</span>{' '}
                              <span className={sample.courseId ? 'text-green-600' : 'text-red-600'}>
                                {sample.courseId || 'Missing'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Room:</span> {sample.room || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Room ID:</span>{' '}
                              <span className={sample.roomId ? 'text-green-600' : 'text-red-600'}>
                                {sample.roomId || 'Missing'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default DataMigration;
