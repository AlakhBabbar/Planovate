import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

const Header = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;
  const isLoadActive = ['/teacher-load', '/course-load', '/room-load'].includes(currentPath);
  const isOccupancyActive = ['/teacher-occupancy', '/class-occupancy', '/room-occupancy'].includes(currentPath);
  const isAdminActive = ['/admin-settings'].includes(currentPath);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Planovate</h1>
        <nav>
          <ul className="flex gap-1 items-center">
            <li><a href="/" className={`inline-block px-4 py-2 text-sm rounded transition-colors ${isActive('/') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>Home</a></li>
            
            {/* Load Dropdown */}
            <li 
              className="relative"
              onMouseEnter={() => setActiveDropdown('load')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className={`inline-block px-4 py-2 text-sm rounded transition-colors align-middle ${isLoadActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
                Manage <ChevronDown size={16} className="inline transition-transform align-middle" style={{ transform: activeDropdown === 'load' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {activeDropdown === 'load' && (
                <div className="absolute top-full left-0 pt-1 z-50">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]">
                    <a href="/teacher-load" className={`block px-4 py-2 text-sm transition-colors ${isActive('/teacher-load') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>Staff</a>
                    <a href="/course-load" className={`block px-4 py-2 text-sm transition-colors ${isActive('/course-load') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>Courses</a>
                    <a href="/room-load" className={`block px-4 py-2 text-sm transition-colors ${isActive('/room-load') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>Rooms</a>
                  </div>
                </div>
              )}
            </li>

            {/* Occupancy Dropdown */}
            <li 
              className="relative"
              onMouseEnter={() => setActiveDropdown('occupancy')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className={`inline-block px-4 py-2 text-sm rounded transition-colors align-middle ${isOccupancyActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
                Occupancy <ChevronDown size={16} className="inline transition-transform align-middle" style={{ transform: activeDropdown === 'occupancy' ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {activeDropdown === 'occupancy' && (
                <div className="absolute top-full left-0 pt-1 z-50">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]">
                    <a href="/teacher-occupancy" className={`block px-4 py-2 text-sm transition-colors ${isActive('/teacher-occupancy') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>Teacher Occupancy</a>
                    <a href="/class-occupancy" className={`block px-4 py-2 text-sm transition-colors ${isActive('/class-occupancy') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>Class Occupancy</a>
                    <a href="/room-occupancy" className={`block px-4 py-2 text-sm transition-colors ${isActive('/room-occupancy') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>Room Occupancy</a>
                  </div>
                </div>
              )}
            </li>

            <li><a href="/curriculum" className={`inline-block px-4 py-2 text-sm rounded transition-colors ${isActive('/curriculum') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>Curriculum</a></li>
            <li><a href="/timetable" className={`inline-block px-4 py-2 text-sm rounded transition-colors ${isActive('/timetable') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>Timetable</a></li>
            <li><a href="/manage" className={`inline-block px-4 py-2 text-sm rounded transition-colors ${isActive('/manage') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>Manage</a></li>
            <li><a href="/admin-settings" className={`inline-block px-4 py-2 text-sm rounded transition-colors ${isAdminActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>Settings</a></li>
            <li><a href="/bulk-upload" className={`inline-block px-4 py-2 text-sm rounded transition-colors ${isActive('/bulk-upload') ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>Bulk Upload</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
