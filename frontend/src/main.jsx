import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import TeacherLoad from "./pages/TeacherLoad";
import Home from "./pages/Home";
import CourseLoad from "./pages/CourseLoad";
import RoomLoad from "./pages/RoomLoad";
import Curriculum from "./pages/Curriculum";
import Timetable from "./pages/TimetableManagement";
import BulkUpload from "./pages/BulkUpload";
import Manage from "./pages/Manage";
import RoomOccupancy from "./pages/RoomOccupancy";
import TeacherOccupancy from "./pages/TeacherOccupancy";
import ClassOccupancy from "./pages/ClassOccupancy";
import AdminSettings from "./pages/AdminSettings";
import DataMigration from "./temp/DataMigration";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/teacher-load" element={<TeacherLoad />} />
        <Route path="/" element={<Home />} />
        <Route path="/course-load" element={<CourseLoad />} />
        <Route path="/room-load" element={<RoomLoad />} />
        <Route path="/curriculum" element={<Curriculum />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/room-occupancy" element={<RoomOccupancy />} />
        <Route path="/teacher-occupancy" element={<TeacherOccupancy />} />
        <Route path="/class-occupancy" element={<ClassOccupancy />} />
        <Route path="/manage" element={<Manage />} />
        <Route path="/admin-settings" element={<AdminSettings />} />
        <Route path="/bulk-upload" element={<BulkUpload />} />
        <Route path="/data-migration" element={<DataMigration />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
