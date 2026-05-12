import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";

// Auth pages (public)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";

// Protected pages
import Home from "./pages/Home";
import TeacherLoad from "./pages/TeacherLoad";
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
import UserManagement from "./pages/UserManagement";

import ProtectedRoute from "./components/ProtectedRoute";

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected */}
        <Route path="/" element={<P><Home /></P>} />
        <Route path="/teacher-load" element={<P><TeacherLoad /></P>} />
        <Route path="/course-load" element={<P><CourseLoad /></P>} />
        <Route path="/room-load" element={<P><RoomLoad /></P>} />
        <Route path="/curriculum" element={<P><Curriculum /></P>} />
        <Route path="/timetable" element={<P><Timetable /></P>} />
        <Route path="/timetable/:timetableId" element={<P><Timetable /></P>} />
        <Route path="/room-occupancy" element={<P><RoomOccupancy /></P>} />
        <Route path="/teacher-occupancy" element={<P><TeacherOccupancy /></P>} />
        <Route path="/class-occupancy" element={<P><ClassOccupancy /></P>} />
        <Route path="/manage" element={<P><Manage /></P>} />
        <Route path="/admin-settings" element={<P><AdminSettings /></P>} />
        <Route path="/bulk-upload" element={<P><BulkUpload /></P>} />
        <Route path="/user-management" element={<P><UserManagement /></P>} />
      </Routes>
    </Router>
  </React.StrictMode>
);
