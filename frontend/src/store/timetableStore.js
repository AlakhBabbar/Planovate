import { create } from 'zustand';
import { courseService, roomService, teacherService, timetableService } from '../firebase/services';

/**
 * Zustand Store for Timetable Global State
 * 
 * Benefits:
 * - Data is fetched only once and shared across all components
 * - No re-fetching when switching between tabs
 * - Improved performance and reduced API calls
 * - Centralized state management
 */
const useTimetableStore = create((set, get) => ({
  // Options data
  courseOptions: [],
  teacherOptions: [],
  roomOptions: [],
  semesterOptions: [],
  
  // Timetables cache
  allTimetables: [],
  isTimetablesLoaded: false,
  isLoadingTimetables: false,
  
  // Loading states
  isOptionsLoaded: false,
  isLoadingOptions: false,
  
  // Fetch options (called once)
  fetchOptions: async () => {
    // If already loaded or currently loading, skip
    if (get().isOptionsLoaded || get().isLoadingOptions) {
      return;
    }
    
    set({ isLoadingOptions: true });
    
    try {
      const [courses, teachers, rooms] = await Promise.all([
        courseService.listCourses(),
        teacherService.listTeachers(),
        roomService.listRooms(),
      ]);

      const courseOptions = (courses ?? [])
        .map((c) => c?.name || c?.code || c?.ID || "")
        .filter(Boolean);

      const semesterOptions = Array.from(
        new Set(
          (courses ?? [])
            .map((c) => String(c?.semester ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      const teacherOptions = (teachers ?? [])
        .map((t) => t?.name || t?.ID || t?.unid || "")
        .filter(Boolean);

      const roomOptions = (rooms ?? [])
        .map((r) => r?.name || r?.ID || r?.unid || "")
        .filter(Boolean);

      set({
        courseOptions,
        semesterOptions,
        teacherOptions,
        roomOptions,
        isOptionsLoaded: true,
        isLoadingOptions: false,
      });
    } catch (error) {
      console.error("Error loading options:", error);
      set({ isLoadingOptions: false });
    }
  },
  
  // Reset/refetch if needed
  refetchOptions: async () => {
    set({ isOptionsLoaded: false });
    await get().fetchOptions();
  },
  
  // Fetch all timetables (for browse modal)
  fetchTimetables: async () => {
    // If already loaded or currently loading, skip
    if (get().isTimetablesLoaded || get().isLoadingTimetables) {
      return;
    }
    
    set({ isLoadingTimetables: true });
    
    try {
      const timetables = await timetableService.listTimetables();
      set({
        allTimetables: timetables || [],
        isTimetablesLoaded: true,
        isLoadingTimetables: false,
      });
    } catch (error) {
      console.error("Error loading timetables:", error);
      set({ isLoadingTimetables: false });
    }
  },
  
  // Reset/refetch timetables if needed
  refetchTimetables: async () => {
    set({ isTimetablesLoaded: false });
    await get().fetchTimetables();
  },
}));

export default useTimetableStore;
