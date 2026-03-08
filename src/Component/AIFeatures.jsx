import React from 'react';
import { BrainCircuit, Zap, LineChart } from 'lucide-react';

const AIFeatures = () => {
  // Using an array makes it easy to handle the conditional styling for the middle card
  const features = [
    {
      id: 1,
      title: 'Predictive Analytics',
      desc: 'Make smarter business decisions.',
      icon: BrainCircuit,
      isMiddle: false,
    },
    {
      id: 2,
      title: 'Intelligent Automation',
      desc: 'Eliminate tedious manual tasks.',
      icon: Zap,
      isMiddle: true,
    },
    {
      id: 3,
      title: 'Smart Forecasting',
      desc: 'Anticipate your market needs.',
      icon: LineChart,
      isMiddle: false,
    },
  ];

  return (
    // Wide container with generous padding
    <section className="w-full py-20 bg-slate-50 flex justify-center">
      <div className="w-full max-w-[1440px] px-6 lg:px-12">
        
        {/* Flex container: stacks on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0">
          
          {features.map((feature) => {
            const IconComponent = feature.icon;
            
            return (
              <div
                key={feature.id}
                // Dynamic class assignment based on whether it's the middle card or an outer card
                className={`flex flex-col items-center justify-center text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 w-full
                  ${feature.isMiddle 
                    ? 'md:flex-[1.15] h-[260px] bg-[#007dd0] text-white shadow-[0_10px_40px_-10px_rgba(0,125,208,0.5)] z-10 md:scale-105' 
                    : 'md:flex-1 h-[220px] bg-white text-[#007dd0] border border-[#007dd0]/30 shadow-sm'
                  }
                `}
              >
                {/* The Icon */}
                <div className="mb-4">
                  <IconComponent 
                    size={feature.isMiddle ? 40 : 32} 
                    strokeWidth={1.5} 
                    className={feature.isMiddle ? 'text-white' : 'text-[#007dd0]'} 
                  />
                </div>

                {/* The Title */}
                <h1 className={`font-bold mb-3 ${feature.isMiddle ? 'text-[24px]' : 'text-[20px]'}`}>
                  {feature.title}
                </h1>

                {/* The 4-word Description */}
                <p className={`text-[15px] leading-[1.5] px-4 ${feature.isMiddle ? 'text-blue-100' : 'text-slate-600'}`}>
                  {feature.desc}
                </p>
                
              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
};

export default AIFeatures;