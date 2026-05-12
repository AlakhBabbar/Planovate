import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Eye } from "lucide-react";
import useAuthStore from "../store/authStore";
import { canAccess } from "../utils/roleAccess";

const SIMULATION_ROLES = [
  { value: null,          label: "Admin (default)" },
  { value: "hod",         label: "HOD view" },
  { value: "teacher",     label: "Teacher view" },
  { value: "tt_incharge", label: "TT Incharge view" },
  { value: "student",     label: "Student view" },
];

const Header = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const simulatedRole = useAuthStore((s) => s.simulatedRole);
  const setSimulatedRole = useAuthStore((s) => s.setSimulatedRole);
  const clearSimulatedRole = useAuthStore((s) => s.clearSimulatedRole);
  const getEffectiveRole = useAuthStore((s) => s.getEffectiveRole);

  const effectiveRole = getEffectiveRole();
  const isAdmin = user?.role === "admin";

  const isActive = (path) => currentPath === path;
  const show = (path) => canAccess(effectiveRole, path);

  const isLoadActive = ['/teacher-load', '/course-load', '/room-load'].includes(currentPath);
  const isOccupancyActive = ['/teacher-occupancy', '/class-occupancy', '/room-occupancy'].includes(currentPath);
  const isAdminActive = ['/admin-settings', '/user-management'].includes(currentPath);

  const handleLogout = () => {
    clearSimulatedRole();
    logout();
    navigate("/login");
  };

  const linkCls = (active) =>
    `inline-block px-4 py-2 text-sm rounded transition-colors ${active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`;
  const dropItemCls = (active) =>
    `block px-4 py-2 text-sm transition-colors ${active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm relative z-50">
      {/* Simulation banner */}
      {simulatedRole && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-3 text-sm">
          <Eye className="w-4 h-4 text-amber-600" />
          <span className="text-amber-700 font-medium">Viewing as: {SIMULATION_ROLES.find(r => r.value === simulatedRole)?.label}</span>
          <button onClick={clearSimulatedRole} className="text-amber-600 hover:text-amber-800 underline text-xs font-medium">
            Exit simulation
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Planovate</h1>

        <nav className="flex items-center gap-1">
          <ul className="flex gap-1 items-center">
            {show("/") && (
              <li><a href="/" className={linkCls(isActive("/"))}> Home</a></li>
            )}

            {/* Load Dropdown */}
            {(show("/teacher-load") || show("/course-load") || show("/room-load")) && (
              <li className="relative" onMouseEnter={() => setActiveDropdown("load")} onMouseLeave={() => setActiveDropdown(null)}>
                <button className={`inline-block px-4 py-2 text-sm rounded transition-colors align-middle ${isLoadActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}>
                  Manage <ChevronDown size={16} className="inline transition-transform align-middle" style={{ transform: activeDropdown === "load" ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {activeDropdown === "load" && (
                  <div className="absolute top-full left-0 pt-1 z-50">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]">
                      {show("/teacher-load") && <a href="/teacher-load" className={dropItemCls(isActive("/teacher-load"))}>Staff</a>}
                      {show("/course-load") && <a href="/course-load" className={dropItemCls(isActive("/course-load"))}>Courses</a>}
                      {show("/room-load") && <a href="/room-load" className={dropItemCls(isActive("/room-load"))}>Rooms</a>}
                    </div>
                  </div>
                )}
              </li>
            )}

            {/* Occupancy Dropdown */}
            {(show("/teacher-occupancy") || show("/class-occupancy") || show("/room-occupancy")) && (
              <li className="relative" onMouseEnter={() => setActiveDropdown("occupancy")} onMouseLeave={() => setActiveDropdown(null)}>
                <button className={`inline-block px-4 py-2 text-sm rounded transition-colors align-middle ${isOccupancyActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}>
                  Occupancy <ChevronDown size={16} className="inline transition-transform align-middle" style={{ transform: activeDropdown === "occupancy" ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {activeDropdown === "occupancy" && (
                  <div className="absolute top-full left-0 pt-1 z-50">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px]">
                      {show("/teacher-occupancy") && <a href="/teacher-occupancy" className={dropItemCls(isActive("/teacher-occupancy"))}>Teacher Occupancy</a>}
                      {show("/class-occupancy") && <a href="/class-occupancy" className={dropItemCls(isActive("/class-occupancy"))}>Class Occupancy</a>}
                      {show("/room-occupancy") && <a href="/room-occupancy" className={dropItemCls(isActive("/room-occupancy"))}>Room Occupancy</a>}
                    </div>
                  </div>
                )}
              </li>
            )}

            {show("/curriculum") && <li><a href="/curriculum" className={linkCls(isActive("/curriculum"))}>Curriculum</a></li>}
            {show("/timetable") && <li><a href="/timetable" className={linkCls(isActive("/timetable"))}>Timetable</a></li>}
            {show("/manage") && <li><a href="/manage" className={linkCls(isActive("/manage"))}>Manage</a></li>}

            {/* Admin Dropdown */}
            {isAdmin && (
              <li className="relative" onMouseEnter={() => setActiveDropdown("admin")} onMouseLeave={() => setActiveDropdown(null)}>
                <button className={`inline-block px-4 py-2 text-sm rounded transition-colors align-middle ${isAdminActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}>
                  Admin <ChevronDown size={16} className="inline transition-transform align-middle" style={{ transform: activeDropdown === "admin" ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                {activeDropdown === "admin" && (
                  <div className="absolute top-full right-0 pt-1 z-50">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]">
                      <a href="/admin-settings" className={dropItemCls(isActive("/admin-settings"))}>Settings</a>
                      <a href="/user-management" className={dropItemCls(isActive("/user-management"))}>User Management</a>
                      <a href="/bulk-upload" className={dropItemCls(isActive("/bulk-upload"))}>Bulk Upload</a>

                      {/* Role simulation */}
                      <div className="border-t border-gray-200 mt-2 pt-2 px-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-2 mb-1">Simulate Role</p>
                        {SIMULATION_ROLES.map((r) => (
                          <button
                            key={r.label}
                            onClick={() => r.value ? setSimulatedRole(r.value) : clearSimulatedRole()}
                            className={`block w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                              (r.value === null && !simulatedRole) || r.value === simulatedRole
                                ? "bg-gray-900 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )}
          </ul>

          {/* User info + Logout */}
          <div className="ml-4 pl-4 border-l border-gray-200 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
