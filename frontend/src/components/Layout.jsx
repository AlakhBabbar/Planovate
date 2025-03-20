import React from "react";
import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ leftSection, rightSection }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow flex p-4 gap-4">
        {/* Left Section (Different Color) */}
        <div className="w-1/3 bg-gray-300 p-4 rounded-lg shadow-md">
          {leftSection}
        </div>

        {/* Right Section (Different Color) */}
        <div className="w-2/3 bg-white p-4 rounded-lg shadow-md">
          {rightSection}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;

