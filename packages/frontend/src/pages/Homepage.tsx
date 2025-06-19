import React from 'react';
// Import the Link component
import { Link } from 'react-router-dom';

const Homepage: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row h-screen font-sans overflow-hidden">
      
      {/* SAFE MODE SECTION - WRAPPED IN A LINK */}
      <Link to="/waiting?mode=safe" className="group relative flex-1 flex items-center justify-center bg-gray-900 text-white cursor-pointer transition-all duration-700 ease-in-out hover:flex-[1.5]">
        {/* Background Video for Safe Mode */}
        <video 
          src="/safe-bg.mp4" 
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
          src="/nsfw-bg.mp4" 
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