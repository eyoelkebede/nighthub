import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
  return (
    <div className="bg-gray-900 text-gray-300 font-sans min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-6">Nighthub - Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: June 20, 2025</p>

        <div className="space-y-6 prose prose-invert prose-lg">
          <p>Your privacy is important to us. This policy explains what information we collect and how we use it.</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">Information We Do Not Collect</h2>
            <p>We are an anonymous service. We <strong>do not</strong> store the content of your video or text chats. We do not require or store personal information like your name or email.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">Information We Collect</h2>
            <ul>
                <li><strong>IP Addresses:</strong> We process your IP address for the primary purpose of enforcing our ban policy.</li>
                <li><strong>Local Storage:</strong> We use your browser's local storage to save your agreement to these terms.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">How We Use Information</h2>
            <p>The primary use of any collected data is to ensure the safety and security of the platform. We <strong>do not</strong> sell or share your information with third-party marketers.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">Data Security & Anonymity</h2>
            <p>We take reasonable measures to protect the information we handle. Your IP address is never exposed directly to another user. However, your anonymity is not absolute.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold text-white">Reporting Illegal Activity</h2>
            <p className="text-red-400 font-bold">Be advised: the use of a VPN or other anonymizing technology will not prevent our moderation team from identifying the source of illegal activity.</p>
            <p>In cases where our systems detect severe violations suggesting real-world harm or illegal acts, we reserve the right to cooperate fully with law enforcement. We will use all available technical and legal means to geolocate and identify users engaging in such acts and will provide this information to the appropriate authorities to ensure prosecution to the fullest extent of the law.</p>
          </section>
        </div>
        <Link to="/" className="inline-block mt-8 text-blue-400 hover:text-blue-300">&larr; Back to Home</Link>
      </div>
    </div>
  );
};

export default PrivacyPage;
