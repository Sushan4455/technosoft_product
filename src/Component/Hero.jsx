import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, BarChart3, GraduationCap, Zap } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative w-full min-h-[65vh] flex flex-col items-center justify-center overflow-hidden bg-[#FAFAFA] text-slate-800 py-16">
      
      {/* --- ADVANCED CSS BACKGROUND (Animated Mesh) --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Abstract Gradient Orbs */}
        <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000" />
        
        {/* GREEN OPACITY REDUCED */}
        <div className="absolute bottom-[-20%] left-[30%] w-[50vw] h-[50vw] bg-emerald-100/15 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-4000" />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-6 mx-auto flex flex-col items-center text-center">

        {/* --- REFINED TYPOGRAPHY (Brand Navy Blue) --- */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="max-w-4xl text-5xl md:text-7xl font-medium tracking-tight text-[#007dd0] leading-[1.15] mb-6"
        >
          Empowering Your Business<br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007dd0] to-[#007dd0] animate-gradient-x">
            with Next-Gen IT Solutions.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="max-w-2xl text-lg md:text-xl text-slate-500 font-light leading-relaxed mb-10"
        >
          From scalable SaaS products like Accounting and E-commerce to expert IT services and E-learning—we provide the tools you need to lead the digital era.
        </motion.p>

       <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex items-center"
        >
          {/* Kept the outer glow effect, but tuned the shadow */}
          <button className="group relative p-[1px] rounded-full overflow-hidden bg-gradient-to-r from-[#00aaff] to-[#007dd0] hover:shadow-[0_0_20px_rgba(0,125,208,0.5)] transition-all duration-300">
            
            {/* 1. Changed bg-slate-900 to your brand Navy Blue: bg-[#007dd0] */}
            {/* 2. Added a slightly darker blue on hover: group-hover:bg-[#006bb0] */}
            <div className="relative px-8 py-3.5 bg-[#007dd0] rounded-full flex items-center gap-3 transition-colors group-hover:bg-[#006bb0]">
              
              <span className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
                Explore Products
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  {/* 3. Changed arrow to white for better contrast */}
                  <ArrowRight size={18} className="text-white" />
                </motion.span>
              </span>
              
              {/* Glossy overlay effect kept intact */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </button>
        </motion.div>

      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
};

export default Hero;