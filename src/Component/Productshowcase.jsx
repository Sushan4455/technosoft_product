import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const ProductShowcase = () => {
  return (
    <section className="py-32 bg-white relative overflow-hidden font-sans">
      <div className="max-w-[85rem] mx-auto px-6 lg:px-12">
        
        {/* --- SHOWCASE 1: Small Business Management System --- */}
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 mb-40">
          
          {/* Text Content (Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex-1 w-full"
          >
            <span className="text-[#1774b5] font-semibold tracking-wide text-sm mb-4 block uppercase">
              Technosoft OS
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 leading-[1.15] tracking-tight mb-6">
              Run your entire business. <br />
              From one beautiful screen.
            </h2>
            <p className="text-lg text-slate-500 font-normal leading-relaxed mb-8 max-w-lg">
              Say goodbye to scattered spreadsheets and messy ledgers. Our unified management system handles your accounting, inventory, and sales natively.
            </p>
            
            <ul className="space-y-4 mb-10">
              {['Automated billing and invoicing.', 'Real-time inventory syncing.', 'Bank-grade secure cloud storage.'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <CheckCircle2 className="text-[#1774b5]" size={20} strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>

            <a href="#os" className="group inline-flex items-center gap-2 text-lg font-medium text-[#1774b5] hover:text-[#115a8c] transition-colors">
              Explore Technosoft OS
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>

          {/* Photo Container (Right) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex-1 w-full"
          >
            {/* The wrapper creates the Apple-style rounded corners and soft shadow around your photo */}
            <div className="relative w-full aspect-[4/3] rounded-[2rem] border border-slate-100 shadow-[0_20px_60px_rgb(0,0,0,0.06)] overflow-hidden bg-slate-50 group">
              <img 
                /* REPLACE THIS SRC WITH YOUR ACTUAL PHOTO PATH (e.g., "/images/business-photo.jpg") */
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3" 
                alt="Business Management" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
          </motion.div>
        </div>


        {/* --- SHOWCASE 2: E-Learning Platform --- */}
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">
          
          {/* Text Content (Right side on desktop) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex-1 w-full"
          >
            <span className="text-[#f5921e] font-semibold tracking-wide text-sm mb-4 block uppercase">
              Technosoft Academy
            </span>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 leading-[1.15] tracking-tight mb-6">
              Master the digital era. <br />
              Learn from the experts.
            </h2>
            <p className="text-lg text-slate-500 font-normal leading-relaxed mb-8 max-w-lg">
              Whether you are upskilling your team or starting a new career, our interactive e-learning platform delivers premium courses like our intensive 1-Month Digital Marketing program.
            </p>
            
            <ul className="space-y-4 mb-10">
              {['High-definition video lessons.', 'Interactive quizzes and assignments.', 'Earn verified certificates upon completion.'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <CheckCircle2 className="text-[#f5921e]" size={20} strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>

            <a href="#academy" className="group inline-flex items-center gap-2 text-lg font-medium text-[#f5921e] hover:text-[#d97c14] transition-colors">
              View the Academy
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>

          {/* Photo Container (Left side on desktop) */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex-1 w-full"
          >
            {/* The wrapper creates the Apple-style rounded corners and soft shadow around your photo */}
            <div className="relative w-full aspect-[4/3] rounded-[2rem] border border-slate-100 shadow-[0_20px_60px_rgb(0,0,0,0.06)] overflow-hidden bg-slate-50 group">
              <img 
                /* REPLACE THIS SRC WITH YOUR ACTUAL PHOTO PATH (e.g., "/images/learning-photo.jpg") */
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=2671&ixlib=rb-4.0.3" 
                alt="Students learning online" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
};

export default ProductShowcase;