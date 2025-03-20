import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white text-center p-3 mt-4">
      <p>© {new Date().getFullYear()} Planovate. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
