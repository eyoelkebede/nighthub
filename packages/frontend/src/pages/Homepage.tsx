import React, { useState, useEffect } from 'react';
// Import the Link component
import { Link } from 'react-router-dom';

const Homepage: React.FC = () => {
  // State to control the modal's visibility. It defaults to false.
  const [showModal, setShowModal] = useState(false);

  // This effect runs once when the component first loads.
  useEffect(() => {
    // Check local storage for our 'agreed' flag.
    const hasAgreed = localStorage.getItem('nighthub_tos_agreed');
    // If the flag is not 'true', show the modal.
    if (hasAgreed !== 'true') {
      setShowModal(true);
    }
  }, []);

  const handleAgree = () => {
    // When the user clicks agree, set the flag in local storage.
    localStorage.setItem('nighthub_tos_agreed', 'true');
    // Hide the modal.
    setShowModal(false);
  };

  return (
    <div className="relative flex flex-col md:flex-row h-screen font-sans overflow-hidden">
      
      {/* --- ToS Modal Overlay --- */}
      {showModal && (
        <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 text-white rounded-lg shadow-xl p-6 md:p-8 max-w-2xl w-full text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Nighthub!</h1>
            <p className="text-gray-400 mb-6">Before you connect, please read and agree to our terms.</p>
            
            <div className="text-left bg-gray-900 p-4 rounded-md space-y-3">
              <p>• You must be <strong>13+</strong> for Safe Mode and <strong>18+</strong> for NSFW Mode.</p>
              <p>• Be respectful. Hate speech, harassment, and illegal activities are strictly forbidden.</p>
              <p>• Severe violations (especially those involving harm to minors) will be reported to law enforcement. Your anonymity is not absolute.</p>
              <p>• This service is for personal use only. No commercial activity.</p>
            </div>

            <button
              onClick={handleAgree}
              className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
              I Understand and Agree
            </button>

            <div className="mt-4 text-xs text-gray-500">
              <p>By clicking Agree, you accept our full</p>
              <Link to="/terms" target="_blank" className="underline hover:text-white">Terms of Service</Link>
              <span className="mx-1">&</span>
              <Link to="/privacy" target="_blank" className="underline hover:text-white">Privacy Policy</Link>
            </div>
          </div>
        </div>
      )}

      {/* SAFE MODE SECTION - WRAPPED IN A LINK */}
      <Link to="/waiting?mode=safe" className="group relative flex-1 flex items-center justify-center bg-gray-900 text-white cursor-pointer transition-all duration-700 ease-in-out hover:flex-[1.5]">
        {/* Background Video for Safe Mode */}
        <video 
          src="assets/safe-bg.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-30 transition-opacity duration-1000"
        ></video>
        <div className="absolute inset-0 bg-green-400 opacity-0 group-hover:opacity-20 transition-opacity duration-1000 blur-3xl"></div>
        <div className="text-center z-10 p-4">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter transition-transform duration-500 group-hover:scale-110 uppercase text-green-400">
            Safe Mode
          </h2>
          <p className="mt-2 text-lg text-gray-300 group-hover:text-white transition-colors duration-500">
            Connect with peace of mind
          </p>
        </div>
      </Link>

      {/* Dividers */}
      <div className="hidden md:block w-0.5 bg-gray-700"></div>
      <div className="block md:hidden h-0.5 bg-gray-700"></div>

      {/* NSFW MODE SECTION - WRAPPED IN A LINK */}
      <Link to="/waiting?mode=nsfw" className="group relative flex-1 flex items-center justify-center bg-black text-white cursor-pointer transition-all duration-700 ease-in-out hover:flex-[1.5]">
        {/* Background Video for NSFW Mode */}
        <video 
          src="assets/nsfw-bg.mp4" 
          autoPlay 
          loop 
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-0 group-hover:opacity-40 transition-opacity duration-1000"
        ></video>
        <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-25 group-hover:animate-pulse transition-opacity duration-1000 blur-3xl"></div>
        <div className="text-center z-10 p-4">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter transition-transform duration-500 group-hover:scale-110 uppercase text-red-500">
            NSFW Mode
          </h2>
          <p className="mt-2 text-lg text-gray-400 group-hover:text-gray-200 transition-colors duration-500">
            Enter the unrestricted zone
          </p>
        </div>
      </Link>

    </div>
  );
};

export default Homepage;