import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Calculator, 
  ShoppingBag, 
  LayoutDashboard
} from 'lucide-react';

// Apple-style smooth, subtle animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } }
};

const BentoGrid = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden font-sans">
      <div className="max-w-[90rem] mx-auto px-6 lg:px-12 relative z-10">
        
        {/* --- Section Header --- */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-slate-500 font-medium tracking-wide text-sm mb-4 block"
          >
            A cohesive suite for modern business.
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold text-slate-900 leading-[1.1] tracking-tight"
          >
            Empowering your business. <br className="hidden md:block" />
            Accelerated. Unbound.
          </motion.h2>
        </div>

        {/* --- Single Row Grid Layout --- */}
        {/* Changed to 4 columns on large screens to force a single horizontal row */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
        >
          
          {/* CARD 1: TechnosoftAI */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-slate-100 shadow-[0_4px_30px_rgb(0,0,0,0.03)] relative group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:border-[#1774b5] transition-all duration-500 flex flex-col h-full">
            <div className="mb-8">
              <BarChart3 className="text-[#1774b5]" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">TechnosoftAI</h3>
            <p className="text-slate-500 font-normal leading-relaxed text-base flex-1">
              Discover hidden insights. Our AI-driven engine unlocks patterns in your sales data, transforming raw numbers into predictive guidance.
            </p>
          </motion.div>

          {/* CARD 2: Smart Accounting */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-slate-100 shadow-[0_4px_30px_rgb(0,0,0,0.03)] relative group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:border-[#1774b5] transition-all duration-500 flex flex-col h-full">
            <div className="mb-8">
              <Calculator className="text-[#1774b5]" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Smart Accounting</h3>
            <p className="text-slate-500 font-normal leading-relaxed text-base flex-1">
              Finance, simplified. Instantly organize every transaction, track invoices, and generate effortless tax-ready reports from one intuitive platform.
            </p>
          </motion.div>

          {/* CARD 3: E-commerce */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-slate-100 shadow-[0_4px_30px_rgb(0,0,0,0.03)] relative group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:border-[#1774b5] transition-all duration-500 flex flex-col h-full">
            <div className="mb-8">
              <ShoppingBag className="text-[#1774b5]" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Storefronts</h3>
            <p className="text-slate-500 font-normal leading-relaxed text-base flex-1">
              Global reach. Launch your complete online business with a simple, powerful storefront that integrates seamlessly across all channels.
            </p>
          </motion.div>

          {/* CARD 4: Integrated OS */}
          <motion.div variants={itemVariants} className="bg-white rounded-[2rem] p-8 lg:p-10 border border-slate-100 shadow-[0_4px_30px_rgb(0,0,0,0.03)] relative group hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] hover:border-[#1774b5] transition-all duration-500 flex flex-col h-full">
            <div className="mb-8">
              <LayoutDashboard className="text-[#1774b5]" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Integrated OS</h3>
            <p className="text-slate-500 font-normal leading-relaxed text-base flex-1">
              Your command center. Connect your accounting, sales, inventory, and analytics into one cohesive business operating system.
            </p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

export default BentoGrid;