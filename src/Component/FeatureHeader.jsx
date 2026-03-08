import React from 'react';

const FeatureHeader = () => {
  return (
    // Outer container keeps it aligned with your Navbar and Cards
    <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      
      {/* The Heading */}
      <h1 className="text-3xl md:text-[35px] font-light text-[#007dd0] leading-tight">
        Streamline Management with <br className="hidden md:block" />
        <span className="font-regular text-orange-400"> Smart Features</span>
      </h1>

      {/* The Action Button */}
      <button className="px-9 py-2.5 bg-[#007dd0] text-white text-base font-regular rounded-4xl shadow-sm hover:bg-[#0066aa] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
        Learn More
      </button>

    </div>
  );
};

export default FeatureHeader;