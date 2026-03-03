import React, { useState, useEffect } from "react";
import { BookOpen, Loader2, AlertCircle, Check, Save } from "lucide-react";
import {
  timetableService,
  scheduleService,
  curriculumService,
} from "../firebase/services";
import CurriculumModal from "../components/timetableManagment/CurriculumModal";

/**
 * CurriculumFilling Component
 * Extracts curriculum data from timetables and allows editing/saving
 */
const CurriculumFilling = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [savingStates, setSavingStates] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    loadCurriculumData();
  }, []);

  const loadCurriculumData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all timetables
      const timetables = await timetableService.listTimetables();
      console.log("Total timetables fetched:", timetables.length);
      
      if (timetables.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      // Fetch schedules for each timetable and extract curriculum
      const allSchedules = [];
      for (const timetable of timetables) {
        const schedules = await scheduleService.getSchedulesByTimetableId(
          timetable.timetableId
        );
        
        // Add semester info from timetable to each schedule
        schedules.forEach((schedule) => {
          schedule.semester = timetable.semester;
        });
        
        allSchedules.push(...schedules);
      }

      // Extract curriculum data from schedules
      const extractedClasses =
        curriculumService.extractCurriculumFromSchedules(allSchedules);

      console.log("Total classes after extraction:", extractedClasses.length);
      console.log("Classes:", extractedClasses.map(c => `${c.className}_${c.branch}_${c.semester}_${c.type}`));

      // Check which curriculums are already saved
      const existingCurriculums = await curriculumService.listCurriculums();
      const existingIds = new Set(
        existingCurriculums.map((c) => c.curriculumId)
      );

      // Add saved status to each class
      extractedClasses.forEach((classData) => {
        const curriculumId = curriculumService.generateCurriculumId({
          className: classData.className,
          branch: classData.branch,
          semester: classData.semester,
          type: classData.type,
        });
        classData.isSaved = existingIds.has(curriculumId);
      });

      setClasses(extractedClasses);
    } catch (err) {
      console.error("Error loading curriculum data:", err);
      setError("Failed to load curriculum data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (classData) => {
    setSelectedClass(classData);
    setShowModal(true);
  };

  const handleSaveCurriculum = async (curriculumData) => {
    const { className, branch, semester, type } = curriculumData;
    const classKey = `${className}_${branch}`;

    setSavingStates((prev) => ({ ...prev, [classKey]: true }));

    try {
      await curriculumService.saveCurriculum(curriculumData);

      // Update saved status in local state
      setClasses((prev) =>
        prev.map((c) =>
          c.classKey === classKey ? { ...c, isSaved: true } : c
        )
      );

      alert("Curriculum saved successfully!");
    } catch (error) {
      console.error("Error saving curriculum:", error);
      alert("Failed to save curriculum. Please try again.");
      throw error;
    } finally {
      setSavingStates((prev) => ({ ...prev, [classKey]: false }));
    }
  };

  const handleSaveAll = async () => {
    const unsavedClasses = classes.filter((c) => !c.isSaved);

    if (unsavedClasses.length === 0) {
      alert("All curriculums are already saved!");
      return;
    }

    const confirmMessage = `Save ${unsavedClasses.length} curriculum(s)?\n\nThis will save all unsaved curriculums with their courses and teachers.\n\nContinue?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setSavingAll(true);
      let successCount = 0;
      let failCount = 0;

      for (const classData of unsavedClasses) {
        try {
          await curriculumService.saveCurriculum({
            className: classData.className,
            branch: classData.branch,
            semester: classData.semester,
            type: classData.type,
            courses: classData.courses,
          });

          // Update saved status in local state
          setClasses((prev) =>
            prev.map((c) =>
              c.classKey === classData.classKey ? { ...c, isSaved: true } : c
            )
          );

          successCount++;
        } catch (error) {
          console.error(`Error saving curriculum for ${classData.classKey}:`, error);
          failCount++;
        }
      }

      if (failCount === 0) {
        alert(`Successfully saved ${successCount} curriculum(s)!`);
      } else {
        alert(`Saved ${successCount} curriculum(s) successfully.\n${failCount} curriculum(s) failed to save.`);
      }
    } catch (error) {
      console.error("Error in bulk save:", error);
      alert("Failed to save curriculums. Please try again.");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Curriculum Filling
          </h2>
          <p className="text-gray-600">
            Extract curriculum data from timetables and save to database
          </p>
        </div>
        {!loading && classes.length > 0 && (
          <button
            onClick={handleSaveAll}
            disabled={savingAll || classes.every((c) => c.isSaved)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={classes.every((c) => c.isSaved) ? "All curriculums already saved" : "Save all unsaved curriculums"}
          >
            {savingAll ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving All...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save All
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
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
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Classes Found
          </h3>
          <p className="text-gray-600">
            Create timetables first to extract curriculum data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classData) => (
            <div
              key={classData.classKey}
              onClick={() => handleClassClick(classData)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer relative"
            >
              {classData.isSaved && (
                <div className="absolute top-3 right-3">
                  <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-lg p-3">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {classData.className}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {classData.branch}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Semester: {classData.semester}</span>
                    <span>Type: {classData.type}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700">
                      {classData.courses.length} Course
                      {classData.courses.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedClass && (
        <CurriculumModal
          classData={selectedClass}
          onClose={() => {
            setShowModal(false);
            setSelectedClass(null);
          }}
          onSave={handleSaveCurriculum}
        />
      )}
    </div>
  );
};

export default CurriculumFilling;
