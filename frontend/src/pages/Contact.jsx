import React from 'react';
import  photo from '../assets/photo.jpg';
function Contact() {
  return (
    <div className="min-h-screen bg-gray-300 p-6">
      {/* <header className="bg-blue-800 text-white p-6 mb-6">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold">About Us</h1>
        </div>
      </header> */}

      <main className="container mx-auto">
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Meet the Developers</h2>
          <div className="flex items-center mb-6">
            <img
              src={photo}
              alt="Aish Kumar"
              className="w-32 h-32 rounded-full mr-6"
            />
            <div>
              <h3 className="text-2xl font-bold">Anish Kumar</h3>
              <p className="text-lg">3rd Year Electrical Engineering</p>
            </div>
          </div>
          <div className="flex items-center mb-6">
            <img
              src="link_to_alakh_image.jpg"
              alt="Alakh Babbar"
              className="w-32 h-32 rounded-full mr-6"
            />
            <div>
              <h3 className="text-2xl font-bold">Alakh Babbar</h3>
              <p className="text-lg">3rd Year Electrical Engineering</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
          <p className="text-lg mb-6">
            If you have any questions or need assistance, please feel free to contact us at <a href="mailto:support@dei.edu" className="text-blue-600 hover:underline">support@dei.edu</a>.
          </p>
        </section>
      </main>
    </div>
  );
}

export default Contact;