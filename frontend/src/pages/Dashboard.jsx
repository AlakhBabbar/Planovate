import React from 'react';
import Footer from '../components/Footer.jsx';
import About from './About.jsx';
import logo from '../assets/logo.jpg';
function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* <header className="bg-blue-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">DEI Timetable Management</h1>
          <nav className="space-x-4">
            <a href="#" className="hover:text-gray-300">Home</a>
            <a href="/About" className="hover:text-gray-300">About</a>
            <a href="#" className="hover:text-gray-300">Courses</a>
            <a href="#" className="hover:text-gray-300">Contact</a>
          </nav>
        </div>
      </header> */}

      <main>
        <section className="hero bg-cover bg-center h-96" style={{ backgroundImage: `url(${logo})` }}>
          <div className="container mx-auto h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-4xl font-bold mb-4">Welcome to DEI Timetable Management</h2>
              <p className="text-xl mb-8">Efficiently manage your academic schedules with ease.</p>
              {/* <a href="#" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Get Started</a> */}
            </div>
          </div>
        </section>

        <section className="features py-12">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Our Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="feature bg-white p-6 rounded shadow">
                <h3 className="text-2xl font-bold mb-4">Easy Timetable Management</h3>
                <p>Organize and manage your class schedules effortlessly.</p>
              </div>
              <div className="feature bg-white p-6 rounded shadow">
                <h3 className="text-2xl font-bold mb-4">Course Management</h3>
                <p>Keep track of all your courses and their schedules in one place.</p>
              </div>
              <div className="feature bg-white p-6 rounded shadow">
                <h3 className="text-2xl font-bold mb-4">Faculty Management</h3>
                <p>Manage faculty schedules and availability with ease.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta bg-blue-800 text-white py-12">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Join Us Today</h2>
            <p className="text-xl mb-8">Become a part of our educational community and streamline your academic management.</p>
            <a href="#" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Sign Up Now</a>
          </div>
        </section>
      </main>

      {/* <Footer /> */}
    </div>
  );
}

export default Dashboard;