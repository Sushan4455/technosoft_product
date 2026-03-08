import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } }
};

const Pricing = () => {
  return (
    <section className="py-32 bg-slate-50 relative overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* --- Header --- */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#1774b5] font-semibold tracking-wide text-sm mb-4 block uppercase"
          >
            Simple Pricing
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-semibold text-slate-900 leading-[1.1] tracking-tight mb-6"
          >
            Choose the right plan <br className="hidden sm:block" /> for your business.
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-500 font-light"
          >
            Start for free, upgrade when you need more power.
          </motion.p>
        </div>

        {/* --- Pricing Cards Grid --- */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto"
        >
          
          {/* --- TIER 1: Free --- */}
          <motion.div variants={cardVariants} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-500 h-full flex flex-col">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Free</h3>
            <p className="text-slate-500 text-sm mb-6 h-10">Essential tools to get your new business off the ground.</p>
            
            <div className="mb-8">
              <span className="text-5xl font-bold text-slate-900">Rs 0</span>
              <span className="text-slate-500 font-medium"> /forever</span>
            </div>

            <button className="w-full py-3.5 px-4 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-full font-medium transition-colors mb-8">
              Get Started Free
            </button>

            <ul className="space-y-4 flex-1">
              {[
                'Basic Accounting (Up to 50 entries)',
                '1 User Account',
                'Standard Support',
                'Basic Analytics Dashboard'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-[#1774b5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* --- TIER 2: Pro (Highlighted) --- */}
          <motion.div variants={cardVariants} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] relative transform md:-translate-y-4 hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)] transition-all duration-500 flex flex-col z-10">
            {/* Most Popular Badge - Solid color, no gradient */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1774b5] text-white px-5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
              Most Popular
            </div>

            <h3 className="text-xl font-semibold text-[#1774b5] mb-2">Pro</h3>
            <p className="text-slate-500 text-sm mb-6 h-10">Everything you need to scale your growing business.</p>
            
            <div className="mb-8">
              <span className="text-5xl font-bold text-slate-900">Rs 1,499</span>
              <span className="text-slate-500 font-medium"> /month</span>
            </div>

            {/* CTA Button - Solid brand color */}
            <button className="w-full py-3.5 px-4 bg-[#1774b5] hover:bg-[#135d90] text-white rounded-full font-medium shadow-sm hover:shadow-md transition-all mb-8 active:scale-95">
              Start 14-Day Free Trial
            </button>

            <ul className="space-y-4 flex-1">
              {[
                'Unlimited Accounting & Invoices',
                'Full E-commerce Storefront',
                'TechnosoftAI Predictive Insights',
                'Up to 5 User Accounts',
                'Priority 24/7 Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-700 text-sm font-medium">
                  {/* Kept the orange checkmark here just for a subtle pop of secondary brand color */}
                  <Check size={18} className="text-[#f5921e] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* --- TIER 3: Enterprise --- */}
          {/* Changed from black to pure white to match the flow */}
          <motion.div variants={cardVariants} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-500 h-full flex flex-col">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Enterprise</h3>
            <p className="text-slate-500 text-sm mb-6 h-10">Custom solutions and dedicated support for large teams.</p>
            
            <div className="mb-8">
              <span className="text-5xl font-bold text-slate-900">Custom</span>
              <span className="text-slate-500 font-medium"> pricing</span>
            </div>

            <button className="w-full py-3.5 px-4 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-full font-medium transition-colors mb-8">
              Contact Sales
            </button>

            <ul className="space-y-4 flex-1">
              {[
                'Everything in Pro plan',
                'Custom AI Model Training',
                'Unlimited Users & Branches',
                'Dedicated Account Manager',
                'Custom API Integrations'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-slate-600 text-sm">
                  <Check size={18} className="text-[#1774b5] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

export default Pricing;