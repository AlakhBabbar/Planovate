import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import TeacherLoad from "./pages/TeacherLoad";
import Home from "./pages/Home";
import CourseLoad from "./pages/CourseLoad";
import RoomLoad from "./pages/RoomLoad";
import Timetable from "./pages/TimetableManagement";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/teacher-load" element={<TeacherLoad />} />
        <Route path="/" element={<Home />} />
        <Route path="/course-load" element={<CourseLoad />} />
        <Route path="/room-load" element={<RoomLoad />} />
        <Route path="/timetable" element={<Timetable />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
