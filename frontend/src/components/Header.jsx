import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import deilogo from '../assets/deilogo.jpg';

const Header = () => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-blue-200 text-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <img src={deilogo} alt='logo' className="h-20 w-20 rounded-full" />
          <Link to="/" className="text-2xl text-black font-bold ml-4">
            DAYALBAGH EDUCATIONAL INSTITUTE <br /> Timetable Management
          </Link>
        </div>
        <nav>
          <ul className="flex space-x-4">
            <li><Link to="/" className="hover:text-gray-400 text-black font-bold">Home</Link></li>
            <li><Link to="/about" className="hover:text-gray-400 text-black font-bold">About</Link></li>
            <li><Link to="/contact" className="hover:text-gray-400 text-black font-bold">Contact Us</Link></li>
            <li><Link to="/timetable" className="hover:text-gray-400 text-black font-bold">Timetable</Link></li>
            {currentUser ? (
              <>
                <li><Link to="/faculty" className="hover:text-gray-400">Faculty</Link></li>
                <li><button onClick={logout} className="hover:text-gray-400 bg-blue-100 text-black font-bold">Logout</button></li>
              </>
            ) : (
              <li><Link to="/login" className="hover:text-gray-400 text-black font-bold">Login</Link></li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;