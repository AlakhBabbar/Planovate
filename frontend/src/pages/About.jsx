import React from 'react';
import Footer from '../components/Footer.jsx';

function About() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* <header className="bg-blue-800 text-white p-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-4xl font-bold">About DEI Timetable Management</h1>
        </div>
      </header> */}
      {/* vhevhvfe */}

      <main className="container mx-auto p-6">
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">About Our App</h2>
          <p className="text-lg mb-6">
            DEI Timetable Management is a comprehensive solution designed to streamline the process of managing academic schedules. Our app provides an intuitive interface for students, faculty, and administrators to efficiently organize and manage their timetables.
          </p>
          <p className="text-lg mb-6">
            With DEI Timetable Management, you can easily create, update, and view timetables, ensuring that everyone stays informed and up-to-date with the latest schedules. Our app is designed to save time and reduce the complexity of timetable management, allowing you to focus on what matters most - education.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Features and Benefits</h2>
          <table className="min-w-full bg-white border border-gray-300 shadow-lg">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-4 px-6 border-b text-left">Feature</th>
                <th className="py-4 px-6 border-b text-left">Description</th>
                <th className="py-4 px-6 border-b text-left">Benefit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-4 px-6 border-b">Real-Time Updates</td>
                <td className="py-4 px-6 border-b">Get instant updates on any changes to the timetable.</td>
                <td className="py-4 px-6 border-b">Keeps everyone informed and reduces miscommunication.</td>
              </tr>
              <tr>
                <td className="py-4 px-6 border-b">Print and Export</td>
                <td className="py-4 px-6 border-b">Easily print or export timetables for offline use.</td>
                <td className="py-4 px-6 border-b">Provides flexibility in how timetables are shared and used.</td>
              </tr>
              <tr>
                <td className="py-4 px-6 border-b">User Roles and Permissions</td>
                <td className="py-4 px-6 border-b">Assign different roles and permissions to users.</td>
                <td className="py-4 px-6 border-b">Ensures that only authorized users can make changes.</td>
              </tr>
              <tr>
                <td className="py-4 px-6 border-b">User-Friendly Interface</td>
                <td className="py-4 px-6 border-b">An intuitive and easy-to-use interface for all users.</td>
                <td className="py-4 px-6 border-b">Reduces the learning curve and increases productivity.</td>
              </tr>
              <tr>
                <td className="py-4 px-6 border-b">Mobile Access</td>
                <td className="py-4 px-6 border-b">Access timetables from any device, anywhere.</td>
                <td className="py-4 px-6 border-b">Ensures that users can stay updated on the go.</td>
              </tr>
              <tr>
                <td className="py-4 px-6 border-b">Customizable Timetables</td>
                <td className="py-4 px-6 border-b">Create and customize timetables to fit specific needs.</td>
                <td className="py-4 px-6 border-b">Provides flexibility to accommodate different schedules.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
          <p className="text-lg mb-6">
            If you have any questions or need assistance, please feel free to contact us at <a href="mailto:support@dei.edu" className="text-blue-600 hover:underline">support@dei.edu</a>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default About;