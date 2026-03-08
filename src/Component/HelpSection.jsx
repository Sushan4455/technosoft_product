import React from 'react';

const HelpSection = () => {
  const helpFeatures = [
    {
      id: 1,
      title: 'Seamless Integration',
      description: 'Easily connect with your existing tools and workflows without any technical hassle.'
    },
    {
      id: 2,
      title: 'Real-Time Syncing',
      description: 'Keep all your data up-to-date across all platforms instantly and securely.'
    },
    {
      id: 3,
      title: 'Automated Workflows',
      description: 'Eliminate manual data entry by setting up smart, automated business rules.'
    },
  ];

  return (
    <section className="w-full py-20 flex justify-center bg-white">
      
      {/* items-stretch keeps the left and right sides perfectly equal in height */}
      <div className="w-full max-w-[1440px] px-6 lg:px-12 flex flex-col lg:flex-row items-stretch gap-10 lg:gap-16">
        
        {/* --- LEFT SIDE: IMAGE --- */}
        <div className="w-full lg:w-[40%] min-h-[300px] rounded-2xl overflow-hidden shadow-sm relative">
          <img 
            src="https://i.pinimg.com/736x/97/e8/dd/97e8ddb09a792b66c7853a9fa8c92806.jpg" 
            alt="Platform Dashboard Overview" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>

        {/* --- RIGHT SIDE: HEADING + BOXES --- */}
        <div className="w-full lg:w-[60%] flex flex-col">
          
          {/* --- LEFT-ALIGNED HEADING --- */}
          {/* Moved here, aligned left, with some margin below to separate from boxes */}
          <div className="text-left mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Everything you need to <span className="text-[#007dd0]">scale efficiently</span>
            </h2>
            <p className="text-slate-500 text-[1.05rem] leading-relaxed max-w-2xl">
              From automation to security, our platform provides the essential tools designed to streamline your operations and accelerate growth.
            </p>
          </div>

          {/* --- 5 BOXES --- */}
          <div className="flex flex-col gap-4">
            {helpFeatures.map((feature) => (
              <div 
                key={feature.id}
                className="w-full py-4 px-6 bg-white border border-[#007dd0]/20 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-[#007dd0] hover:shadow-[0_10px_25px_rgba(0,125,208,0.12)] cursor-default"
              >
                <h3 className="text-[#007dd0] text-[1.25rem] font-semibold mb-1">
                  {feature.title}
                </h3>
                <p className="text-[#475569] text-[0.95rem] leading-relaxed m-0">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
          
        </div>

      </div>
    </section>
  );
};

export default HelpSection;