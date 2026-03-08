import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, ArrowRight, Sparkles, X, QrCode, Building2 } from 'lucide-react';

const EventBanner = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    // Ensured outer container is completely white and hides any weird overflowing boxes
    <section className="py-16 bg-white w-full overflow-hidden font-sans">
      
      {/* Centered, contained banner */}
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative w-full rounded-[2.5rem] overflow-hidden bg-slate-950 flex flex-col md:flex-row items-center justify-between p-10 md:p-14 border border-slate-800 shadow-2xl group"
        >
          {/* Background Ambient Glow Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#f5921e]/20 blur-[120px] rounded-full mix-blend-screen transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#1774b5]/30 blur-[120px] rounded-full mix-blend-screen transition-transform duration-700 group-hover:scale-110" />
          </div>

          {/* Left Side: Event Details */}
          <div className="relative z-10 flex-1 mb-10 md:mb-0 pr-0 md:pr-10">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-white/10 border border-white/10 text-white/90 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                <Sparkles size={14} className="text-[#f5921e]" />
                Enrollment Open
              </span>
            </div>
            
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white tracking-tight mb-5 leading-tight">
              Digital Marketing Cohort 1.0
            </h3>
            
            <p className="text-slate-400 text-lg max-w-xl font-light leading-relaxed mb-8">
              Master the art of online growth. Join our intensive 1-month online program designed to take you from beginner to expert. Limited seats available for just Rs 2000.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-300">
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/5">
                <CalendarDays size={18} className="text-[#1774b5]" />
                1-Month Online Course
              </div>
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/5">
                <span className="text-[#f5921e] font-bold">Rs 2000</span> 
                <span>Registration Fee</span>
              </div>
            </div>
          </div>

          {/* Right Side: Call to Action */}
          <div className="relative z-10 shrink-0 w-full md:w-auto flex justify-start md:justify-end">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-8 py-4 bg-white text-slate-950 text-base font-semibold rounded-full hover:bg-slate-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95 flex items-center justify-center gap-2"
            >
              Reserve Your Spot
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* --- REGISTRATION MODAL --- */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              {/* Form Section (Left) */}
              <div className="flex-1 p-8 sm:p-10 overflow-y-auto">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Complete Registration</h3>
                <p className="text-sm text-slate-500 mb-8">Please fill in your details and complete the payment to secure your spot in Cohort 1.0.</p>
                
                {/* FormSubmit.co Integration targeting your email */}
                <form 
                  action="https://formsubmit.co/info.technosoftintl@gmail.com" 
                  method="POST" 
                  className="space-y-5"
                >
                  {/* Hidden fields for FormSubmit configuration */}
                  <input type="hidden" name="_subject" value="New Registration for Digital Marketing Cohort!" />
                  <input type="hidden" name="_captcha" value="false" />
                  <input type="hidden" name="_template" value="table" />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input type="text" name="Full Name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1774b5]/20 focus:border-[#1774b5] outline-none transition-all" placeholder="Ram Bahadur" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                      <input type="email" name="Email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1774b5]/20 focus:border-[#1774b5] outline-none transition-all" placeholder="ram@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                      <input type="tel" name="Phone Number" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1774b5]/20 focus:border-[#1774b5] outline-none transition-all" placeholder="+977 98..." />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Location / Address</label>
                    <input type="text" name="Location" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1774b5]/20 focus:border-[#1774b5] outline-none transition-all" placeholder="Kathmandu, Nepal" />
                  </div>

                  {/* Payment Verification Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Remarks / Transaction ID</label>
                    <input type="text" name="Payment Remarks" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1774b5]/20 focus:border-[#1774b5] outline-none transition-all" placeholder="Enter eSewa/Bank Transaction Code" />
                  </div>

                  <button type="submit" className="w-full mt-4 py-3.5 px-4 bg-[#1774b5] hover:bg-[#135d90] text-white rounded-xl font-medium shadow-sm hover:shadow transition-all active:scale-[0.98]">
                    Submit Registration
                  </button>
                </form>
              </div>

              {/* Payment Details Section (Right) */}
              <div className="w-full md:w-[40%] bg-slate-50 p-8 sm:p-10 border-t md:border-t-0 md:border-l border-slate-200 overflow-y-auto">
                <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                  Payment Details
                </h4>

                {/* QR Code Area */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center mb-6">
                  <div className="flex justify-center mb-3">
                    {/* REPLACE WITH YOUR ACTUAL QR CODE IMAGE */}
                    <div className="w-40 h-40 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden">
                       <img src="/your-qr-code.png" alt="Scan to Pay" className="w-full h-full object-contain absolute inset-0 opacity-0" />
                       <QrCode className="text-slate-400 absolute" size={40} />
                       <span className="text-xs text-slate-400 mt-14 absolute">Your QR Here</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Scan to pay via eSewa / Fonepay</p>
                  <p className="text-xs text-slate-500 mt-1">Amount: Rs 2000</p>
                </div>

                {/* Bank Details Area */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-[#1774b5]">
                    <Building2 size={20} />
                    <span className="font-semibold text-sm">Direct Bank Transfer</span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Bank Name</span>
                      <span className="font-medium text-slate-900">NIC Asia Bank</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Account Name</span>
                      <span className="font-medium text-slate-900">Technosoft Intl Pvt Ltd</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-xs uppercase tracking-wider">Account Number</span>
                      <span className="font-medium text-slate-900 tracking-wider">1234 5678 9012 3456</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default EventBanner;