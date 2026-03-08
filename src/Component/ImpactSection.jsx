import React from 'react';
import { motion } from 'framer-motion';

const ImpactSection = () => {
  const statsData = [
    { id: 1, value: '500K+', label: 'Businesses Powered' },
    { id: 2, value: '99.9%', label: 'Uptime Guarantee' },
    { id: 3, value: '350K', label: 'Active Users' },
    { id: 4, value: '24/7', label: 'Customer Support' },
  ];

  return (
    <section className="relative flex justify-center py-[60px] mt-[25px] w-full overflow-hidden">
      
      {/* --- FAINT NAVY BLUE GRADIENT BACKGROUND --- */}
      {/* This creates a very subtle blue glow that fades into white */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#007dd0]/5 to-transparent pointer-events-none" />

      {/* The Full-Width Stats Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-around gap-[50px] md:gap-[60px] w-full py-[40px] md:py-[60px] px-5 bg-white/40 backdrop-blur-sm border-y border-[#007dd0]/20">
        
        {statsData.map((stat, index) => (
          <motion.div 
            key={stat.id} 
            // --- ENTRANCE ANIMATION ---
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
            // 'group' class enables the hover effects for the child elements
            className="text-center flex-1 group cursor-default"
          >
            {/* --- HOVER EFFECT WRAPPER --- */}
            {/* Lifts up and scales slightly on hover */}
            <div className="transition-all duration-300 ease-in-out group-hover:-translate-y-2 group-hover:scale-105">
              
              {/* The Numbers (Gap removed using leading-none) */}
              <h2 className="text-[#007dd0] text-[3.25rem] font-medium leading-none drop-shadow-sm transition-colors duration-300 group-hover:text-[#005a9e]">
                {stat.value}
              </h2>
              
              {/* The Labels (Zero margin top keeps it flushed against the number) */}
              <p className="text-[#475569] text-[1.25rem] font-light leading-snug transition-colors duration-300 group-hover:text-slate-900">
                {stat.label}
              </p>

            </div>
          </motion.div>
        ))}

      </div>
    </section>
  );
};

export default ImpactSection;