import React from 'react';
import photo from '../image/photo.jpg';

function Contact() {
  return (
    <div className="min-h-screen bg-gray-300 p-6">
      <main className="container mx-auto bg-white p-8 rounded-lg shadow-lg">
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Meet the Developers</h2>
          <div className="flex flex-wrap justify-between mx-60">
            <div className="flex items-center mb-6 ">
              <img
                src={photo}
                alt="Anish Kumar"
                className="w-32 h-32 rounded-full mr-6"
              />
              <div>
                <h3 className="text-2xl font-bold">Anish Kumar</h3>
                <p className="text-lg">3rd Year Electrical Engineering</p>
              </div>
            </div>
            <div className="flex items-center mb-6">
              <img
                src={photo}
                alt="Alakh Babbar"
                className="w-32 h-32 rounded-full mr-6"
              />
              <div>
                <h3 className="text-2xl font-bold">Alakh Babbar</h3>
                <p className="text-lg">3rd Year Computer Science</p>
              </div>
            </div>

          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">About Us</h2>
          <p className="text-lg mb-4">
            We are a team of dedicated students from Dayalbagh Educational Institute, working together to create a comprehensive timetable management system. Our goal is to provide an efficient and user-friendly platform for managing academic schedules.
          </p>
          <p className="text-lg mb-4">
            Our team consists of students from various engineering disciplines, bringing together a diverse set of skills and knowledge. We are passionate about leveraging technology to solve real-world problems and enhance the educational experience for students and faculty alike.
          </p>
          <p className="text-lg mb-4">
            This project is a testament to our commitment to innovation and excellence. We have worked tirelessly to ensure that the system is robust, reliable, and easy to use. We hope that our efforts will make a positive impact on the academic community at Dayalbagh Educational Institute.
          </p>
          <p className="text-lg mb-4">
            If you have any questions or feedback, please feel free to reach out to us. We are always looking for ways to improve and would love to hear from you.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
          <p className="text-lg mb-6">
            If you have any questions or need assistance, please feel free to contact us at <a href="mailto:support@dei.edu" className="text-blue-600 hover:underline">support@dei.edu</a>.
          </p>
          <p className="text-lg mb-6">
            You can also reach us at our office:
          </p>
          <address className="text-lg mb-6">
            Dayalbagh Educational Institute<br />
            Dayalbagh Road, Agra<br />
            Uttar Pradesh, India<br />
            Phone: <a href="tel:+911234567890" className="text-blue-600 hover:underline">+91 12345 67890</a>
          </address>
          <p className="text-lg mb-6">
            Follow us on social media:
          </p>
          <div className="flex space-x-4">
            <a href="https://www.facebook.com/dei" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              <i className="fab fa-facebook-f"></i> Facebook
            </a>
            <a href="https://www.twitter.com/dei" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              <i className="fab fa-twitter"></i> Twitter
            </a>
            <a href="https://www.linkedin.com/school/dei" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              <i className="fab fa-linkedin-in"></i> LinkedIn
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Contact;