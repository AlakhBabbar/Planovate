import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-blue-100 text-white  bottom-0 w-full">
      <div className="container mx-auto py-4 flex flex-col items-center">
        <p className="text-black mb-2">&copy; {new Date().getFullYear()} DAYALBAGH EDUCATIONAL INSTITUTE. All rights reserved.</p>
        <nav>
          <ul className="flex space-x-4">
            <li><Link to="/about" className="hover:text-blue-200 text-black font-bold">About</Link></li>
            <li><Link to="/contact" className="hover:text-blue-200 text-black font-bold">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-blue-200 text-black font-bold">Privacy Policy</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;