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
        <Route path="/bulk-upload" element={<BulkUpload />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
