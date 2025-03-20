import React from "react";

const Header = () => {
  return (
    <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">Planovate</h1>
      <nav>
        <ul className="flex gap-4">
          <li><a href="/" className="hover:underline">Home</a></li>
          <li><a href="/teacher-load" className="hover:underline">Teacher Load</a></li>
          <li><a href="/course-load" className="hover:underline">Course Load</a></li>
          <li><a href="/room-load" className="hover:underline">Room Load</a></li>
          <li><a href="/timetable" className="hover:underline">Timetable</a></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
