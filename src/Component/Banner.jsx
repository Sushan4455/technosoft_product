import React from 'react';

const Banner = () => {
  return (
    // Changed to a solid background using your brand blue at 10% opacity
    <div className="w-full py-20 px-6 flex justify-center items-center text-center bg-[#007dd0]/10">
      
      {/* Text remains exactly as you had it */}
      <h1 className="text-[1.75rem] md:text-[2.25rem] font-light text-[#007dd0] leading-snug max-w-4xl mx-auto">
        Powering growing businesses. Run your operations on a unified platform that scales with your needs.
      </h1>

    </div>
  );
};

export default Banner;