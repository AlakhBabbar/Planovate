// filepath: /c:/Users/anish/Desktop/DEI/Practice/src/App.jsx
import React from 'react';
import Header from './components/Header.jsx';
import CourseManagement from './pages/CourseManagement.jsx';
import Login from './pages/login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TeacherManagement from './pages/TeacherManagement.jsx';
import TimetableManagement from './pages/TimetableManagement.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import RoomList from './pages/RoomList.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<CourseManagement />} />
          <Route path="/teacher" element={<TeacherManagement />} />
          <Route path="/timetable" element={<TimetableManagement />} />
          <Route path="/rooms" element={<RoomList />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;